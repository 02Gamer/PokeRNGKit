// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using System.Text.Json;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record AccessorConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash);
public sealed record AccessorResult(string Block, AccessorCatalog Before, AccessorCatalog Result);
public sealed record AccessorBlockDiff(string Key, int[] Offsets, string BeforeHex, string AfterHex);
public sealed record AccessorTicket(string Token, string SourceHash, string TargetHash, AccessorResult[] Results, AccessorBlockDiff[] Blocks, int[] ChangedOffsets);
public sealed record AccessorSelection(string? Selected = null, string Culture = "en-US");

internal static class BlockAccessorSession
{
    private static byte[]? output;
    private static AccessorConfirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    internal static AccessorTicket Prepare(SaveFile source, byte[] original, AccessorRequest request)
    {
        Reset();
        string hash = Br4Editing.Hash(original);
        if (request.SourceHash != hash) throw new ArgumentException("Block accessor preview is stale.");
        var prepared = BlockAccessorEditing.Prepare(source, original, request);
        var reopened = SaveUtil.GetSaveFile(prepared.ToArray()) ?? throw new InvalidOperationException("Block accessor output is unrecognized.");
        string target = Br4Editing.Hash(prepared);
        var results = request.Changes.Select(c => c.Block).Distinct(StringComparer.Ordinal).Select(key => new AccessorResult(key, BlockAccessorReading.Read(source, hash, key, request.Culture), BlockAccessorReading.Read(reopened, target, key, request.Culture))).ToArray();
        var beforeMetadata = new SaveBlockMetadata<BlockInfo>(BlockAccessorReading.Accessor(source.Clone()));
        var afterMetadata = new SaveBlockMetadata<BlockInfo>(BlockAccessorReading.Accessor(reopened.Clone()));
        var diffs = new List<AccessorBlockDiff>();
        foreach (string key in beforeMetadata.GetSortedBlockList())
        {
            var before = beforeMetadata.GetBlock(key).Data.ToArray();
            var after = afterMetadata.GetBlock(key).Data.ToArray();
            if (before.SequenceEqual(after)) continue;
            var offsets = Enumerable.Range(0, Math.Max(before.Length, after.Length)).Where(i => i >= before.Length || i >= after.Length || before[i] != after[i]).ToArray();
            diffs.Add(new(key, offsets, Convert.ToHexString(before), Convert.ToHexString(after)));
        }
        string token = "accessor:" + (++revision).ToString(CultureInfo.InvariantCulture);
        var changed = Enumerable.Range(0, Math.Max(original.Length, prepared.Length)).Where(i => i >= original.Length || i >= prepared.Length || original[i] != prepared[i]).ToArray();
        output = prepared;
        current = new(token, hash, target);
        return new(token, hash, target, results, diffs.ToArray(), changed);
    }
    internal static byte[] Commit(byte[] original, AccessorConfirmation confirmation)
    {
        if (current is null || output is null || confirmation != current) throw new ArgumentException("Block accessor preview is missing or replaced.");
        if (Br4Editing.Hash(original) != current.SourceHash) throw new ArgumentException("Block accessor preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Block accessor frozen output hash is invalid.");
        var result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

public static partial class SaveService
{
    public static string ReadBlockAccessor(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Block accessor selection is too large.");
        var selection = JsonSerializer.Deserialize(json, SaveJsonContext.Default.AccessorSelection) ?? throw new ArgumentException("Missing block accessor selection.");
        return JsonSerializer.Serialize(BlockAccessorReading.Read(Open(data), Br4Editing.Hash(data), selection.Selected, selection.Culture), SaveJsonContext.Default.AccessorCatalog);
    }
    public static string PreviewBlockAccessor(byte[] data, string json)
    {
        BlockAccessorSession.Reset();
        if (json.Length > 4 * 1024 * 1024) throw new ArgumentException("Block accessor request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.AccessorRequest) ?? throw new ArgumentException("Missing block accessor request.");
        return JsonSerializer.Serialize(BlockAccessorSession.Prepare(Open(data), data, request), SaveJsonContext.Default.AccessorTicket);
    }
    public static byte[] CommitBlockAccessor(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Block accessor confirmation is too large.");
        return BlockAccessorSession.Commit(data, JsonSerializer.Deserialize(json, SaveJsonContext.Default.AccessorConfirmation) ?? throw new ArgumentException("Missing block accessor confirmation."));
    }
    public static void DiscardBlockAccessor(string token) => BlockAccessorSession.Discard(token);
}

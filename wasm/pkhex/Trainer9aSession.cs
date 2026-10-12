// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using System.Text.Json;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record Trainer9aConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash);
public sealed record Trainer9aTicket(string Token, string SourceHash, string TargetHash, Trainer9aCatalog Before, Trainer9aCatalog Result, int[] ChangedOffsets, Trainer9aOperation[] Operations);

internal static class Trainer9aSession
{
    private static byte[]? output;
    private static Trainer9aConfirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }

    internal static Trainer9aTicket Prepare(SAV9ZA source, byte[] original, Trainer9aRequest request)
    {
        Reset();
        string hash = Br4Editing.Hash(original);
        if (request.SourceHash != hash) throw new ArgumentException("Trainer9a preview is stale.");
        var before = Trainer9aEditing.Read(source, hash);
        var prepared = Trainer9aActions.Prepare(source, original, request, out var operations);
        string target = Br4Editing.Hash(prepared);
        var result = Trainer9aEditing.Read(new SAV9ZA(prepared.ToArray()), target);
        string token = "trainer9a:" + (++revision).ToString(CultureInfo.InvariantCulture);
        // Encrypted length may differ after editing a scalar's stored type. Compare both tails.
        var offsets = Enumerable.Range(0, Math.Max(original.Length, prepared.Length)).Where(i => i >= original.Length || i >= prepared.Length || original[i] != prepared[i]).ToArray();
        output = prepared;
        current = new(token, hash, target);
        return new(token, hash, target, before, result, offsets, operations);
    }

    internal static byte[] Commit(byte[] original, Trainer9aConfirmation confirmation)
    {
        if (current is null || output is null || confirmation != current) throw new ArgumentException("Trainer9a preview is missing or replaced.");
        if (Br4Editing.Hash(original) != current.SourceHash) throw new ArgumentException("Trainer9a preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Trainer9a frozen output verification failed.");
        var result = output.ToArray();
        Reset();
        return result;
    }

    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

public static partial class SaveService
{
    public static string ReadTrainer9a(byte[] data) => JsonSerializer.Serialize(Trainer9aEditing.Read(Open(data), Br4Editing.Hash(data)), SaveJsonContext.Default.Trainer9aCatalog);
    public static string PreviewTrainer9a(byte[] data, string json)
    {
        Trainer9aSession.Reset();
        if (json.Length > 4 * 1024 * 1024) throw new ArgumentException("Trainer9a request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Trainer9aRequest) ?? throw new ArgumentException("Missing Trainer9a request.");
        var source = Open(data) as SAV9ZA ?? throw new ArgumentException("Trainer9a save is unrecognized.");
        return JsonSerializer.Serialize(Trainer9aSession.Prepare(source, data, request), SaveJsonContext.Default.Trainer9aTicket);
    }
    public static byte[] CommitTrainer9a(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Trainer9a confirmation is too large.");
        return Trainer9aSession.Commit(data, JsonSerializer.Deserialize(json, SaveJsonContext.Default.Trainer9aConfirmation) ?? throw new ArgumentException("Missing Trainer9a confirmation."));
    }
    public static void DiscardTrainer9a(string token) => Trainer9aSession.Discard(token);
}

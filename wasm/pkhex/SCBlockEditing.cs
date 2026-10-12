// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record SCBlockQuery(string Names = "", string[]? Exclusions = null, string Filter = "", int Offset = 0, int Limit = 50, string? Selected = null);
public sealed record SCBlockEntry(string Key, string Hint, string? Name, string Type, string SubType, int Bytes, string? Value, string FileName, bool CanToggle);
public sealed record SCBlockPage(string SourceHash, string Format, bool CanEdit, int Total, int Offset, SCBlockEntry[] Blocks, SCBlockEntry? Selected, string? Data);
public sealed record SCBlockFile([property: JsonRequired] string FileName, [property: JsonRequired] string Data);
public sealed record SCBlockAction([property: JsonRequired] string Kind, string? Key = null, string? Type = null, string? Data = null, SCBlockFile[]? Files = null);
public sealed record SCBlockImportResult(int Index, string FileName, string Key, bool Imported, string? Error);
public sealed record SCBlockDifference(string Key, string Kind, string? BeforeType, string? AfterType, string? BeforeSubType, string? AfterSubType, string? BeforeData, string? AfterData);
public sealed record SCBlockComparison(string PreviousHash, string UpdatedHash, string[] SourceReport, string? SourceReportError, SCBlockDifference[] Blocks);

internal static class SCBlockEditing
{
    internal static bool Supports(SaveFile save) => save is ISCBlockArray;
    internal static ISCBlockArray Storage(SaveFile save) => save as ISCBlockArray ?? throw new ArgumentException("SCBlock tools are unavailable for this save.");
    internal static SaveFile Reopen(SaveFile source, byte[] data) => source switch
    {
        SAV8SWSH => new SAV8SWSH(data.ToArray()), SAV8LA => new SAV8LA(data.ToArray()),
        SAV9SV => new SAV9SV(data.ToArray()), SAV9ZA => new SAV9ZA(data.ToArray()),
        _ => throw new ArgumentException("Unsupported SCBlock save family."),
    };
    private static uint Key(string? text) => text is { Length: 8 } && uint.TryParse(text, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var key) ? key : throw new ArgumentException("Invalid SCBlock key.");
    private static string[] Lines(string text)
    {
        if (text is null || text.Length > 4 * 1024 * 1024) throw new ArgumentException("SCBlock name table is too large.");
        var lines = new List<string>(); using var reader = new StringReader(text);
        while (reader.ReadLine() is { } line) lines.Add(line);
        return lines.ToArray();
    }
    private static SCBlockMetadata Metadata(ISCBlockArray storage, SCBlockQuery query)
    {
        if (query.Exclusions is { } exclusions && (exclusions.Length > 512 || exclusions.Any(x => x is null || x.Length > 32767))) throw new ArgumentException("Invalid SCBlock exclusions.");
        return new(storage.Accessor, Lines(query.Names), query.Exclusions ?? []);
    }
    private static SCBlockEntry Entry(SCBlock block, string hint, SCBlockMetadata metadata) => new(
        block.Key.ToString("X8"), hint, metadata.GetBlockName(block, out _), block.Type.ToString(), block.SubType.ToString(), block.Data.Length,
        block.HasValue() ? Convert.ToString(block.GetValue(), CultureInfo.InvariantCulture) : null,
        SCBlockUtil.GetBlockFileNameWithoutExtension(block) + ".bin", block.Type is SCTypeCode.Bool1 or SCTypeCode.Bool2);
    internal static SCBlockPage Read(SaveFile original, string hash, SCBlockQuery query)
    {
        if (query.Offset < 0 || query.Limit is < 1 or > 200 || query.Filter is null || query.Filter.Length > 32767) throw new ArgumentException("Invalid SCBlock page.");
        bool canEdit = original.State.Exportable && SaveChecksums.Valid(original);
        var storage = Storage(original.Clone()); var metadata = Metadata(storage, query);
        var sorted = metadata.GetSortedBlockKeyList().ToArray();
        var visible = sorted.Where(x => x.Text.Contains(query.Filter, StringComparison.InvariantCultureIgnoreCase)).ToArray();
        SCBlockEntry? selected = null; string? data = null;
        if (query.Selected is { } key) { var block = storage.Accessor.GetBlock(Key(key)); selected = Entry(block, sorted.First(x => (uint)x.Value == block.Key).Text, metadata); data = Convert.ToBase64String(block.Data); }
        return new(hash, original.GetType().Name, canEdit, visible.Length, query.Offset,
            visible.Skip(query.Offset).Take(query.Limit).Select(x => Entry(storage.Accessor.GetBlock(unchecked((uint)x.Value)), x.Text, metadata)).ToArray(), selected, data);
    }
    internal static SCBlockFile Export(SaveFile original, string key)
    {
        var block = Storage(original.Clone()).Accessor.GetBlock(Key(key));
        return new(SCBlockUtil.GetBlockFileNameWithoutExtension(block) + ".bin", Convert.ToBase64String(block.Data));
    }
    internal static SCBlockFile[] ExportFolder(SaveFile original) => Storage(original.Clone()).AllBlocks.Where(b => b.Data.Length != 0).Select(b => new SCBlockFile(SCBlockUtil.GetBlockFileNameWithoutExtension(b) + ".bin", Convert.ToBase64String(b.Data))).ToArray();
    internal static byte[] ExportSingle(SaveFile original, int options)
    {
        if (options is < 0 or > 15) throw new ArgumentException("Invalid SCBlock export options.");
        return SCBlockUtil.ExportAllBlocks(Storage(original.Clone()).Accessor.BlockInfo, (SCBlockExportOption)options);
    }
    private static byte[] Bytes(string? data)
    {
        if (data is null || data.Length > 48 * 1024 * 1024) throw new ArgumentException("SCBlock input is too large.");
        return Convert.FromBase64String(data);
    }
    internal static (byte[] Output, SCBlockImportResult[] Imports) Prepare(SaveFile original, byte[] input, SCBlockAction[] actions)
    {
        if (!original.State.Exportable || !SaveChecksums.Valid(original) || actions is null || actions.Length > 512) throw new ArgumentException("Invalid SCBlock edit source/actions.");
        var copy = original.Clone(); var storage = Storage(copy); var imports = new List<SCBlockImportResult>();
        foreach (var action in actions)
        {
            if (action is null) throw new ArgumentException("Missing SCBlock action.");
            switch (action.Kind)
            {
                case "toggle":
                    if (action.Type is not ("Bool1" or "Bool2")) throw new ArgumentException("Invalid SCBlock Boolean type.");
                    storage.Accessor.GetBlock(Key(action.Key)).ChangeBooleanType(Enum.Parse<SCTypeCode>(action.Type)); break;
                case "import": storage.Accessor.GetBlock(Key(action.Key)).ChangeData(Bytes(action.Data)); break;
                case "folder":
                    if (action.Files is null || action.Files.Length > 50000) throw new ArgumentException("Invalid SCBlock folder.");
                    for (int i = 0; i < action.Files.Length; i++)
                    {
                        var file = action.Files[i];
                        if (file is null || file.FileName is null || file.FileName.Length > 1024 || file.FileName.IndexOfAny(['/', '\\']) >= 0) throw new ArgumentException("Invalid SCBlock file name.");
                        string name = Path.GetFileNameWithoutExtension(file.FileName); int space = name.IndexOf(' '); if (space >= 0) name = name[..space];
                        uint key = Util.GetHexValue(name);
                        try { storage.Accessor.GetBlock(key).ChangeData(Bytes(file.Data)); imports.Add(new(i, file.FileName, key.ToString("X8"), true, null)); }
                        catch (Exception e) when (e is not OutOfMemoryException) { imports.Add(new(i, file.FileName, key.ToString("X8"), false, e.GetType().Name)); }
                    }
                    break;
                default: throw new ArgumentException("Unknown SCBlock action.");
            }
        }
        var output = copy.Write().ToArray();
        var reopened = Reopen(original, output); var blocks = Storage(reopened).AllBlocks;
        if (output.Length != input.Length || !SaveChecksums.Valid(reopened) || reopened.Version != copy.Version || blocks.Count != storage.AllBlocks.Count || blocks.Where((b, i) => b.Key != storage.AllBlocks[i].Key || b.Type != storage.AllBlocks[i].Type || b.SubType != storage.AllBlocks[i].SubType || !b.Data.SequenceEqual(storage.AllBlocks[i].Data)).Any()) throw new InvalidOperationException("SCBlock export verification failed.");
        return (output, imports.ToArray());
    }
    internal static SCBlockComparison Compare(SaveFile previous, SaveFile updated, string previousHash, string updatedHash, string names)
    {
        var first = Storage(previous.Clone()); var second = Storage(updated.Clone()); var extra = Lines(names);
        string[] report; string? error = null;
        try { report = new SCBlockCompare(first.Accessor, second.Accessor, extra).Summary().ToArray(); }
        catch (Exception e) when (e is not OutOfMemoryException) { report = []; error = e.GetType().Name; }
        var a = first.AllBlocks.ToDictionary(b => b.Key); var b = second.AllBlocks.ToDictionary(b => b.Key); var changes = new List<SCBlockDifference>();
        foreach (uint key in a.Keys.Union(b.Keys).Order())
        {
            a.TryGetValue(key, out var old); b.TryGetValue(key, out var next);
            if (old is not null && next is not null && old.Type == next.Type && old.SubType == next.SubType && old.Data.SequenceEqual(next.Data)) continue;
            changes.Add(new(key.ToString("X8"), old is null ? "added" : next is null ? "removed" : "changed", old?.Type.ToString(), next?.Type.ToString(), old?.SubType.ToString(), next?.SubType.ToString(), old is null ? null : Convert.ToBase64String(old.Data), next is null ? null : Convert.ToBase64String(next.Data)));
        }
        return new(previousHash, updatedHash, report, error, changes.ToArray());
    }
}

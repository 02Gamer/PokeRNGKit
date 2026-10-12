// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Text.Json.Serialization;
using System.IO.Compression;

namespace PokeRNGKit.SaveEditor;
public sealed record SCBlockExportQuery([property: JsonRequired] string Kind, string? Key = null, int Options = 9);
public sealed record SCBlockExportResult(string Kind, SCBlockFile[] Files);
public sealed record SCBlockCompareQuery([property: JsonRequired] string Updated, string Names = "");

public static partial class SaveService
{
    public static string ReadSCBlocks(byte[] data, string json)
    {
        if (json.Length > 8 * 1024 * 1024) throw new ArgumentException("SCBlock query is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SCBlockQuery) ?? throw new ArgumentException("Missing SCBlock query.");
        return JsonSerializer.Serialize(SCBlockEditing.Read(Open(data), Br4Editing.Hash(data), query), SaveJsonContext.Default.SCBlockPage);
    }
    public static string ExportSCBlocks(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("SCBlock export query is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SCBlockExportQuery) ?? throw new ArgumentException("Missing SCBlock export query.");
        var source = Open(data);
        SCBlockFile[] files = query.Kind switch {
            "block" => [SCBlockEditing.Export(source, query.Key ?? "")],
            "folder" => [ArchiveSCBlocks(SCBlockEditing.ExportFolder(source))],
            "single" => [new("raw.bin", Convert.ToBase64String(SCBlockEditing.ExportSingle(source, query.Options)))],
            _ => throw new ArgumentException("Unknown SCBlock export kind."),
        };
        return JsonSerializer.Serialize(new SCBlockExportResult(query.Kind, files), SaveJsonContext.Default.SCBlockExportResult);
    }
    internal static SCBlockFile ArchiveSCBlocks(SCBlockFile[] files)
    {
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
            foreach (var file in files)
            {
                var entry = zip.CreateEntry(file.FileName, CompressionLevel.NoCompression);
                entry.LastWriteTime = new(2000, 1, 1, 0, 0, 0, TimeSpan.Zero);
                using var output = entry.Open(); output.Write(Convert.FromBase64String(file.Data));
            }
        return new("blocks.zip", Convert.ToBase64String(stream.ToArray()));
    }
    public static string CompareSCBlocks(byte[] data, string json)
    {
        if (json.Length > 52 * 1024 * 1024) throw new ArgumentException("SCBlock comparison is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SCBlockCompareQuery) ?? throw new ArgumentException("Missing SCBlock comparison.");
        byte[] updated = Convert.FromBase64String(query.Updated);
        var before = Open(data); var after = Open(updated);
        return JsonSerializer.Serialize(SCBlockEditing.Compare(before, after, Br4Editing.Hash(data), Br4Editing.Hash(updated), query.Names), SaveJsonContext.Default.SCBlockComparison);
    }
    public static string PreviewSCBlocks(byte[] data, string json)
    {
        SCBlockSession.Reset();
        if (json.Length > 52 * 1024 * 1024) throw new ArgumentException("SCBlock request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SCBlockRequest) ?? throw new ArgumentException("Missing SCBlock request.");
        return JsonSerializer.Serialize(SCBlockSession.Prepare(data, request), SaveJsonContext.Default.SCBlockTicket);
    }
    public static byte[] CommitSCBlocks(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("SCBlock confirmation is too large.");
        var confirmation = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SCBlockConfirmation) ?? throw new ArgumentException("Missing SCBlock confirmation.");
        return SCBlockSession.Commit(data, confirmation);
    }
    public static void DiscardSCBlocks(string token) => SCBlockSession.Discard(token);
}

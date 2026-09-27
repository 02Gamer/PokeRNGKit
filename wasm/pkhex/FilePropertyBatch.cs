// SPDX-License-Identifier: GPL-3.0-or-later
using System.IO.Compression;
using System.Text;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record FileBatchInput(string Path, byte[] Data);
internal sealed record FileBatchOutcome(int Group, string Result, bool Error);
internal sealed record FileBatchEntry(string Path, string? Format, string Status, int InputSize, int OutputSize, FileBatchOutcome[] Outcomes);
internal sealed record FileBatchSummary(int Groups, int Filters, int Instructions, int ExportedFiles,
    int[] IgnoredLines, bool EmptyValues, FileBatchEntry[] Files);

internal sealed class FileBatchPlan
{
    private readonly byte[] archive;
    private readonly bool needsErrors, needsEmpty, needsIgnored;
    public FileBatchSummary Summary { get; }
    public FileBatchPlan(byte[] archive, FileBatchSummary summary)
    {
        this.archive = archive; Summary = summary;
        needsErrors = summary.Files.Any(f => FilePropertyBatch.IsFailure(f.Status) || f.Outcomes.Any(o => o.Error));
        needsEmpty = summary.EmptyValues; needsIgnored = summary.IgnoredLines.Length != 0;
    }
    public byte[] Export(bool allowErrors = false, bool allowEmpty = false, bool allowIgnored = false)
    {
        if (archive.Length == 0) throw new ArgumentException("File batch has no exportable results.");
        if ((needsErrors && !allowErrors) || (needsEmpty && !allowEmpty) || (needsIgnored && !allowIgnored))
            throw new ArgumentException("File batch confirmation is required.");
        // The archive is frozen during preview: random instructions never run twice.
        return archive.ToArray();
    }
}

internal static class FilePropertyBatch
{
    public const int MaximumFiles = 10_000;
    public const long MaximumInputBytes = 64L * 1024 * 1024;
    public const long MaximumOutcomes = 1_000_000;
    public const int MaximumInstructionCharacters = 1_000_000;
    public const int MaximumPathCharacters = 4 * 1024 * 1024;
    public static bool IsFailure(string status) => status is "unrecognized" or "formatConflict" or "invalid" or "exportFailed";

    private sealed class Entry(FileBatchInput input, string path)
    {
        public readonly string Path = path;
        public readonly int InputSize = input.Data.Length;
        public PKM? Pokemon;
        public SlotCache? Slot;
        public string Status = "ready";
        public byte[]? Output;
        public readonly List<FileBatchOutcome> Outcomes = [];
    }

    public static FileBatchPlan Preview(byte[] contextData, FileBatchInput[] files, string text, string language)
    {
        var context = SaveUtil.GetSaveFile(contextData.ToArray()) ?? throw new ArgumentException("File batch context is unsupported.");
        if (files is null || files.Length == 0 || files.Length > MaximumFiles ||
            files.Any(f => f is null || f.Data is null) || files.Sum(f => (long)f.Data.Length) > MaximumInputBytes ||
            files.Sum(f => (long)(f.Path?.Length ?? 0)) > MaximumPathCharacters ||
            text is null || text.Length > MaximumInstructionCharacters)
            throw new ArgumentException("File batch input exceeds preview limits.");
        var commands = PropertyBatchCommands.Parse(text, language);
        if ((long)files.Length * commands.Sets.Length > MaximumOutcomes)
            throw new ArgumentException("File batch input exceeds preview limits.");
        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var entries = files.Select(f => new Entry(f, SafePath(f.Path))).ToArray();
        foreach (var entry in entries)
            if (!paths.Add(entry.Path)) throw new ArgumentException("File batch paths collide.");
        // Prevent a file from also serving as a parent directory in the exported archive.
        foreach (var path in paths)
            for (int slash = path.IndexOf('/'); slash >= 0; slash = path.IndexOf('/', slash + 1))
                if (paths.Contains(path[..slash])) throw new ArgumentException("File batch paths collide.");

        for (int i = 0; i < entries.Length; i++)
        {
            var entry = entries[i];
            if (!EntityDetection.IsSizePlausible(files[i].Data.Length)) { entry.Status = "unrecognized"; continue; }
            try
            {
                var extension = System.IO.Path.GetExtension(entry.Path).ToLowerInvariant();
                if (!PokemonFiles.TryRead(files[i].Data, extension, context, out var pk)) { entry.Status = "unrecognized"; continue; }
                entry.Pokemon = pk;
                if (PokemonFiles.HasFormatConflict(extension, pk)) { entry.Status = "formatConflict"; continue; }
                if (!pk.Valid) { entry.Status = "invalid"; continue; }
                if (pk.Species == 0) { entry.Status = "empty"; continue; }
                entry.Slot = new SlotCache(new SlotInfoFileSingle(entry.Path), pk);
            }
            catch (Exception e) when (e is not OutOfMemoryException) { entry.Status = "unrecognized"; }
        }

        var priorStrings = GameInfo.Strings;
        try
        {
            GameInfo.Strings = GameInfo.GetStrings(language == "zh" ? "zh-Hans" : language);
            for (int group = 0; group < commands.Sets.Length; group++)
            {
                var set = commands.Sets[group];
                EntityBatchEditor.ScreenStrings(set.Filters); EntityBatchEditor.ScreenStrings(set.Instructions);
                bool IsMeta(StringInstruction f) => BatchFilters.FilterMeta.Any(m => m.IsMatch(f.PropertyName));
                var meta = set.Filters.Where(IsMeta).ToArray(); var filters = set.Filters.Where(f => !IsMeta(f)).ToArray();
                foreach (var entry in entries)
                {
                    if (entry.Slot is null || entry.Status == "exportFailed") continue;
                    var pk = entry.Pokemon!;
                    if (pk.Species == 0) { entry.Outcomes.Add(new(group, "empty", false)); continue; }
                    if (!pk.Valid) { entry.Outcomes.Add(new(group, "invalid", true)); continue; }
                    if (!EntityBatchEditor.IsFilterMatchMeta(meta, entry.Slot)) { entry.Outcomes.Add(new(group, "filtered", false)); continue; }
                    if (set.Instructions.Count == 0)
                    {
                        entry.Outcomes.Add(new(group, BatchEditingUtil.IsFilterMatch(filters, pk) ? "matched" : "filtered", false));
                        continue;
                    }
                    var result = EntityBatchEditor.Instance.TryModify(pk, filters, set.Instructions);
                    bool error = result.HasFlag(ModifyResult.Error); result &= ~ModifyResult.Error;
                    if (result != ModifyResult.Modified)
                    {
                        entry.Outcomes.Add(new(group, result == ModifyResult.Filtered ? "filtered" : "skipped", error));
                        continue;
                    }
                    try
                    {
                        pk.RefreshChecksum(); pk.ForcePartyData();
                        var output = new byte[pk.SIZE_PARTY]; pk.WriteDecryptedDataParty(output);
                        if (!FileUtil.TryGetPKM(output.ToArray(), out var reopened, "." + pk.Extension, context) ||
                            reopened.GetType() != pk.GetType() || !reopened.Valid)
                            throw new InvalidOperationException("File batch export could not reopen.");
                        var check = new byte[reopened.SIZE_PARTY]; reopened.WriteDecryptedDataParty(check);
                        if (!output.SequenceEqual(check)) throw new InvalidOperationException("File batch export content changed.");
                        entry.Output = output;
                        entry.Outcomes.Add(new(group, "modified", error));
                    }
                    catch (Exception e) when (e is not OutOfMemoryException)
                    {
                        entry.Output = null; entry.Status = "exportFailed";
                        entry.Outcomes.Add(new(group, "exportFailed", true));
                    }
                }
            }
        }
        finally { GameInfo.Strings = priorStrings; }

        foreach (var entry in entries.Where(e => e.Status == "ready"))
            entry.Status = entry.Output is null ? "notExported" : "exported";
        var summary = new FileBatchSummary(commands.Sets.Length, commands.Sets.Sum(s => s.Filters.Count),
            commands.Sets.Sum(s => s.Instructions.Count), entries.Count(e => e.Output is not null),
            commands.IgnoredLines, commands.EmptyValues, entries.Select(e => new FileBatchEntry(e.Path,
                e.Pokemon?.GetType().Name, e.Status, e.InputSize, e.Output?.Length ?? 0, e.Outcomes.ToArray())).ToArray());
        if (summary.ExportedFiles == 0) return new([], summary);
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
            foreach (var entry in entries.Where(e => e.Output is not null))
            {
                var item = zip.CreateEntry(entry.Path, CompressionLevel.NoCompression);
                item.LastWriteTime = new DateTimeOffset(2000, 1, 1, 0, 0, 0, TimeSpan.Zero);
                using var destination = item.Open(); destination.Write(entry.Output!);
            }
        return new(stream.ToArray(), summary);
    }

    internal static string SafePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("File batch path is invalid.");
        var normalized = path.Replace('\\', '/').Normalize(NormalizationForm.FormC);
        if (Encoding.UTF8.GetByteCount(normalized) > ushort.MaxValue) throw new ArgumentException("File batch path is too long.");
        foreach (string part in normalized.Split('/'))
        {
            if (part.Length == 0 || part is "." or ".." || part.EndsWith(' ') || part.EndsWith('.') ||
                part.Any(c => char.IsControl(c) || "<>:\"|?*".Contains(c))) throw new ArgumentException("File batch path is invalid.");
            string name = part.Split('.')[0].TrimEnd(' ').ToUpperInvariant();
            if (name is "CON" or "PRN" or "AUX" or "NUL" ||
                (name.Length == 4 && (name.StartsWith("COM") || name.StartsWith("LPT")) && name[3] is >= '1' and <= '9'))
                throw new ArgumentException("File batch path is reserved.");
        }
        return normalized;
    }
}

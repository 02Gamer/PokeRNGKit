// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record BoxImportFileResult(int File, string Path, string Status, int Entities);
internal sealed record BoxImportSource(int File, int Entry);
internal sealed record BoxImportDecoded(PKM[] Entities, BoxImportSource[] Sources, BoxImportFileResult[] Files);
internal sealed class BoxImportFilePlan(BoxImportPlan plan, BoxImportDecoded decoded)
{
    public BoxImportSummary Summary => plan.Summary;
    public BoxImportSource[] Sources { get; } = decoded.Sources;
    public BoxImportFileResult[] Files { get; } = decoded.Files;
    private readonly bool needsFileConfirmation = decoded.Files.Any(f => f.Status != "ready");

    public byte[] Commit(byte[] source, bool allowClear, bool allowOverwrite, bool allowSkipped)
    {
        if (needsFileConfirmation && !allowSkipped)
            throw new ArgumentException("Box import file errors require confirmation.");
        return plan.Commit(source, allowClear, allowOverwrite, allowSkipped);
    }
}

internal static class BoxImportFiles
{
    private static readonly HashSet<string> EntityExtensions = new(EntityFileExtension.GetExtensions(), StringComparer.OrdinalIgnoreCase);

    public static BoxImportFilePlan Prepare(byte[] input, FileBatchInput[] files, int firstBox, bool clear, bool overwrite, EntityImportSettings settings)
    {
        var decoded = Decode(input, files);
        var plan = BoxImportPreview.Prepare(input, decoded.Entities, firstBox, clear, overwrite, settings);
        return new(plan, decoded);
    }

    public static BoxImportDecoded Decode(byte[] contextData, FileBatchInput[] files)
    {
        if (contextData.Length is 0 or > SaveService.MaximumSize || files is null ||
            files.Length > FilePropertyBatch.MaximumFiles || files.Any(f => f is null || f.Data is null) ||
            files.Sum(f => (long)f.Data.Length) > FilePropertyBatch.MaximumInputBytes ||
            files.Sum(f => (long)(f.Path?.Length ?? 0)) > FilePropertyBatch.MaximumPathCharacters)
            throw new ArgumentException("Box import file input exceeds limits.");
        var context = SaveUtil.GetSaveFile(contextData.ToArray()) ?? throw new ArgumentException("Box import context is unsupported.");
        var paths = files.Select(f => FilePropertyBatch.SafePath(f.Path)).ToArray();
        if (paths.Distinct(StringComparer.OrdinalIgnoreCase).Count() != paths.Length)
            throw new ArgumentException("Box import source paths collide.");
        var entities = new List<PKM>();
        var sources = new List<BoxImportSource>();
        var results = new List<BoxImportFileResult>();
        for (int file = 0; file < files.Length; file++)
        {
            var data = files[file].Data;
            var extension = Path.GetExtension(paths[file]).ToLowerInvariant();
            string status = "ready";
            var expanded = new List<PKM>();
            if (FileUtil.IsFileTooSmall(data.Length) || FileUtil.IsFileTooBig(data.Length)) status = "unrecognized";
            else try
            {
                object? content;
                if (extension.Length > 1 && EntityExtensions.Contains(extension[1..]))
                {
                    // Preserve the explicit PK4/PK5 decrypt-before-detection correction.
                    content = PokemonFiles.TryRead(data, extension, context, out var pk) ? pk : null;
                    if (pk is not null && PokemonFiles.HasFormatConflict(extension, pk)) status = "formatConflict";
                }
                else content = FileUtil.GetSupportedFile(data.ToArray(), extension, context);
                if (status == "ready")
                {
                    IEnumerable<PKM>? items = content switch
                    {
                        PKM p => [p],
                        MysteryGift { IsEntity: true } gift => [gift.ConvertToPKM(context)],
                        IEncounterInfo encounter when encounter.Species != 0 => [encounter.ConvertToPKM(context)],
                        IPokeGroup group => group.Contents,
                        ConcatenatedEntitySet boxes => ReadBoxSlots(boxes, context),
                        IEnumerable<PKM> sequence => sequence,
                        _ => null,
                    };
                    if (items is null) status = content is null ? "unrecognized" : "unsupported";
                    else foreach (var entity in items)
                    {
                        if (entities.Count + expanded.Count >= FilePropertyBatch.MaximumFiles)
                            throw new ImportExpansionLimitException();
                        expanded.Add(entity.Clone());
                    }
                    if (items is not null && expanded.Count == 0) status = "empty";
                }
            }
            catch (ImportExpansionLimitException) { throw new ArgumentException("Box import expanded entity count exceeds limits."); }
            catch (Exception e) when (e is not OutOfMemoryException)
            {
                // A damaged group must not silently contribute only its successfully decoded prefix.
                expanded.Clear(); status = "decodeFailed";
            }
            for (int entry = 0; entry < expanded.Count; entry++)
            {
                entities.Add(expanded[entry]); sources.Add(new(file, entry));
            }
            results.Add(new(file, paths[file], status, expanded.Count));
        }
        return new(entities.ToArray(), sources.ToArray(), results.ToArray());
    }

    private sealed class ImportExpansionLimitException : Exception;

    private static IEnumerable<PKM> ReadBoxSlots(ConcatenatedEntitySet boxes, SaveFile context)
    {
        // This is entity expansion. Exact PC-layout replacement is a separate operation.
        for (int i = 0; i < boxes.Count; i++)
            yield return context.GetStoredSlot(boxes.Data.Span.Slice(i * boxes.SlotSize, boxes.SlotSize));
    }
}

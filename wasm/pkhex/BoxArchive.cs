// SPDX-License-Identifier: GPL-3.0-or-later
using System.IO.Compression;
using System.Text;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record BoxArchiveRequest(int Box, bool All, int FolderMode, int FolderNaming, int EmptySlots, int IndexPrefix);

internal static class BoxArchive
{
    // Browser export mirrors Core BoxExport's traversal and serialization without disk writes.
    public static byte[] Export(SaveFile save, BoxArchiveRequest request)
    {
        if (!save.HasBox || save.BoxCount <= 0 || save.BoxSlotCount <= 0 || save.SlotCount > 10000 ||
            (!request.All && (uint)request.Box >= save.BoxCount) ||
            (uint)request.FolderMode > 1 || (uint)request.FolderNaming > 2 ||
            (uint)request.EmptySlots > 1 || (uint)request.IndexPrefix > 3)
            throw new ArgumentException("Box archive options are invalid.");
        var first = request.All ? 0 : request.Box;
        var end = request.All ? save.BoxCount : first + 1;
        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var folders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using var stream = new MemoryStream();
        int written = 0;
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            for (int box = first; box < end; box++)
            {
                string folder = "";
                if (request.FolderMode == 1)
                {
                    var name = save is IBoxDetailNameRead names ? names.GetBoxName(box) : BoxDetailNameExtensions.GetDefaultBoxName(box);
                    folder = Unique(Clean(request.FolderNaming switch
                    {
                        0 => name, 1 => $"{box + 1:00}", _ => $"{box + 1:00} {name}",
                    }), "", folders) + "/";
                    zip.CreateEntry(folder).LastWriteTime = new(2000, 1, 1, 0, 0, 0, TimeSpan.Zero);
                }
                int count = Math.Min(save.BoxSlotCount, save.SlotCount - box * save.BoxSlotCount);
                for (int slot = 0; slot < count; slot++)
                {
                    var pk = save.GetBoxSlotAtIndex(box, slot);
                    if (request.EmptySlots == 0 && (pk.Species == 0 || !pk.Valid)) continue;
                    string name;
                    try { name = EntityFileNamer.GetName(pk); }
                    catch { name = "Name Error"; }
                    string prefix = request.IndexPrefix switch
                    {
                        0 => "", 1 => $"{slot:00} - ", 2 => $"{box * save.BoxSlotCount + slot:0000} - ",
                        _ => $"{box + 1:00}-{slot:00} - ",
                    };
                    var path = Unique(folder + Clean(prefix + name), "." + pk.Extension, paths);
                    // Preserve existing party stats for games whose box slots already contain party data.
                    if (save.SIZE_BOXSLOT != save.SIZE_PARTY) pk.ForcePartyData();
                    var data = new byte[save.SIZE_PARTY];
                    pk.WriteDecryptedDataParty(data);
                    var entry = zip.CreateEntry(path, CompressionLevel.NoCompression);
                    entry.LastWriteTime = new(2000, 1, 1, 0, 0, 0, TimeSpan.Zero);
                    using var output = entry.Open(); output.Write(data); written++;
                }
            }
        }
        if (written == 0) throw new ArgumentException("Box archive contains no eligible Pokemon.");
        return stream.ToArray();
    }

    private static string Unique(string stem, string extension, HashSet<string> used)
    {
        string result = stem + extension;
        for (int i = 2; !used.Add(result); i++) result = $"{stem} ~{i}{extension}";
        return result;
    }

    private static string Clean(string name)
    {
        var clean = new string(name.Normalize(NormalizationForm.FormC).Select(c =>
            char.IsControl(c) || "<>:\"/\\|?*".Contains(c) ? '_' : c).ToArray()).TrimEnd(' ', '.');
        if (clean.Length == 0) clean = "_";
        var device = clean.Split('.')[0].ToUpperInvariant();
        if (device is "CON" or "PRN" or "AUX" or "NUL" ||
            (device.Length == 4 && (device.StartsWith("COM") || device.StartsWith("LPT")) && device[3] is >= '1' and <= '9'))
            clean = "_" + clean;
        return clean;
    }
}

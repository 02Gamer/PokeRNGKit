// SPDX-License-Identifier: GPL-3.0-or-later
using System.IO.Compression;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class BoxArchiveTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        bool rejected = false; try { action(); } catch (ArgumentException) { rejected = true; }
        Check(rejected, "Invalid or empty box archive is rejected");
    }
    private static Dictionary<string, byte[]> Read(byte[] bytes)
    {
        using var stream = new MemoryStream(bytes); using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
        return zip.Entries.Where(e => !e.FullName.EndsWith('/')).ToDictionary(e => e.FullName, e =>
        {
            using var source = e.Open(); using var target = new MemoryStream(); source.CopyTo(target); return target.ToArray();
        });
    }
    public static void Run()
    {
        var defaults = new BoxArchiveRequest(0, false, 1, 2, 0, 3);
        var root = Path.Combine(".tmp", "pkhex-box-export", Guid.NewGuid().ToString("N"));
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var original = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var before = original.ToArray();
            var save = SaveUtil.GetSaveFile(original.ToArray())!;
            var entity = save.GetBoxSlotAtIndex(0, 0);
            Check(entity.Species != 0 && entity.Valid, "Reference fixture has an exportable entity");
            var snapshot = save.Data.ToArray();
            for (int prefix = 0; prefix <= 3; prefix++)
            {
                var request = defaults with { FolderMode = 0, IndexPrefix = prefix };
                var output = Read(BoxArchive.Export(save, request));
                var directory = Path.Combine(root, version, prefix.ToString());
                var count = BoxExport.Export(save, directory, 0, new BoxExportSettings { FileIndexPrefix = (BoxExportIndexPrefix)prefix });
                Check(output.Count == count, "Native and ZIP file counts agree");
                foreach (var path in Directory.EnumerateFiles(directory))
                    Check(output[Path.GetFileName(path)].SequenceEqual(File.ReadAllBytes(path)), "ZIP path and party bytes equal upstream BoxExport");
            }
            Check(save.Data.SequenceEqual(snapshot), "Box export does not change loaded save bytes");
            string json = JsonSerializer.Serialize(defaults, SaveJsonContext.Default.BoxArchiveRequest);
            Check(Read(PokeRNGKit.SaveEditor.Program.ExportBoxes(original, json)).Count > 0 && original.SequenceEqual(before), "Browser API preserves original save bytes");
            var current = Read(BoxArchive.Export(save, defaults));
            var all = Read(BoxArchive.Export(save, defaults with { All = true, Box = -1 }));
            Check(current.All(entry => all[entry.Key].SequenceEqual(entry.Value)), "All boxes contain current-box bytes at identical paths");
            for (int naming = 0; naming <= 2; naming++)
                Check(Read(BoxArchive.Export(save, defaults with { FolderNaming = naming })).Keys.All(k => k.Split('/').Length == 2), "Folder mode preserves a single box directory");
            var included = Read(BoxArchive.Export(save, defaults with { EmptySlots = 1 }));
            Check(included.Count == save.BoxSlotCount, "Including empty slots retains all slot files");
            save.SetBoxSlotAtIndex(entity.Clone(), 0, 1, EntityImportSettings.None);
            var duplicates = Read(BoxArchive.Export(save, defaults with { FolderMode = 0, IndexPrefix = 0 }));
            Check(duplicates.Keys.Any(k => k.Contains(" ~2.")), "Identical entities get separate files without overwriting");
            if (save is IBoxDetailName names)
            {
                names.SetBoxName(0, "CON"); names.SetBoxName(save.BoxCount - 1, "CON");
                var safe = Read(BoxArchive.Export(save, defaults with { All = true, FolderNaming = 0 }));
                Check(safe.Keys.Any(k => k.StartsWith("_CON/")) && safe.Keys.Any(k => k.StartsWith("_CON ~2/")),
                    "Reserved and duplicate box names produce distinct portable folders");
            }
            Reject(() => BoxArchive.Export(save, defaults with { Box = -1 }));
            Reject(() => BoxArchive.Export(save, defaults with { Box = save.BoxCount }));
            Reject(() => BoxArchive.Export(save, defaults with { FolderMode = 2 }));
            Reject(() => BoxArchive.Export(save, defaults with { FolderNaming = -1 }));
            Reject(() => BoxArchive.Export(save, defaults with { EmptySlots = 2 }));
            Reject(() => BoxArchive.Export(save, defaults with { IndexPrefix = 4 }));
            for (int i = 0; i < save.BoxSlotCount; i++) save.SetBoxSlotAtIndex(save.BlankPKM, 0, i, EntityImportSettings.None);
            Reject(() => BoxArchive.Export(save, defaults));
            Console.WriteLine($"PASS {version}: ZIP equals upstream BoxExport for all prefixes; scopes, folders, empty slots, collision retention, input bounds and original preservation");
        }
    }
}

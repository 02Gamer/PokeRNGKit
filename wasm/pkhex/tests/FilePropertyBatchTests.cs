// SPDX-License-Identifier: GPL-3.0-or-later
using System.IO.Compression;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class FilePropertyBatchTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        bool rejected = false; try { action(); } catch (ArgumentException) { rejected = true; }
        Check(rejected, "Unsafe or unconfirmed file batch is rejected");
    }
    private static Dictionary<string, byte[]> Read(byte[] bytes)
    {
        using var stream = new MemoryStream(bytes);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
        return archive.Entries.ToDictionary(e => e.FullName, e =>
        {
            using var input = e.Open(); using var output = new MemoryStream(); input.CopyTo(output); return output.ToArray();
        });
    }
    private static byte[] Stored(PKM p, bool encrypted = false)
    {
        var result = new byte[p.SIZE_STORED];
        if (encrypted) p.WriteEncryptedDataStored(result); else p.WriteDecryptedDataStored(result);
        return result;
    }
    public static void Run()
    {
        var context = File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        var contextBefore = context.ToArray(); var mixed = new List<FileBatchInput>();
        foreach (string version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var seed = save.BlankPKM; seed.Species = 25; seed.Version = Enum.Parse<GameVersion>(version);
            seed.Language = 2; seed.CurrentLevel = 25; seed.IV_HP = 9; seed.RefreshChecksum();
            var file = new FileBatchInput($"root/{version}/same.{seed.Extension}", Stored(seed));
            mixed.Add(file);
            var source = file.Data.ToArray();
            var plan = FilePropertyBatch.Preview(context, [file], ".IV_HP=31\n;\n>Stat_HPMax=0\n.IV_ATK=29", "en");
            Check(plan.Summary.ExportedFiles == 1 && plan.Summary.Files.Single().Outcomes.Length == 2, "Both groups produce one file result");
            var output = Read(plan.Export());
            var expected = seed.Clone(); expected.IV_HP = 31; expected.RefreshChecksum(); expected.ForcePartyData();
            expected.IV_ATK = 29; expected.RefreshChecksum(); expected.ForcePartyData();
            var expectedBytes = new byte[expected.SIZE_PARTY]; expected.WriteDecryptedDataParty(expectedBytes);
            Check(output[file.Path].SequenceEqual(expectedBytes), "ZIP party payload equals independently edited native entity");
            Check(file.Data.SequenceEqual(source), "Preview preserves source file bytes");
            var encrypted = FilePropertyBatch.Preview(context, [file with { Data = Stored(seed, true) }], ".IV_HP=31", "en");
            Check(seed is PK5 ? encrypted.Summary.Files[0].Status == "formatConflict" : encrypted.Summary.ExportedFiles == 1,
                "Encrypted files are processed only when the recognized native format agrees");
            var partial = FilePropertyBatch.Preview(context, [file], ".IV_HP=31\n.UnknownProperty=1", "en");
            Check(partial.Summary.Files[0].Outcomes[0].Error, "Partial failure is visible");
            Reject(() => partial.Export()); Check(Read(partial.Export(allowErrors: true)).Count == 1, "Partial export requires explicit confirmation");
            var filtered = FilePropertyBatch.Preview(context, [file], "!Species=25\n.IV_HP=31", "en");
            Check(filtered.Summary.ExportedFiles == 0 && filtered.Summary.Files[0].Outcomes[0].Result == "filtered", "Unmatched file is not exported");
            Reject(() => filtered.Export());
            var random = FilePropertyBatch.Preview(context, [file], ".IV_HP=$0,31", "en");
            var first = random.Export(); var second = random.Export();
            Check(first.SequenceEqual(second), "Random values and ZIP metadata are frozen at preview");
            first[0] ^= 1; Check(random.Export().SequenceEqual(second), "Caller cannot mutate retained ZIP");
            Console.WriteLine($"PASS {version}: file preview, independent ZIP bytes, sequential party stats, partial confirmation, filtered files and fixed random results");
        }
        var prior = GameInfo.Strings;
        var all = FilePropertyBatch.Preview(context, mixed.ToArray(), ".IV_HP=31", "zh");
        Check(all.Summary.ExportedFiles == 11 && Read(all.Export()).Count == 11, "Mixed native formats and duplicate basenames remain separate");
        Check(ReferenceEquals(prior, GameInfo.Strings), "Active language restored");
        var pick = mixed.First(f => f.Path.Contains("/X/"));
        var detached = pick with { Data = pick.Data.ToArray() };
        var frozen = FilePropertyBatch.Preview(context, [detached], ".IV_HP=31", "en");
        var frozenBytes = frozen.Export(); detached.Data[0] ^= 1;
        Check(frozen.Export().SequenceEqual(frozenBytes), "Changing caller-owned input after preview cannot alter the export");
        // WriteDecryptedDataStored refreshes checksums, so damage the serialized checksum directly.
        var damaged = pick.Data.ToArray(); damaged[6] ^= 1;
        var rejectedFile = FilePropertyBatch.Preview(context, [pick with { Data = damaged }, pick with { Path = "empty.pk6", Data = Stored(new PK6()) }], ".IV_HP=31", "en");
        Check(rejectedFile.Summary.Files[0].Status == "invalid" && rejectedFile.Summary.Files[1].Status == "empty" && rejectedFile.Summary.ExportedFiles == 0, "Invalid and empty entities cannot be repaired implicitly by editing");
        foreach (var language in new[] { "zh", "en", "ja" })
        {
            var strings = GameInfo.GetStrings(language == "zh" ? "zh-Hans" : language);
            var plan = FilePropertyBatch.Preview(context, [pick], $"=Species={strings.specieslist[25]}\n.Move1={strings.movelist[33]}", language);
            Check(plan.Summary.ExportedFiles == 1, "Three-language names screen correctly");
        }
        var withErrors = FilePropertyBatch.Preview(context, [pick, new("root/readme.txt", [1, 2, 3])], ".Nickname=\nunknown line", "en");
        Check(withErrors.Summary.EmptyValues && withErrors.Summary.IgnoredLines.SequenceEqual(new[] { 2 }) && withErrors.Summary.Files[1].Status == "unrecognized", "Empty, ignored lines and unrecognized file reported separately");
        Reject(() => withErrors.Export()); Reject(() => withErrors.Export(true)); Reject(() => withErrors.Export(true, true));
        Check(Read(withErrors.Export(true, true, true)).Count == 1, "All relevant confirmations required");
        var match = FilePropertyBatch.Preview(context, [pick], "=Species=25", "en");
        Check(match.Summary.ExportedFiles == 0 && match.Summary.Files[0].Outcomes[0].Result == "matched", "Filter-only preview does not export");
        var pathFilter = FilePropertyBatch.Preview(context, mixed.ToArray(), "=IdentifierContains=root/X/\n.Slot=1\n.IV_HP=31", "en");
        Check(pathFilter.Summary.ExportedFiles == 1 && pathFilter.Summary.Files.Single(f => f.Status == "exported").Path == pick.Path, "Metadata selects relative directory");
        // The unsupported Slot assignment deliberately proves that partial metadata mistakes are visible.
        Reject(() => pathFilter.Export());
        var foreign = mixed.First(f => f.Path.Contains("/B/"));
        var pk5 = (PK5)EntityFormat.GetFromBytes(foreign.Data.ToArray())!;
        var conflict = FilePropertyBatch.Preview(context, [new(foreign.Path, Stored(pk5, true)), pick], ".IV_HP=31", "en");
        Check(conflict.Summary.Files[0].Status == "formatConflict" && conflict.Summary.ExportedFiles == 1, "Encrypted PK5 cannot silently become PK4");
        Reject(() => conflict.Export()); Check(Read(conflict.Export(true)).Count == 1, "Conflicting source excluded from partial archive");
        var badOutput = FilePropertyBatch.Preview(context, [pick], $".IV_HP=31\n;\n.Version={(int)GameVersion.SN}", "en");
        Check(badOutput.Summary.ExportedFiles == 0 && badOutput.Summary.Files[0].Status == "exportFailed", "Output format drift rejects that file including prior intermediate output");
        Reject(() => badOutput.Export(true));
        foreach (string path in new[] { "../a.pk6", "/a.pk6", "C:/a.pk6", "a//b.pk6", "a/./b.pk6", "a/CON.pk6", "a/file. ", "a/x:y.pk6", "a/COM1.pk6" })
            Reject(() => FilePropertyBatch.Preview(context, [pick with { Path = path }], ".IV_HP=31", "en"));
        foreach (var paths in new[] { new[] { "A.pk6", "a.pk6" }, new[] { "é.pk6", "e\u0301.pk6" }, new[] { "a", "a/b.pk6" } })
            Reject(() => FilePropertyBatch.Preview(context, paths.Select(path => pick with { Path = path }).ToArray(), ".IV_HP=31", "en"));
        var unicode = FilePropertyBatch.Preview(context, [pick with { Path = "宝可梦\\箱子\\皮卡丘.pk6" }], ".IV_HP=31", "ja");
        Check(Read(unicode.Export()).ContainsKey("宝可梦/箱子/皮卡丘.pk6"), "Unicode paths and separators preserved in portable ZIP");
        Reject(() => FilePropertyBatch.Preview(context, [], ".IV_HP=31", "en"));
        Reject(() => FilePropertyBatch.Preview(context, Enumerable.Repeat(pick, FilePropertyBatch.MaximumFiles + 1).ToArray(), ".IV_HP=31", "en"));
        Reject(() => FilePropertyBatch.Preview(context, Enumerable.Repeat(new FileBatchInput("large", new byte[65536]), 1025).ToArray(), ".IV_HP=31", "en"));
        Reject(() => FilePropertyBatch.Preview(context, Enumerable.Repeat(pick, 10000).ToArray(), string.Join("\n;\n", Enumerable.Repeat(".IV_HP=31", 101)), "en"));
        Reject(() => FilePropertyBatch.Preview(context, [pick], new string('x', FilePropertyBatch.MaximumInstructionCharacters + 1), "en"));
        Reject(() => FilePropertyBatch.Preview(context, Enumerable.Repeat(pick with { Path = new string('x', 500) }, 9000).ToArray(), ".IV_HP=31", "en"));
        foreach (string text in new[] { "", ".IV_HP=31\n\n.IV_ATK=31", "=Species=\n.IV_HP=31" })
            Reject(() => FilePropertyBatch.Preview(context, [pick], text, "en"));
        Check(context.SequenceEqual(contextBefore) && ReferenceEquals(prior, GameInfo.Strings), "All file previews preserve save context and restore language");
        Console.WriteLine("PASS file preview: mixed directory, three languages, independent confirmations, PK5 ambiguity, output drift, safe paths and bounded input");
    }
}

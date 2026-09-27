// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

// Upstream semantics required by the future property-batch preview and result UI.
// This suite does not expose a product endpoint or mutate a user save.
internal static class PropertyBatchContractTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static StringInstructionSet[] Parse(string text)
    {
        Check(!StringInstructionSet.HasEmptyLine(text), "Valid instruction text has no blank lines");
        return StringInstructionSet.GetBatchSets(text.AsSpan());
    }
    private static ModifyResult Run(PKM pk, string text)
    {
        var set = Parse(text).Single();
        EntityBatchEditor.ScreenStrings(set.Filters);
        EntityBatchEditor.ScreenStrings(set.Instructions);
        return EntityBatchEditor.Instance.TryModify(pk, set.Filters, set.Instructions);
    }
    public static void Run()
    {
        foreach (string version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            byte[] input = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var original = input.ToArray();
            var save = SaveUtil.GetSaveFile(input.ToArray())!;
            var seed = save.BlankPKM;
            seed.Species = 25; seed.Version = save.Version; seed.Language = 2;
            seed.CurrentLevel = 25; seed.IV_HP = 9; seed.IV_ATK = 17;
            seed.EV_HP = 10; seed.EV_ATK = 20; seed.Nickname = "TEST"; seed.RefreshChecksum();
            var p = seed.Clone();
            Check(Run(p, "=Species=25\n.IV_HP=31") == ModifyResult.Modified && p.IV_HP == 31, "Equality filter and assignment");
            p = seed.Clone();
            Check(Run(p, "!Species=25\n.IV_HP=31") == ModifyResult.Filtered && p.Data.SequenceEqual(seed.Data), "Filtered entities remain byte-identical");
            p = seed.Clone();
            Check(Run(p, "≥EV_HP=10\n≤EV_ATK=20\n+EV_HP=5\n*EV_HP=2\n-EV_HP=4\n/EV_HP=2\n%EV_HP=10") == ModifyResult.Modified && p.EV_HP == 3, "Ordered arithmetic and inclusive filters");
            p = seed.Clone();
            Check(Run(p, ".IV_HP=*IV_ATK") == ModifyResult.Modified && p.IV_HP == 17, "Property reference assignment");
            p = seed.Clone();
            Check(Run(p, ".EV_HP=3\n«EV_HP=2\n|EV_HP=1\n&EV_HP=7\n^EV_HP=3\n»EV_HP=1") == ModifyResult.Modified && p.EV_HP == 3, "Bitwise operators use Core syntax");
            p = seed.Clone();
            var result = Run(p, ".IV_HP=31\n.NotAnExistingProperty=1\n.EV_HP=7");
            Check(result == (ModifyResult.Modified | ModifyResult.Error) && p.IV_HP == 31 && p.EV_HP == 7, "Partial failure still applies both successful instructions");
            p = seed.Clone();
            result = Run(p, "/EV_HP=0\n.IV_HP=31");
            Check(result == (ModifyResult.Modified | ModifyResult.Error) && p.EV_HP == 10 && p.IV_HP == 31, "Division failure does not roll back following instructions");
            p = seed.Clone();
            Check(Run(p, ".Nickname=") == ModifyResult.Modified && p.Nickname.Length == 0, "Empty assignment is permitted after explicit UI confirmation");
            var sets = Parse("=Species=25\n.IV_HP=30\n;\n=IV_HP=30\n.IV_ATK=29");
            Check(sets.Length == 2, "Semicolon separates two groups");
            p = seed.Clone();
            var processor = new EntityBatchProcessor();
            foreach (var set in sets) Check(processor.Process(p, set.Filters, set.Instructions), "Sequential groups observe earlier mutations");
            Check(p.IV_HP == 30 && p.IV_ATK == 29 && p.ChecksumValid, "Processor refreshes checksum after successful group");
            p = seed.Clone();
            var meta = new SlotCache(new SlotInfoBox(1, 2, save), p, save);
            var filters = Parse("=Box=2\n=Slot=3\n.IV_HP=31")[0].Filters;
            Check(EntityBatchEditor.IsFilterMatchMeta(filters, meta), "Box and slot metadata are one-based");
            Check(!EntityBatchEditor.IsFilterMatchMeta(Parse("=Box=1\n.IV_HP=31")[0].Filters, meta), "Different box metadata is filtered");
            Check(!BatchEditingUtil.IsFilterMatch(filters, p), "Meta filters must be separated before entity filtering");
            var party = new SlotCache(new SlotInfoParty(2), p, save);
            Check(EntityBatchEditor.IsFilterMatchMeta(Parse("=Slot=3\n.IV_HP=31")[0].Filters, party), "Party slot filter is one-based");
            Check(!EntityBatchEditor.IsFilterMatchMeta(filters, party), "Party has no box metadata");
            var properties = EntityBatchEditor.Instance;
            Check(properties.TryGetHasProperty(p, "IV_HP", out var property) && property.CanWrite && property.CanRead, "Reflection catalog exposes read/write entity fields");
            foreach (string lang in new[] { "zh-Hans", "en", "ja" })
            {
                var prior = GameInfo.Strings;
                try
                {
                    GameInfo.Strings = GameInfo.GetStrings(lang);
                    p = seed.Clone();
                    Check(Run(p, $"=Species={GameInfo.Strings.specieslist[25]}\n.Move1={GameInfo.Strings.movelist[33]}") == ModifyResult.Modified && p.Move1 == 33, "Active-language name screening");
                }
                finally { GameInfo.Strings = prior; }
            }
            Check(input.SequenceEqual(original), "Contract checks preserve source bytes");
            Console.WriteLine($"PASS {version}: property batch filters, operators, references, partial failures, sequential groups, metadata and three-language names");
        }
        Check(StringInstructionSet.HasEmptyLine(".IV_HP=31\n\n.EV_HP=10"), "Blank lines are invalid in desktop editor");
        Check(Parse("=Species=25").Single().Instructions.Count == 0, "Filter-only text is preview-only");
        Check(Parse("=Species=\n.IV_HP=31").Single().Filters.Any(f => string.IsNullOrWhiteSpace(f.PropertyValue)), "Desktop editor must reject empty filter values");
        Check(Parse(".IV_HP=31\nunsupported line").Single().Instructions.Count == 1, "Core silently ignores unrecognized lines; UI must expose parsed counts");
        Console.WriteLine("PASS property batch parser: blank lines, filter-only preview, empty filters and ignored lines");
    }
}

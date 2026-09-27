// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using Api = PokeRNGKit.SaveEditor.Program;

internal static class StandaloneRawTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; } catch (JsonException) { return; }
        throw new Exception("Expected independent advanced operation rejection");
    }
    private static string Json(StandalonePokemonRequest request) => JsonSerializer.Serialize(request, StandalonePokemonJson.Default.StandalonePokemonRequest);
    public static void Run()
    {
        var samples = new List<PKM>();
        foreach (var version in new[] {"E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD"})
            samples.Add(SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!.GetBoxSlotAtIndex(0, 0));
        foreach (PKM p in new PKM[] {new CK3 {Version = GameVersion.CXD}, new XK3 {Version = GameVersion.CXD}, new BK4 {Version = GameVersion.D}, new PB7 {Version = GameVersion.GP}, new PK8 {Version = GameVersion.SW}, new PA8 {Version = GameVersion.PLA}, new PK9 {Version = GameVersion.SL}, new PA9 {Version = GameVersion.ZA}})
        {
            p.Species = 25; p.Language = 2; p.PID = 12345; p.CurrentLevel = 25; p.Nickname = "TEST"; p.OriginalTrainerName = "TEST"; samples.Add(p);
        }
        foreach (var source in samples)
        {
            foreach (bool party in new[] {false, true})
            foreach (bool encrypted in new[] {false, true}) Exercise(source, party, encrypted);
            Console.WriteLine($"PASS {source.GetType().Name}: independent advanced edits, catalogs, four input modes, health, bounds and original");
        }
        // Form counters must use actual serialization width, never a caller's fictitious slot.
        foreach (bool party in new[] {false, true})
        {
            var p = new PK6 {Species = 676, Form = 1, Version = GameVersion.X, Language = 2, CurrentLevel = 25};
            var data = new byte[party ? p.SIZE_PARTY : p.SIZE_STORED];
            if (party) p.WriteDecryptedDataParty(data); else p.WriteDecryptedDataStored(data);
            var edit = new PokemonRawEdit(party ? 55 : -1, 999, "formArgument", FormArgument: party ? new(Remain: 5, Elapsed: 3) : new(Maximum: 3));
            var result = StandalonePokemon.Open(StandalonePokemon.EditRaw(data, "test.pk6", edit), "test.pk6").Entity;
            var argument = (IFormArgument)result;
            Check(argument.FormArgumentMaximum == 3 && (!party || argument.FormArgumentElapsed == 3), "Actual file shape controls Furfrou timers");
        }
        foreach (PKM p in new PKM[] {new PK1 {Species = 25}, new PK2 {Species = 25}})
        {
            var input = new byte[p.SIZE_STORED]; p.WriteDecryptedDataStored(input);
            Reject(() => StandalonePokemon.EditRaw(input, "test." + p.Extension, new(0, 0, "values", 1)));
        }
    }
    private static void Exercise(PKM source, bool party, bool encrypted)
    {
        var p = source.Clone(); p.ResetPartyStats(); p.Stat_HPCurrent = 1; p.Status_Condition = 8; p.RefreshChecksum();
        var bytes = new byte[party ? p.SIZE_PARTY : p.SIZE_STORED];
        if (party) { if (encrypted) p.WriteEncryptedDataParty(bytes); else p.WriteDecryptedDataParty(bytes); }
        else { if (encrypted) p.WriteEncryptedDataStored(bytes); else p.WriteDecryptedDataStored(bytes); }
        var original = bytes.ToArray(); var name = "entity." + p.Extension;
        var opened = StandalonePokemon.Open(bytes, name, encrypted); var before = opened.Entity;
        var request = new StandalonePokemonRequest(name, encrypted);
        PKM Apply(PokemonRawEdit edit)
        {
            var output = Api.EditStandalonePokemonRaw(bytes, Json(request with {Raw = edit}));
            Check(output.Length == bytes.Length, "Edit retains file shape");
            var actual = StandalonePokemon.Open(output, name).Entity;
            Check(actual.GetType() == p.GetType() && actual.ChecksumValid && actual.Species == before.Species && actual.OriginalTrainerName == before.OriginalTrainerName, "Re-opened format and unrelated identity remain intact");
            if (opened.Party) Check(actual.Stat_HPCurrent == before.Stat_HPCurrent && actual.Status_Condition == before.Status_Condition, "Party HP and status preserved");
            Check(bytes.SequenceEqual(original), "Advanced edits preserve original input");
            return actual;
        }
        foreach (uint pid in new uint[] {0, 0xABCDEF01, uint.MaxValue})
        {
            var result = Apply(new(99, 999, "values", pid, p.Format >= 6 ? pid ^ 0x12345678 : null));
            Check(result.PID == pid && result.EncryptionConstant == (p.Format >= 6 ? pid ^ 0x12345678 : pid), "PID/EC boundary roundtrip");
        }
        Check(Apply(new(0, 0, "rerollPid")).Gender == before.GetSaneGender(), "PID reroll keeps sane gender");
        if (p.Format >= 6) Apply(new(0, 0, "rerollEc"));
        var encounter = PokemonEncounter.Read(before);
        var met = Apply(new(0, 0, "encounter", Encounter: new(encounter.MaxMetLevel, !before.FatefulEncounter, encounter.CanDates ? "2099-12-31" : null, encounter.CanDates ? "2000-01-01" : null)));
        Check(met.MetLevel == encounter.MaxMetLevel && met.FatefulEncounter != before.FatefulEncounter, "Encounter fields and packed gender boundary");
        if (encounter.CanDates) Check(met.MetDate == new DateOnly(2099, 12, 31) && met.EggMetDate == new DateOnly(2000, 1, 1), "Dates available across every supported generation 4+ entity");
        Reject(() => Api.EditStandalonePokemonRaw(bytes, Json(request with {Raw = new(0, 0, "encounter", Encounter: new(encounter.MaxMetLevel + 1))})));
        var training = PokemonTraining.Read(before);
        if (training.CanEditContest)
        {
            int[] values = [1, 2, 3, 4, 5, 255];
            Check(PokemonTraining.Read(Apply(new(0, 0, "training", Training: new(Contest: values)))).Contest!.SequenceEqual(values), "Contest stats stored exactly");
        }
        if (training.Hyper is not null)
        {
            bool[] flags = [true, false, true, false, true, false];
            Check(PokemonTraining.Read(Apply(new(0, 0, "training", Training: new(Hyper: flags)))).Hyper!.SequenceEqual(flags), "Hyper-training stat order");
        }
        if (p.Format >= 6)
        {
            var care = Apply(new(0, 0, "care", Care: new([new("originalFriendship", 255)])));
            Check(care.OriginalTrainerFriendship == 255, "Care edit applies to original trainer");
            if (care is PB7 letsGo)
            {
                Span<ushort> expected = stackalloc ushort[6]; letsGo.LoadStats(letsGo.PersonalInfo, expected);
                Check(letsGo.Stat_CP == letsGo.CalcCP && letsGo.Stat_ATK == expected[1], "Let's Go friendship updates stats and CP");
            }
            Check(Apply(new(0, 0, "history", History: new(Handler: 0))).CurrentHandler == 0, "History handler roundtrip");
        }
        foreach (string shiny in new[] {"square", "star", "off"})
        {
            var actual = Apply(new(0, 0, "shiny", Shiny: new("sid", shiny)));
            Check(actual.IsShiny == (shiny != "off") && (shiny == "off" || actual.ShinyXor == (shiny == "square" ? 0 : 1)), "Exact shiny SID mode");
        }
        var pidShiny = Apply(new(0, 0, "shiny", Shiny: new("pid", "star")));
        Check(pidShiny.ShinyXor == 1 && pidShiny.Gender == before.Gender && pidShiny.Nature == before.Nature, "Shiny PID retains nature and gender");
        var ribbons = PokemonRibbons.Read(before);
        if (ribbons.Entries.FirstOrDefault() is {} ribbon)
            Check(PokemonRibbons.Read(Apply(new(0, 0, "ribbons", Ribbons: new([new(ribbon.Key, ribbon.Max)])))).Entries.Single(e => e.Key == ribbon.Key).Value == ribbon.Max, "Ribbon value roundtrip");
        if (PokemonRelearn.Supported(p))
            Check(Apply(new(0, 0, "relearn", Relearn: new([85, 0, 0, 0]))).RelearnMove1 == 85, "Relearn move roundtrip");
        if (p is ITrainerMemories)
        {
            Apply(new(0, 0, "memory", Memory: new(0, 0, 0, 0, 0)));
            Reject(() => Api.ReadStandalonePokemonAdvanced(bytes, Json(request with {ReadKind = "memory", Handler = 2})));
        }
        foreach (string kind in new[] {"ribbons", "history", "memory", "relearn"})
        {
            if (kind == "history" && p.Format < 6 || kind == "memory" && p is not ITrainerMemories || kind == "relearn" && !PokemonRelearn.Supported(p)) continue;
            var analysis = new LegalityAnalysis(before);
            if (kind == "relearn" && !analysis.Parsed) { Reject(() => Api.ReadStandalonePokemonAdvanced(bytes, Json(request with {ReadKind = kind}))); continue; }
            var catalog = JsonSerializer.Deserialize(Api.ReadStandalonePokemonAdvanced(bytes, Json(request with {ReadKind = kind})), StandalonePokemonJson.Default.StandaloneAdvancedData)!;
            if (kind == "ribbons") Check(catalog.Ribbons!.Entries.Length == ribbons.Entries.Length, "JSON ribbon catalog retains all properties");
            if (kind == "history") Check(catalog.History!.Holder.Original == before.OriginalTrainerName, "JSON history uses entity");
            if (kind == "memory") Check(catalog.Memory!.Memories.Length == PokemonMemories.Read(before, 0).Memories.Length, "JSON memory choices preserved");
            if (kind == "relearn") { ushort[] moves = new ushort[4]; analysis.GetSuggestedRelearnMoves(moves); Check(catalog.Relearn!.SequenceEqual(moves), "Independent relearn suggestion matches Core"); }
        }
        foreach (string unsupported in new[] {"egg", "origin", "invalid"}) Reject(() => Api.EditStandalonePokemonRaw(bytes, Json(request with {Raw = new(0, 0, unsupported)})));
        Reject(() => Api.EditStandalonePokemonRaw(bytes, Json(request)));
        Reject(() => Api.ReadStandalonePokemonAdvanced(bytes, Json(request with {ReadKind = "invalid"})));
        Check(bytes.SequenceEqual(original), "Catalog reads and failed requests preserve input");
    }
}

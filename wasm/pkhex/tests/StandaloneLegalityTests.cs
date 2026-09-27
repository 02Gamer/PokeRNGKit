// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using Api = PokeRNGKit.SaveEditor.Program;

internal static class StandaloneLegalityTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static PokemonLegalityReport Analyze(byte[] data, string name, bool encrypted) =>
        JsonSerializer.Deserialize(Api.AnalyzeStandalonePokemon(data,
            JsonSerializer.Serialize(new StandalonePokemonRequest(name, encrypted), StandalonePokemonJson.Default.StandalonePokemonRequest)), StandalonePokemonJson.Default.PokemonLegalityReport)!;
    private static void Compare(byte[] data, string name, bool encrypted)
    {
        var before = data.ToArray();
        var file = StandalonePokemon.Open(data, name, encrypted);
        var reference = new LegalityAnalysis(file.Entity, StorageSlotType.None);
        var report = Analyze(data, name, encrypted);
        Check(report.Box == (file.Party ? -1 : 0) && report.Slot == 0, "Report address matches the displayed entity");
        Check(report.Parsed == reference.Parsed && report.Valid == (reference.Parsed && reference.Valid), "Independent entity context matches Core");
        Check(report.Summary.Zh == reference.Report("zh-Hans") && report.Summary.En == reference.Report("en") && report.Summary.Ja == reference.Report("ja"), "All summary translations match Core");
        Check(report.Details.Zh == reference.Report("zh-Hans", true) && report.Details.En == reference.Report("en", true) && report.Details.Ja == reference.Report("ja", true), "All detailed translations match Core");
        Check(data.SequenceEqual(before), "Analysis does not modify the input");
    }
    public static void Run()
    {
        foreach (var (name, valid) in new[] {("legal-shedinja.pk3", true), ("illegal-shedinja.pk3", false)})
        {
            var data = File.ReadAllBytes("third_party/pkhex/legality-fixtures/" + name);
            var report = Analyze(data, name, false);
            Check(report.Parsed && report.Valid == valid, "Known upstream legal/illegal fixture result");
            Compare(data, name, false);
            Check(report.Summary.Zh != report.Summary.En && report.Summary.Ja != report.Summary.En, "Localized reports available");
            var p = StandalonePokemon.Open(data, name).Entity;
            p.ForcePartyData(); var party = new byte[p.SIZE_PARTY]; p.WriteDecryptedDataParty(party);
            Compare(party, name, false);
            var damaged = data.ToArray(); damaged[0x1C] ^= 1;
            try { Analyze(damaged, name, false); throw new Exception("Bad checksum accepted"); } catch (ArgumentException) { }
        }
        var samples = new List<PKM>();
        foreach (var version in new[] {"E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD"})
            samples.Add(SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!.GetBoxSlotAtIndex(0, 0));
        foreach (PKM p in new PKM[] {new PK1(), new PK2(), new CK3 {Version = GameVersion.CXD}, new XK3 {Version = GameVersion.CXD}, new BK4 {Version = GameVersion.D}, new PB7 {Version = GameVersion.GP}, new PK8 {Version = GameVersion.SW}, new PA8 {Version = GameVersion.PLA}, new PK9 {Version = GameVersion.SL}, new PA9 {Version = GameVersion.ZA}})
        {
            p.Species = 25; p.Language = 2; p.PID = 12345; p.CurrentLevel = 25; p.Nickname = "TEST"; p.OriginalTrainerName = "TEST";
            p.ResetPartyStats(); p.RefreshChecksum(); samples.Add(p);
        }
        foreach (var p in samples)
        foreach (bool party in new[] {false, true})
        foreach (bool encrypted in new[] {false, true})
        {
            var input = new byte[party ? p.SIZE_PARTY : p.SIZE_STORED];
            if (party) { if (encrypted) p.WriteEncryptedDataParty(input); else p.WriteDecryptedDataParty(input); }
            else { if (encrypted) p.WriteEncryptedDataStored(input); else p.WriteDecryptedDataStored(input); }
            Compare(input, "entity." + p.Extension, encrypted);
        }
        Console.WriteLine("PASS standalone legality: known legal/illegal fixtures, 16 entity types, all layouts, three-language Core parity, checksum rejection and original preservation");
    }
}

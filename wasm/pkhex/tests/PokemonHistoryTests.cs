using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonHistoryTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid trainer history accepted"); }
    private static void Set(IGeoTrack g, GeoValue v)
    {
        byte c = (byte)v.Country, r = c == 0 ? (byte)0 : (byte)v.Region;
        switch (v.Index)
        {
            case 0: g.Geo1_Country = c; g.Geo1_Region = r; break;
            case 1: g.Geo2_Country = c; g.Geo2_Region = r; break;
            case 2: g.Geo3_Country = c; g.Geo3_Region = r; break;
            case 3: g.Geo4_Country = c; g.Geo4_Region = r; break;
            case 4: g.Geo5_Country = c; g.Geo5_Region = r; break;
        }
    }
    public static void Run()
    {
        var reference = PokemonHistory.Read(new PK6()).Geo!;
        foreach (var language in new[] { "zh-Hans", "en", "ja" })
        {
            string Name(LocalizedText v) => language == "zh-Hans" ? v.Zh : language == "en" ? v.En : v.Ja;
            foreach (var c in Util.GetCountryRegionList("countries", language))
                Require(reference.Countries.Single(v => v.Id == c.Value).Name is var n && Name(n) == c.Text, "Country translations and IDs");
            foreach (var group in reference.Regions.Where(r => r.Country != 0))
            {
                var expected = Util.GetCountryRegionList($"sr_{group.Country:000}", language);
                Require(group.Choices.Length == expected.Count, "Region catalog size");
                foreach (var c in expected) Require(Name(group.Choices.Single(v => v.Id == c.Value).Name) == c.Text, "Region translation and ID");
            }
        }
        foreach (var version in new[] { "X", "OR", "SN", "US", "BD" })
        {
            var fixture = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var p = fixture.GetPartySlotAtIndex(0);
            p.HandlingTrainerName = "OTHER"; p.CurrentHandler = 0;
            p.OriginalTrainerFriendship = 37; p.HandlingTrainerFriendship = 91;
            p.Stat_HPCurrent = Math.Max(1, p.Stat_HPMax / 2); p.Status_Condition = 8;
            if (p is IGeoTrack g) for (int i = 0; i < 5; i++) Set(g, new(i, 1, i + 1));
            p.RefreshChecksum();
            fixture.SetPartySlotAtIndex(p, 0, EntityImportSettings.None); fixture.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray(); var original = data.ToArray(); var before = SaveUtil.GetSaveFile(data.ToArray())!;
            foreach (var box in new[] { -1, 0 })
            {
                var source = PokemonEditing.Read(before, box, 0);
                var catalog = JsonSerializer.Deserialize(SaveService.ReadHistory(data, JsonSerializer.Serialize(new PokemonPosition(box, 0), SaveJsonContext.Default.PokemonPosition)), SaveJsonContext.Default.HistoryCatalog)!;
                Require(data.SequenceEqual(original) && catalog.Holder.Current == 0 && catalog.Holder.Handling == "OTHER", "Read-only history");
                var requests = new List<HistoryEdit> { new(Handler: 0), new(Handler: 1) };
                if (catalog.Geo is { } geo)
                {
                    Require(geo.Entries.All(e => e.CanEdit) && geo.Entries.Length == 5, "Five editable residences");
                    int lastRegion = geo.Regions.Single(r => r.Country == 1).Choices.Max(c => c.Id);
                    requests.Add(new(Locations: Enumerable.Range(0,5).Select(i => new GeoValue(i, 1, lastRegion)).ToArray()));
                    requests.Add(new(Locations: [new(2, 0, 255)]));
                    requests.Add(new(Locations: Enumerable.Range(0,5).Select(i => new GeoValue(i, 0, 0)).ToArray()));
                    requests.Add(new(Handler: 1, Locations: [new(4, 1, lastRegion)]));
                }
                else Reject(() => PokemonHistory.Apply(source.Clone(), new(Locations: [new(0,0,0)])));
                foreach (var edit in requests)
                {
                    var request = new PokemonRawEdit(box, 0, "history", History: edit);
                    var output = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                    var after = SaveUtil.GetSaveFile(output.ToArray())!; var actual = PokemonEditing.Read(after, box, 0);
                    var expected = source.Clone();
                    if (edit.Handler is int h) expected.CurrentHandler = (byte)h;
                    if (edit.Locations is { } values) foreach (var v in values) Set((IGeoTrack)expected, v);
                    expected.RefreshChecksum();
                    Require(actual.Data.SequenceEqual(expected.Data), $"{version}/{box}: history-only full payload");
                    Require(actual.CurrentFriendship == (actual.CurrentHandler == 0 ? 37 : 91), "Current friendship follows selected holder");
                    Require(actual.Stat_HPCurrent == source.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "Health");
                    Require(after.ChecksumsValid && actual.ChecksumValid && data.SequenceEqual(original), "Checksums and original");
                    for (int b = 0; b < before.BoxCount; b++) for (int slot = 0; slot < before.BoxSlotCount; slot++)
                        if (b != box || slot != 0) Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other boxes");
                    if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Other party");
                }
            }
            Console.WriteLine($"PASS {version}: trainer holder, residence history, catalogs and full payload preservation");
        }
        var untraded = new PK6 { Species = 25, Version = GameVersion.X, Geo3_Country = 1, Geo3_Region = 4 };
        Require(PokemonHistory.Read(untraded).Geo!.Entries.Skip(1).All(e => !e.CanEdit), "Untraded country choices disabled");
        Reject(() => PokemonHistory.Apply(untraded.Clone(), new(Handler: 1)));
        Reject(() => PokemonHistory.Apply(untraded.Clone(), new(Locations: [new(2, 1, 1)])));
        PokemonHistory.Apply(untraded, new(Locations: [new(2, 0, 255)]));
        Require(untraded.Geo3_Country == 0 && untraded.Geo3_Region == 0, "Clear label works for disabled residence");
        untraded.HandlingTrainerName = "OTHER";
        foreach (var invalid in new GeoValue[] { new(-1,1,1),new(5,1,1),new(0,-1,0),new(0,256,0),new(0,1,-1),new(0,1,256),new(0,2,0),new(0,1,255) })
            Reject(() => PokemonHistory.Apply(untraded.Clone(), new(Locations: [invalid])));
        Reject(() => PokemonHistory.Apply(untraded.Clone(), new(Locations: [new(0,0,0),new(0,1,1)])));
        Reject(() => PokemonHistory.Apply(untraded.Clone(), new(Handler: 2)));
        Reject(() => PokemonHistory.Apply(untraded.Clone(), new()));
        Reject(() => PokemonHistory.Read(new PK3()));
        var eight = new PK8 { HandlingTrainerName = "OTHER", OriginalTrainerFriendship = 37, HandlingTrainerFriendship = 91 };
        PokemonHistory.Apply(eight, new(Handler: 1));
        Require(eight.CurrentHandler == 1 && eight.CurrentFriendship == 91 && PokemonHistory.Read(eight).Geo is null, "PK8 holder and absent geo");
    }
}

using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonRibbonTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Invalid ribbon operation accepted");
    }
    private static void CompareCatalog(PKM p)
    {
        var actual = PokemonRibbons.Read(p);
        var upstream = RibbonInfo.GetRibbonInfo(p);
        Require(actual.Entries.Select(r => r.Key).Order().SequenceEqual(upstream.Select(r => r.Name).Order()), $"{p.GetType().Name}: complete upstream field set");
        foreach (var r in upstream)
        {
            var a = actual.Entries.Single(e => e.Key == r.Name);
            Require(a.Max == (r.Type == RibbonValueType.Boolean ? 1 : r.MaxCount), "Upstream count bounds");
            Require(a.Value == (r.Type == RibbonValueType.Boolean ? (r.HasRibbon ? 1 : 0) : r.RibbonCount), "Upstream current value");
            Require(!string.IsNullOrEmpty(a.Name.Zh) && !string.IsNullOrEmpty(a.Name.En) && !string.IsNullOrEmpty(a.Name.Ja), "Three localized names");
        }
    }
    public static void Run()
    {
        foreach (var p in new PKM[] { new PK3(), new CK3(), new XK3(), new PK4(), new BK4(), new RK4(), new PK5(), new PK6(), new PK7(), new PB7(), new PK8(), new PB8(), new PA8(), new PK9(), new PA9() })
        {
            CompareCatalog(p);
            var catalog = PokemonRibbons.Read(p);
            if (p is IRibbonSetAffixed a)
            {
                foreach (var index in new[] { -1, 0, (int)AffixedRibbon.Max })
                {
                    PokemonRibbons.Apply(p, new([], index));
                    Require(a.AffixedRibbon == index, "Affixed range includes none and final entry");
                }
                Reject(() => PokemonRibbons.Apply(p, new([], -2)));
                Reject(() => PokemonRibbons.Apply(p, new([], AffixedRibbon.Max + 1)));
            }
            else Reject(() => PokemonRibbons.Apply(p, new([], 0)));
            foreach (var r in catalog.Entries)
            {
                Reject(() => PokemonRibbons.Apply(p, new([new(r.Key, -1)])));
                Reject(() => PokemonRibbons.Apply(p, new([new(r.Key, r.Max + 1)])));
            }
            Reject(() => PokemonRibbons.Apply(p, new([new("Species", 1)])));
            Reject(() => PokemonRibbons.Apply(p, new([new("RibbonUnknown", 1)])));
            Reject(() => PokemonRibbons.Apply(p, new(null!)));
        }
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var fixture = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var party = fixture.GetPartySlotAtIndex(0);
            party.Stat_HPCurrent = Math.Max(1, party.Stat_HPMax / 2);
            party.Status_Condition = 8;
            party.RefreshChecksum();
            fixture.SetPartySlotAtIndex(party, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray();
            var original = data.ToArray();
            var before = SaveUtil.GetSaveFile(data.ToArray())!;
            foreach (var box in new[] { -1, 0 })
            {
                var source = PokemonEditing.Read(before, box, 0);
                var catalog = PokemonRibbons.Read(source);
                var readJson = SaveService.ReadRibbons(data, JsonSerializer.Serialize(new PokemonPosition(box, 0), SaveJsonContext.Default.PokemonPosition));
                Require(JsonSerializer.Deserialize(readJson, SaveJsonContext.Default.RibbonCatalog)!.Entries.Length == catalog.Entries.Length && data.SequenceEqual(original), "Read-only catalog service");
                foreach (var filled in new[] { true, false })
                {
                    var values = catalog.Entries.Select(r => new RibbonValue(r.Key, filled ? r.Max : 0)).ToArray();
                    int? affixed = source is IRibbonSetAffixed ? (filled ? 0 : -1) : null;
                    var request = new PokemonRawEdit(box, 0, "ribbons", Ribbons: new(values, affixed));
                    var output = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                    var after = SaveUtil.GetSaveFile(output.ToArray())!;
                    var actual = PokemonEditing.Read(after, box, 0);
                    var expected = source.Clone();
                    foreach (var r in values)
                    {
                        var property = expected.GetType().GetProperty(r.Key)!;
                        property.SetValue(expected, property.PropertyType == typeof(bool) ? (object)(r.Value != 0) : (byte)r.Value);
                    }
                    if (affixed is int index) ((IRibbonSetAffixed)expected).AffixedRibbon = (sbyte)index;
                    expected.RefreshChecksum();
                    Require(actual.Data.SequenceEqual(expected.Data), $"{version}/{box}: exact upstream ribbon payload");
                    Require(after.ChecksumsValid && actual.ChecksumValid && data.SequenceEqual(original), "Checksums and original");
                    CompareCatalog(actual);
                    for (var b = 0; b < before.BoxCount; b++)
                        for (var slot = 0; slot < before.BoxSlotCount; slot++)
                            if (b != box || slot != 0)
                                Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other box slots");
                    if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Other party slot");
                }
                var first = catalog.Entries[0];
                Reject(() => PokemonRibbons.Apply(source.Clone(), new([new(first.Key, 0), new(first.Key, 1)])));
            }
            Console.WriteLine($"PASS {version}: ribbon catalog, bounds, fill/clear roundtrip and full payload preservation");
        }
    }
}

using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonOriginTests
{
    private static SaveFile Open(byte[] bytes) => SaveUtil.GetSaveFile(bytes.ToArray())!;
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Invalid origin option accepted");
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var fixture = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            var wounded = fixture.GetPartySlotAtIndex(0);
            wounded.Stat_HPCurrent = Math.Max(1, wounded.Stat_HPMax / 2);
            wounded.Status_Condition = 8;
            wounded.RefreshChecksum();
            fixture.SetPartySlotAtIndex(wounded, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray();
            var original = data.ToArray();
            var before = Open(data);
            foreach (var box in new[] { -1, 0 })
            {
                var p = PokemonEditing.Read(before, box, 0);
                var originalPayload = p.Data.ToArray();
                var catalogJson = SaveService.ReadOrigin(data, JsonSerializer.Serialize(new OriginQuery(box, 0), SaveJsonContext.Default.OriginQuery));
                var catalog = JsonSerializer.Deserialize(catalogJson, SaveJsonContext.Default.OriginCatalog)!;
                Require(catalog.Version == (int)p.Version && catalog.Games.Length > 0 && catalog.MetLocations.Length > 0, "Catalog context");
                Require(catalog.EggLocations.Length > 0 == (p.Format >= 4), "Egg locations by format");
                foreach (var list in new[] { catalog.Games, catalog.Balls, catalog.MetLocations, catalog.EggLocations })
                    Require(list.Select(c => c.Id).Distinct().Count() == list.Length && list.All(c => c.Name.Zh.Length > 0 && c.Name.En.Length > 0 && c.Name.Ja.Length > 0), "Unique localized IDs");
                Require(p.Data.SequenceEqual(originalPayload) && data.SequenceEqual(original), "Read-only query");
                var different = catalog.Games.First(c => c.Id != 0 && c.Id != (int)p.Version).Id;
                var other = PokemonOrigin.Catalog(before, new(box, 0, different));
                Require(other.Version == different && p.Data.SequenceEqual(originalPayload), "Preview game without editing");
                var edits = new[] {
                    new OriginEdit(Version: different),
                    new OriginEdit(Ball: catalog.Balls.Last().Id),
                    new OriginEdit(MetLocation: catalog.MetLocations.Last().Id),
                    new OriginEdit(Version: different, Ball: other.Balls.First().Id, MetLocation: other.MetLocations.First().Id,
                        EggLocation: p.Format >= 4 ? other.EggLocations.First().Id : null),
                    new OriginEdit(EggLocation: p.Format >= 4 ? catalog.EggLocations.Last().Id : null, Ball: catalog.Balls.First().Id),
                };
                foreach (var edit in edits)
                {
                    var request = new PokemonRawEdit(box, 0, "origin", Origin: edit);
                    var output = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                    var after = Open(output);
                    var actual = PokemonEditing.Read(after, box, 0);
                    Require((int)actual.Version == (edit.Version ?? (int)p.Version) && actual.Ball == (edit.Ball ?? p.Ball) &&
                        actual.MetLocation == (edit.MetLocation ?? p.MetLocation) && actual.EggLocation == (edit.EggLocation ?? p.EggLocation), "Origin fields persisted");
                    Require(actual.PID == p.PID && actual.MetLevel == p.MetLevel && actual.OriginalTrainerGender == p.OriginalTrainerGender &&
                        actual.MetDate == p.MetDate && actual.EggMetDate == p.EggMetDate && actual.IsEgg == p.IsEgg, "Unchanged encounter and identity");
                    Require(actual.Stat_HPCurrent == p.Stat_HPCurrent && actual.Status_Condition == p.Status_Condition, "Health preserved");
                    Require(after.ChecksumsValid && actual.ChecksumValid && after.PartyCount == before.PartyCount && data.SequenceEqual(original), "Checksums and original");
                    for (var b = 0; b < before.BoxCount; b++)
                        for (var slot = 0; slot < before.BoxSlotCount; slot++)
                            if (b != box || slot != 0)
                                Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other storage preserved");
                    if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Party preserved");
                }
                foreach (var invalid in new[] { new OriginEdit(), new(Version: -1), new(Version: 256), new(Ball: 256), new(MetLocation: 65536), new(EggLocation: -1) })
                    Reject(() => PokemonOrigin.Apply(before, p.Clone(), invalid));
                if (p.Format == 3) Reject(() => PokemonOrigin.Apply(before, p.Clone(), new(EggLocation: 0)));
            }
            Console.WriteLine($"PASS {version}: origin catalog, preview, edits, boundaries and data preservation");
        }
        var bd = Open(File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav"));
        var transferred = PokemonOrigin.Catalog(bd, new(0, 0, (int)GameVersion.X));
        Require(transferred.MetLocations.Any(c => c.Id == Locations.Default8bNone) && transferred.EggLocations.Any(c => c.Id == Locations.Default8bNone), "BDSP none location retained for older origin");
        var save4 = Open(File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav"));
        var pk4 = save4.GetBoxSlotAtIndex(0,0);
        pk4.Version = GameVersion.D;
        ((IGroundTile)pk4).GroundTile = GroundTileType.Grass;
        PokemonOrigin.Apply(save4, pk4, new(Version: (int)GameVersion.E));
        Require(((IGroundTile)pk4).GroundTile == GroundTileType.None, "Non-Gen4 origin clears ground tile");
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using Api = PokeRNGKit.SaveEditor.Program;

internal static class StandaloneOriginTests
{
    private static void Check(bool ok, string message) { if (!ok) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Expected invalid standalone origin rejection");
    }
    private static string Json(StandalonePokemonRequest request) => JsonSerializer.Serialize(request, StandalonePokemonJson.Default.StandalonePokemonRequest);
    public static void Run()
    {
        PKM[] samples = [new PK3 {Version = GameVersion.E}, new CK3 {Version = GameVersion.CXD}, new XK3 {Version = GameVersion.CXD},
            new PK4 {Version = GameVersion.D}, new BK4 {Version = GameVersion.D}, new PK5 {Version = GameVersion.B},
            new PK6 {Version = GameVersion.X}, new PK7 {Version = GameVersion.SN}, new PB7 {Version = GameVersion.GP},
            new PK8 {Version = GameVersion.SW}, new PB8 {Version = GameVersion.BD}, new PA8 {Version = GameVersion.PLA},
            new PK9 {Version = GameVersion.SL}, new PA9 {Version = GameVersion.ZA}];
        foreach (var p in samples)
        {
            p.Species = 25; p.Language = 2; p.PID = 12345; p.CurrentLevel = 25; p.OriginalTrainerName = "TEST";
            p.ResetPartyStats(); p.Stat_HPCurrent = 1; p.Status_Condition = 8;
            if (p is IGroundTile ground) ground.GroundTile = GroundTileType.Grass;
            foreach (bool party in new[] {false, true})
            foreach (bool encrypted in new[] {false, true}) Exercise(p, party, encrypted);
            Console.WriteLine($"PASS {p.GetType().Name}: independent origin catalogs, previews, all allowed games, ball/location limits, four layouts, full entity parity and original");
        }
        var unlisted = new PK6 {Species = 25, Version = (GameVersion)255, Ball = 255, MetLocation = 65535, EggLocation = 65535, Language = 2};
        Exercise(unlisted, false, false, true);
        Console.WriteLine("PASS unlisted existing origin values: contextual catalog fallback, unchanged raw values and explicit edits");
        var ambiguous = new PK5 {Species = 25, Version = GameVersion.D, Language = 2};
        var bytes = new byte[ambiguous.SIZE_STORED]; ambiguous.WriteDecryptedDataStored(bytes);
        Reject(() => StandalonePokemon.Inspect(bytes, "edited.pk5"));
        Check(StandalonePokemon.Inspect(bytes, "edited.pk5", useFileFormat: true).Format == "PK5", "Explicit mode retains file type when origin defeats auto-detection");
        var explicitRequest = new StandalonePokemonRequest("edited.pk5", UseFileFormat: true, Raw: new(0, 0, "origin", Origin: new(Ball: 4)));
        var edited = Api.EditStandalonePokemonRaw(bytes, Json(explicitRequest));
        foreach (bool party in new[] {false, true})
        foreach (bool encrypted in new[] {false, true})
        {
            var exported = Api.ExportStandalonePokemon(edited, Json(explicitRequest with {Party = party, Encrypted = encrypted}));
            var reopened = JsonSerializer.Deserialize(Api.InspectStandalonePokemon(exported, Json(explicitRequest with {InputEncrypted = encrypted})), StandalonePokemonJson.Default.StandalonePokemonReport)!;
            Check(reopened.Format == "PK5" && reopened.Party == party && reopened.Pokemon.Origin.Ball == 4, "Ambiguous edited file exports and reopens through all public API layouts");
        }
        _ = Api.AnalyzeStandalonePokemon(edited, Json(explicitRequest));
        _ = Api.ReadStandalonePokemonAdvanced(edited, Json(explicitRequest with {ReadKind = "origin"}));
        Reject(() => StandalonePokemon.Open(bytes[..^1], "edited.pk5", useFileFormat: true));
        Reject(() => StandalonePokemon.Open(bytes, "edited.unknown", useFileFormat: true));
        Reject(() => StandalonePokemon.Open(bytes, "edited.pk3", useFileFormat: true));
        bytes[8] ^= 1;
        Reject(() => StandalonePokemon.Open(bytes, "edited.pk5", useFileFormat: true));
        Console.WriteLine("PASS explicit format: heuristic conflict requires opt-in; unknown extension, wrong width and invalid checksum rejected");
    }
    private static void Exercise(PKM p, bool party, bool encrypted, bool useFileFormat = false)
    {
        var input = new byte[party ? p.SIZE_PARTY : p.SIZE_STORED];
        if (party) { if (encrypted) p.WriteEncryptedDataParty(input); else p.WriteDecryptedDataParty(input); }
        else { if (encrypted) p.WriteEncryptedDataStored(input); else p.WriteDecryptedDataStored(input); }
        var original = input.ToArray(); var fileName = "origin." + p.Extension;
        var before = StandalonePokemon.Open(input, fileName, encrypted, useFileFormat).Entity;
        var request = new StandalonePokemonRequest(fileName, encrypted, ReadKind: "origin", UseFileFormat: useFileFormat);
        var explicitReport = JsonSerializer.Deserialize(Api.InspectStandalonePokemon(input, Json(request with {UseFileFormat = true})), StandalonePokemonJson.Default.StandalonePokemonReport)!;
        Check(explicitReport.Format == p.GetType().Name, "Explicit format reads all supported representations");
        OriginCatalog Read(int? version = null)
        {
            var value = Api.ReadStandalonePokemonAdvanced(input, Json(request with {Version = version}));
            return JsonSerializer.Deserialize(value, StandalonePokemonJson.Default.StandaloneAdvancedData)!.Origin!;
        }
        void Apply(OriginEdit edit)
        {
            var output = Api.EditStandalonePokemonRaw(input, Json(request with {Raw = new(123, 456, "origin", Origin: edit)}));
            var actual = StandalonePokemon.Open(output, fileName, useFileFormat: true).Entity;
            var expected = before.Clone();
            // BK4.Clone uses a party-sized internal buffer even for stored files. The
            // independent stored-file workflow preserves its original header flag.
            if (expected is BK4 battle && before is BK4 originalBattle) battle.Sanity = originalBattle.Sanity;
            if (edit.Version is int version && version != (int)expected.Version)
            {
                expected.Version = (GameVersion)version;
                if (expected is IGroundTile ground && !expected.Gen4) ground.GroundTile = GroundTileType.None;
            }
            if (edit.Ball is int ball) expected.Ball = (byte)ball;
            if (edit.MetLocation is int met) expected.MetLocation = (ushort)met;
            if (edit.EggLocation is int egg) expected.EggLocation = (ushort)egg;
            expected.RefreshChecksum();
            Check(output.Length == input.Length && actual.ChecksumValid && actual.Data.SequenceEqual(expected.Data),
                $"Full entity parity {p.GetType().Name} party={party} encrypted={encrypted} edit={edit}; differences=" +
                string.Join(',', Enumerable.Range(0, expected.Data.Length).Where(i => expected.Data[i] != actual.Data[i]).Select(i => $"{i:X}:{expected.Data[i]:X2}/{actual.Data[i]:X2}")));
            Check(input.SequenceEqual(original), "Original file is immutable");
        }
        var catalog = Read();
        var source = new GameDataSource(GameInfo.GetStrings("en"));
        if (GameUtil.GetMetLocationVersionGroup(before.Version) == GameVersion.Invalid)
            Check(catalog.MetLocations.Select(c => c.Id).Order().SequenceEqual(source.Met.GetLocationList(before.Context.GetSingleGameVersion(), before.Context).Select(c => c.Value).Distinct().Order()), "Unknown origin uses a concrete context game, not a grouping enum");
        var allowed = GameUtil.GetVersionsWithinRange(before, before.Context).ToHashSet();
        var expectedGames = source.VersionDataSource.Where(c => (c.Value == 0 || allowed.Contains((GameVersion)c.Value)) && FitsVersion(c.Value)).Select(c => c.Value).Distinct().Order().ToArray();
        Check(catalog.Games.Select(c => c.Id).Order().SequenceEqual(expectedGames), "Complete Core entity game range");
        var expectedBalls = source.BallDataSource.Where(c => c.Value <= before.MaxBallID && FitsBall(c.Value)).Select(c => c.Value).Distinct().Order();
        Check(catalog.Balls.Select(c => c.Id).Order().SequenceEqual(expectedBalls), "Complete Core entity ball range");
        foreach (var list in new[] {catalog.Games, catalog.Balls, catalog.MetLocations, catalog.EggLocations})
            Check(list.Select(c => c.Id).Distinct().Count() == list.Length && list.All(c => c.Name.Zh.Length > 0 && c.Name.En.Length > 0 && c.Name.Ja.Length > 0), "Unique trilingual origin choices");
        foreach (var game in catalog.Games)
        {
            var preview = Read(game.Id);
            Check(preview.Version == game.Id, "Origin preview identifies chosen game");
            var version = (GameVersion)game.Id;
            if (GameUtil.GetMetLocationVersionGroup(version) == GameVersion.Invalid) version = before.Context.GetSingleGameVersion();
            var max = before is PK3 ? byte.MaxValue : ushort.MaxValue;
            Check(preview.MetLocations.Select(c => c.Id).Order().SequenceEqual(source.Met.GetLocationList(version, before.Context).Where(c => c.Value >= 0 && c.Value <= max).Select(c => c.Value).Distinct().Order()), "Core met location list");
            if (before.Format >= 4) Check(preview.EggLocations.Select(c => c.Id).Order().SequenceEqual(source.Met.GetLocationList(version, before.Context, true).Select(c => c.Value).Distinct().Order()), "Core egg location list");
            Apply(new(Version: game.Id));
        }
        Apply(new(Ball: catalog.Balls.First().Id)); Apply(new(Ball: catalog.Balls.Last().Id));
        Apply(new(MetLocation: catalog.MetLocations.First().Id)); Apply(new(MetLocation: catalog.MetLocations.Last().Id));
        if (before.Format >= 4) { Apply(new(EggLocation: catalog.EggLocations.First().Id)); Apply(new(EggLocation: catalog.EggLocations.Last().Id)); }
        else Reject(() => Api.EditStandalonePokemonRaw(input, Json(request with {Raw = new(0, 0, "origin", Origin: new(EggLocation: 0))})));
        Apply(new(Version: (int)before.Version, Ball: before.Ball, MetLocation: before.MetLocation, EggLocation: before.Format >= 4 ? before.EggLocation : null));
        foreach (var edit in new OriginEdit[] {new(), new(Version: -1), new(Version: 256), new(Ball: -1), new(Ball: 256), new(MetLocation: -1), new(MetLocation: 65536), new(EggLocation: -1), new(EggLocation: 65536)})
            Reject(() => Api.EditStandalonePokemonRaw(input, Json(request with {Raw = new(0, 0, "origin", Origin: edit)})));
        Reject(() => Read(-1)); Reject(() => Read(256));
        Check(input.SequenceEqual(original), "Preview and rejected requests preserve file");
        bool FitsVersion(int value) { var copy = before.Clone(); copy.Version = (GameVersion)value; return (int)copy.Version == value; }
        bool FitsBall(int value) { var copy = before.Clone(); copy.Ball = (byte)value; return copy.Ball == value; }
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using Api = PokeRNGKit.SaveEditor.Program;

internal static class StandaloneEggTests
{
    private static void Check(bool ok, string message) { if (!ok) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Expected entity egg rejection"); }
    private static string Json(StandalonePokemonRequest r) => JsonSerializer.Serialize(r, StandalonePokemonJson.Default.StandalonePokemonRequest);
    public static void Run()
    {
        PKM[] samples = [new PK3 {Version = GameVersion.E}, new CK3 {Version = GameVersion.CXD}, new XK3 {Version = GameVersion.CXD},
            new PK4 {Version = GameVersion.D}, new BK4 {Version = GameVersion.D}, new PK5 {Version = GameVersion.B},
            new PK6 {Version = GameVersion.X}, new PK7 {Version = GameVersion.SN}, new PB7 {Version = GameVersion.GP},
            new PK8 {Version = GameVersion.SW}, new PB8 {Version = GameVersion.BD}, new PA8 {Version = GameVersion.PLA},
            new PK9 {Version = GameVersion.SL}, new PA9 {Version = GameVersion.ZA}];
        foreach (var p in samples)
        {
            p.Species = 25; p.Language = 2; p.PID = 12345; p.CurrentLevel = 25; p.OriginalTrainerName = "TEST"; p.TID16 = 123; p.SID16 = 456;
            p.OriginalTrainerFriendship = 70;
            p.ResetPartyStats(); p.Stat_HPCurrent = 1; p.Status_Condition = 8;
            foreach (bool party in new[] {false, true})
            foreach (bool encrypted in new[] {false, true}) Exercise(p, party, encrypted);
            Console.WriteLine($"PASS {p.GetType().Name}: explicit egg context, all target games, traded/untraded creation, cycle bounds, Core hatch output, four layouts and original");
        }
    }
    private static void Exercise(PKM sample, bool party, bool encrypted)
    {
        var bytes = new byte[party ? sample.SIZE_PARTY : sample.SIZE_STORED];
        if (party) { if (encrypted) sample.WriteEncryptedDataParty(bytes); else sample.WriteDecryptedDataParty(bytes); }
        else { if (encrypted) sample.WriteEncryptedDataStored(bytes); else sample.WriteDecryptedDataStored(bytes); }
        var original = bytes.ToArray(); var fileName = "egg." + sample.Extension;
        var before = StandalonePokemon.Open(bytes, fileName, encrypted, true).Entity;
        var request = new StandalonePokemonRequest(fileName, encrypted, UseFileFormat: true, ReadKind: "eggContext");
        var catalog = JsonSerializer.Deserialize(Api.ReadStandalonePokemonAdvanced(bytes, Json(request)), StandalonePokemonJson.Default.StandaloneAdvancedData)!.EggContext!;
        Check(catalog.Trainer.Name == before.OriginalTrainerName && catalog.Trainer.Tid == before.TID16 && catalog.MaximumName == before.MaxStringLengthTrainer, "Visible context defaults come from entity");
        Check(catalog.Games.Length > 0 && catalog.Games.All(c => GameUtil.GetVersionsInGeneration(before.Context, before.Version).Contains((GameVersion)c.Id)), "Target games belong to entity context");
        Check(catalog.Games.All(c => c.Name.Zh.Length > 0 && c.Name.En.Length > 0 && c.Name.Ja.Length > 0), "Target game names are localized");
        foreach (var game in catalog.Games)
        foreach (int tradeCase in new[] {0, 1, 2, 3, 4})
        {
            var traded = tradeCase != 0;
            var trainer = catalog.Trainer with {Version = game.Id,
                Name = tradeCase == 1 ? "OTHER" : tradeCase == 4 ? new string('A', catalog.MaximumName) : catalog.Trainer.Name,
                Tid = tradeCase == 2 ? before.TID16 ^ 1 : tradeCase == 4 ? 65535 : before.TID16,
                Sid = tradeCase == 3 ? before.SID16 ^ 1 : tradeCase == 4 ? 0 : before.SID16};
            var context = new SimpleTrainerInfo((GameVersion)trainer.Version) {OT = trainer.Name, TID16 = (ushort)trainer.Tid, SID16 = (ushort)trainer.Sid};
            var editRequest = request with {EggTrainer = trainer, Raw = new(999, 999, "egg", Egg: new("makeEgg"))};
            var output = Api.EditStandalonePokemonRaw(bytes, Json(editRequest));
            var egg = StandalonePokemon.Open(output, fileName, useFileFormat: true).Entity;
            Check(egg.IsEgg && egg.OriginalTrainerFriendship == EggStateLegality.GetMinimumEggHatchCycles(egg), "Egg flag and starting counter");
            Check(egg.TID16 == before.TID16 && egg.SID16 == before.SID16 && egg.PID == before.PID, "Context does not replace identity");
            Check(egg.Nickname == SpeciesName.GetEggName(egg.Language, egg.Format), "Core egg name");
            if (egg.Format >= 4) Check(egg.MetLocation == (traded ? Locations.TradedEggLocation(context.Generation, context.Version) : LocationEdits.GetNoneLocation(egg)), "Explicit context controls trade location");
            if (egg is PK9) Check(egg.Version == 0, "SV eggs have no origin version");
            if (egg is PB7 letsGo) Check(letsGo.Stat_CP == letsGo.CalcCP, "Let's Go friendship change updates CP");
            Check(egg.ChecksumValid && output.Length == bytes.Length && bytes.SequenceEqual(original), "Width, checksum and original");
            var working = editRequest with {InputEncrypted = false};
            foreach (int cycles in new[] {0, 255})
            {
                var changed = Api.EditStandalonePokemonRaw(output, Json(working with {Raw = new(0, 0, "egg", Egg: new("cycles", cycles))}));
                Check(StandalonePokemon.Open(changed, fileName, useFileFormat: true).Entity.OriginalTrainerFriendship == cycles, "Full byte hatch counter bounds");
            }
            var expected = egg.Clone();
            if (expected is BK4 bk4 && egg is BK4 sourceBattle) bk4.Sanity = sourceBattle.Sanity;
            expected.ForceHatchPKM(context);
            var hatchedBytes = Api.EditStandalonePokemonRaw(output, Json(working with {Raw = new(0, 0, "egg", Egg: new("hatch"))}));
            var actual = StandalonePokemon.Open(hatchedBytes, fileName, useFileFormat: true).Entity;
            if (egg.Gen6 && actual is IMemoryOT am && expected is IMemoryOT em)
            {
                Check(MemoryContext6.CanHaveFeeling6(2, am.OriginalTrainerMemoryFeeling, am.OriginalTrainerMemoryVariable), "Generated hatch feeling is in Core range");
                em.OriginalTrainerMemoryFeeling = am.OriginalTrainerMemoryFeeling;
            }
            expected.RefreshChecksum();
            Check(!actual.IsEgg && actual.Data.SequenceEqual(expected.Data), $"Full Core hatch output {sample.GetType().Name}/{party}/{encrypted}/{game.Id}/{traded}");
            Check(actual.Stat_HPCurrent == egg.Stat_HPCurrent && actual.Status_Condition == egg.Status_Condition, "Hatching does not heal");
            if (actual is PK9) Check((int)actual.Version == game.Id, "SV hatch uses selected game without trainer cache");
            foreach (var invalid in new EggEdit[] {new("cycles", -1), new("cycles", 256), new("hatch", 1), new("makeEgg"), new("invalid")})
                Reject(() => Api.EditStandalonePokemonRaw(output, Json(working with {Raw = new(0, 0, "egg", Egg: invalid)})));
        }
        foreach (var trainer in new[] {catalog.Trainer with {Version = -1}, catalog.Trainer with {Version = 256}, catalog.Trainer with {Tid = -1}, catalog.Trainer with {Tid = 65536}, catalog.Trainer with {Sid = -1}, catalog.Trainer with {Sid = 65536}, catalog.Trainer with {Name = ""}, catalog.Trainer with {Name = "A\n"}, catalog.Trainer with {Name = new string('A', catalog.MaximumName + 1)}})
            Reject(() => Api.EditStandalonePokemonRaw(bytes, Json(request with {EggTrainer = trainer, Raw = new(0, 0, "egg", Egg: new("makeEgg"))})));
        Reject(() => Api.EditStandalonePokemonRaw(bytes, Json(request with {Raw = new(0, 0, "egg", Egg: new("makeEgg"))})));
        Check(bytes.SequenceEqual(original), "Failed requests preserve original");
    }
}

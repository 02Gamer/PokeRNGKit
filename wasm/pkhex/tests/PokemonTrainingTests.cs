using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonTrainingTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid training edit accepted"); }
    private static void Set(PKM p, TrainingEdit edit)
    {
        if (edit.Contest is { } a)
        {
            var c = (IContestStats)p;
            c.ContestCool = (byte)a[0]; c.ContestBeauty = (byte)a[1]; c.ContestCute = (byte)a[2]; c.ContestSmart = (byte)a[3]; c.ContestTough = (byte)a[4]; c.ContestSheen = (byte)a[5];
        }
        if (edit.Hyper is { } v)
        {
            var h = (IHyperTrain)p;
            h.HT_HP = v[0]; h.HT_ATK = v[1]; h.HT_DEF = v[2]; h.HT_SPA = v[3]; h.HT_SPD = v[4]; h.HT_SPE = v[5];
        }
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var fixture = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var p = fixture.GetPartySlotAtIndex(0);
            p.IV_HP = 1; p.CurrentLevel = 100;
            if (p is IHyperTrain h) h.HyperTrainFlags = 0xC1;
            p.ResetPartyStats(); p.Stat_HPCurrent = Math.Max(1, p.Stat_HPMax / 2); p.Status_Condition = 8;
            p.RefreshChecksum(); fixture.SetPartySlotAtIndex(p, 0, EntityImportSettings.None); fixture.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray(); var original = data.ToArray(); var before = SaveUtil.GetSaveFile(data.ToArray())!;
            var requests = new List<TrainingEdit>();
            if (p is IContestStats) { requests.Add(new(Contest: [0,0,0,0,0,0])); requests.Add(new(Contest: [255,255,255,255,255,255])); requests.Add(new(Contest: [1,2,3,4,5,6])); }
            if (p is IHyperTrain)
            {
                for (int i = 0; i < 6; i++) requests.Add(new(Hyper: Enumerable.Range(0,6).Select(j => j == i).ToArray()));
                requests.Add(new(Hyper: [true,true,true,true,true,true])); requests.Add(new(Hyper: [false,false,false,false,false,false]));
                if (p is IContestStats) requests.Add(new(Contest: [6,5,4,3,2,1], Hyper: [true,false,false,true,false,true]));
            }
            foreach (var box in new[] { -1, 0 })
            {
                var source = PokemonEditing.Read(before, box, 0);
                using var report = JsonDocument.Parse(SaveService.Inspect(data));
                var info = report.RootElement.GetProperty("pokemon").EnumerateArray().Single(e => e.GetProperty("box").GetInt32() == box && e.GetProperty("slot").GetInt32() == 0).GetProperty("training");
                Require(info.GetProperty("canEditContest").GetBoolean() == (source is IContestStats), "Reported contest capability");
                Require((info.GetProperty("hyper").ValueKind != JsonValueKind.Null) == (source is IHyperTrain), "Reported Hyper Training capability");
                foreach (var edit in requests)
                {
                    var output = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(new PokemonRawEdit(box, 0, "training", Training: edit), SaveJsonContext.Default.PokemonRawEdit));
                    var after = SaveUtil.GetSaveFile(output.ToArray())!; var actual = PokemonEditing.Read(after, box, 0);
                    var expected = source.Clone(); Set(expected, edit);
                    if (box == -1 && edit.Hyper is not null) { var hp = expected.Stat_HPCurrent; var status = expected.Status_Condition; expected.ResetPartyStats(); expected.Stat_HPCurrent = Math.Min(hp, expected.Stat_HPMax); expected.Status_Condition = status; }
                    expected.RefreshChecksum();
                    Require(actual.Data.SequenceEqual(expected.Data), $"{version}/{box}: full training payload");
                    Require(actual.IVs.SequenceEqual(source.IVs), "Original IVs preserved");
                    Require(actual.Stat_HPCurrent == expected.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "Health and stats policy");
                    if (actual is IHyperTrain t) Require((t.HyperTrainFlags & 0xC0) == 0xC0, "Reserved flag bits preserved");
                    Require(after.ChecksumsValid && actual.ChecksumValid && data.SequenceEqual(original), "Original and checksums");
                    for (int b = 0; b < before.BoxCount; b++) for (int slot = 0; slot < before.BoxSlotCount; slot++)
                        if (b != box || slot != 0) Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other slots");
                    if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Other party");
                }
            }
            if (p is IHyperTrain)
            {
                p.Stat_HPCurrent = p.Stat_HPMax; p.RefreshChecksum(); fixture.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
                var full = fixture.Write().ToArray();
                var output = SaveService.EditPokemonRaw(full, JsonSerializer.Serialize(new PokemonRawEdit(-1,0,"training", Training: new(Hyper: [false,false,false,false,false,false])), SaveJsonContext.Default.PokemonRawEdit));
                var actual = SaveUtil.GetSaveFile(output)!.GetPartySlotAtIndex(0);
                Require(actual.Stat_HPMax < p.Stat_HPMax && actual.Stat_HPCurrent == actual.Stat_HPMax && actual.Status_Condition == 8, "HP down-clamp after clearing HP Hyper Training");
            }
            Console.WriteLine($"PASS {version}: contest and Hyper Training fields, stat order, IVs, health and complete payload");
        }
        foreach (PKM p in new PKM[] {new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new RK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()})
        {
            var info = PokemonTraining.Read(p);
            Require((info.Contest is not null) == (p is IContestStatsReadOnly) && info.CanEditContest == (p is IContestStats), "Contest interfaces");
            Require((info.Hyper is not null) == (p is IHyperTrain), "Hyper interface");
            Reject(() => PokemonTraining.Apply(p, new()));
            Reject(() => PokemonTraining.Apply(p, new(Contest: [0])));
            Reject(() => PokemonTraining.Apply(p, new(Hyper: [true])));
            Reject(() => PokemonTraining.Apply(p, new(Contest: [0,0,0,0,0,256])));
            Reject(() => PokemonTraining.Apply(p, new(Contest: [-1,0,0,0,0,0])));
            if (p is not IHyperTrain) Reject(() => PokemonTraining.Apply(p, new(Hyper: [false,false,false,false,false,false])));
            else
            {
                var h = (IHyperTrain)p; h.HyperTrainFlags = 0xC0;
                PokemonTraining.Apply(p, new(Hyper: [false,false,false,true,false,false]));
                Require(h.HT_SPA && !h.HT_SPE && !h.HT_SPD && (h.HyperTrainFlags & 0xC0) == 0xC0, "Special Attack is product index 3");
                PokemonTraining.Apply(p, new(Hyper: [false,false,false,false,false,true]));
                Require(h.HT_SPE && !h.HT_SPA && !h.HT_SPD, "Speed is product index 5");
            }
        }
    }
}

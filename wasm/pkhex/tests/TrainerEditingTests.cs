// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerEditingTests
{
    private static void Require(bool value,string message) { if(!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile save) => new(save.OT,save.TID16,save.SID16,save.Money);
    private static byte[] Apply(byte[] data,TrainerEdit edit) => SaveService.Export(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.TrainerEdit));
    public static void Run()
    {
        foreach(var version in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD"})
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            save.OT = "A"; save.PlayedHours = 23; save.PlayedMinutes = 255; save.PlayedSeconds = 37;
            if(save is SAV3 g3) g3.SmallBlock.OriginalTrainerTrash[4] = 0x55;
            if(save is SAV4 g4) g4.OriginalTrainerTrash[6] = 0x55;
            var data = save.Write().ToArray(); var original = data.ToArray();
            var source = SaveUtil.GetSaveFile(data.ToArray())!;
            var basis = Original(source);
            Require(TrainerEditing.Options(source).CanPlayTime,"Play time capability");
            var cases = new[]{basis,basis with { Gender=1-source.Gender },basis with { Hours=65535 },basis with { Minutes=99,Seconds=60 },basis with { Hours=0,Minutes=0,Seconds=0 }};
            foreach(var edit in cases)
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!;
                if(edit.Gender is int gender) expected.Gender=(byte)gender;
                if(edit.Hours is int hours) expected.PlayedHours=hours;
                if(edit.Minutes is int minutes) expected.PlayedMinutes=minutes%60;
                if(edit.Seconds is int seconds) expected.PlayedSeconds=seconds%60;
                var output = Apply(data,edit);
                Require(output.SequenceEqual(expected.Write().ToArray()),$"{version}: complete trainer output preserves all unrelated data");
                var result = SaveUtil.GetSaveFile(output.ToArray())!;
                Require(result.ChecksumsValid && TrainerEditing.Snapshot(result) == TrainerEditing.Snapshot(expected),"Trainer reread and checksums");
                Require(data.SequenceEqual(original),"Trainer original preserved");
            }
            foreach(var edit in new[]{basis with {Gender=2},basis with {Gender=-1},basis with {Hours=65536},basis with {Minutes=100},basis with {Seconds=-1}})
            {
                try { Apply(data,edit); throw new Exception("Invalid trainer field accepted"); }
                catch(ArgumentException) { Require(data.SequenceEqual(original),"Rejected trainer edit preserves source"); }
            }
            Console.WriteLine($"PASS {version}: trainer gender/time, modulo, unchanged abnormal values, name padding and complete output");
        }
        // SWSH appearance behavior is checked on a Core-created save, not a full real-save acceptance fixture.
        var swsh = new SAV8SWSH(); swsh.OT = "A"; swsh.Gender = 0;
        swsh.MyStatus.ResetAppearance(PlayerSkinColor8.TanM); swsh.MyStatus.Hair = 123;
        var expectedSwsh = (SAV8SWSH)swsh.Clone(); expectedSwsh.Gender = 1;
        expectedSwsh.MyStatus.ResetAppearance(PlayerSkinColor8.TanF);
        TrainerEditing.Apply(swsh,Original(swsh) with {Gender=1});
        Require(swsh.MyStatus.Data.SequenceEqual(expectedSwsh.MyStatus.Data),"SWSH gender change matches upstream appearance reset");
        swsh.MyStatus.Hair=456; var untouched = swsh.MyStatus.Data.ToArray();
        TrainerEditing.Apply(swsh,Original(swsh) with {Gender=1});
        Require(swsh.MyStatus.Data.SequenceEqual(untouched),"Unchanged SWSH gender preserves custom appearance");
        swsh.MyStatus.Skin=ulong.MaxValue;
        try { TrainerEditing.Apply(swsh,Original(swsh) with {Gender=0}); throw new Exception("Unknown skin accepted"); }
        catch(ArgumentException) { }
        Console.WriteLine("PASS SWSH Core-created trainer appearance reset, unchanged appearance and unknown skin rejection");
    }
}

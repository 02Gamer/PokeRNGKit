// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerBadgeTests
{
    private static void Require(bool value,string message) { if(!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile save) => new(save.OT,save.TID16,save.SID16,save.Money);
    private static byte[] Apply(byte[] data,TrainerEdit edit) => SaveService.Export(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.TrainerEdit));
    private static void Direct(SaveFile save,int value)
    {
        switch(save)
        {
            case SAV3 s: s.Badges=value; break;
            case SAV4HGSS s: s.Badges=(byte)value; s.Badges16=value >> 8; break;
            case SAV4 s: s.Badges=(byte)value; break;
            case SAV5 s: s.Misc.Badges=value; break;
            case SAV6 s: s.Badges=value; break;
            case SAV8BS s:
                for(int i=0;i<8;i++) s.FlagWork.SetSystemFlag(124+i,(value & (1 << i))!=0);
                break;
        }
    }
    public static void Run()
    {
        foreach(var version in new[]{"E","D","Pt","HG","B","B2","X","OR","BD"})
        {
            var save=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            save.OT="A"; Direct(save,0);
            if(save is SAV8BS bd) { bd.FlagWork.SetSystemFlag(123,true); bd.FlagWork.SetSystemFlag(132,true); }
            var data=save.Write().ToArray(); var original=data.ToArray(); var basis=Original(save);
            int count=version=="HG" ? 16 : 8, max=(1 << count)-1;
            Require(TrainerEditing.Options(save).Badges is { } state && state.Count==count && state.Value==0,"Correct number of badges");
            foreach(int mask in new[]{0,max,0x55,0xAA}.Concat(Enumerable.Range(0,count).Select(i=>1 << i)))
            {
                var expected=SaveUtil.GetSaveFile(data.ToArray())!; Direct(expected,mask);
                var output=Apply(data,basis with{Badges=mask});
                Require(output.SequenceEqual(expected.Write().ToArray()),"Complete output matches direct Core badge setters");
                var after=SaveUtil.GetSaveFile(output.ToArray())!;
                Require(after.ChecksumsValid && TrainerBadges.Read(after)!.Value==mask,"Badge flags and checksum survive reread");
                Require(data.SequenceEqual(original),"Original input preserved");
                var cleared=SaveUtil.GetSaveFile(Apply(output,Original(after) with{Badges=0}))!;
                Require(TrainerBadges.Read(cleared)!.Value==0,"Every badge can be removed again");
            }
            foreach(int invalid in new[]{-1,max+1,int.MaxValue})
            {
                try { Apply(data,basis with{Badges=invalid}); throw new Exception("Invalid badge mask accepted"); }
                catch(ArgumentException) { Require(data.SequenceEqual(original),"Rejected mask preserves input"); }
            }
            Console.WriteLine($"PASS {version}: each badge, all/none, full output, clear, bounds, original and checksums");
        }
        var rawSave=(SAV8BS)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav"))!;
        rawSave.OT="A"; Direct(rawSave,0);
        int offset=FlagWork8b.OFS_SYSTEM+4*124;
        BinaryPrimitives.WriteInt32LittleEndian(rawSave.FlagWork.Data[offset..],2);
        var raw=rawSave.Write().ToArray();
        foreach(int mask in new[]{0,2,128})
        {
            var output=Apply(raw,Original(rawSave) with{Badges=mask});
            var after=(SAV8BS)SaveUtil.GetSaveFile(output.ToArray())!;
            Require(BinaryPrimitives.ReadInt32LittleEndian(after.FlagWork.Data[offset..])==2,"Unchanged noncanonical badge flag preserved");
            Require(after.ChecksumsValid && TrainerBadges.Read(after)!.Value==mask,"Changed badges and checksum valid with unrelated unusual flag");
        }
        foreach(var version in new[]{"SN","US"})
        {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var save=SaveUtil.GetSaveFile(data.ToArray())!;
            Require(TrainerEditing.Options(save).Badges is null,"No standard badges for Alola");
            try { Apply(data,Original(save) with{Badges=0}); throw new Exception("Unsupported badge edit accepted"); }
            catch(ArgumentException) { }
        }
        Require(TrainerBadges.Read(new SAV8SWSH()) is null,"SWSH does not use the checkbox badge editor");
        Console.WriteLine("PASS BDSP unchanged noncanonical system flags and unsupported formats");
    }
}

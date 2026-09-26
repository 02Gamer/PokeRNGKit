// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class SaveRecordTests
{
    private static void Require(bool value,string message) { if(!value) throw new Exception(message); }
    private static byte[] Apply(byte[] data,int index,int value) => SaveService.EditRecord(data,JsonSerializer.Serialize(new SaveRecordEdit(index,value),SaveJsonContext.Default.SaveRecordEdit));
    public static void Run()
    {
        foreach(var version in new[]{"X","OR","SN","US","BD"})
        {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var original=data.ToArray();
            var save=SaveUtil.GetSaveFile(data.ToArray())!; var records=(ITrainerStatRecord)save;
            var catalog=SaveRecords.Read(save);
            Require(catalog.Entries.Length==records.RecordCount && catalog.Entries.Length==(version=="BD" ? 30 : 200),"Complete record count");
            var names=save switch {SAV6=>RecordLists.RecordList_6,SAV7=>RecordLists.RecordList_7,_=>Record8b.RecordList_8b};
            int signedRejects=0;
            foreach(var entry in catalog.Entries)
            {
                Require(entry.Name==names.GetValueOrDefault(entry.Index,entry.Index.ToString("D3")) && entry.Offset==records.GetRecordOffset(entry.Index),"Upstream name/fallback and offset");
                Require(entry.Max==Math.Max(entry.Value,records.GetRecordMax(entry.Index)),"Dynamic desktop maximum");
                int value=entry.Value==1 ? 0 : 1;
                var expected=SaveUtil.GetSaveFile(data.ToArray())!; ((ITrainerStatRecord)expected).SetRecord(entry.Index,value);
                var output=Apply(data,entry.Index,value);
                Require(output.SequenceEqual(expected.Write().ToArray()),"Every record: full output matches direct Core write");
                var after=SaveUtil.GetSaveFile(output.ToArray())!;
                Require(after.ChecksumsValid && ((ITrainerStatRecord)after).GetRecord(entry.Index)==value,"Value/checksum survives reread");
                Require(data.SequenceEqual(original),"Original input preserved");
                var maxProbe=save.Clone(); var maxDirect=save.Clone(); ((ITrainerStatRecord)maxDirect).SetRecord(entry.Index,entry.NormalMax);
                bool representable=((ITrainerStatRecord)maxDirect).GetRecord(entry.Index)==entry.NormalMax;
                if(representable) {
                    SaveRecords.Apply(maxProbe,new(entry.Index,entry.NormalMax));
                    if(entry.Value!=entry.NormalMax) Require(SaveRecords.Snapshot(maxProbe)==SaveRecords.Snapshot(maxDirect),"Upper boundary record block equals Core");
                } else {
                    try { SaveRecords.Apply(maxProbe,new(entry.Index,entry.NormalMax)); throw new Exception("Unrepresentable signed record accepted"); }
                    catch(ArgumentException) { signedRejects++; }
                }
            }
            foreach(var edit in new[]{new SaveRecordEdit(-1,0),new SaveRecordEdit(records.RecordCount,0),new SaveRecordEdit(0,-1)})
            {
                try { Apply(data,edit.Index,edit.Value); throw new Exception("Invalid record accepted"); }
                catch(ArgumentException) { Require(data.SequenceEqual(original),"Rejected edit preserves input"); }
            }
            // An untouched negative time record must remain readable and survive another edit.
            records.SetRecord(2,-1); var negative=save.Write().ToArray();
            var negativeRead=SaveRecords.Read(SaveUtil.GetSaveFile(negative.ToArray())!);
            Require(negativeRead.Entries[2].Value==-1 && negativeRead.Entries[2].TimeHint is null,"Negative original time is preserved, not parsed as TimeOnly");
            var kept=SaveUtil.GetSaveFile(Apply(negative,0,1))!;
            Require(((ITrainerStatRecord)kept).GetRecord(2)==-1,"Editing another record preserves negative original");
            if(save is SAV6 or SAV7) {
                var block=save is SAV6 six ? six.Records.Data : ((SAV7)save).Records.Data;
                BinaryPrimitives.WriteInt16LittleEndian(block[records.GetRecordOffset(100)..],15000);
                var high=save.Write().ToArray(); var highEntry=SaveRecords.Read(save).Entries[100];
                if(highEntry.Value>highEntry.NormalMax) {
                    var clamped=SaveUtil.GetSaveFile(Apply(high,100,highEntry.Value-1))!;
                    Require(((ITrainerStatRecord)clamped).GetRecord(100)==Math.Min(highEntry.Value-1,highEntry.NormalMax),"Changed over-limit original follows Core clamp");
                }
            }
            Console.WriteLine($"PASS {version}: all {records.RecordCount} records, names/offsets, full output, maximums ({signedRejects} signed-boundary rejections), original and negative preservation");
        }
        var bd=(SAV8BS)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav"))!;
        BinaryPrimitives.WriteInt32LittleEndian(bd.Records.Data[4..],65535);
        var hidden=bd.Write().ToArray(); var unchanged=Apply(hidden,1,9999);
        Require(unchanged.SequenceEqual(bd.Write().ToArray()),"BDSP same displayed value preserves hidden over-limit raw bytes and all 12 record sets");
        var swsh=new SAV8SWSH(); Require(SaveRecords.Read(swsh).Entries.Length==50,"SWSH 50 records");
        for(int i=0;i<50;i++) { var clone=(SAV8SWSH)swsh.Clone(); clone.SetRecord(i,123); SaveRecords.Apply(swsh,new(i,123)); Require(swsh.Records.Data.SequenceEqual(clone.Records.Data),"SWSH Core-created record bytes"); }
        foreach(var version in new[]{"E","D","Pt","HG","B","B2"}) {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            try { SaveService.ReadRecords(data); throw new Exception("Unsupported format accepted"); } catch(ArgumentException) { }
        }
        Console.WriteLine("PASS BDSP hidden data preservation, SWSH Core-created records and unsupported formats");
    }
}

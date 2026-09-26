// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerCurrencyTests
{
    private static void Require(bool value,string message) { if(!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile save) => new(save.OT,save.TID16,save.SID16,save.Money);
    private static TrainerCurrencyEdit Edit(string key,long value) => key switch {
        "bp"=>new(Bp:value),"pokeMiles"=>new(PokeMiles:value),"festivalCoins"=>new(FestivalCoins:value),"watts"=>new(Watts:value),_=>throw new Exception(key),
    };
    private static byte[] Apply(byte[] data,TrainerEdit edit) => SaveService.Export(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.TrainerEdit));
    private static void Direct(SaveFile save,string key,int value)
    {
        switch(key,save)
        {
            case ("bp",SAV5 s): s.BattleSubway.BP=value; break;
            case ("bp",SAV6 s): s.BP=value; break;
            case ("bp",SAV7 s): s.Misc.BP=(uint)value; break;
            case ("bp",SAV8BS s): s.BattleTower.BP=(uint)value; break;
            case ("pokeMiles",SAV6 s): s.SetRecord(63,value); s.SetRecord(64,value); break;
            case ("festivalCoins",SAV7 s): s.Festa.FestaCoins=value; break;
        }
    }
    public static void Run()
    {
        foreach(var version in new[]{"B","B2","X","OR","SN","US","BD"})
        {
            var save=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!; save.OT="A";
            foreach(var field in TrainerCurrencies.Read(save)) Direct(save,field.Key,5);
            if(save is SAV6 g6) g6.SetRecord(64,9876);
            if(save is SAV7 g7) { g7.SetRecord(38,50); g7.Festa.TotalFestaCoins=8765; }
            var data=save.Write().ToArray(); var original=data.ToArray(); var basis=Original(save);
            foreach(var field in TrainerCurrencies.Read(save))
            {
                Require(field.Max==(field.Key=="bp" ? 9999 : 9999999),"Verified desktop input maximum");
                foreach(int value in new[]{0,5,123,field.Max})
                {
                    var expected=SaveUtil.GetSaveFile(data.ToArray())!;
                    if(value!=field.Value) Direct(expected,field.Key,value);
                    var output=Apply(data,basis with{Currencies=Edit(field.Key,value)});
                    Require(output.SequenceEqual(expected.Write().ToArray()),"Complete output matches Core currency and linked record writes");
                    var after=SaveUtil.GetSaveFile(output.ToArray())!;
                    Require(after.ChecksumsValid && TrainerCurrencies.Read(after).Single(f=>f.Key==field.Key).Value==value,"Value/checksum survives export");
                    if(save is SAV6 && field.Key=="pokeMiles") Require(((SAV6)after).GetRecord(64)==(value==5 ? 9876 : value),"Miles total changes only with edited balance");
                    if(save is SAV7 && field.Key=="festivalCoins") Require(((SAV7)after).Festa.TotalFestaCoins==(value==5 ? 8765 : Math.Min(9999999,value+50)),"FC total tracks spent record and clamps maximum");
                    Require(data.SequenceEqual(original),"Original input preserved");
                }
                foreach(long invalid in new[]{-1L,(long)field.Max+1,long.MaxValue})
                {
                    try { Apply(data,basis with{Currencies=Edit(field.Key,invalid)}); throw new Exception("Invalid currency accepted"); }
                    catch(ArgumentException) { Require(data.SequenceEqual(original),"Rejected currency preserves source"); }
                }
            }
            // Seed an out-of-UI-range BP without Core's Gen7 clamp.
            if(save is SAV7 s7) BinaryPrimitives.WriteUInt32LittleEndian(s7.Misc.Data[0x11C..],65535);
            else Direct(save,"bp",65535);
            var unusual=save.Write().ToArray();
            var kept=SaveUtil.GetSaveFile(Apply(unusual,Original(save) with{Money=1}))!;
            Require(TrainerCurrencies.Read(kept).Single(f=>f.Key=="bp").Value==65535,"Unchanged abnormal BP preserved");
            try { Apply(data,basis with{Currencies=new(Watts:1)}); throw new Exception("Unsupported currency accepted"); }
            catch(ArgumentException) { }
            Console.WriteLine($"PASS {version}: currencies, linked records, same-value preservation, bounds, full output, original and checksum");
        }
        var swsh=new SAV8SWSH(); swsh.OT="A"; swsh.Misc.BP=5; swsh.MyStatus.Watt=100; swsh.SetRecord(Record8.WattTotal,700);
        foreach(int value in new[]{0,100,200,9999999})
        {
            var actual=(SAV8SWSH)swsh.Clone(); var expected=(SAV8SWSH)swsh.Clone();
            if(value!=100) { expected.MyStatus.Watt=(uint)value; if(expected.GetRecord(Record8.WattTotal)<value) expected.SetRecord(Record8.WattTotal,value); }
            TrainerEditing.Apply(actual,Original(actual) with{Currencies=new(Bp:9999,Watts:value)}); expected.Misc.BP=9999;
            Require(actual.MyStatus.Data.SequenceEqual(expected.MyStatus.Data) && actual.Misc.Data.SequenceEqual(expected.Misc.Data) && actual.Records.Data.SequenceEqual(expected.Records.Data),"SWSH currency and cumulative record bytes match Core");
            Require(actual.GetRecord(Record8.WattTotal)==Math.Max(700,value),"Watt total never decreases");
        }
        foreach(var version in new[]{"E","D","Pt","HG"})
        {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var save=SaveUtil.GetSaveFile(data.ToArray())!;
            Require(TrainerCurrencies.Read(save).Length==0,"No unrelated currencies in trainer window");
            try { Apply(data,Original(save) with{Currencies=new(Bp:1)}); throw new Exception("Unsupported trainer currency accepted"); }
            catch(ArgumentException) { }
        }
        Console.WriteLine("PASS SWSH Core-created currency/record linkage and unsupported trainer formats");
    }
}

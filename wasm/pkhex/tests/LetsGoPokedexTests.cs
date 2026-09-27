// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class LetsGoPokedexTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static SAV7b Open(byte[] data)=>(SAV7b)SaveUtil.GetSaveFile(data.ToArray())!;
    private static byte[] Edit(byte[] data,Dex7Edit edit)=>SaveService.EditPokedex7(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Dex7Edit));
    private static byte[] Fixture(GameVersion version)
    {
        var s=new SAV7b{Version=version,Language=9,OT="TEST"};
        WriteUInt32LittleEndian(s.Data[0xB8610..],0x42454546);WriteUInt16LittleEndian(s.Data[0xB86B0..],0x13);
        WriteUInt32LittleEndian(s.Zukan.Data,0x2F120F17);
        for(int i=0;i<7;i++)WriteUInt16LittleEndian(s.Storage.Data[(i*2)..],1001);
        WriteUInt16LittleEndian(s.Storage.Data[14..],0);
        for(int i=0;i<186;i++)for(int group=0;group<4;group++)s.Zukan.SetSizeData((DexSizeType)group,i,254,127);
        s.Zukan.Data[0x85]=0xAD;s.Zukan.Data[0xF78+3]=0xAB;s.Zukan.Data[0xF78+4]=0xEF;s.Zukan.Data[0xF78+5]=0xBE;
        s.Captured.Data[0x770]=0xDA;
        s.Zukan.SetCaught(25,true);s.Zukan.SetSeen(25,3,true);s.Zukan.SetDisplayed(24,3,true);s.Captured.SetCapturedCount(25,5);s.Captured.TotalCaptured=123;
        return s.Write().ToArray();
    }
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.GP,GameVersion.GE}){
            var data=Fixture(version);var original=data.ToArray();var save=Open(data);Check(save.ChecksumsValid&&save.State.Exportable,"Valid serialized LGPE fixture");
            Directory.CreateDirectory(".tmp/pkhex-fixtures");File.WriteAllBytes($".tmp/pkhex-fixtures/{version}.sav",data);
            var catalog=Gen7Pokedex.Read(save);Check(catalog.CanEdit&&catalog.Entries.Count(e=>e.Form==0)==809&&catalog.Captures!.Entries.Length==153,"LGPE catalogs");
            Check(catalog.Entries.Count(e=>e.State.Sizes is not null)==186,"All 186 size records reachable");
            foreach(var e in catalog.Entries)Check(save.Zukan.GetEntryIndex((ushort)e.Species,(byte)e.Form)==e.State.Index,"LGPE form mapping");
            using(var report=JsonDocument.Parse(SaveService.Inspect(data)))Check(!report.RootElement.GetProperty("canEdit").GetBoolean()&&report.RootElement.GetProperty("pokedex").GetProperty("canEdit").GetBoolean(),"LGPE dex-only capabilities");
            foreach(var e in catalog.Entries.Where(e=>e.State.Sizes is not null&&(e.Form>0||e.Species is 1 or 25 or 808 or 809))){
                Compare(data,new("entry",e.State),Open(data));
                var values=new[]{new Dex7Size(true,0,255,true),new(true,255,0,false),new(false,1,2,true),new(true,254,127,true)};
                var expected=Open(data);for(int group=0;group<4;group++){var v=values[group];expected.Zukan.SetSizeData((DexSizeType)group,(ushort)e.Species,(byte)e.Form,v.Used?(byte)v.Height:(byte)254,v.Used?(byte)v.Weight:(byte)127,v.Flagged);}
                Compare(data,new("entry",e.State with{Sizes=values}),expected);
            }
            foreach(var action in new[]{"clear","uncaught","seen","caught","complete","give","giveNone"}){
                var expected=Open(data);ExpectedDex(expected,action,catalog.Entries.Length);Compare(data,new(action,Index:action is "give" or "giveNone"?24:-1),expected);
            }
            var complete=Open(Edit(data,new("complete")));Check(!complete.Zukan.GetCaught(152)&&complete.Zukan.GetCaught(809),"Bulk legal species only");
            var formIndex=complete.Zukan.GetEntryIndex(3,1);Check(complete.Zukan.GetSeen((ushort)(formIndex+1),0),"Bulk form seen");
            Check(!complete.Zukan.GetSizeData(DexSizeType.MinHeight,3,1,out _,out _,out _),"Complete only fills base size records");
            foreach(string kind in new[]{"entry","sum","all"})foreach(string count in new[]{"0","9999"}){
                var edit=new Capture7Edit(kind,25,count,"999999999","999999999","999999999");var expected=Open(data);ExpectedCapture(expected,edit);Compare(data,new("capture",Capture:edit),expected);
            }
            // Five large transfers exceed uint.MaxValue; the total must stay capped, not wrap down.
            var large=Open(data);large.Zukan.SetCaught(25,false);for(ushort i=1;i<=5;i++)large.Zukan.SetCaught(i,true);large.Captured.TotalTransferred=999999999;
            var overflow=new Capture7Edit("all",1,"0","900000000","0","999999999");var largeData=large.Write().ToArray();var largeExpected=Open(largeData);ExpectedCapture(largeExpected,overflow);Compare(largeData,new("capture",Capture:overflow),largeExpected);
            Check(Open(Edit(largeData,new("capture",Capture:overflow))).Captured.TotalTransferred==999999999,"64-bit transfer sum prevents wraparound");
            // Read-only abnormal raw counts can remain unchanged, but cannot be introduced or used as bulk templates.
            var raw=Open(data);WriteUInt32LittleEndian(raw.Captured.Data[0x2A8..],uint.MaxValue);var rawData=raw.Write().ToArray();var preserve=new Capture7Edit("entry",1,"4294967295","0","123","0");Compare(rawData,new("capture",Capture:preserve),Open(rawData));
            Reject(rawData,new("capture",Capture:preserve with{Kind="all"}));
            var first=catalog.Entries[0].State;
            foreach(var bad in new[]{new Dex7Edit("entry",first with{Sizes=null}),new("entry",first with{Sizes=[new(true,256,0,false)]}),new("entry",catalog.Entries[151].State with{Sizes=first.Sizes}),new("capture",Capture:new("entry",152,"0","0","0","0")),new("capture",Capture:new("entry",1,"10000","0","0","0")),new("capture",Capture:new("entry",1,"0","1000000000","0","0")),new("capture",Capture:new("entry",1,"","0","0","0")),new("capture",Capture:new("entry",1,"-1","0","0","0"))})Reject(data,bad);
            Check(SaveService.ExportWorkingCopy(data).SequenceEqual(data)&&data.SequenceEqual(original),"LGPE original and exact working-copy export");
            var corrupt=data.ToArray();corrupt[0x100]^=1;Reject(corrupt,new("clear"));
            Console.WriteLine($"PASS {version}: {catalog.Entries.Length} dex entries, all 186 size mappings, form writes, sentinel/no-op preservation, legal batches, 153 capture records, bounds/overflow, exact export and full output");
        }
    }
    private static void ExpectedDex(SAV7b save,string action,int count)
    {
        var d=save.Zukan;
        if(action is "clear" or "uncaught"){
            for(int index=0;index<count;index++){
                if(index<809){d.SetCaught((ushort)(index+1),false);for(int i=0;i<9;i++)d.SetLanguageFlag(index,i,false);}
                if(action=="clear")for(int r=0;r<4;r++){d.SetSeen((ushort)(index+1),r,false);d.SetDisplayed(index,r,false);}
            }
            if(action=="clear")for(int i=0;i<186;i++)for(int g=0;g<4;g++)d.SetSizeData((DexSizeType)g,i,254,127,false);
            return;
        }
        IEnumerable<ushort> species=action is "give" or "giveNone"?new ushort[]{25}:Enumerable.Range(1,151).Select(i=>(ushort)i).Concat(new ushort[]{808,809});
        foreach(ushort s in species){
            var indexes=new[]{(int)s-1}.AsEnumerable();if(action is not ("give" or "giveNone")&&s is not (25 or 133))indexes=indexes.Concat(d.GetAllFormEntries(s).Where(i=>i>=809).Distinct());
            foreach(int index in indexes){
                byte gender=d.GetBaseSpeciesGenderValue(index);bool[] allowed=[gender!=254,gender is not (0 or 255),gender!=254,gender is not (0 or 255)];
                for(int r=0;r<4;r++)d.SetSeen((ushort)(index+1),r,action!="giveNone"&&allowed[r]);
                if(action=="giveNone")for(int r=0;r<4;r++)d.SetDisplayed(index,r,false);
                else if(index<809&&!Enumerable.Range(0,4).Any(r=>d.GetDisplayed(index,r)))d.SetDisplayed(index,allowed[0]?0:1,true);
                if(index>=809)continue;
                if(action!="seen")d.SetCaught((ushort)(index+1),action!="giveNone");
                if(action!="seen"||!d.GetCaught(s))for(int i=0;i<9;i++)d.SetLanguageFlag(index,i,action is "give" or "complete"||action=="caught"&&i==7);
                if(action is "caught" or "complete")for(int g=0;g<4;g++)if(!d.GetSizeData((DexSizeType)g,s,0,out _,out _,out bool flag)){byte v=g%2==0?(byte)0:(byte)255;d.SetSizeData((DexSizeType)g,s,0,v,v,flag);}
            }
        }
    }
    private static void ExpectedCapture(SAV7b save,Capture7Edit e)
    {
        var c=save.Captured;uint captured=uint.Parse(e.Captured),transferred=uint.Parse(e.Transferred);c.TotalCaptured=uint.Parse(e.TotalCaptured);c.TotalTransferred=uint.Parse(e.TotalTransferred);
        if(e.Kind=="all")for(ushort i=0;i<153;i++){ushort s=CaptureRecords.GetIndexSpecies(i);if(captured==0||save.Zukan.GetCaught(s))c.SetCapturedCountIndex(i,captured);if(transferred==0||save.Zukan.GetCaught(s))c.SetTransferredCountIndex(i,transferred);}
        else {c.SetCapturedCount((ushort)e.Species,captured);c.SetTransferredCount((ushort)e.Species,transferred);}
        if(e.Kind=="entry")return;
        ulong sumC=0,sumT=0;for(int i=0;i<153;i++){sumC+=c.GetCapturedCountIndex(i);sumT+=c.GetTransferredCountIndex(i);}
        var maxC=(uint)Math.Min(sumC,999999999UL);var maxT=(uint)Math.Min(sumT,999999999UL);
        c.TotalCaptured=e.Kind=="sum"?maxC:Math.Min(c.TotalCaptured,maxC);c.TotalTransferred=e.Kind=="sum"?maxT:Math.Min(c.TotalTransferred,maxT);
    }
    private static void Reject(byte[] data,Dex7Edit edit){try{Edit(data,edit);throw new Exception("Invalid LGPE payload accepted");}catch(ArgumentException){}}
    private static void Compare(byte[] data,Dex7Edit edit,SAV7b expected){var output=Edit(data,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"LGPE complete output matches independent operations");Check(Open(output).ChecksumsValid&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"LGPE valid reload and exported bytes");}
}

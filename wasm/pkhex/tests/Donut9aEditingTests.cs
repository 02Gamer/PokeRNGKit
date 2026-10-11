// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Donut9aEditingTests
{
    private static void Check(bool value,string text){if(!value)throw new Exception(text);}
    private static void Reject(Action action){bool rejected=false;try{action();}catch(ArgumentException){rejected=true;}Check(rejected,"Invalid Donut9a request accepted");}
    private static SAV9ZA Open(byte[] bytes)=>new(bytes.ToArray());
    private static void DateRaw(Span<byte> raw,DateTime date){uint bits=unchecked((uint)(date.Year-1900))|((uint)(date.Month-1)<<12)|((uint)date.Day<<16)|((uint)date.Hour<<21)|((uint)date.Minute<<26);BinaryPrimitives.WriteUInt32LittleEndian(raw[0x20..],bits);raw[0x24]=(byte)date.Second;}
    private static byte[] Create(int revision)
    {
        var s=Open(ZaBlockFixtureTests.Create(revision));Check(Donut9aEditing.Available(s),"ZA synthetic template contains donuts");var data=s.Blocks.GetBlock(Donut9aEditing.Key).Data;data.Clear();
        foreach(int i in new[]{0,17,998}){var row=data.Slice(i*72,72);BinaryPrimitives.WriteUInt64LittleEndian(row,1234);row[8]=9;row[9]=10;BinaryPrimitives.WriteUInt16LittleEndian(row[10..],3);BinaryPrimitives.WriteUInt16LittleEndian(row[12..],1234);BinaryPrimitives.WriteUInt16LittleEndian(row[14..],149);BinaryPrimitives.WriteUInt16LittleEndian(row[16..],149);BinaryPrimitives.WriteUInt64LittleEndian(row[40..],DonutInfo.Flavors[0].Hash);DateRaw(row,new DateTime(2024,1,2,3,4,5));row.Slice(0x25,3).Fill(0xA7);row[0x40..].Fill(0xD3);}
        return s.Write().ToArray();
    }
    private static byte[] Compare(byte[] data,Dn9aEdit edit,Action<SAV9ZA> raw)
    {
        var original=data.ToArray();string hash=Br4Editing.Hash(data);var output=Donut9aEditing.Prepare(Open(data),edit with{SourceHash=hash},hash,data.Length,out _);var expected=Open(data);raw(expected);Check(output.SequenceEqual(expected.Write().ToArray()),"Donut9a independent raw full-file parity");Check(data.SequenceEqual(original),"Donut9a immutable original");return output;
    }
    public static void Run()
    {
        for(int revision=0;revision<3;revision++)
        {
            var data=Create(revision);var hash=Br4Editing.Hash(data);var c=Donut9aEditing.Read(Open(data),hash);Check(c.CanEdit&&c.Entries.Length==999&&c.Entries[998].Stars==9&&c.Entries[17].Profile[0]==10&&c.Entries[17].Scale.Length==5,"Donut9a catalog, physical last slot and core flavor profile");
            Compare(data,new("patch",hash,998,[new("stars","7"),new("boost","255"),new("calories","65535"),new("flavor0","2")],UiLanguage:"en"),s=>{var row=s.Blocks.GetBlock(Donut9aEditing.Key).Data.Slice(998*72,72);row[8]=6;row[9]=255;BinaryPrimitives.WriteUInt16LittleEndian(row[12..],65535);BinaryPrimitives.WriteUInt64LittleEndian(row[40..],DonutInfo.Flavors[1].Hash);});
            Compare(data,new("patch",hash,17,[new("date","2025-02-03T04:05:06")],UiLanguage:"zh"),s=>{var row=s.Blocks.GetBlock(Donut9aEditing.Key).Data.Slice(17*72,72);row[8]=6;var d=new DateTime(2025,2,3,4,5,6);DateRaw(row,d);BinaryPrimitives.WriteUInt64LittleEndian(row,(ulong)(d.Ticks-DateTime.UnixEpoch.Ticks)/10000+234);});
            Compare(data,new("patch",hash,17,[new("milliseconds","18446744073709551615")],Now:"2026-01-02T03:04:05.006",UiLanguage:"ja"),s=>{var row=s.Blocks.GetBlock(Donut9aEditing.Key).Data.Slice(17*72,72);row[8]=6;var d=new DateTime(2026,1,2,3,4,5,6);DateRaw(row,d);BinaryPrimitives.WriteUInt64LittleEndian(row,(ulong)(d.Ticks-DateTime.UnixEpoch.Ticks)/10000);});
            Compare(data,new("reset",hash,17),s=>{var row=s.Blocks.GetBlock(Donut9aEditing.Key).Data.Slice(17*72,72);row.Clear();DateRaw(row,new DateTime(1970,1,1));});
            Compare(data,new("clone",hash,17),s=>{var block=s.Blocks.GetBlock(Donut9aEditing.Key).Data;byte[] source=block.Slice(17*72,72).ToArray();source[8]=6;for(int i=0;i<999;i++)source.CopyTo(block.Slice(i*72,72));});
            Compare(data,new("hex",hash,17,Hex:"FF GG"),s=>{var row=s.Blocks.GetBlock(Donut9aEditing.Key).Data.Slice(17*72,72);row[0]=255;row[8]=6;});
            Compare(data,new("import",hash,17,Hex:new string('0',144)),s=>{var row=s.Blocks.GetBlock(Donut9aEditing.Key).Data.Slice(17*72,72);row.Clear();DateRaw(row,new DateTime(1970,1,1));});
            Compare(data,new("patch",hash,17,[new("milliseconds","1234"),new("date","2025-02-03T04:05:06"),new("milliseconds","bad"),new("stars","")],UiLanguage:"en"),s=>{var row=s.Blocks.GetBlock(Donut9aEditing.Key).Data.Slice(17*72,72);row[8]=6;DateRaw(row,new DateTime(2025,2,3,4,5,6));BinaryPrimitives.WriteUInt64LittleEndian(row,0);});
            int flavor=c.Flavors.First(v=>v.GeneratorAllowed).Id;var request=new Dn9aEdit("generate",hash,17,Start:995,End:999,Flavors:[flavor],Now:"2026-01-02T03:04:05.006");var ticket=Donut9aSession.Prepare(Open(data),request,hash,data.Length);Check(ticket.ChangedEntries.SequenceEqual(new[]{17,995,996,997,998}),"Generator also saves current source controls outside its range");var result=Donut9aSession.Commit(data,new(ticket.Token,ticket.SourceHash,ticket.TargetHash));var generated=Open(result);for(int i=995;i<999;i++){var d=generated.Donuts.GetDonut(i);Check(d.Stars==5&&d.LevelBoost==84&&d.Calories==3600&&d.Flavor0==ulong.Parse(c.Flavors.Single(f=>f.Id==flavor).Hash,System.Globalization.NumberStyles.HexNumber)&&d.Flavor1==0&&d.Flavor2==0&&d.Reserved==0,"Source generator template and selected single flavor");}Reject(()=>Donut9aSession.Commit(data,new(ticket.Token,ticket.SourceHash,ticket.TargetHash)));
            var random=Donut9aSession.Prepare(Open(data),new("randomLv3",hash,17,Now:"2026-01-02T03:04:05.006"),hash,data.Length);var frozen=Donut9aSession.Commit(data,new(random.Token,random.SourceHash,random.TargetHash));Check(Br4Editing.Hash(frozen)==random.TargetHash&&Open(frozen).Donuts.GetDonut(998).GetFlavors().ToArray().Distinct().Count()==3,"Random preview committed byte-exact without reroll");
            var first=Donut9aSession.Prepare(Open(data),new("resave",hash,17),hash,data.Length);var second=Donut9aSession.Prepare(Open(data),new("resave",hash,0),hash,data.Length);Reject(()=>Donut9aSession.Commit(data,new(first.Token,first.SourceHash,first.TargetHash)));var changed=data.ToArray();changed[0]^=1;Reject(()=>Donut9aSession.Commit(changed,new(second.Token,second.SourceHash,second.TargetHash)));Donut9aSession.Discard(first.Token);Check(Donut9aSession.Commit(data,new(second.Token,second.SourceHash,second.TargetHash)).Length==data.Length,"Discard old token preserves current plan");
            foreach(var bad in new[]{new Dn9aEdit("patch",hash,999,[new("stars","1")],UiLanguage:"en"),new("generate",hash,Start:4,End:4,Flavors:[flavor],Now:"2026-01-02T03:04:05.006"),new("import",hash,Hex:"00"),new("resave",new string('0',64))})Reject(()=>Donut9aEditing.Prepare(Open(data),bad,hash,data.Length,out _));
            var failed=Donut9aSession.Prepare(Open(data),new("resave",hash,17),hash,data.Length);Reject(()=>Donut9aSession.Prepare(Open(data),new("import",hash,17,Hex:"00"),hash,data.Length));Reject(()=>Donut9aSession.Commit(data,new(failed.Token,failed.SourceHash,failed.TargetHash)));
            var failedFormat=Donut9aSession.Prepare(Open(data),new("resave",hash,17),hash,data.Length);Reject(()=>SaveService.PreviewDonut9a([1,2,3],"{}"));Reject(()=>Donut9aSession.Commit(data,new(failedFormat.Token,failedFormat.SourceHash,failedFormat.TargetHash)));
            var invalid=Open(data);BinaryPrimitives.WriteUInt32LittleEndian(invalid.Donuts.GetDonut(17).Data[0x20..],0xFFFFFFFF);Check(!Donut9aEditing.ReadEntry(invalid.Donuts.GetDonut(17),17).CanLoad,"Impossible source date is not silently repaired on read");Reject(()=>Donut9aEditing.Prepare(invalid,new("resave",hash,17),hash,data.Length,out _));
            Console.WriteLine($"PASS Donut9a revision {revision}: 999 physical slots, source scalar/choice/date/hex semantics, reserved bytes, profile, clone/reset/import, generator range, frozen randomness/session replacement/failed cleanup and full-file raw parity; typed synthetic only, no SaveService/real-save acceptance");
        }
    }
}

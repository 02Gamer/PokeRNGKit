// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Misc8bEditingTests
{
    private static void Check(bool v,string message){if(!v)throw new Exception(message);}
    private static SAV8BS Open(byte[] data)=>(SAV8BS)SaveUtil.GetSaveFile(data.ToArray())!;
    private static Misc8bCatalog Read(byte[] data)=>JsonSerializer.Deserialize(SaveService.ReadMisc8b(data),SaveJsonContext.Default.Misc8bCatalog)!;
    private static string Json(Misc8bEdit e)=>JsonSerializer.Serialize(e,SaveJsonContext.Default.Misc8bEdit);
    private static void Reject(Action action){try{action();throw new Exception("Invalid Misc8b edit accepted");}catch(ArgumentException){}}
    private static void I32(SAV8BS s,int offset,int value)=>BinaryPrimitives.WriteInt32LittleEndian(s.Data[offset..],value);
    private static void Flag(SAV8BS s,int i,int value)=>I32(s,0x7D4+4*i,value);
    private static void System(SAV8BS s,int i,int value)=>I32(s,0x4654+4*i,value);
    private static void Work(SAV8BS s,int i,int value)=>I32(s,4+4*i,value);
    private static void Item(SAV8BS s,ushort id)
    {
        var row=s.Data.Slice(0x563C+id*16,16);ushort sort=BinaryPrimitives.ReadUInt16LittleEndian(row[12..]);if(sort==0){ushort max=0;foreach(ushort other in ItemStorage8BDSP.GetLegal(ItemStorage8BDSP.GetInventoryPouch(id)))max=Math.Max(max,BinaryPrimitives.ReadUInt16LittleEndian(s.Data[(0x563C+other*16+12)..]));sort=unchecked((ushort)(max+1));}
        int seen=BinaryPrimitives.ReadInt32LittleEndian(row[4..]),favorite=BinaryPrimitives.ReadInt32LittleEndian(row[8..]);BinaryPrimitives.WriteInt32LittleEndian(row,1);BinaryPrimitives.WriteInt32LittleEndian(row[4..],seen==0?0:1);BinaryPrimitives.WriteInt32LittleEndian(row[8..],favorite==1?1:0);BinaryPrimitives.WriteUInt16LittleEndian(row[12..],sort);BinaryPrimitives.WriteUInt16LittleEndian(row[14..],0);
    }
    private static void Oracle(SAV8BS s,string action)
    {
        void Dex()=>I32(s,0x7A328+0x30B4,1);
        switch(action){case "spiritomb":for(int i=0;i<32;i++)s.Data[0x9A89C+0x273C+i]=(byte)(i+1);break;
            case "boxLegend":foreach(int i in new[]{308,393,1623})Flag(s,i,0);Work(s,84,5);break;
            case "shaymin":Dex();System(s,5,1);Work(s,276,1);Item(s,452);Flag(s,545,0);break;
            case "darkrai":Dex();Work(s,275,1);Item(s,454);Flag(s,301,0);break;
            case "arceus":Dex();Item(s,455);System(s,5,1);Flag(s,1508,1);Flag(s,244,0);Flag(s,531,0);Work(s,188,0);break;
            case "roamers":foreach(int i in new[]{249,420,245,532})Flag(s,i,0);s.Data[0x8F97C+0x158]=s.Data[0x8F97C+0x178]=0;break;
            case "zones":for(int i=134;i<=757;i++)System(s,i,1);foreach(int i in new[]{278,279,280,281,291,292})Work(s,i,1);break;
            case "fashion":for(int i=1246;i<=1257;i++)Flag(s,i,1);break;
            case "defeat":case "rebattle":for(int i=0;i<707;i++){I32(s,0x7D3E0+i*8,action=="defeat"?1:0);I32(s,0x7D3E0+i*8+4,action=="rebattle"?1:0);}break;
        }
    }
    private static byte[] Compare(byte[] data,string action)
    {
        var original=data.ToArray();var e=new Misc8bEdit(action,Read(data).SourceHash);var expected=Open(data);Oracle(expected,action);var p=JsonSerializer.Deserialize(SaveService.PreviewMisc8b(data,Json(e)),SaveJsonContext.Default.Misc8bPreview)!;var output=SaveService.EditMisc8b(data,Json(p.Request));Check(output.SequenceEqual(expected.Write().ToArray()),"Misc8b independent entire-file parity: "+action);Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i])),"Misc8b exact changed byte addresses");Check(p.Result.SourceHash==Br4Editing.Hash(output)&&p.Request.TargetHash==p.Result.SourceHash,"Misc8b frozen full target");Check(original.SequenceEqual(data),"Misc8b original immutable");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Misc8b export matches complete working copy");return output;
    }
    public static void Run()
    {
        var source=File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav");
        foreach(var version in new[]{GameVersion.BD,GameVersion.SP})foreach(var layout in new[]{(Revision:Gem8Version.V1_0,Length:0xE9828),(Revision:Gem8Version.V1_1,Length:0xEDC20),(Revision:Gem8Version.V1_2,Length:0xEED8C),(Revision:Gem8Version.V1_3,Length:0xEF0A4)})
        {
            var bytes=source[..layout.Length];BinaryPrimitives.WriteInt32LittleEndian(bytes,(int)layout.Revision);var s=new SAV8BS(bytes){Version=version};
            for(int i=0;i<500;i++)Work(s,i,unchecked(i*1234567));for(int i=0;i<4000;i++)Flag(s,i,i%3);for(int i=0;i<1000;i++)System(s,i,i%3);Flag(s,308,1);Work(s,84,0);I32(s,0x7A328+0x30B4,0);s.UgSaveData.ClearNPC();for(int i=0;i<30;i++)s.Data[0x9A89C+0x273C+i]=7;s.Data[0x9A89C+0x273C+99]=255;s.Data[0x8F97C+0x158]=2;s.Data[0x8F97C+0x178]=0;
            for(int i=0;i<707;i++){I32(s,0x7D3E0+i*8,i%3);I32(s,0x7D3E0+i*8+4,i%3);}
            foreach(ushort item in new ushort[]{452,454,455}){var row=s.Data.Slice(0x563C+item*16,16);row.Fill(0xAB);BinaryPrimitives.WriteUInt16LittleEndian(row[12..],0);}
            var data=s.Write().ToArray();var c=Read(data);Check(c.CanEdit&&c.Actions.Length==10&&c.Actions.All(a=>a.Enabled),"Misc8b exact source action readiness");Check(c.Values.Count(v=>v.Group=="system")==625&&c.Values.Count(v=>v.Group=="flag")==24,"Misc8b complete linked state snapshots");
            foreach(var a in c.Actions){var output=Compare(data,a.Key);if(a.Key is "spiritomb" or "shaymin" or "darkrai" or "arceus" or "boxLegend" or "roamers" or "rebattle" or "defeat"){Check(!Read(output).Actions.Single(v=>v.Key==a.Key).Enabled,"Misc8b source disabled after action");Reject(()=>SaveService.PreviewMisc8b(output,Json(new(a.Key,Read(output).SourceHash))));}else Check(Compare(output,a.Key).SequenceEqual(output),"Misc8b reopened source zones/fashion allow harmless no-op");}
            var ready=Open(data);ready.FlagWork.SetFlag(308,false);var notCaptured=ready.Write().ToArray();Check(!Read(notCaptured).Actions.Single(a=>a.Key=="boxLegend").Enabled,"Misc8b box legend captured prerequisite");Reject(()=>SaveService.PreviewMisc8b(notCaptured,Json(new("boxLegend",Read(notCaptured).SourceHash))));
            var both=Open(data);both.Encounter.Roamer1Encount=both.Encounter.Roamer2Encount=0;var inactive=both.Write().ToArray();Check(!Read(inactive).Actions.Single(a=>a.Key=="roamers").Enabled,"Misc8b both inactive roamers disabled");
            Reject(()=>SaveService.PreviewMisc8b(data,Json(new("unknown",c.SourceHash))));Reject(()=>SaveService.EditMisc8b(data,Json(new("zones",c.SourceHash))));Reject(()=>SaveService.PreviewMisc8b(data,Json(new("zones","0".PadLeft(64,'0')))));var corrupt=data.ToArray();corrupt[0x7D4]^=1;Check(!Read(corrupt).CanEdit,"Misc8b bad checksum is read-only");Reject(()=>SaveService.PreviewMisc8b(corrupt,Json(new("zones",Read(corrupt).SourceHash))));
            Console.WriteLine($"PASS Misc8b {version}/{layout.Revision}: all ten source actions/readiness, independent scalar/flag/item/NPC/trainer addresses, linked state, eight layouts, frozen full-file parity, original and atomic rejection");
        }
    }
}

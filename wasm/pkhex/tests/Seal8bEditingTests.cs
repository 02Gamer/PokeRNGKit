// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Seal8bEditingTests
{
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static SAV8BS Open(byte[] data)=>(SAV8BS)SaveUtil.GetSaveFile(data.ToArray())!;
    private static Seal8bCatalog Read(byte[] data)=>JsonSerializer.Deserialize(SaveService.ReadSeal8b(data),SaveJsonContext.Default.Seal8bCatalog)!;
    private static string Json(Seal8bEdit e)=>JsonSerializer.Serialize(e,SaveJsonContext.Default.Seal8bEdit);
    private static void Reject(Action a){try{a();throw new Exception("Invalid Seal8b edit accepted");}catch(ArgumentException){}}
    private static int I32(SAV8BS s,int index,int field)=>BinaryPrimitives.ReadInt32LittleEndian(s.Data[(0x93E0C+index*12+field)..]);
    private static void Set(SAV8BS s,int index,int field,int value)=>BinaryPrimitives.WriteInt32LittleEndian(s.Data[(0x93E0C+index*12+field)..],value);
    private static byte[] Compare(byte[] data,string action,Seal8bValue[]? changes=null)
    {
        var original=data.ToArray();var c=Read(data);var e=new Seal8bEdit(action,c.SourceHash,changes);var p=JsonSerializer.Deserialize(SaveService.PreviewSeal8b(data,Json(e)),SaveJsonContext.Default.Seal8bPreview)!;var expected=Open(data);
        if(changes is {} rows)foreach(var v in rows){if(v.Count is {} count)Set(expected,v.Index,4,count);if(v.Total is {} total)Set(expected,v.Index,8,total);if(v.Obtained is {} obtained)Set(expected,v.Index,0,obtained?1:0);}
        for(int i=1;i<=96;i++){if(action=="all"){Set(expected,i,4,unchecked(I32(expected,i,4)+unchecked(99-I32(expected,i,8))));Set(expected,i,8,99);Set(expected,i,0,1);}else if(action=="none"){Set(expected,i,0,0);Set(expected,i,4,0);Set(expected,i,8,0);}}
        for(int i=0;i<200;i++)Set(expected,i,0,I32(expected,i,0)==1?1:0);
        var output=SaveService.EditSeal8b(data,Json(p.Request));Check(output.SequenceEqual(expected.Write().ToArray()),"Seal8b independent entire-file parity "+action);Check(data.SequenceEqual(original),"Seal8b original immutable");Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i])),"Seal8b exact offsets");Check(p.Request.TargetHash==p.Result.SourceHash&&p.Result.SourceHash==Br4Editing.Hash(output),"Seal8b frozen target");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Seal8b exact export");return output;
    }
    public static void Run()
    {
        var fixture=File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav");
        foreach(var version in new[]{GameVersion.BD,GameVersion.SP})foreach(var layout in new[]{(Revision:Gem8Version.V1_0,Length:0xE9828),(Revision:Gem8Version.V1_1,Length:0xEDC20),(Revision:Gem8Version.V1_2,Length:0xEED8C),(Revision:Gem8Version.V1_3,Length:0xEF0A4)})
        {
            var raw=fixture[..layout.Length];BinaryPrimitives.WriteInt32LittleEndian(raw,(int)layout.Revision);var s=new SAV8BS(raw){Version=version};for(int i=0;i<200;i++){Set(s,i,0,i%4);Set(s,i,4,i%2==0?int.MinValue+i:int.MaxValue-i);Set(s,i,8,i%3==0?int.MinValue+i:int.MaxValue-i);}
            var data=s.Write().ToArray();var c=Read(data);Check(c.CanEdit&&c.Entries.Length==96&&c.Entries.First().Index==1&&c.Entries.Last().Index==96&&c.RawObtained.Length==200,"Seal8b source visible/hidden records");Check(c.Entries.All(v=>v.Name.Zh.Length>0&&v.Name.En.Length>0&&v.Name.Ja.Length>0),"Seal8b source three-language names");
            foreach(var action in new[]{"all","none","resave"})Compare(data,action);
            Compare(data,"patch",[new(1,int.MinValue,int.MaxValue,true),new(96,0,-1,false)]);Compare(data,"all",[new(1,int.MaxValue,int.MinValue,true)]);var cleared=Compare(data,"none");Check(Compare(cleared,"resave").SequenceEqual(cleared),"Seal8b source no-op after normalization");
            foreach(var changes in new[]{new[]{new Seal8bValue(0,1)},new[]{new Seal8bValue(97,1)},new[]{new Seal8bValue(1,1),new Seal8bValue(1,2)},new[]{new Seal8bValue(1)}})Reject(()=>SaveService.PreviewSeal8b(data,Json(new("patch",c.SourceHash,changes))));
            Reject(()=>SaveService.PreviewSeal8b(data,Json(new("unknown",c.SourceHash))));Reject(()=>SaveService.PreviewSeal8b(data,Json(new("patch",c.SourceHash))));Reject(()=>SaveService.EditSeal8b(data,Json(new("all",c.SourceHash))));Reject(()=>SaveService.PreviewSeal8b(data,Json(new("all",new string('0',64)))));var p=JsonSerializer.Deserialize(SaveService.PreviewSeal8b(data,Json(new("all",c.SourceHash))),SaveJsonContext.Default.Seal8bPreview)!;Reject(()=>SaveService.EditSeal8b(data,Json(p.Request with{TargetHash=new string('0',64)})));var bad=data.ToArray();bad[0x93E0C]^=1;Check(!Read(bad).CanEdit,"Seal8b bad CRC readonly");Reject(()=>SaveService.PreviewSeal8b(bad,Json(new("all",Read(bad).SourceHash))));
            Console.WriteLine($"PASS Seal8b {version}/{layout.Revision}: 96 visible/200 physical records, signed Int32 boundaries/wrap, drafts/all/none/resave, hidden normalization, independent full-file parity, frozen/CRC/atomic rejection and original");
        }
    }
}

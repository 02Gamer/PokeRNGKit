// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using System.Text.RegularExpressions;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Underground8bEditingTests
{
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static SAV8BS Open(byte[] data)=>(SAV8BS)SaveUtil.GetSaveFile(data.ToArray())!;
    private static Ug8bCatalog Read(byte[] data)=>JsonSerializer.Deserialize(SaveService.ReadUnderground8b(data),SaveJsonContext.Default.Ug8bCatalog)!;
    private static string Json(Ug8bEdit e)=>JsonSerializer.Serialize(e,SaveJsonContext.Default.Ug8bEdit);
    private static void Reject(Action a){try{a();throw new Exception("Invalid Underground8b edit accepted");}catch(ArgumentException){}}
    private static int Get(SAV8BS s,int i,int field)=>BinaryPrimitives.ReadInt32LittleEndian(s.Data[(0x111BC+i*12+field)..]);
    private static void Set(SAV8BS s,int i,int field,int value)=>BinaryPrimitives.WriteInt32LittleEndian(s.Data[(0x111BC+i*12+field)..],value);
    private static Dictionary<int,(string Type,int Max)> SourceRows()
    {
        var source=File.ReadAllText("third_party/pkhex/PKHeX.Core/Saves/Substructures/Gen8/BS/UgItemUtil.cs");var result=new Dictionary<int,(string,int)>();foreach(Match m in Regex.Matches(source,@"new\(\s*(\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)\)")){var v=Enumerable.Range(1,5).Select(i=>int.Parse(m.Groups[i].Value)).ToArray();string type=v[2]>0?"Sphere":v[1]>0?"Item":v[4]>0?"Statue":v[3]>0?"Pedestal":"None";if(type!="None")result.Add(v[0],(type,type is "Statue" or "Pedestal"?99:999));}return result;
    }
    private static byte[] Compare(byte[] data,string action,Dictionary<int,(string Type,int Max)> source,Ug8bValue[]? changes=null)
    {
        var original=data.ToArray();var c=Read(data);var p=JsonSerializer.Deserialize(SaveService.PreviewUnderground8b(data,Json(new(action,c.SourceHash,changes))),SaveJsonContext.Default.Ug8bPreview)!;var expected=Open(data);
        if(changes is {} rows)foreach(var v in rows){if(v.Count is {} count)Set(expected,v.Index,0,count);if(v.New is {} n)Set(expected,v.Index,4,n?0:1);if(v.Favorite is {} f)Set(expected,v.Index,8,f?1:0);}
        foreach(var (i,v) in source){if(action=="all")Set(expected,i,0,v.Max);else if(action=="none"){Set(expected,i,0,0);Set(expected,i,4,0);Set(expected,i,8,0);}}
        for(int i=0;i<999;i++){Set(expected,i,4,Get(expected,i,4)==1?1:0);Set(expected,i,8,Get(expected,i,8)==1?1:0);}
        var output=SaveService.EditUnderground8b(data,Json(p.Request));Check(output.SequenceEqual(expected.Write().ToArray()),"Underground8b independent entire-file parity "+action);Check(data.SequenceEqual(original),"Underground8b original immutable");Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i])),"Underground8b exact offsets");Check(p.Request.TargetHash==p.Result.SourceHash&&p.Result.SourceHash==Br4Editing.Hash(output),"Underground8b frozen target");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Underground8b full export");return output;
    }
    public static void Run()
    {
        var fixture=File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav");var source=SourceRows();Check(source.Values.Select(v=>v.Type).Distinct().Count()==4,"Underground8b all source categories");
        foreach(var version in new[]{GameVersion.BD,GameVersion.SP})foreach(var layout in new[]{(Revision:Gem8Version.V1_0,Length:0xE9828),(Revision:Gem8Version.V1_1,Length:0xEDC20),(Revision:Gem8Version.V1_2,Length:0xEED8C),(Revision:Gem8Version.V1_3,Length:0xEF0A4)})
        {
            var raw=fixture[..layout.Length];BinaryPrimitives.WriteInt32LittleEndian(raw,(int)layout.Revision);var s=new SAV8BS(raw){Version=version};for(int i=0;i<999;i++){Set(s,i,0,i%2==0?int.MinValue+i:int.MaxValue-i);Set(s,i,4,i%4);Set(s,i,8,(i+1)%4);}
            var data=s.Write().ToArray();var c=Read(data);Check(c.CanEdit&&c.Entries.Select(v=>v.Index).SequenceEqual(source.Keys)&&c.RawHideNew.Length==999&&c.RawFavorite.Length==999,"Underground8b exact source visible/physical indices");Check(c.Entries.All(v=>v.Type==source[v.Index].Type&&v.Maximum==source[v.Index].Max&&v.Name.Zh.Length>0&&v.Name.En.Length>0&&v.Name.Ja.Length>0),"Underground8b source names/types/maxima");
            foreach(var action in new[]{"all","none","resave"})Compare(data,action,source);Compare(data,"patch",source,[new(1,int.MinValue,true,false),new(492,int.MaxValue,false,true)]);Compare(data,"all",source,[new(1,-5,false,true)]);var none=Compare(data,"none",source);Check(Compare(none,"resave",source).SequenceEqual(none),"Underground8b normalized no-op");
            foreach(var entries in new[]{new[]{new Ug8bValue(0,1)},new[]{new Ug8bValue(998,1)},new[]{new Ug8bValue(1)},new[]{new Ug8bValue(1,1),new Ug8bValue(1,2)}})Reject(()=>SaveService.PreviewUnderground8b(data,Json(new("patch",c.SourceHash,entries))));Reject(()=>SaveService.PreviewUnderground8b(data,Json(new("unknown",c.SourceHash))));Reject(()=>SaveService.EditUnderground8b(data,Json(new("all",c.SourceHash))));Reject(()=>SaveService.PreviewUnderground8b(data,Json(new("all",new string('0',64)))));var p=JsonSerializer.Deserialize(SaveService.PreviewUnderground8b(data,Json(new("all",c.SourceHash))),SaveJsonContext.Default.Ug8bPreview)!;Reject(()=>SaveService.EditUnderground8b(data,Json(p.Request with{TargetHash=new string('0',64)})));var bad=data.ToArray();bad[0x111BC]^=1;Check(!Read(bad).CanEdit,"Underground8b invalid CRC readonly");Reject(()=>SaveService.PreviewUnderground8b(bad,Json(new("all",Read(bad).SourceHash))));
            Console.WriteLine($"PASS Underground8b {version}/{layout.Revision}: {source.Count} source rows/999 physical records, four types/maxima, Int32 extremes, New inversion/favorite, all/none/drafts/resave, hidden normalization, independent full-file parity, CRC/frozen rejection/original");
        }
    }
}

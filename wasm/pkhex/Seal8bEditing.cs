// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Seal8bEntry(int Index,LocalizedText Name,int Count,int Total,bool Obtained,uint RawObtained);
public sealed record Seal8bCatalog(bool CanEdit,string SourceHash,Seal8bEntry[] Entries,uint[] RawObtained);
public sealed record Seal8bValue(int Index,int? Count=null,int? Total=null,bool? Obtained=null);
public sealed record Seal8bEdit(string Action,string? SourceHash,Seal8bValue[]? Entries=null,string? TargetHash=null);
public sealed record Seal8bPreview(Seal8bEdit Request,Seal8bCatalog Result,int[] ChangedOffsets);
internal static class Seal8bEditing
{
    private static readonly string[][] Names=new[]{"zh-Hans","en","ja"}.Select(l=>Util.GetStringList("stickers",l)).ToArray();
    internal static SAV8BS Save(SaveFile save)=>save is SAV8BS s?s:throw new ArgumentException("Seal8b requires Brilliant Diamond/Shining Pearl.");
    private static bool Visible(int i)=>i<Names[1].Length&&Names[1][i].Length!=0;
    internal static Seal8bCatalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var raw=Enumerable.Range(0,200).Select(i=>BinaryPrimitives.ReadUInt32LittleEndian(s.SealList.Data[(i*12)..])).ToArray();
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,s.SealList.ReadItems().Where(v=>Visible(v.Index)).Select(v=>new Seal8bEntry(v.Index,new(Names[0][v.Index],Names[1][v.Index],Names[2][v.Index]),v.Count,v.TotalCount,v.IsGet,raw[v.Index])).ToArray(),raw);
    }
    internal static byte[] Prepare(SaveFile save,Seal8bEdit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Seal8b editing requires valid checksums.");if(e.SourceHash!=hash)throw new ArgumentException("Seal8b preview is stale.");
        if(e.Action is not ("patch" or "all" or "none" or "resave"))throw new ArgumentException("Invalid Seal8b action.");
        if(e.Entries is {} changes&&(changes.Length<1||changes.Length>200||changes.Select(v=>v.Index).Distinct().Count()!=changes.Length||changes.Any(v=>v.Index<0||v.Index>=200||!Visible(v.Index)||(v.Count is null&&v.Total is null&&v.Obtained is null))))throw new ArgumentException("Invalid Seal8b entries.");
        if(e.Action=="patch"&&e.Entries is null)throw new ArgumentException("Missing Seal8b changes.");
        var copy=(SAV8BS)s.Clone();var items=copy.SealList.ReadItems();
        if(e.Entries is {} rows)foreach(var v in rows){var item=items[v.Index];if(v.Count is {} c)item.Count=c;if(v.Total is {} t)item.TotalCount=t;if(v.Obtained is {} g)item.IsGet=g;}
        if(e.Action is "all" or "none")foreach(var v in items.Where(v=>Visible(v.Index))){if(e.Action=="all"){v.Count=unchecked(v.Count+unchecked(99-v.TotalCount));v.TotalCount=99;v.IsGet=true;}else{v.Count=v.TotalCount=0;v.IsGet=false;}}
        // The source Save button writes all 200 rows, including hidden IsGet normalization.
        copy.SealList.WriteItems(items);var output=copy.Write().ToArray();var parsed=SaveUtil.GetSaveFile(output.ToArray());
        if(parsed is not SAV8BS p||p.Version!=copy.Version||p.SaveRevision!=s.SaveRevision||output.Length!=length||!SaveChecksums.Valid(p)||!p.Data.SequenceEqual(copy.Data))throw new InvalidOperationException("Seal8b export verification failed.");
        if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Seal8b preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Seal8bEdit ParseSeal8b(string json)=>json.Length>30000?throw new ArgumentException("Seal8b request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Seal8bEdit)??throw new ArgumentException("Missing Seal8b edit.");
    public static string ReadSeal8b(byte[] data)=>JsonSerializer.Serialize(Seal8bEditing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Seal8bCatalog);
    public static string PreviewSeal8b(byte[] data,string json){var e=ParseSeal8b(json);var output=Seal8bEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Seal8bPreview(e with{TargetHash=hash},Seal8bEditing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Seal8bPreview);}
    public static byte[] EditSeal8b(byte[] data,string json){var e=ParseSeal8b(json);if(e.TargetHash is null)throw new ArgumentException("Seal8b requires a frozen preview.");return Seal8bEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
}

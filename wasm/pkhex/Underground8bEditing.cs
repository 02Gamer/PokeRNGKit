// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Ug8bEntry(int Index,string Type,LocalizedText Name,int Maximum,int Count,bool New,bool Favorite,uint RawHideNew,uint RawFavorite);
public sealed record Ug8bCatalog(bool CanEdit,string SourceHash,Ug8bEntry[] Entries,uint[] RawHideNew,uint[] RawFavorite);
public sealed record Ug8bValue(int Index,int? Count=null,bool? New=null,bool? Favorite=null);
public sealed record Ug8bEdit(string Action,string? SourceHash,Ug8bValue[]? Entries=null,string? TargetHash=null);
public sealed record Ug8bPreview(Ug8bEdit Request,Ug8bCatalog Result,int[] ChangedOffsets);
internal static class Underground8bEditing
{
    private static readonly string[][] Names=new[]{"zh-Hans","en","ja"}.Select(l=>Util.GetStringList("ug_item",l)).ToArray();
    internal static SAV8BS Save(SaveFile save)=>save is SAV8BS s?s:throw new ArgumentException("Underground8b requires Brilliant Diamond/Shining Pearl.");
    internal static Ug8bCatalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var hidden=Enumerable.Range(0,999).Select(i=>BinaryPrimitives.ReadUInt32LittleEndian(s.Underground.Data[(i*12+4)..])).ToArray();var favorite=Enumerable.Range(0,999).Select(i=>BinaryPrimitives.ReadUInt32LittleEndian(s.Underground.Data[(i*12+8)..])).ToArray();
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,s.Underground.ReadItems().Where(v=>v.Type!=UgItemType.None).Select(v=>new Ug8bEntry(v.Index,v.Type.ToString(),new(Names[0][v.Index],Names[1][v.Index],Names[2][v.Index]),v.MaxValue,v.Count,!v.HideNewFlag,v.IsFavoriteFlag,hidden[v.Index],favorite[v.Index])).ToArray(),hidden,favorite);
    }
    internal static byte[] Prepare(SaveFile save,Ug8bEdit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Underground8b editing requires valid checksums.");if(e.SourceHash!=hash)throw new ArgumentException("Underground8b preview is stale.");
        if(e.Action is not ("patch" or "all" or "none" or "resave"))throw new ArgumentException("Invalid Underground8b action.");
        if(e.Entries is {} changes&&(changes.Length<1||changes.Length>999||changes.Select(v=>v.Index).Distinct().Count()!=changes.Length||changes.Any(v=>v.Index<0||v.Index>=999||UgItemUtil.GetType(v.Index)==UgItemType.None||(v.Count is null&&v.New is null&&v.Favorite is null))))throw new ArgumentException("Invalid Underground8b entries.");
        if(e.Action=="patch"&&e.Entries is null)throw new ArgumentException("Missing Underground8b changes.");var copy=(SAV8BS)s.Clone();var items=copy.Underground.ReadItems();
        if(e.Entries is {} rows)foreach(var v in rows){var item=items[v.Index];if(v.Count is {} c)item.Count=c;if(v.New is {} n)item.HideNewFlag=!n;if(v.Favorite is {} f)item.IsFavoriteFlag=f;}
        if(e.Action is "all" or "none")foreach(var v in items.Where(v=>v.Type!=UgItemType.None)){if(e.Action=="all")v.Count=v.MaxValue;else{v.Count=0;v.HideNewFlag=false;v.IsFavoriteFlag=false;}}
        copy.Underground.WriteItems(items);var output=copy.Write().ToArray();var parsed=SaveUtil.GetSaveFile(output.ToArray());
        if(parsed is not SAV8BS p||p.Version!=copy.Version||p.SaveRevision!=s.SaveRevision||output.Length!=length||!SaveChecksums.Valid(p)||!p.Data.SequenceEqual(copy.Data))throw new InvalidOperationException("Underground8b export verification failed.");
        if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Underground8b preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Ug8bEdit ParseUnderground8b(string json)=>json.Length>100000?throw new ArgumentException("Underground8b request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Ug8bEdit)??throw new ArgumentException("Missing Underground8b edit.");
    public static string ReadUnderground8b(byte[] data)=>JsonSerializer.Serialize(Underground8bEditing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Ug8bCatalog);
    public static string PreviewUnderground8b(byte[] data,string json){var e=ParseUnderground8b(json);var output=Underground8bEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Ug8bPreview(e with{TargetHash=hash},Underground8bEditing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Ug8bPreview);}
    public static byte[] EditUnderground8b(byte[] data,string json){var e=ParseUnderground8b(json);if(e.TargetHash is null)throw new ArgumentException("Underground8b requires a frozen preview.");return Underground8bEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
}

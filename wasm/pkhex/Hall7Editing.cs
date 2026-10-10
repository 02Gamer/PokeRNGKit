// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;
public sealed record Hall7Member(int Index,int Species,bool Known,LocalizedText Name,string Sprite);
public sealed record Hall7Catalog(bool CanEdit,string SourceHash,Hall7Member[] Members,OriginChoice[] Species,string? Ec);
public sealed record Hall7Value(int Index,int Species);
public sealed record Hall7Edit(string Action,string? SourceHash,Hall7Value[]? Members=null,string? Ec=null,string? TargetHash=null);
public sealed record Hall7Preview(Hall7Edit Request,Hall7Catalog Result,int[] ChangedOffsets);
internal static class Hall7Editing
{
    private static SAV7 Save(SaveFile save)=>save is SAV7SM or SAV7USUM?(SAV7)save:throw new ArgumentException("Hall7 requires Sun/Moon or Ultra Sun/Ultra Moon.");
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<(Type,GameVersion),OriginChoice[]> Cache=new();
    private static OriginChoice[] Choices(SAV7 s)=>Cache.GetOrAdd((s.GetType(),s.Version),_=>{var strings=new[]{"zh-Hans","en","ja"}.Select(GameInfo.GetStrings).ToArray();var rows=new FilteredGameDataSource(s,new GameDataSource(strings[1])).Species;return rows.Select(v=>new OriginChoice(v.Value,new(strings[0].specieslist[v.Value],strings[1].specieslist[v.Value],strings[2].specieslist[v.Value]))).ToArray();});
    internal static Hall7Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var choices=Choices(s);var names=choices.ToDictionary(v=>v.Id,v=>v.Name);
        var members=Enumerable.Range(0,12).Select(i=>{int species=s.EventWork.Fame.GetEntry(i);bool known=names.TryGetValue(species,out var name);return new Hall7Member(i,species,known,name??new($"未知种类 ({species})",$"Unknown species ({species})",$"不明な種類 ({species})"),known&&species!=0?"b"+SpriteName.GetResourceStringSprite((ushort)species,0,0,0,s.Context):"");}).ToArray();
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,members,choices,s is SAV7USUM uu?uu.Misc.StarterEncryptionConstant.ToString("X8"):null);
    }
    internal static byte[] Prepare(SaveFile save,Hall7Edit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Hall7 editing requires valid checksums.");if(e.SourceHash!=hash)throw new ArgumentException("Hall7 preview is stale.");
        var choices=Choices(s).Select(v=>v.Id).ToHashSet();
        if(e.Ec is not null&&(s is not SAV7USUM||e.Ec.Length>8))throw new ArgumentException("Hall7 starter encryption constant requires USUM and at most eight characters.");
        var copy=(SAV7)s.Clone();
        switch(e.Action)
        {
            case "patch":
                if(e.Members is null&&e.Ec is null)throw new ArgumentException("Missing Hall7 changes.");
                if(e.Members is {} rows){if(rows.Length<1||rows.Length>12||rows.Any(v=>v.Index<0||v.Index>=12||!choices.Contains(v.Species))||rows.Select(v=>v.Index).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid Hall7 members.");foreach(var row in rows)copy.EventWork.Fame.SetEntry(row.Index,(ushort)row.Species);}
                if(e.Ec is {} ec)((SAV7USUM)copy).Misc.StarterEncryptionConstant=Util.GetHexValue(ec);
                break;
            case "resave":
                if(e.Members is not null||e.Ec is not null)throw new ArgumentException("Invalid Hall7 source resave fields.");
                // WinFormsUtil.GetIndex returns 0 for an unselected (unknown) source species.
                for(int i=0;i<12;i++){int species=copy.EventWork.Fame.GetEntry(i);copy.EventWork.Fame.SetEntry(i,choices.Contains(species)?(ushort)species:(ushort)0);}
                if(copy is SAV7USUM uu)uu.Misc.StarterEncryptionConstant=Util.GetHexValue(uu.Misc.StarterEncryptionConstant.ToString("X8"));
                break;
            default:throw new ArgumentException("Invalid Hall7 action.");
        }
        var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray());
        if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!check.Data.SequenceEqual(copy.Data))throw new InvalidOperationException("Hall7 export verification failed.");
        if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Hall7 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Hall7Edit ParseHall7(string json)=>json.Length>5000?throw new ArgumentException("Hall7 request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Hall7Edit)??throw new ArgumentException("Missing Hall7 edit.");
    public static string ReadHall7(byte[] data)=>JsonSerializer.Serialize(Hall7Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Hall7Catalog);
    public static string PreviewHall7(byte[] data,string json){var e=ParseHall7(json);var output=Hall7Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Hall7Preview(e with{TargetHash=hash},Hall7Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Hall7Preview);}
    public static byte[] EditHall7(byte[] data,string json){var e=ParseHall7(json);if(e.TargetHash is null)throw new ArgumentException("Hall7 requires a frozen preview.");return Hall7Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
}

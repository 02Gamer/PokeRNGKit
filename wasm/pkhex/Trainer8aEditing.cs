// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Tr8aCatalog(bool CanEdit,string SourceHash,TrGGField[] Fields,Tr7Ids Ids,Tr6Position Position,string Map,string NameTrash,string CoordinateRaw,string StartedRaw,string SavedRaw,int[] Characters,OriginChoice[] TrashSpecies,OriginChoice[] TrashLanguages);
public sealed record Tr8aEdit(string Action,string? SourceHash,Tr7Value[]? Fields=null,string? TargetHash=null,string? UiLanguage=null,Hall6Trash? Trash=null);
public sealed record Tr8aPreview(Tr8aEdit Request,Tr8aCatalog Result,int[] ChangedOffsets,string[] IgnoredFields);
internal static class Trainer8aEditing
{
    private static readonly CultureInfo Culture=CultureInfo.InvariantCulture;
    private static readonly uint[] ExtraKeys=[SaveBlockAccessor8LA.KMeritCurrent,SaveBlockAccessor8LA.KMeritEarnedTotal,SaveBlockAccessor8LA.KExpeditionTeamRank,SaveBlockAccessor8LA.KSatchelUpgrades];
    private static readonly string[] ExtraNames=["merit","meritTotal","rank","satchel"];
    internal static SAV8LA Save(SaveFile save)=>save is SAV8LA s?s:throw new ArgumentException("Trainer8a requires Legends: Arceus.");
    private static string Text(long n)=>n.ToString(Culture);
    private static string DateText(Func<DateTime> read){try{return read().ToString("yyyy-MM-dd'T'HH:mm:ss",Culture);}catch(ArgumentOutOfRangeException){return "";}}
    internal static TrGGField[] Fields(SAV8LA s)
    {
        var languages=GameInfo.LanguageDataSource(s.Generation,s.Context).Select(v=>new OriginChoice(v.Value,new(GameInfo.GetStrings("zh-Hans").languageNames[v.Value],GameInfo.GetStrings("en").languageNames[v.Value],GameInfo.GetStrings("ja").languageNames[v.Value]))).ToArray();var result=new List<TrGGField>();void Number(string key,LocalizedText name,long value,int width,long max,OriginChoice[]? choices=null)=>result.Add(new(key,name,Text(value),choices is null?"number":"choice",width,"0",Text(max),choices??[]));
        result.Add(new("name",new("训练家姓名","Trainer name","トレーナー名"),s.OT,"text",12,"","",[]));Number("money",new("金钱","Money","おこづかい"),s.Money,7,9999999);Number("gender",new("性别","Gender","性別"),s.Gender,1,1,[new(0,new("男","Male","男性")),new(1,new("女","Female","女性"))]);Number("language",new("语言","Language","言語"),s.Language,3,255,languages);Number("hours",new("小时","Hours","時間"),s.PlayedHours,5,65535);Number("minutes",new("分钟","Minutes","分"),s.PlayedMinutes,2,99);Number("seconds",new("秒","Seconds","秒"),s.PlayedSeconds,2,99);
        result.Add(new("started",new("冒险开始时间","Adventure started","冒険開始時刻"),DateText(()=>s.AdventureStart.Timestamp),"date",19,"2000-01-01T00:00:00","2099-12-31T23:59:59",[]));result.Add(new("saved",new("最后保存时间","Last saved","最後のセーブ時刻"),DateText(()=>s.LastSaved.Timestamp),"date",19,"2000-01-01T00:00:00","2099-12-31T23:59:59",[]));LocalizedText[] names=[new("当前功勋点","Current Merit Points","現在のFP"),new("累计功勋点","Total Merit Points","獲得FP累計"),new("调查队等级","Expedition Team rank","団員ランク"),new("腰包扩充次数","Satchel upgrades","ポーチ拡張回数")];for(int i=0;i<4;i++)Number(ExtraNames[i],names[i],s.GetValue<uint>(ExtraKeys[i]),9,999999999);return result.ToArray();
    }
    private static decimal[] Coordinates(SAV8LA s){var p=s.Coordinates;return[(decimal)(double)p.X,(decimal)(double)p.Z,(decimal)(double)p.Y,(decimal)(Math.Atan2(p.RZ,p.RW)*360/Math.PI)];}
    internal static Tr6Position Position(SAV8LA s)
    {
        string[] keys=["x","z","y","rotation"];decimal[]? values=null;try{values=Coordinates(s);}catch(OverflowException){}bool valid=values is not null&&values.All(v=>v>=-99999999&&v<=99999999);return new(valid,Enumerable.Range(0,4).Select(i=>new Tr6PositionField(keys[i],values is null?"":values[i].ToString(Culture),values is null?"":values[i].ToString("F6",Culture),"-99999999","99999999",6)).ToArray());
    }
    internal static Tr8aCatalog Read(SaveFile save,string hash){var s=Save(save);return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,Fields(s),new(s.GetTrainerTID7(),s.GetTrainerSID7(),s.ID32,s.GetTSV(8)),Position(s),s.Coordinates.M,Convert.ToHexString(s.MyStatus.OriginalTrainerTrash),Convert.ToHexString(s.Coordinates.Data),Convert.ToHexString(s.Blocks.GetBlock(0xAEE903A2).Data),Convert.ToHexString(s.Blocks.GetBlock(0x1B1E3D8B).Data),Hall6TrashEditing.Chars,Hall6TrashEditing.Species.Value,Hall6TrashEditing.Languages.Value);}
    internal static void Patch(SAV8LA s,Tr7Value[] rows)
    {
        var fields=Fields(s);if(rows.Length<1||rows.Length>fields.Length||rows.Select(v=>v.Key).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid Trainer8a field list.");foreach(var v in rows){var f=fields.SingleOrDefault(f=>f.Key==v.Key);if(f is null||v.Value is null||v.Value.Length>f.MaxLength)throw new ArgumentException("Invalid Trainer8a field.");if(f.Kind=="text"){if(v.Value.Any(char.IsControl))throw new ArgumentException("Invalid Trainer8a name.");if(s.OT!=v.Value)s.OT=v.Value;continue;}if(f.Kind=="date"){if(!DateTime.TryParseExact(v.Value,"yyyy-MM-dd'T'HH:mm:ss",Culture,DateTimeStyles.None,out var d)||d.Date<new DateTime(2000,1,1)||d.Date>new DateTime(2099,12,31))throw new ArgumentException("Invalid Trainer8a date.");if(v.Key=="started")s.AdventureStart.Timestamp=d;else s.LastSaved.Timestamp=d;continue;}if(!uint.TryParse(v.Value.Length==0?"0":v.Value,NumberStyles.None,Culture,out var n)||n>uint.Parse(f.Max,Culture)||f.Kind=="choice"&&!f.Choices.Any(c=>c.Id==n))throw new ArgumentException("Invalid Trainer8a number.");switch(v.Key){case"money":s.Money=n;break;case"gender":s.Gender=(byte)n;break;case"language":s.Language=(int)n;break;case"hours":s.PlayedHours=(int)n;break;case"minutes":s.PlayedMinutes=(int)n%60;break;case"seconds":s.PlayedSeconds=(int)n%60;break;default:int i=Array.IndexOf(ExtraNames,v.Key);s.SetValue(ExtraKeys[i],n);break;}}
    }
    private static string[] ApplyPosition(SAV8LA s,Tr7Value[] rows,string? language)
    {
        if(!Position(s).CanEdit)throw new ArgumentException("Trainer8a source coordinates cannot load.");string[] keys=["x","z","y","rotation"];if(rows.Length<1||rows.Length>5||rows.Select(v=>v.Key).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid Trainer8a coordinate list.");var values=Coordinates(s);string map=s.Coordinates.M;bool dirty=values.Any(v=>v!=0);var ignored=new List<string>();var culture=SuperTrain6Editing.Culture(language);foreach(var row in rows){if(row.Value is null||row.Value.Length>(row.Key=="map"?48:32767))throw new ArgumentException("Invalid Trainer8a coordinate text.");if(row.Key=="map"){map=row.Value;continue;}int i=Array.IndexOf(keys,row.Key);if(i<0)throw new ArgumentException("Invalid Trainer8a coordinate.");if(!decimal.TryParse(row.Value,NumberStyles.Number,culture,out var n)){ignored.Add(row.Key);continue;}n=Math.Clamp(n,-99999999,99999999);if(n!=values[i]){values[i]=n;dirty=true;}}
        // Map text has no handler, but nonzero NumericUpDown values already mark the source dirty on load.
        if(dirty){var p=s.Coordinates;p.M=map;p.X=(float)values[0];p.Z=(float)values[1];p.Y=(float)values[2];double angle=(double)values[3]*Math.PI/360;p.RX=0;p.RZ=(float)Math.Sin(angle);p.RY=0;p.RW=(float)Math.Cos(angle);}else if(map!=s.Coordinates.M)ignored.Add("map");return ignored.ToArray();
    }
    private static void Resave(SAV8LA s)
    {
        if(s.Gender>1||s.PlayedHours<0||s.PlayedHours>65535)throw new ArgumentException("Trainer8a source controls cannot load.");var fields=Fields(s);var rows=fields.Where(f=>f.Key is not("name"or"hours")).Select(f=>new Tr7Value(f.Key,f.Key is "minutes"or"seconds"?f.Value[..Math.Min(2,f.Value.Length)]:Array.IndexOf(ExtraNames,f.Key)>=0?Math.Min(uint.Parse(f.Value,Culture),999999999u).ToString(Culture):f.Value)).ToArray();Patch(s,rows);
        // This source window has no Loading guard: loading nonzero NumericUpDown values fires MapUpdated.
        if(Position(s).CanEdit){var values=Coordinates(s);if(values.Any(v=>v!=0)){var p=s.Coordinates;p.M=p.M;p.X=(float)values[0];p.Z=(float)values[1];p.Y=(float)values[2];double angle=(double)values[3]*Math.PI/360;p.RX=0;p.RZ=(float)Math.Sin(angle);p.RY=0;p.RW=(float)Math.Cos(angle);}}
    }
    internal static byte[] Prepare(SaveFile save,Tr8aEdit e,string hash,int length,out string[] ignored)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Trainer8a requires valid checksums.");if(e.SourceHash!=hash)throw new ArgumentException("Trainer8a preview is stale.");var copy=(SAV8LA)s.Clone();ignored=[];if(e.Action is not("patch"or"ids"or"position")&&e.Fields is not null||e.Action!="position"&&e.UiLanguage is not null||e.Action!="trash"&&e.Trash is not null)throw new ArgumentException("Invalid Trainer8a action fields.");switch(e.Action){case"patch":Patch(copy,e.Fields??throw new ArgumentException("Missing Trainer8a fields."));break;case"ids":Trainer7Editing.Ids(copy,e.Fields??throw new ArgumentException("Missing Trainer8a IDs."));break;case"position":ignored=ApplyPosition(copy,e.Fields??throw new ArgumentException("Missing Trainer8a coordinates."),e.UiLanguage);break;case"resave":Resave(copy);break;case"trash":Trainer7Editing.Trash(copy,copy.MyStatus.OriginalTrainerTrash,copy.OT,v=>copy.OT=v,e.Trash??throw new ArgumentException("Missing Trainer8a name bytes."));break;default:throw new ArgumentException("Invalid Trainer8a action.");}
        var output=copy.Write().ToArray();var p=new SAV8LA(output.ToArray());if(p.Version!=copy.Version||p.SaveRevision!=s.SaveRevision||output.Length!=length||!SaveChecksums.Valid(p)||p.AllBlocks.Count!=copy.AllBlocks.Count||p.AllBlocks.Where((b,i)=>b.Key!=copy.AllBlocks[i].Key||b.Type!=copy.AllBlocks[i].Type||b.SubType!=copy.AllBlocks[i].SubType||!b.Data.SequenceEqual(copy.AllBlocks[i].Data)).Any())throw new InvalidOperationException("Trainer8a export verification failed.");if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Trainer8a preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Tr8aEdit ParseTrainer8a(string json)=>json.Length>100000?throw new ArgumentException("Trainer8a request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Tr8aEdit)??throw new ArgumentException("Missing Trainer8a edit.");
    public static string ReadTrainer8a(byte[] data)=>JsonSerializer.Serialize(Trainer8aEditing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Tr8aCatalog);
    public static string PreviewTrainer8a(byte[] data,string json){var e=ParseTrainer8a(json);var output=Trainer8aEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out var ignored);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Tr8aPreview(e with{TargetHash=hash},Trainer8aEditing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray(),ignored),SaveJsonContext.Default.Tr8aPreview);}
    public static byte[] EditTrainer8a(byte[] data,string json){var e=ParseTrainer8a(json);if(e.TargetHash is null)throw new ArgumentException("Trainer8a requires a frozen preview.");return Trainer8aEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out _);}
}

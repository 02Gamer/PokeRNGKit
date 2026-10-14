// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record TrGGField(string Key,LocalizedText Name,string Value,string Kind,int MaxLength,string Min,string Max,OriginChoice[] Choices,bool Editable=true);
public sealed record TrGGCatalog(bool CanEdit,string SourceHash,TrGGField[] Fields,Tr7Ids Ids,Tr6Position Position,string NameTrash,string RivalTrash,int[] Characters,OriginChoice[] TrashSpecies,OriginChoice[] TrashLanguages,GoParkEntry[] Park,int TitleCount);
public sealed record TrGGEdit(string Action,string? SourceHash,Tr7Value[]? Fields=null,string? TargetHash=null,string? UiLanguage=null,int? Index=null,GoParkFile[]? Files=null,string? NameTarget=null,Hall6Trash? Trash=null);
public sealed record TrGGPreview(TrGGEdit Request,TrGGCatalog Result,int[] ChangedOffsets,string[] IgnoredFields,GoParkReceipt? Receipt);
internal static class TrainerGGEditing
{
    internal static SAV7b Save(SaveFile s)=>s is SAV7b gg?gg:throw new ArgumentException("TrainerGG requires Let's Go Pikachu/Eevee.");
    private static string Text(long n)=>n.ToString(CultureInfo.InvariantCulture);
    private static string DateText(Func<DateTime?> read){try{return read()?.ToString("yyyy-MM-dd'T'HH:mm:ss",CultureInfo.InvariantCulture)??"";}catch(ArgumentOutOfRangeException){return "";}}
    internal static TrGGField[] Fields(SAV7b s)
    {
        var options=TrainerEditing.Options(s);var rows=new List<TrGGField>();var languageNames=new[]{"zh-Hans","en","ja"}.Select(l=>GameInfo.GetStrings(l).languageNames).ToArray();var languages=GameInfo.LanguageDataSource(s.Generation,s.Context).Select(v=>new OriginChoice(v.Value,new(languageNames[0][v.Value],languageNames[1][v.Value],languageNames[2][v.Value]))).ToArray();
        void Number(string key,string label,long value,int width,long max,OriginChoice[]? choices=null)=>rows.Add(new(key,key=="game"?new("游戏版本","Game version","ゲームバージョン"):key=="gender"?new("训练家性别","Trainer gender","トレーナーの性別"):TrainerGGNames.Get(label,key),Text(value),choices is null?"number":"choice",width,"0",Text(max),choices??[]));
        rows.Add(new("name",TrainerGGNames.Get("L_TrainerName","Trainer Name"),s.OT,"text",12,"","",[]));rows.Add(new("rival",TrainerGGNames.Get("L_RivalName","Rival Name"),s.Misc.RivalName,"text",12,"","",[]));
        Number("money","L_Money",s.Money,7,9999999);Number("game","CB_Game",(int)s.Version,32767,255,options.GameVersion.Choices);Number("gender","CB_Gender",s.Gender,1,1,[new(0,new("男","Male","男性")),new(1,new("女","Female","女性"))]);Number("language","L_Language",s.Language,32767,255,languages);
        Number("hours","L_Hours",s.PlayedHours,5,65535);Number("minutes","L_Minutes",s.PlayedMinutes,2,99);Number("seconds","L_Seconds",s.PlayedSeconds,2,99);
        rows.Add(new("started",new("冒险开始时间","Adventure started","冒険開始時刻"),DateText(()=>s.PlayerGeoLocation.AdventureBegin.Timestamp),"date",19,"2000-01-01T00:00:00","2099-12-31T23:59:59",[]));
        string saved=DateText(()=>s.Played.LastSavedDate);rows.Add(new("saved",new("最后保存时间","Last saved","最後のセーブ時刻"),saved,"date",19,"2000-01-01T00:00:00","2099-12-31T23:59:59",[],saved.Length>0));
        return rows.ToArray();
    }
    internal static TrGGCatalog Read(SaveFile save,string hash){var s=Save(save);return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,Fields(s),new(s.GetTrainerTID7(),s.GetTrainerSID7(),s.ID32,s.GetTSV(7)),TrainerGGPosition.Read(s),Convert.ToHexString(s.Status.OriginalTrainerTrash),Convert.ToHexString(s.Misc.RivalNameTrash),Hall6TrashEditing.Chars,Hall6TrashEditing.Species.Value,Hall6TrashEditing.Languages.Value,GoParkEditing.Read(s),Enumerable.Range(0,EventWork7b.MaxTitleFlag).Count(s.EventWork.GetTitleFlag));}
    internal static void Patch(SAV7b s,Tr7Value[] values)
    {
        var fields=Fields(s);if(values.Length<1||values.Length>fields.Length||values.Select(v=>v.Key).Distinct().Count()!=values.Length)throw new ArgumentException("Invalid TrainerGG field list.");var changes=values.ToDictionary(v=>v.Key);
        foreach(var v in values){var f=fields.SingleOrDefault(f=>f.Key==v.Key);if(f is null||!f.Editable||v.Value is null||v.Value.Length>f.MaxLength)throw new ArgumentException("Invalid TrainerGG field.");
            if(f.Kind=="text"){if(v.Value.Any(char.IsControl))throw new ArgumentException("Invalid TrainerGG name.");}
            else if(f.Kind=="date"){if(!DateTime.TryParseExact(v.Value,"yyyy-MM-dd'T'HH:mm:ss",CultureInfo.InvariantCulture,DateTimeStyles.None,out var date)||date.Date<new DateTime(2000,1,1)||date.Date>new DateTime(2099,12,31))throw new ArgumentException("Invalid TrainerGG date.");}
            else{if(v.Value.Length==0&&v.Key is not("money" or "minutes" or "seconds")||v.Value.Any(c=>!char.IsAsciiDigit(c))||!long.TryParse(v.Value.Length==0?"0":v.Value,out var n)||n<long.Parse(f.Min,CultureInfo.InvariantCulture)||n>long.Parse(f.Max,CultureInfo.InvariantCulture)||f.Kind=="choice"&&!f.Choices.Any(c=>c.Id==n))throw new ArgumentException("Invalid TrainerGG number or choice.");}
        }
        // Source order: game/gender, money/language, names, then play time and dates.
        foreach(string key in new[]{"game","gender","money","language","name","rival","hours","minutes","seconds","started","saved"})if(changes.TryGetValue(key,out var v)){
            if(key is "name" or "rival"){string old=key=="name"?s.OT:s.Misc.RivalName;if(old!=v.Value){if(key=="name")s.OT=v.Value;else s.Misc.RivalName=v.Value;}if((key=="name"?s.OT:s.Misc.RivalName)!=v.Value)throw new ArgumentException("TrainerGG name cannot be represented.");continue;}
            if(key is "started" or "saved"){var date=DateTime.ParseExact(v.Value,"yyyy-MM-dd'T'HH:mm:ss",CultureInfo.InvariantCulture);if(key=="started")s.PlayerGeoLocation.AdventureBegin.Timestamp=date;else s.Played.LastSavedDate=date;continue;}
            long n=long.Parse(v.Value.Length==0?"0":v.Value,CultureInfo.InvariantCulture);switch(key){case "game":s.Version=(GameVersion)n;break;case "gender":s.Gender=(byte)n;break;case "money":s.Money=(uint)n;break;case "language":s.Language=(int)n;break;case "hours":s.PlayedHours=(int)n;break;case "minutes":s.PlayedMinutes=(int)n%60;break;case "seconds":s.PlayedSeconds=(int)n%60;break;}
        }
    }
    private static int Prefix(long n,int width){var text=Text(n);return int.Parse(text[..Math.Min(width,text.Length)],CultureInfo.InvariantCulture);}
    internal static void Resave(SAV7b s)
    {
        if(s.Gender>1)throw new ArgumentException("TrainerGG source gender cannot load.");var fields=Fields(s);var start=s.PlayerGeoLocation.AdventureBegin.Timestamp;var saved=s.Played.LastSavedDate;var min=new DateTime(2000,1,1);var max=new DateTime(2099,12,31);
        if(start<min||start>max||saved is {} date&&(date<min||date>max))throw new ArgumentException("TrainerGG source date cannot load.");
        s.Version=fields.Single(v=>v.Key=="game").Choices.Any(v=>v.Id==(int)s.Version)?s.Version:0;s.Gender=s.Gender;s.Money=(uint)Prefix(s.Money,7);
        s.Language=fields.Single(v=>v.Key=="language").Choices.Any(v=>v.Id==s.Language)?s.Language:0;
        s.PlayedHours=s.PlayedHours;s.PlayedMinutes=Prefix(s.PlayedMinutes,2)%60;s.PlayedSeconds=Prefix(s.PlayedSeconds,2)%60;s.PlayerGeoLocation.AdventureBegin.Timestamp=start;if(saved is {} d)s.Played.LastSavedDate=d;
    }
    internal static byte[] Prepare(SaveFile save,TrGGEdit e,string hash,int length,out string[] ignored,out GoParkReceipt? receipt)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("TrainerGG requires valid checksums.");if(e.SourceHash!=hash)throw new ArgumentException("TrainerGG preview is stale.");var copy=(SAV7b)s.Clone();ignored=[];receipt=null;
        if(e.Action!="position"&&e.UiLanguage is not null||e.Action is not("patch" or "position" or "ids")&&e.Fields is not null||e.Action is not("parkImport" or "parkBatch")&&e.Files is not null||e.Action is not("parkImport" or "parkBatch" or "parkDelete")&&e.Index is not null||e.Action!="trash"&&(e.Trash is not null||e.NameTarget is not null))throw new ArgumentException("Invalid TrainerGG action fields.");
        switch(e.Action){case "patch":Patch(copy,e.Fields??throw new ArgumentException("Missing TrainerGG fields."));break;case "ids":Trainer7Editing.Ids(copy,e.Fields??throw new ArgumentException("Missing TrainerGG IDs."));break;case "position":ignored=TrainerGGPosition.Apply(copy,e.Fields??throw new ArgumentException("Missing TrainerGG coordinates."),e.UiLanguage);break;
            case "resave":Resave(copy);break;case "titles":copy.EventWork.UnlockAllTitleFlags();break;case "fashion":copy.Blocks.FashionPlayer.UnlockAllAccessoriesPlayer();copy.Blocks.FashionStarter.UnlockAllAccessoriesStarter();break;
            case "parkImport":case "parkBatch":receipt=GoParkEditing.Import(copy,e.Index??throw new ArgumentException("Missing TrainerGG GO Park index."),e.Files??throw new ArgumentException("Missing TrainerGG GP1 files."),e.Action=="parkImport");break;
            case "parkDelete":GoParkEditing.Index(e.Index??-1);copy.Park[e.Index!.Value]=new GP1();break;case "parkClear":copy.Park.DeleteAll();break;
            case "trash":if(e.Trash is null||e.NameTarget is not("name" or "rival"))throw new ArgumentException("Invalid TrainerGG name trash.");if(e.NameTarget=="name")Trainer7Editing.Trash(copy,copy.Status.OriginalTrainerTrash,copy.OT,v=>copy.OT=v,e.Trash);else Trainer7Editing.Trash(copy,copy.Misc.RivalNameTrash,copy.Misc.RivalName,v=>copy.Misc.RivalName=v,e.Trash);break;
            default:throw new ArgumentException("Invalid TrainerGG action.");}
        var output=copy.Write().ToArray();var check=SaveDetectionContext.OpenDerived(output);if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!check.Data.SequenceEqual(copy.Data))throw new InvalidOperationException("TrainerGG export verification failed.");if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("TrainerGG preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static TrGGEdit ParseTrainerGG(string json)=>json.Length>2300000?throw new ArgumentException("TrainerGG request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.TrGGEdit)??throw new ArgumentException("Missing TrainerGG edit.");
    public static string ReadTrainerGG(byte[] data)=>JsonSerializer.Serialize(TrainerGGEditing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.TrGGCatalog);
    public static string PreviewTrainerGG(byte[] data,string json){var e=ParseTrainerGG(json);var output=TrainerGGEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out var ignored,out var receipt);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new TrGGPreview(e with{TargetHash=hash},TrainerGGEditing.Read(OpenDerived(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray(),ignored,receipt),SaveJsonContext.Default.TrGGPreview);}
    public static byte[] EditTrainerGG(byte[] data,string json){var e=ParseTrainerGG(json);if(e.TargetHash is null)throw new ArgumentException("TrainerGG requires frozen preview.");return TrainerGGEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out _,out _);}
    public static string ExportGoPark(byte[] data,int index){var s=TrainerGGEditing.Save(Open(data));if(index<-1)throw new ArgumentException("TrainerGG GO Park export index invalid.");return JsonSerializer.Serialize(GoParkEditing.Export(s,index==-1?null:index),SaveJsonContext.Default.GoParkExportArray);}
    public static byte[] ExportGoParkArchive(byte[] data)
    {
        var save=TrainerGGEditing.Save(Open(data));var entries=GoParkEditing.Export(save,null);if(entries.Length==0)throw new ArgumentException("TrainerGG GO Park has no entries to export.");
        using var stream=new MemoryStream();using(var archive=new System.IO.Compression.ZipArchive(stream,System.IO.Compression.ZipArchiveMode.Create,true))foreach(var file in entries){var entry=archive.CreateEntry($"{file.Index/50+1:00}-{file.Index%50+1:00}/{file.Name}",System.IO.Compression.CompressionLevel.NoCompression);entry.LastWriteTime=new(2000,1,1,0,0,0,TimeSpan.Zero);using var output=entry.Open();output.Write(Convert.FromBase64String(file.Data));}return stream.ToArray();
    }
}

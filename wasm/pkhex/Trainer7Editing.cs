// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Tr7Field(string Key,string Group,LocalizedText Name,string Value,string Kind,int MaxLength,long Min,long Max,OriginChoice[] Choices,bool Editable=true);
public sealed record Tr7Ids(uint Tid,uint Sid,uint Id32,uint Tsv);
public sealed record Tr7Catalog(bool CanEdit,string SourceHash,Tr7Field[] Fields,TrainerOptions Existing,Tr6Basics Basics,string NameTrash,Tr6Position Position,int[] Characters,OriginChoice[] TrashSpecies,OriginChoice[] TrashLanguages,Tr7Ids Ids);
public sealed record Tr7Value(string Key,string Value);
public sealed record Tr7Edit(string Action,string? SourceHash,Tr7Value[]? Fields=null,string? TargetHash=null,string? UiLanguage=null,bool AllowMismatchedSkin=false,Hall6Trash? Trash=null,string? Fashion=null);
public sealed record Tr7Preview(Tr7Edit Request,Tr7Catalog Result,int[] ChangedOffsets,string[] IgnoredFields);
internal static class Trainer7Editing
{
    internal static SAV7 Save(SaveFile s)=>s is SAV7SM or SAV7USUM?(SAV7)s:throw new ArgumentException("Trainer7 requires Sun/Moon or Ultra Sun/Ultra Moon.");
    private static string Text(long value)=>value.ToString(CultureInfo.InvariantCulture);
    private static LocalizedText Label(string key,string fallback)=>Trainer7Names.Get("SAV_Trainer7."+key,fallback);
    private static OriginChoice[] Styles(SAV7 s)=>Enum.GetValues<PlayerBattleStyle7>().Where(v=>s is SAV7USUM||v!=PlayerBattleStyle7.Nihilist).Select(v=>new OriginChoice((int)v,Trainer7Names.Get("PlayerBattleStyle7."+v,v.ToString()))).ToArray();
    private static OriginChoice[] Vivillon(SAV7 s){var langs=new[]{"zh-Hans","en","ja"}.Select(l=>{var g=GameInfo.GetStrings(l);return FormConverter.GetFormList((ushort)Species.Vivillon,g.types,g.forms,["♂","♀","-"],s.Context);}).ToArray();return Enumerable.Range(0,langs[0].Length).Select(i=>new OriginChoice(i,new(langs[0][i],langs[1][i],langs[2][i]))).ToArray();}
    private static LocalizedText Place(int id)=>new(GameInfo.GetStrings("zh-Hans").GetLocationName(false,(ushort)id,7,7,GameVersion.US),GameInfo.GetStrings("en").GetLocationName(false,(ushort)id,7,7,GameVersion.US),GameInfo.GetStrings("ja").GetLocationName(false,(ushort)id,7,7,GameVersion.US));
    internal static Tr7Field[] Fields(SAV7 s)
    {
        var result=new List<Tr7Field>();OriginChoice[] flags=[new(0,new("关","Off","オフ")),new(1,new("开","On","オン"))];
        void Number(string key,string group,string label,long value,long max,OriginChoice[]? choices=null)=>result.Add(new(key,group,Label(label,key),Text(value),choices is null?"number":"choice",32767,0,max,choices??[]));
        void Flag(string key,string group,LocalizedText name,bool value,bool editable=true)=>result.Add(new(key,group,name,value?"1":"0","choice",1,0,1,flags,editable));
        Number("SnapCount","finder","L_SnapCount",s.PokeFinder.SnapCount,9999999);Number("ThumbsTotal","finder","L_ThumbsTotal",s.PokeFinder.ThumbsTotalValue,9999999);Number("ThumbsRecord","finder","L_ThumbsRecord",s.PokeFinder.ThumbsHighValue,9999999);
        Number("Camera","finder","L_CameraVersion",s.PokeFinder.CameraVersion,4,Enumerable.Range(0,5).Select(i=>new OriginChoice(i,new(Text(i+1),Text(i+1),Text(i+1)))).ToArray());Flag("Gyro","finder",Label("CHK_Gyro","Gyro"),s.PokeFinder.GyroFlag);
        string[] modes=["Singles","Doubles","Multi"];
        for(int i=0;i<12;i++){int mode=i/4;bool super=(i&1)!=0,max=(i&2)!=0;var label=new LocalizedText($"{(super?"超级":"普通")}{(max?"最高":"当前")} · {modes[mode] switch{"Singles"=>"单打","Doubles"=>"双打",_=>"多人"}}",$"{(super?"Super":"Normal")} {(max?"Best":"Current")} · {modes[mode]}",$"{(super?"スーパー":"ノーマル")} {(max?"最高":"現在")} · {modes[mode] switch{"Singles"=>"シングル","Doubles"=>"ダブル",_=>"マルチ"}}");result.Add(new("Tree"+i,"tree",label,Text(s.BattleTree.GetTreeStreak(mode,super,max)),"number",32767,0,65535,[]));}
        for(int i=0;i<3;i++)Flag("TreeUnlock"+i,"tree",Label(new[]{"CHK_UnlockSuperSingles","CHK_UnlockSuperDoubles","CHK_UnlockSuperMulti"}[i],"Unlock Super "+modes[i]),s.EventWork.GetEventFlag(333+i));
        Number("Skin","appearance","L_SkinColor",s.MyStatus.DressUpSkinColor,7,Enum.GetValues<PlayerSkinColor7>().Select(v=>new OriginChoice((int)v,Trainer7Names.Get("PlayerSkinColor7."+v,v.ToString()))).ToArray());
        Number("Style","style","L_BallThrowType",s.MyStatus.BallThrowType,Styles(s).Length-1,Styles(s));
        if(s is SAV7SM)for(int i=0;i<Styles(s).Length;i++){var name=Styles(s)[i].Name;Flag("StyleUnlock"+i,"style",new("解锁 · "+name.Zh,"Unlocked · "+name.En,"解禁 · "+name.Ja),i<2||s.EventWork.GetEventFlag(292+i),i>=2);Flag("StyleLearn"+i,"style",new("学会 · "+name.Zh,"Learned · "+name.En,"習得 · "+name.Ja),i==0||s.EventWork.GetEventFlag(3479+i),i>0);}
        foreach(var stamp in Enum.GetValues<Stamp7>())Flag("Stamp"+(int)stamp,"stamps",Trainer7Names.Get("Stamp7."+stamp,stamp.ToString()),(s.Misc.Stamps&(1u<<(int)stamp))!=0);
        Flag("Mega","flags",Label("CHK_UnlockMega","Mega Evolution"),s.MyStatus.MegaUnlocked);Flag("ZMove","flags",Label("CHK_UnlockZMove","Z-Move"),s.MyStatus.ZMoveUnlocked);
        Number("RefreshDays","other","L_DaysFromRefreshed",s.Misc.DaysFromRefreshed,255);Number("Vivillon","other","L_Vivillon",s.Misc.Vivillon,Vivillon(s).Length-1,Vivillon(s));
        result.Add(new("PlazaName","other",Label("L_PlazaName","Festival Plaza Name"),s.Festa.FestivalPlazaName,"text",20,0,0,[]));
        var hours=Enumerable.Range(0,24).Select(i=>{int h=i==0?24:i;return new OriginChoice(h*3600,i==0?new("太阳时间","Sun Time","サン時間"):i==12?new("月亮时间","Moon Time","ムーン時間"):new($"+{i:00} 小时",$"+{i:00} Hours",$"+{i:00} 時間"));}).ToArray();ulong raw=s.GameTime.AlolaTime,loaded=raw==0?86400:raw;result.Add(new("AlolaTime","other",Label("L_AlolaTime","Alola Time"),loaded.ToString(CultureInfo.InvariantCulture),"choice",32767,3600,86400,hours,hours.Any(v=>(ulong)v.Id==loaded)));
        int start=s is SAV7USUM?4160:3200;int[] flyNames=Trainer7MapData.FlyDestNameIndex.ToArray();if(s.Version is GameVersion.MN or GameVersion.UM){flyNames[28]=142;flyNames[36]=178;}LocalizedText[] flyAlt=[new("自己的家","My House","自分の家"),new("摄影俱乐部（好奥乐）","Photo Club (Hau'oli)","フォトクラブ（ハウオリ）"),new("摄影俱乐部（可霓可）","Photo Club (Konikoni)","フォトクラブ（コニコ）")];
        for(int i=0,alt=0;i<flyNames.Length-(s is SAV7USUM?0:6);i++)Flag("Fly"+i,"fly",flyNames[i]<0?flyAlt[alt++]:Place(flyNames[i]),s.EventWork.GetEventFlag(start+Trainer7MapData.FlyDestFlagOfs[i]));
        LocalizedText[] mapAlt=[new("美乐美乐海（东）","Melemele Sea (East)","メレメレ海（東）"),new("美乐美乐海（西）","Melemele Sea (West)","メレメレ海（西）")];for(int i=0,alt=0;i<Trainer7MapData.MapUnmaskNameIndex.Length-(s is SAV7USUM?0:4);i++)Flag("Map"+i,"map",Trainer7MapData.MapUnmaskNameIndex[i]<0?mapAlt[alt++]:Place(Trainer7MapData.MapUnmaskNameIndex[i]),s.EventWork.GetEventFlag(start+Trainer7MapData.MapUnmaskFlagOfs[i]));
        if(s is SAV7USUM){for(int i=0;i<4;i++)Number("Surf"+i,"ultra","L_Surf"+i,s.Misc.GetSurfScore(i),999999999);Number("RotomAffection","ultra","L_RotomAffection",s.FieldMenu.RotomAffection,9999);Flag("RotomLoto1","ultra",Label("CHK_RotoLoto1","Roto Loto 1"),s.FieldMenu.RotomLoto1);Flag("RotomLoto2","ultra",Label("CHK_RotoLoto2","Roto Loto 2"),s.FieldMenu.RotomLoto2);result.Add(new("RotomName","ultra",Label("L_RotomOT","Rotom Trainer Name"),s.FieldMenu.RotomOT,"text",12,0,0,[]));}
        return result.ToArray();
    }
    internal static Tr7Catalog Read(SaveFile save,string hash){var s=Save(save);return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,Fields(s),TrainerEditing.Options(s),new(s.OT,s.TID16,s.SID16,s.Money,s.Gender),Convert.ToHexString(s.MyStatus.OriginalTrainerTrash),Trainer7Position.Read(s),Hall6TrashEditing.Chars,Hall6TrashEditing.Species.Value,Hall6TrashEditing.Languages.Value,new(s.GetTrainerTID7(),s.GetTrainerSID7(),s.ID32,s.GetTSV(7)));}
    internal static void Ids(ITrainerID32 s,Tr7Value[] rows)
    {
        if(rows.Length!=2||rows.Select(v=>v.Key).Distinct().Count()!=2||rows.Any(v=>v.Key is not("tid" or "sid")||v.Value is null||v.Value.Length>(v.Key=="tid"?6:4)||v.Value.Any(c=>!char.IsAsciiDigit(c))))throw new ArgumentException("Invalid Trainer7 ID controls.");
        uint Value(string key)=>uint.TryParse(rows.Single(v=>v.Key==key).Value,out var n)?n:0;
        // TrainerIDManager saves SID first, using the previous TID, then saves TID.
        uint sid=Value("sid");if(sid>4294)sid=4294;if(!s.IsValidTrainerID7(sid,s.GetTrainerTID7()))sid=4293;s.SetTrainerSID7(sid);
        uint tid=Value("tid");if(tid>999999)tid=999999;else if(tid==999999&&s.IsValidTrainerID7(tid,s.GetTrainerTID7()))tid=999998;s.SetTrainerTID7(tid);
    }
    private static long Parse(Tr7Field f,string text)
    {
        if(text.Length>f.MaxLength)throw new ArgumentException("Trainer7 input exceeds source width.");if(!decimal.TryParse(text,NumberStyles.Number,CultureInfo.InvariantCulture,out var value)||value!=decimal.Truncate(value)||value<f.Min||value>f.Max||f.Kind=="choice"&&!f.Choices.Any(v=>v.Id==value))throw new ArgumentException("Invalid Trainer7 number or choice.");return(decimal.ToInt64(value));
    }
    internal static void Patch(SAV7 s,Tr7Value[] rows,bool allowSkin)
    {
        var fields=Fields(s);var catalog=fields.ToDictionary(v=>v.Key);if(rows.Length<1||rows.Length>fields.Length||rows.Select(v=>v.Key).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid Trainer7 field list.");
        var parsed=new Dictionary<string,(Tr7Field Field,string Text,long Value)>();foreach(var row in rows){if(!catalog.TryGetValue(row.Key,out var f)||!f.Editable||row.Value is null||row.Value.Length>f.MaxLength)throw new ArgumentException("Invalid Trainer7 field.");long n=f.Kind=="text"?0:Parse(f,row.Value);if(f.Kind=="text"&&row.Value.Any(char.IsControl))throw new ArgumentException("Invalid Trainer7 text.");if(f.Key=="Skin"&&n!=s.MyStatus.DressUpSkinColor&&(n&1)!=(s.Gender&1)&&!allowSkin)throw new ArgumentException("Trainer7 gender/skin mismatch requires confirmation.");parsed.Add(row.Key,(f,row.Value,n));}
        // Field order matches the source's total-before-high Poke Finder writes.
        foreach(var f in fields)if(parsed.TryGetValue(f.Key,out var row)){
            long n=row.Value;if(f.Key.StartsWith("TreeUnlock",StringComparison.Ordinal)){s.EventWork.SetEventFlag(333+int.Parse(f.Key[10..],CultureInfo.InvariantCulture),n==1);continue;}
            if(f.Key.StartsWith("Tree",StringComparison.Ordinal)){int i=int.Parse(f.Key[4..],CultureInfo.InvariantCulture);s.BattleTree.SetTreeStreak((int)n,i/4,(i&1)!=0,(i&2)!=0);continue;}
            if(f.Key.StartsWith("StyleUnlock",StringComparison.Ordinal)){s.EventWork.SetEventFlag(292+int.Parse(f.Key[11..],CultureInfo.InvariantCulture),n==1);continue;}
            if(f.Key.StartsWith("StyleLearn",StringComparison.Ordinal)){s.EventWork.SetEventFlag(3479+int.Parse(f.Key[10..],CultureInfo.InvariantCulture),n==1);continue;}
            if(f.Key.StartsWith("Stamp",StringComparison.Ordinal)){int bit=int.Parse(f.Key[5..],CultureInfo.InvariantCulture);s.Misc.Stamps=n==1?s.Misc.Stamps|(1u<<bit):s.Misc.Stamps&~(1u<<bit);continue;}
            if(f.Key.StartsWith("Fly",StringComparison.Ordinal)||f.Key.StartsWith("Map",StringComparison.Ordinal)){int i=int.Parse(f.Key[3..],CultureInfo.InvariantCulture);int flag=(s is SAV7USUM?4160:3200)+(f.Key.StartsWith("Fly",StringComparison.Ordinal)?Trainer7MapData.FlyDestFlagOfs[i]:Trainer7MapData.MapUnmaskFlagOfs[i]);s.EventWork.SetEventFlag(flag,n==1);continue;}
            if(f.Key.StartsWith("Surf",StringComparison.Ordinal)){s.Misc.SetSurfScore(int.Parse(f.Key[4..],CultureInfo.InvariantCulture),(int)n);continue;}
            switch(f.Key){case "SnapCount":s.PokeFinder.SnapCount=(uint)n;break;case "ThumbsTotal":s.PokeFinder.ThumbsTotalValue=(uint)n;break;case "ThumbsRecord":s.PokeFinder.ThumbsHighValue=(uint)n;break;case "Camera":s.PokeFinder.CameraVersion=(ushort)n;break;case "Gyro":s.PokeFinder.GyroFlag=n==1;break;case "Skin":s.MyStatus.DressUpSkinColor=(int)n;break;case "Style":s.MyStatus.BallThrowType=(byte)n;break;case "Mega":s.MyStatus.MegaUnlocked=n==1;break;case "ZMove":s.MyStatus.ZMoveUnlocked=n==1;break;case "RefreshDays":s.Misc.DaysFromRefreshed=(int)n;break;case "Vivillon":s.Misc.Vivillon=(int)n;break;case "PlazaName":s.Festa.FestivalPlazaName=row.Text;if(s.Festa.FestivalPlazaName!=row.Text)throw new ArgumentException("Trainer7 Plaza name cannot be represented.");break;case "AlolaTime":s.GameTime.AlolaTime=(ulong)n;break;case "RotomAffection":s.FieldMenu.RotomAffection=(ushort)n;break;case "RotomLoto1":s.FieldMenu.RotomLoto1=n==1;break;case "RotomLoto2":s.FieldMenu.RotomLoto2=n==1;break;case "RotomName":s.FieldMenu.RotomOT=row.Text;if(s.FieldMenu.RotomOT!=row.Text)throw new ArgumentException("Trainer7 Rotom name cannot be represented.");break;}
        }
    }
    private static int Prefix(int value,int length){string text=value.ToString(CultureInfo.InvariantCulture);return int.Parse(text[..Math.Min(length,text.Length)],CultureInfo.InvariantCulture);}
    internal static void Resave(SAV7 s)
    {
        if((int)s.Version is <29 or >33||s.Gender>1||s.Situation.M>1000)throw new ArgumentException("Trainer7 source window cannot load the game, gender or map value.");
        var maxDate=new DateTime(2050,12,31);var epoch=new DateTime(2000,1,1);
        DateUtil.GetDateTime2000(s.SecondsToStart,out var started,out var startTime);DateUtil.GetDateTime2000(s.SecondsToFame,out var fame,out var fameTime);
        DateTime? saved;try{saved=s.Played.LastSavedDate;}catch(ArgumentOutOfRangeException){throw new ArgumentException("Trainer7 source window cannot load last saved date.");}
        if(started>maxDate||fame>maxDate||saved is {} loaded&&(loaded<epoch||loaded>maxDate))throw new ArgumentException("Trainer7 source window cannot load source date bounds.");
        // Values clamped explicitly during source window loading; unlisted data is preserved.
        s.PokeFinder.SnapCount=Math.Min(s.PokeFinder.SnapCount,9999999);s.PokeFinder.ThumbsTotalValue=Math.Min(s.PokeFinder.ThumbsTotalValue,9999999);s.PokeFinder.ThumbsHighValue=Math.Min(s.PokeFinder.ThumbsHighValue,9999999);s.PokeFinder.CameraVersion=Math.Min(s.PokeFinder.CameraVersion,(ushort)4);s.PokeFinder.GyroFlag=s.PokeFinder.GyroFlag;
        for(int i=0;i<12;i++)s.BattleTree.SetTreeStreak(s.BattleTree.GetTreeStreak(i/4,(i&1)!=0,(i&2)!=0),i/4,(i&1)!=0,(i&2)!=0);
        s.Misc.BP=Math.Min(s.Misc.BP,9999);if(s.Festa.FestaCoins<0)throw new ArgumentException("Trainer7 source window cannot load negative Festival Coins.");s.Festa.FestaCoins=Math.Min(s.Festa.FestaCoins,9999999);s.Misc.DaysFromRefreshed=s.Misc.DaysFromRefreshed;
        s.Festa.FestivalPlazaName=s.Festa.FestivalPlazaName;
        if(Vivillon(s).Any(v=>v.Id==s.Misc.Vivillon))s.Misc.Vivillon=s.Misc.Vivillon;
        if(Styles(s).Any(v=>v.Id==s.MyStatus.BallThrowType))s.MyStatus.BallThrowType=s.MyStatus.BallThrowType;
        s.Misc.Stamps=s.Misc.Stamps;s.MyStatus.MegaUnlocked=s.MyStatus.MegaUnlocked;s.MyStatus.ZMoveUnlocked=s.MyStatus.ZMoveUnlocked;
        var flags=Fields(s).Where(v=>v.Key.StartsWith("TreeUnlock",StringComparison.Ordinal)||v.Group is "fly" or "map"||s is SAV7SM&&v.Group=="style"&&v.Editable&&v.Key!="Style").Select(f=>new Tr7Value(f.Key,f.Value)).ToArray();Patch(s,flags,false);
        if(s.GameTime.AlolaTime==0)s.GameTime.AlolaTime=86400;
        if(s is SAV7USUM){for(int i=0;i<4;i++){int n=s.Misc.GetSurfScore(i);if(n<0||n>999999999)throw new ArgumentException("Trainer7 source window cannot load surf scores.");s.Misc.SetSurfScore(i,n);}s.FieldMenu.RotomAffection=(ushort)Math.Min((int)s.FieldMenu.RotomAffection,9999);s.FieldMenu.RotomLoto1=s.FieldMenu.RotomLoto1;s.FieldMenu.RotomLoto2=s.FieldMenu.RotomLoto2;s.FieldMenu.RotomOT=s.FieldMenu.RotomOT;}
        // Basic source controls are also rewritten by SaveTrainerInfo; name bytes change only on explicit name edit.
        s.Money=uint.Parse(s.Money.ToString(CultureInfo.InvariantCulture)[..Math.Min(7,s.Money.ToString(CultureInfo.InvariantCulture).Length)],CultureInfo.InvariantCulture);s.PlayedHours=s.PlayedHours;s.PlayedMinutes=Prefix(s.PlayedMinutes,2)%60;s.PlayedSeconds=Prefix(s.PlayedSeconds,2)%60;
        var options=TrainerEditing.Options(s);int Pick(int value,IEnumerable<int> values)=>values.Contains(value)?value:0;
        int country=Pick(s.Country,options.Geography!.Countries.Select(v=>v.Id));s.Region=(byte)Pick(s.Region,country>0?Util.GetCountryRegionList($"sr_{country:000}","en").Select(v=>v.Value):[]);s.Country=(byte)country;s.ConsoleRegion=(byte)Pick(s.ConsoleRegion,options.Geography.Consoles.Select(v=>v.Id));s.Language=Pick(s.Language,options.Languages.Select(v=>v.Id));
        s.SecondsToStart=unchecked((uint)DateUtil.GetSecondsFrom2000(started,startTime));s.SecondsToFame=unchecked((uint)DateUtil.GetSecondsFrom2000(fame,fameTime));
        if(saved is {} d)s.Played.LastSavedDate=new(d.Year,d.Month,d.Day,d.Hour,d.Minute,0);
    }
    internal static void Trash(SAV7 s,Hall6Trash e)
        =>Trash(s,s.MyStatus.OriginalTrainerTrash,s.OT,v=>s.OT=v,e);
    internal static void Trash(SaveFile s,Span<byte> target,string old,Action<string> set,Hall6Trash e)
    {
        var bytes=target.ToArray();
        byte[] Encode(string text){var data=new byte[26];int length=s.SetString(data,text,text.Length,StringConverterOption.None);return data[..length];}
        if(e.Action!="layer"&&(e.Species is not null||e.Language is not null||e.Generation is not null||e.UiLanguage is not null)||e.Action!="hex"&&e.Hex is not null||e.Action!="text"&&e.Text is not null)throw new ArgumentException("Invalid Trainer7 trash fields.");
        switch(e.Action){case "prepare":Encode(old).CopyTo(bytes,0);break;case "hex":if(e.Hex is null||e.Hex.Length!=52||e.Hex.Any(c=>!char.IsAsciiHexDigit(c)))throw new ArgumentException("Invalid Trainer7 name hex.");bytes=Convert.FromHexString(e.Hex);break;case "text":if(e.Text is null||e.Text.Length>12)throw new ArgumentException("Invalid Trainer7 name text.");Encode(e.Text).CopyTo(bytes,0);break;case "clear":int start=Encode(old).Length;Array.Clear(bytes,start,26-start);break;case "layer":if(e.Species is null||!Hall6TrashEditing.Species.Value.Any(v=>v.Id==e.Species)||e.Language is null||!Hall6TrashEditing.Languages.Value.Any(v=>v.Id==e.Language)||e.Generation is null or <0 or >100||e.UiLanguage is not("zh" or "en" or "ja"))throw new ArgumentException("Invalid Trainer7 trash layer.");string name=SpeciesName.GetSpeciesNameGeneration((ushort)e.Species.Value,e.Language.Value,(byte)e.Generation.Value);if(name.Length==0){var v=Hall6TrashEditing.Species.Value.Single(v=>v.Id==e.Species);name=e.UiLanguage=="zh"?v.Name.Zh:e.UiLanguage=="ja"?v.Name.Ja:v.Name.En;}var layer=Encode(name);int from=Encode(old).Length;if(layer.Length<=from||layer.Length>26)throw new ArgumentException("Trainer7 trash layer is hidden or too long.");layer.AsSpan(from).CopyTo(bytes.AsSpan(from));break;default:throw new ArgumentException("Invalid Trainer7 trash action.");}
        string next=s.GetString(bytes);if(next!=old)set(next);bytes.CopyTo(target);
    }
    internal static byte[] Prepare(SaveFile save,Tr7Edit e,string hash,int length,out string[] ignored)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Trainer7 editing requires valid checksums.");if(e.SourceHash!=hash)throw new ArgumentException("Trainer7 preview is stale.");var copy=(SAV7)s.Clone();ignored=[];
        if(e.Action=="position"){if(e.Fields is null||e.Trash is not null||e.Fashion is not null||e.AllowMismatchedSkin)throw new ArgumentException("Invalid Trainer7 position edit.");ignored=Trainer7Position.Apply(copy,e.Fields,e.UiLanguage);}
        else{
            if(e.UiLanguage is not null)throw new ArgumentException("Trainer7 language is position-only.");
            if(e.Action!="patch"&&e.AllowMismatchedSkin)throw new ArgumentException("Trainer7 skin confirmation is patch-only.");
            switch(e.Action){case "ids":if(e.Fields is null||e.Trash is not null||e.Fashion is not null)throw new ArgumentException("Invalid Trainer7 IDs.");Ids(copy,e.Fields);break;case "patch":if(e.Fields is null||e.Trash is not null||e.Fashion is not null)throw new ArgumentException("Invalid Trainer7 patch.");Patch(copy,e.Fields,e.AllowMismatchedSkin);break;case "resave":if(e.Fields is not null||e.Trash is not null||e.Fashion is not null)throw new ArgumentException("Invalid Trainer7 resave.");Resave(copy);break;case "flyAll":case "mapAll":if(e.Fields is not null||e.Trash is not null||e.Fashion is not null)throw new ArgumentException("Invalid Trainer7 map batch.");Patch(copy,Fields(copy).Where(v=>v.Group==(e.Action=="flyAll"?"fly":"map")).Select(v=>new Tr7Value(v.Key,"1")).ToArray(),false);break;case "fashion":if(e.Fields is not null||e.Trash is not null||e.Fashion is not("base" or "legal" or "all")||copy.Gender>1)throw new ArgumentException("Invalid Trainer7 fashion mode or gender.");copy.Fashion.Clear();if(e.Fashion=="base")copy.Fashion.Reset();else copy.Fashion.ImportPayload(Trainer7Fashion.Read(copy is SAV7USUM,copy.Gender,e.Fashion=="all"));break;case "trash":if(e.Fields is not null||e.Trash is null||e.Fashion is not null)throw new ArgumentException("Invalid Trainer7 trash.");Trash(copy,e.Trash);break;default:throw new ArgumentException("Invalid Trainer7 action.");}
        }
        var output=copy.Write().ToArray();var check=SaveDetectionContext.OpenDerived(output);if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!check.Data.SequenceEqual(copy.Data))throw new InvalidOperationException("Trainer7 export verification failed.");if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Trainer7 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Tr7Edit ParseTrainer7(string json)=>json.Length>2300000?throw new ArgumentException("Trainer7 request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Tr7Edit)??throw new ArgumentException("Missing Trainer7 edit.");
    public static string ReadTrainer7(byte[] data)=>JsonSerializer.Serialize(Trainer7Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Tr7Catalog);
    public static string PreviewTrainer7(byte[] data,string json){var e=ParseTrainer7(json);var output=Trainer7Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out var ignored);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Tr7Preview(e with{TargetHash=hash},Trainer7Editing.Read(OpenDerived(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray(),ignored),SaveJsonContext.Default.Tr7Preview);}
    public static byte[] EditTrainer7(byte[] data,string json){var e=ParseTrainer7(json);if(e.TargetHash is null)throw new ArgumentException("Trainer7 requires a frozen preview.");return Trainer7Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out _);}
}

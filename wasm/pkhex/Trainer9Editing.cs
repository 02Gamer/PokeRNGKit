// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Globalization;
using static PKHeX.Core.SaveBlockAccessor9SV;
namespace PokeRNGKit.SaveEditor;
public sealed record Trainer9Image(string Key,bool Available,int Width,int Height,string? Pixels,string? Error);
public sealed record Trainer9Map(bool Editable,string X,string Y,string Z,string Rotation,float[] Quaternion);
public sealed record Trainer9Blueberry(uint Points,uint Solo,uint Group,int ThrowStyle,OriginChoice[] ThrowStyles);
public sealed record Trainer9Catalog(bool CanEdit,string SourceHash,int Revision,string Name,uint Id,byte Gender,int Language,string Version,uint Money,uint LeaguePoints,int Hours,int Minutes,int Seconds,string Enrollment,string Saved,Trainer9Map Map,Trainer9Blueberry? Blueberry,Trainer9Image[] Images,OriginChoice[] Languages){public string NameTrash{get;init;}="";public uint Tid{get;init;}public uint Sid{get;init;}public uint Tsv{get;init;}public OriginChoice[] TrashSpecies{get;init;}=[];public OriginChoice[] TrashLanguages{get;init;}=[];}
internal static class Trainer9Editing
{
    internal static bool Supports(SaveFile s)=>s is SAV9SV;
    internal static Trainer9Catalog Read(SaveFile source,string hash)
    {
        if(source is not SAV9SV save)throw new ArgumentException("Trainer9 tools are unsupported for this save.");
        static string Date(Func<DateTime> read){try{return read().ToString("yyyy-MM-ddTHH:mm:ss",CultureInfo.InvariantCulture);}catch(ArgumentOutOfRangeException){return "";}}
        double rotation=Math.Atan2(save.RZ,save.RW)*360/Math.PI;var coords=new[]{(double)save.X,save.Y,save.Z,rotation};bool editable=coords.All(v=>double.IsFinite(v)&&v>=-99999999&&v<=99999999);string Value(double v)=>v.ToString("0.######",CultureInfo.InvariantCulture);
        var languages=GameInfo.LanguageDataSource(save.Generation,save.Context).Select(v=>new OriginChoice(v.Value,new(GameInfo.GetStrings("zh-Hans").languageNames[v.Value],GameInfo.GetStrings("en").languageNames[v.Value],GameInfo.GetStrings("ja").languageNames[v.Value]))).ToArray();
        Trainer9Blueberry? blueberry=null;if(save.SaveRevision>=2){var styles=new[]{"zh-Hans","en","ja"}.Select(l=>Util.GetStringList("throw_styles",l)).ToArray();blueberry=new(save.BlueberryPoints,save.BlueberryQuestRecord.QuestsDoneSolo,save.BlueberryQuestRecord.QuestsDoneGroup,(int)save.ThrowStyle,Enumerable.Range(0,styles[1].Length).Select(i=>new OriginChoice(i+1,new(styles[0][i],styles[1][i],styles[2][i]))).ToArray());}
        var images=new[]{Image(save,"photo",KPictureProfileCurrent,KPictureProfileCurrentWidth,KPictureProfileCurrentHeight),Image(save,"icon",KPictureIconCurrent,KPictureIconCurrentWidth,KPictureIconCurrentHeight),Image(save,"initialIcon",KPictureIconInitial,KPictureIconInitialWidth,KPictureIconInitialHeight)};
        return new(save.State.Exportable&&SaveChecksums.Valid(save),hash,save.SaveRevision,save.OT,save.ID32,save.Gender,save.Language,save.Version.ToString(),save.Money,save.LeaguePoints,save.PlayedHours,save.PlayedMinutes,save.PlayedSeconds,Date(()=>save.EnrollmentDate.Timestamp),Date(()=>save.LastSaved.Timestamp),new(editable,Value(coords[0]),Value(coords[1]),Value(coords[2]),Value(rotation),[save.RX,save.RY,save.RZ,save.RW]),blueberry,images,languages){NameTrash=Convert.ToHexString(save.MyStatus.OriginalTrainerTrash),Tid=save.GetTrainerTID7(),Sid=save.GetTrainerSID7(),Tsv=save.GetTSV(9),TrashSpecies=Hall6TrashEditing.Species.Value,TrashLanguages=Hall6TrashEditing.Languages.Value};
    }
    private static Trainer9Image Image(SAV9SV save,string key,uint dataKey,uint widthKey,uint heightKey)
    {
        if(!save.Blocks.TryGetBlock(dataKey,out var data)||!save.Blocks.TryGetBlock(widthKey,out var widthBlock)||!save.Blocks.TryGetBlock(heightKey,out var heightBlock))return new(key,false,0,0,null,"missing");
        if(widthBlock.Type!=SCTypeCode.UInt32||heightBlock.Type!=SCTypeCode.UInt32||widthBlock.Data.Length!=4||heightBlock.Data.Length!=4)return new(key,false,0,0,null,"type");
        uint width=save.Blocks.GetBlockValue<uint>(widthKey),height=save.Blocks.GetBlockValue<uint>(heightKey);
        // Resource guard; source DXT1 requires nonzero multiples of four.
        if(width==0||height==0||width%4!=0||height%4!=0||width>4096||height>4096||(ulong)width*height>4194304||(ulong)data.Data.Length<(ulong)width*height/2)return new(key,false,(int)width,(int)height,null,"dimensions");
        var pixels=DXT1.Decompress(data.Data,(int)width,(int)height);return new(key,true,(int)width,(int)height,Convert.ToBase64String(CGear5Editing.SwapRedBlue(pixels)),null);
    }
}

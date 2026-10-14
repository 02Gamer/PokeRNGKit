// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Globalization;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;
public sealed record Trainer9Request([property:JsonRequired]string SourceHash,[property:JsonRequired]string Name,[property:JsonRequired]uint Id,[property:JsonRequired]byte Gender,[property:JsonRequired]int Language,[property:JsonRequired]string Version,[property:JsonRequired]string Money,[property:JsonRequired]string LeaguePoints,[property:JsonRequired]string BlueberryPoints,[property:JsonRequired]string Hours,[property:JsonRequired]string Minutes,[property:JsonRequired]string Seconds,[property:JsonRequired]string Enrollment,[property:JsonRequired]string Saved,[property:JsonRequired]bool MapUpdated,[property:JsonRequired]string[] Map,uint? Solo=null,uint? Group=null,int? ThrowStyle=null,string[]? Operations=null,Trainer9IdEvent[]? IdEvents=null,Hall6Trash[]? NameEvents=null);
internal static class Trainer9Actions
{
    internal static byte[] Prepare(byte[] original,Trainer9Request request)
    {
        if(request.SourceHash!=Br4Editing.Hash(original))throw new ArgumentException("Trainer9 preview is stale.");var save=SaveDetectionContext.OpenCurrent(original)as SAV9SV??throw new ArgumentException("Trainer9 save is unrecognized.");return Prepare(save,original,request);
    }
    internal static byte[] Prepare(SAV9SV source,byte[] original,Trainer9Request request){if(request.SourceHash!=Br4Editing.Hash(original))throw new ArgumentException("Trainer9 preview is stale.");var save=new SAV9SV(source.Write().ToArray());Apply(save,request);var output=save.Write().ToArray();var reread=new SAV9SV(output.ToArray());if(!SaveChecksums.Valid(reread))throw new InvalidOperationException("Trainer9 export verification failed.");return output;}
    internal static void Apply(SAV9SV save,Trainer9Request request)
    {
        if(!save.State.Exportable||!SaveChecksums.Valid(save)||request.Name is null||request.Name.Length>12||request.Gender>1||!GameInfo.LanguageDataSource(9,save.Context).Any(v=>v.Value==request.Language)||request.Version is not("SL"or"VL"))throw new ArgumentException("Invalid Trainer9 trainer fields.");
        static uint Number(string text,int width){if(text is null||text.Length>width||text.Any(c=>c<'0'||c>'9'))throw new ArgumentException("Invalid Trainer9 numeric text.");return text.Length==0?0:uint.Parse(text,CultureInfo.InvariantCulture);}
        uint money=Number(request.Money,7),lp=Number(request.LeaguePoints,7),bp=Number(request.BlueberryPoints,7),rawHours=Number(request.Hours,5);if(rawHours>65535)throw new ArgumentException("Trainer9 played hours exceed UInt16.");ushort hours=(ushort)rawHours,minutes=(ushort)Number(request.Minutes,2),seconds=(ushort)Number(request.Seconds,2);
        if(!DateTime.TryParseExact(request.Enrollment,"yyyy-MM-ddTHH:mm:ss",CultureInfo.InvariantCulture,DateTimeStyles.None,out var enrollment)||enrollment.Date<new DateTime(1932,1,1)||enrollment.Date>new DateTime(2050,12,31)||!DateTime.TryParseExact(request.Saved,"yyyy-MM-ddTHH:mm:ss",CultureInfo.InvariantCulture,DateTimeStyles.None,out var saved)||saved.Date<new DateTime(1753,1,1)||saved.Year>4095)throw new ArgumentException("Invalid Trainer9 date.");
        if(request.Operations is not null&&request.Operations.Length>32)throw new ArgumentException("Too many Trainer9 operations.");
        if(request.IdEvents is not null){save.ID32=request.Id;Trainer9Ids.Apply(save,request.IdEvents);}
        if(request.NameEvents is not null){if(request.NameEvents.Length>512)throw new ArgumentException("Too many Trainer9 name events.");foreach(var e in request.NameEvents)Trainer7Editing.Trash(save,save.MyStatus.OriginalTrainerTrash,save.OT,v=>save.OT=v,e);}
        foreach(string operation in request.Operations??[])
        {
            switch(operation)
            {
                case "clothing":PlayerFashionUnlock9.UnlockBase(save.Accessor,save.Gender);break;
                case "bike":foreach(string name in new[]{"FSYS_RIDE_DASH_ENABLE","FSYS_RIDE_SWIM_ENABLE","FSYS_RIDE_HIJUMP_ENABLE","FSYS_RIDE_GLIDE_ENABLE","FSYS_RIDE_CLIMB_ENABLE"})save.Accessor.GetBlock(name).ChangeBooleanType(SCTypeCode.Bool2);if(save.Accessor.TryGetBlock("FSYS_RIDE_FLIGHT_ENABLE",out var fly))fly.ChangeBooleanType(SCTypeCode.Bool2);break;
                case "stakes":save.CollectAllStakes();break;
                case "fly":foreach(uint key in Trainer9Fly.Keys)if(save.Accessor.TryGetBlock(key,out var block))block.ChangeBooleanType(SCTypeCode.Bool2);break;
                case "tm":save.UnlockAllTMRecipes();break;
                case "throwStyles" when save.SaveRevision>=2:save.UnlockAllThrowStyles();break;
                case "coaches" when save.SaveRevision>=2:save.UnlockAllCoaches();break;
                case "legendaries" when save.SaveRevision>=2:save.ActivateSnacksworthLegendaries();break;
                default:throw new ArgumentException("Unsupported Trainer9 operation.");
            }
        }
        save.Version=request.Version=="SL"?GameVersion.SL:GameVersion.VL;save.Gender=request.Gender;if(request.IdEvents is null)save.ID32=request.Id;save.Money=money;save.LeaguePoints=lp;save.Language=request.Language;if(request.NameEvents is null&&save.OT!=request.Name)save.OT=request.Name;save.PlayedHours=hours;save.PlayedMinutes=minutes%60;save.PlayedSeconds=seconds%60;save.EnrollmentDate.Timestamp=enrollment;save.LastSaved.Timestamp=saved;
        if(save.Blocks.TryGetBlock(SaveBlockAccessor9SV.KBlueberryPoints,out var bpBlock))bpBlock.SetValue(bp);
        if(request.MapUpdated)
        {
            if(request.Map is not{Length:4})throw new ArgumentException("Invalid Trainer9 map values.");var values=request.Map.Select(v=>decimal.TryParse(v,NumberStyles.AllowLeadingSign|NumberStyles.AllowDecimalPoint,CultureInfo.InvariantCulture,out var number)&&number>=-99999999&&number<=99999999?number:throw new ArgumentException("Trainer9 map value is out of range.")).ToArray();save.SetCoordinates((float)values[0],(float)values[1],(float)values[2]);double angle=(double)values[3]*Math.PI/360;save.SetPlayerRotation(0,(float)Math.Sin(angle),0,(float)Math.Cos(angle));
        }
        if(save.SaveRevision>=2)
        {
            if(request.Solo is null||request.Group is null||request.ThrowStyle is null||request.ThrowStyle<1||request.ThrowStyle>Util.GetStringList("throw_styles","en").Length)throw new ArgumentException("Invalid Trainer9 Blueberry fields.");save.BlueberryPoints=bp;save.BlueberryQuestRecord.QuestsDoneSolo=request.Solo.Value;save.BlueberryQuestRecord.QuestsDoneGroup=request.Group.Value;save.ThrowStyle=(ThrowStyle9)request.ThrowStyle.Value;
        }
        else if(request.Solo is not null||request.Group is not null||request.ThrowStyle is not null)throw new ArgumentException("Trainer9 Blueberry fields are unsupported for this revision.");
    }
}

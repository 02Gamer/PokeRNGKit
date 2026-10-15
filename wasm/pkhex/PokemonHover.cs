// SPDX-License-Identifier: GPL-3.0-or-later
// Preview composition adapted from PKHeX.WinForms SummaryPreviewer/PokePreview.
// Copyright (C) PKHeX contributors; see third_party/pkhex/UPSTREAM.md.
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonHoverMove(string Name,bool Valid,byte Type);
internal sealed record PokemonHoverQuery([property:JsonRequired]int Box,[property:JsonRequired]int Slot);
internal sealed record PokemonHoverTarget([property:JsonRequired]string Kind,int? Box=null,int? Slot=null,int? Id=null,int? Group=null);
internal sealed record PokemonHoverLanguage(string Title,string Before,string After,string Hint,string Tooltip,PokemonHoverMove[] Moves);
internal sealed record PokemonHoverLanguages(PokemonHoverLanguage Zh,PokemonHoverLanguage En,PokemonHoverLanguage Ja);
internal sealed record PokemonHoverReport(int? Box,int? Slot,string SourceHash,PokemonHoverLanguages Text,PokemonHoverTarget? Target=null,PokemonArtwork? Artwork=null,string Mode="pokemon",int Generation=0,int? Ball=null,string[]? CryNames=null,PokemonArtwork? GlowArtwork=null);
public static partial class Program
{
    [JSExport]public static string ReadPokemonHover(byte[] data,string json)=>SaveService.ReadPokemonHover(data,json);
    [JSExport]public static string ReadContextHover(byte[] data,string json)=>SaveService.ReadContextHover(data,json);
}
public static partial class SaveService
{
    public static string ReadPokemonHover(byte[] data,string json)
    {
        if(json is null||json.Length>1024)throw new ArgumentException("Invalid hover position.");
        var position=JsonSerializer.Deserialize(json,PokemonHoverJson.Default.PokemonHoverQuery)??throw new ArgumentException("Missing hover position.");
        var save=OpenDatabaseSave(data.ToArray());
        var pk=PokemonEditing.Read(save,position.Box,position.Slot).Clone();
        if(pk.Species==0)throw new ArgumentException("Pokemon slot is empty.");
        var analysis=new LegalityAnalysis(pk,save.Personal,position.Box==-1?StorageSlotType.Party:StorageSlotType.Box);
        SaveSpriteView.Select(save);
        return PokemonHover.Serialize(PokemonHover.Entity(new("slot",position.Box,position.Slot),pk,analysis,data));
    }
    public static string ReadContextHover(byte[] data,string json)
    {
        if(json is null||json.Length>1024)throw new ArgumentException("Invalid hover target.");
        var target=JsonSerializer.Deserialize(json,PokemonHoverJson.Default.PokemonHoverTarget)??throw new ArgumentException("Missing hover target.");
        if(target.Kind=="slot"&&target.Box is >=-1&&target.Slot is >=0&&target.Id is null&&target.Group is null)
            return ReadPokemonHover(data,JsonSerializer.Serialize(new PokemonHoverQuery(target.Box.Value,target.Slot.Value),PokemonHoverJson.Default.PokemonHoverQuery));
        if(target.Kind=="database"&&target.Id is >=0&&target.Box is null&&target.Slot is null&&target.Group is null) {
            var entry=PokemonDatabaseRuntime.HoverEntry(data,target.Id.Value);
            var pk=entry.Entity;var analysis=new LegalityAnalysis(pk,entry.Storage);
            SaveSpriteView.Select(OpenDatabaseSave(data.ToArray()));
            return PokemonHover.Serialize(PokemonHover.Entity(target,pk,analysis,data));
        }
        if(target.Kind=="registered"&&target.Group is >=0&&target.Slot is >=0&&target.Box is null&&target.Id is null) {
            var save=OpenDatabaseSave(data.ToArray());var member=RegisteredGroups.HoverMember(save,new(target.Group.Value,target.Slot.Value));
            if(member.Entity.Species==0)throw new ArgumentException("Registered team slot is empty.");
            SaveSpriteView.Select(save);
            return PokemonHover.Serialize(PokemonHover.Entity(target,member.Entity,new LegalityAnalysis(member.Entity,save.Personal,member.Storage),data));
        }
        if(target.Kind is "encounter" or "gift"&&target.Id is >=0&&target.Box is null&&target.Slot is null&&target.Group is null) {
            var encounter=target.Kind=="encounter"?PokemonEncounterRuntime.HoverEntry(data,target.Id.Value):MysteryGiftDatabaseRuntime.HoverEntry(data,target.Id.Value);
            SaveSpriteView.Select(OpenDatabaseSave(data.ToArray()));
            return PokemonHover.Serialize(PokemonHover.Encounter(target,encounter,data));
        }
        throw new ArgumentException("Invalid hover target namespace or position.");
    }
}
internal static class PokemonHover
{
    internal static string Serialize(PokemonHoverReport report)=>JsonSerializer.Serialize(report,PokemonHoverJson.Default.PokemonHoverReport);
    internal static PokemonHoverReport Entity(PokemonHoverTarget target,PKM pk,LegalityAnalysis analysis,byte[] source)
    {
        var hover=SaveProgramSettingsRuntime.Current?.Hover??new();
        var templates=SaveProgramSettingsRuntime.Current?.BattleTemplate??new();
        PokemonHoverLanguage Text(string language,LanguageID id)=>Read(pk,analysis,hover,templates.Hover.GetSettings(id,pk.Context),language);
        return new(target.Kind=="slot"?target.Box:null,target.Kind=="slot"?target.Slot:null,Br4Editing.Hash(source),new(Text("zh-Hans",LanguageID.ChineseS),Text("en",LanguageID.English),Text("ja",LanguageID.Japanese)),target,SaveArtwork.Entity(pk),Generation:pk.Format,Ball:pk.Format>2?pk.Ball:null,CryNames:CryFileNames(pk,pk.Context),GlowArtwork:GlowArtwork(pk));
    }
    // GetSpriteGlow(PKM) uses the base builder with heldItem=0. Shadow,
    // giant/alpha, legality and storage markers are not part of its mask.
    internal static PokemonArtwork GlowArtwork(PKM pk)=>new(pk.Species,
        SaveSpriteView.BaseSprite(pk.Species,pk.Form,pk.Gender,pk is IFormArgument arg?arg.FormArgument:0,pk.Context,pk.IsShiny),
        pk.IsEgg?SaveSpriteView.Egg(pk.Species):null,
        pk.IsEgg&&SaveProgramSettingsRuntime.Current?.Sprite.ShowEggSpriteAsHeldItem==true,
        ShinyOverlay:pk.IsShiny?"rare_icon_alt":null,
        SpecialEffects:FormInfo.IsTotemForm(pk.Species,pk.Form,pk.Context)?new(true,null,false,null):null);
    internal static PokemonHoverReport Encounter(PokemonHoverTarget target,IEncounterInfo encounter,byte[] source)
    {
        var hover=SaveProgramSettingsRuntime.Current?.Hover??new();
        PokemonHoverLanguage Text(string language)=>new("","","","",hover.HoverSlotShowText?string.Join(Environment.NewLine,encounter.GetTextLines(hover.HoverSlotShowEncounterVerbose,language)):"",[]);
        return new(null,null,Br4Editing.Hash(source),new(Text("zh-Hans"),Text("en"),Text("ja")),target,SaveArtwork.Encounter(encounter),"encounter",encounter.Generation,CryNames:CryFileNames(encounter,encounter.Context));
    }
    // PKHeX.WinForms.Controls.CryPlayer: ignore gender, preserve the Urshifu
    // exception and fall back to the species file after the sprite-form name.
    internal static string[] CryFileNames(ISpeciesForm value,EntityContext context)
    {
        if(value.Species==0)return [];
        string form=value is {Species:(ushort)Species.Urshifu,Form:1}?"892-1":SpriteName.GetResourceStringSprite(value.Species,value.Form,0,0,context).Replace('_','-')[1..];
        return new[]{form+".wav",value.Species+".wav"}.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }
    internal static PokemonHoverLanguage Read(PKM pk,LegalityAnalysis analysis,BrowserHoverSettings hover,in BattleTemplateExportSettings settings,string language)
    {
        var localization=LegalityLocalizationSet.GetLocalization(language);
        var context=LegalityLocalizationContext.Create(analysis,localization);
        var order=settings.Order;
        int index=settings.GetTokenIndex(BattleTemplateToken.Moves);
        var before=index==-1?order:order[..index];
        var after=index==-1?default:order[(index+1)..];
        if(before.Length>0&&before[0]==BattleTemplateToken.FirstLine)before=before[1..];
        string start=ShowdownParsing.GetLocalizedPreviewText(pk,settings with {Order=before});
        string end=ShowdownParsing.GetLocalizedPreviewText(pk,settings with {Order=after});
        if(settings.IsTokenInExport(BattleTemplateToken.IVs,before))AppendOtherStats(pk,ref start,settings);
        else if(settings.IsTokenInExport(BattleTemplateToken.IVs,after))AppendOtherStats(pk,ref end,settings);
        string hint=hover.HoverSlotShowLegalityHint?FirstHint(context):"";
        if(hover.HoverSlotShowEncounter)end=AppendEncounter(context,end);
        string tooltip="";
        if(hover.HoverSlotShowText) {
            var textOrder=order.Contains(BattleTemplateToken.FirstLine)?order.ToArray():new[]{BattleTemplateToken.FirstLine}.Concat(order.ToArray()).ToArray();
            tooltip=ShowdownParsing.GetLocalizedPreviewText(pk,settings with {Order=textOrder});
            AppendOtherStats(pk,ref tooltip,settings);
            if(hover.HoverSlotShowEncounter)tooltip=AppendEncounter(context,tooltip);
        }
        var strings=settings.Localization.Strings;
        string title=pk.Nickname;
        if(pk.Species<strings.Species.Count) {
            var species=strings.Species[pk.Species];
            title=settings.IsTokenInExport(BattleTemplateToken.Nickname)?species:pk.Nickname.Equals(species,StringComparison.OrdinalIgnoreCase)?pk.Nickname:$"{pk.Nickname} ({species})";
        }
        var moves=new List<PokemonHoverMove>();
        for(int i=0;i<4;i++) {
            var move=pk.GetMove(i);
            if(move==0||move>=strings.movelist.Length)continue;
            string name=strings.movelist[move];
            byte type=MoveInfo.GetType(move,pk.Context);
            if(move==(int)Move.HiddenPower&&pk.Context!=EntityContext.Gen8a&&HiddenPower.TryGetTypeIndex(pk.HPType,out type))name+=$" ({strings.types[type]}) [{pk.HPPower}]";
            moves.Add(new(name,analysis.Info.Moves[i].Valid,type));
        }
        return new(title,hover.PreviewShowPaste?start:"",hover.HoverSlotShowEncounter?end:"",hint,tooltip,moves.ToArray());
    }
    private static string AppendEncounter(in LegalityLocalizationContext context,string text)
    {
        var lines=new List<string>();
        if(text.Length!=0){lines.Add(text);lines.Add("");}
        LegalityFormatting.AddEncounterInfo(context,lines);
        return string.Join(Environment.NewLine,lines);
    }
    private static string FirstHint(in LegalityLocalizationContext context)
    {
        var analysis=context.Analysis;
        foreach(var check in analysis.Results)if(!check.Valid)return Limit(context.Humanize(check,verbose:true));
        for(int i=0;i<analysis.Info.Moves.Length;i++)if(!analysis.Info.Moves[i].Valid)return Limit(context.FormatMove(analysis.Info.Moves[i],i+1,analysis.Info.Entity.Context));
        for(int i=0;i<analysis.Info.Relearn.Length;i++)if(!analysis.Info.Relearn[i].Valid)return Limit(context.FormatMove(analysis.Info.Relearn[i],i+1,analysis.Info.Entity.Context));
        return "";
        static string Limit(string value)=>value.Length>67?value[..67]+"...":value;
    }
    private static void AppendOtherStats(PKM pk,ref string text,in BattleTemplateExportSettings settings)
    {
        if(pk is IGanbaru ganbaru){Span<byte> stats=stackalloc byte[6];ganbaru.GetGVs(stats);Append(stats,ref text,settings,BattleTemplateToken.GVs,settings.StatsOther);}
        if(pk is IAwakened awakened){Span<byte> stats=stackalloc byte[6];awakened.GetAVs(stats);Append(stats,ref text,settings,BattleTemplateToken.AVs,settings.StatsOther);}
        if(!settings.IsTokenInExport(BattleTemplateToken.SPs)&&settings.IncludeChampionsStatPoints){Span<int> stats=stackalloc int[6];pk.GetEVs(stats);EffortValues.ConvertToChampions(stats,stats);Append(stats,ref text,settings,BattleTemplateToken.SPs,settings.StatsSPs);}
    }
    private static void Append<T>(ReadOnlySpan<T> stats,ref string text,in BattleTemplateExportSettings settings,BattleTemplateToken token,StatDisplayStyle style)where T:unmanaged,IEquatable<T>
    {
        var localization=settings.Localization;
        var names=localization.Config.GetStatDisplay(style);
        var value=ShowdownSet.GetStringStats(stats,default,names);
        if(value.Length!=0)text+=Environment.NewLine+localization.Config.Push(token,value);
    }
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(PokemonHoverReport))]
[JsonSerializable(typeof(PokemonHoverQuery))]
[JsonSerializable(typeof(PokemonHoverTarget))]
internal partial class PokemonHoverJson:JsonSerializerContext{}

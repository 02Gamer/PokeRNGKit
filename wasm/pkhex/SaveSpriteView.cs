// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;

public sealed record SpriteColorLayer(string Color,int Mode,int Thickness,byte Opacity);
public sealed record SpriteExperienceLine(string Color,int Width);
public sealed record SpriteSpecialEffects(bool TotemGlow,string? ShadowGlowSource,bool ShadowEggAsItem,string? Marker);
internal static class SaveSpriteView
{
    internal static string Mode {get;private set;}="b";
    private static readonly Dictionary<string,GameVersion> Versions=new();
    internal static void Configure(string mode)
    {
        if(mode is not ("a" or "b" or "c"))throw new ArgumentException("Invalid sprite mode.");
        // Standalone entity reads have no SaveFile to select a builder from.
        // Forced preferences still apply; other preferences retain the client's mode.
        Mode=SaveProgramSettingsRuntime.Current?.Sprite.SpritePreference switch {
            BrowserSpritePreference.ForceSprites=>"b",
            BrowserSpritePreference.ForceMugshots=>"c",
            BrowserSpritePreference.ForceArtwork=>"a",
            _=>mode,
        };
    }
    internal static void Select(SaveFile save)
    {
        var preference=SaveProgramSettingsRuntime.Current?.Sprite.SpritePreference;
        if(preference is null) {Mode="b";return;}
        Mode=preference switch {
            BrowserSpritePreference.DoNotChange=>Mode,
            BrowserSpritePreference.ForceSprites=>"b",
            BrowserSpritePreference.ForceMugshots=>"c",
            BrowserSpritePreference.ForceArtwork=>"a",
            _=>save is SAV8LA?"c":save is SAV9SV or SAV9ZA?"a":"b",
        };
        if(save.Generation==3)Versions[Mode]=save.Version==GameVersion.FRLG
            ?ReferenceEquals(save.Personal,PersonalTable.FR)?GameVersion.FR:GameVersion.LG
            :save.Version;
    }
    internal static string Sprite(PKM pokemon)
    {
        if(pokemon.IsEgg&&SaveProgramSettingsRuntime.Current is null)return Egg(pokemon.Species);
        if(SaveProgramSettingsRuntime.Current is not null&&pokemon is IShadowCapture {IsShadow:true}&&pokemon.Species==(ushort)Species.Lugia)return "b_249x";
        return BaseSprite(pokemon);
    }
    private static string BaseSprite(PKM pokemon)
    {
        return BaseSprite(pokemon.Species,pokemon.Form,pokemon.Gender,pokemon is IFormArgument arg?arg.FormArgument:0,pokemon.Context,pokemon.IsShiny);
    }
    internal static string BaseSprite(ushort species,byte form,byte gender,uint argument,EntityContext context,bool shiny)
    {
        if(SaveProgramSettingsRuntime.Current is not null) {
            if(context==EntityContext.Gen3&&species==(ushort)Species.Deoxys)
                form=Versions.GetValueOrDefault(Mode) switch {GameVersion.FR=>1,GameVersion.LG=>2,GameVersion.E=>3,_=>0};
            else if(context==EntityContext.Gen4&&species==(ushort)Species.Arceus)
                form=form>9?(byte)(form-1):form==9?byte.MaxValue:form;
            if(FormInfo.IsTotemForm(species,form,context))form=FormInfo.GetTotemBaseForm(species,form);
        }
        return Mode+SpriteName.GetResourceStringSprite(species,form,gender,argument,context,shiny);
    }
    internal static SpriteSpecialEffects? Special(PKM pokemon)
    {
        var settings=SaveProgramSettingsRuntime.Current?.Sprite;
        if(settings is null)return null;
        bool totem=FormInfo.IsTotemForm(pokemon.Species,pokemon.Form,pokemon.Context);
        if(pokemon is IShadowCapture {IsShadow:true})return new(totem,BaseSprite(pokemon),pokemon.IsEgg&&settings.ShowEggSpriteAsHeldItem,null);
        string? marker=pokemon is IGigantamaxReadOnly {CanGigantamax:true}?"dyna":pokemon is IAlphaReadOnly {IsAlpha:true}?"alpha_alt":null;
        return totem||marker is not null?new(totem,null,false,marker):null;
    }
    internal static string Egg(ushort species)=>(Mode=="a"?"a":"b")+(species==490?"_490_e":"_egg");
    internal static string? Item(PKM pokemon)
    {
        return Item(pokemon.SpriteItem,pokemon.Context);
    }
    internal static string? Item(int item,EntityContext context)
    {
        if(SaveProgramSettingsRuntime.Current is null||item<=0)return null;
        return HeldItemLumpUtil.GetIsLump(item,context) switch {
            HeldItemLumpImage.TechnicalMachine=>Mode=="a"?"aitem_tm":"bitem_tm",
            HeldItemLumpImage.TechnicalRecord=>"bitem_tr",
            _=>(Mode=="a"?"a":"b")+"item_"+item,
        };
    }
    internal static string? ShinyIcon(PKM pokemon)
    {
        if(SaveProgramSettingsRuntime.Current is null||!pokemon.IsShiny)return null;
        return ShinyExtensions.GetType(pokemon)==Shiny.AlwaysSquare?"rare_icon_alt_2":"rare_icon_alt";
    }
    // SpriteUtil.ApplyTeraColor and TypeColor.GetTeraSpriteColor. Apply only to
    // storage views: upstream standalone PKM sprites do not add slot backgrounds.
    internal static SpriteColorLayer? Tera(PKM pokemon,bool storage)
    {
        var settings=SaveProgramSettingsRuntime.Current?.Sprite;
        if(!storage||settings is null||settings.ShowTeraType==BrowserSpriteBackground.None||pokemon is not ITeraType tera)return null;
        var type=(byte)tera.TeraType;
        if(!TeraTypeUtil.IsOverrideValid(type))return null;
        string[] colors=["#9FA19F","#FF8000","#81B9EF","#8F41CB","#915121","#AFA981","#91A119","#704170","#60A1B8","#E62829","#2980EF","#3FA129","#FAC000","#EF4179","#3FD8FF","#5061E1","#50413F","#EF71EF"];
        var thickness=settings.ShowTeraThicknessStripe;
        if((uint)thickness>56)thickness=56;
        return new(type==TeraTypeUtil.Stellar?"#FFFFE0":colors[type],(int)settings.ShowTeraType,thickness,
            settings.ShowTeraType==BrowserSpriteBackground.FullBackground?settings.ShowTeraOpacityBackground:settings.ShowTeraOpacityStripe);
    }
    internal static SpriteExperienceLine? ExperienceBar(PKM pokemon,bool storage,IEncounterTemplate? encounter=null)
    {
        if(!storage||SaveProgramSettingsRuntime.Current?.Sprite.ShowExperiencePercent!=true)return null;
        var level=pokemon.CurrentLevel;
        if(level==Experience.MaxLevel)return new("#00FF00",68);
        var percentage=Experience.GetEXPToLevelUpPercentage(level,pokemon.EXP,pokemon.PersonalInfo.EXPGrowth);
        if(percentage!=0)return new("#1E90FF",(int)(68*percentage));
        var met=encounter is {IsEgg:true}?encounter.LevelMin:pokemon.MetLevel;
        return new(level!=met&&pokemon.HasOriginalMetLocation?"#FF8C00":"#FFFF00",68);
    }
}

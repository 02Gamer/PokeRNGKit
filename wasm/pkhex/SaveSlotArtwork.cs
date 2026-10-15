// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record SpriteFilterProfile(float Grayscale,int[] Alpha);
public sealed record SpriteStorageMarker(int Box,int Slot,string[] Markers);
internal sealed record SpriteSlotArtwork(string? Indicator,SpriteColorLayer? Encounter,SpriteExperienceLine? Experience,bool? Parsed,bool? Valid);
internal static class SaveSlotArtwork
{
    internal static string[] Markers(SaveFile save,int box,int slot)
    {
        if(SaveProgramSettingsRuntime.Current is null||(uint)slot>=30)return [];
        var flags=save.GetBoxSlotFlags(box,slot);return Markers(flags);
    }
    internal static string[] Markers(StorageSlotSource flags)
    {
        var result=new List<string>();
        if(flags.IsBattleTeam()>=0)result.Add("team");
        if(flags.HasFlag(StorageSlotSource.Locked))result.Add("locked");
        int party=flags.IsParty();if(party>=0)result.Add("party"+(party+1));
        if(flags.HasFlag(StorageSlotSource.Starter))result.Add("starter");
        return result.ToArray();
    }
    internal static SpriteStorageMarker[] EmptyMarkers(SaveFile save)
    {
        if(SaveProgramSettingsRuntime.Current is null||!save.HasBox)return [];
        var result=new List<SpriteStorageMarker>();
        for(int box=0;box<save.BoxCount;box++)for(int slot=0;slot<save.BoxSlotCount;slot++) {
            var markers=Markers(save,box,slot);
            if(markers.Length!=0&&save.GetBoxSlotAtIndex(box,slot).Species==0)result.Add(new(box,slot,markers));
        }
        return result.ToArray();
    }
    internal static SpriteFilterProfile? Filter()
    {
        var settings=SaveProgramSettingsRuntime.Current?.Sprite;
        if(settings is null)return null;
        // ImageUtil.ChangeOpacity skips <= 0.01f and > 1f. Evaluate the source
        // byte cast inside the actual runtime for the remaining float values.
        var opacity=settings.FilterMismatchOpacity;
        return new(settings.FilterMismatchGrayscale,Enumerable.Range(0,256).Select(alpha=>opacity is <=0.01f or >1f?alpha:(int)unchecked((byte)(alpha*(double)opacity))).ToArray());
    }
    internal static SpriteSlotArtwork Read(SaveFile save,PKM original,int box)
    {
        var program=SaveProgramSettingsRuntime.Current;
        if(program?.Display.FlagIllegal!=true||program.Startup.ForceHaXOnLaunch)return new(null,null,SaveSpriteView.ExperienceBar(original,true),null,null);
        var pokemon=original.Clone();
        var storage=box==-1?StorageSlotType.Party:StorageSlotType.Box;
        var analysis=pokemon.GetType()==save.PKMType?new LegalityAnalysis(pokemon,save.Personal,storage):new LegalityAnalysis(pokemon,pokemon.PersonalInfo,storage);
        string? icon=!analysis.Valid?"warn":pokemon.Format>=8&&MoveInfo.IsDummiedMoveAny(pokemon)?"hint":null;
        var settings=program.Sprite;
        var color=SaveArtwork.EncounterColor(analysis.EncounterOriginal,settings.ShowEncounterColorPKM,settings.ShowEncounterThicknessStripe,settings.ShowEncounterOpacityBackground,settings.ShowEncounterOpacityStripe);
        return new(icon,color,SaveSpriteView.ExperienceBar(pokemon,true,analysis.EncounterMatch),analysis.Parsed,analysis.Valid);
    }
}

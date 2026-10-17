// SPDX-License-Identifier: GPL-3.0-or-later
// WinForms PKMEditor.ClickMetLocation / SetSuggestedMetLocation (26.08.26).
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record MetSuggestionState(int Level,int MetLevel,int Location,LocalizedText LocationName,int? GroundTile,int? TimeOfDay);
internal sealed record MetSuggestionResult(PKM Pokemon,MetSuggestionState Before,MetSuggestionState After,bool HatchMemory);
internal static class PokemonMetSuggestion
{
    internal static bool Supported(PKM p)=>p is PK2||p.Format>=3&&StandalonePokemon.CanEdit(p);
    internal static MetSuggestionState State(PKM p)
    {
        var version=p is PK2?GameVersion.C:p.Version;
        var names=PokemonOrigin.Localize(s=>s.Met.GetLocationList(version,p.Context));
        string fallback="#"+p.MetLocation.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var name=names.FirstOrDefault(c=>c.Id==p.MetLocation)?.Name??new(fallback,fallback,fallback);
        return new(p.CurrentLevel,p.MetLevel,p.MetLocation,name,p is IGroundTile tile?(int)tile.GroundTile:null,p is PK2 crystal?crystal.MetTimeOfDay:null);
    }
    internal static MetSuggestionResult? Prepare(PKM original)
    {
        if(PokemonEditorMode.HaX||!Supported(original)||!PokemonEditorMode.Readable(original))throw new ArgumentException("Automatic met suggestion is unavailable for this editor mode or format.");
        var p=original.Clone();
        if(PokemonHints.Analyze(p).Valid)return null;
        var encounter=EncounterSuggestion.GetSuggestedMetInfo(p);
        if(encounter is null||p.Format>=3&&encounter.Location==0)return null;
        byte level=encounter.LevelMin;int minimum=EncounterSuggestion.GetLowestLevel(p,level);if(minimum==0)minimum=level;
        ushort location=encounter.Location;
        if(p.Format<3&&encounter.Encounter is{} found&&!found.Version.Contains(GameVersion.C))location=0;
        if(p.CurrentLevel>=minimum&&p.MetLevel==level&&p.MetLocation==location&&
            (!encounter.HasGroundTile(p.Format)||p is IGroundTile current&&current.GroundTile==encounter.GetSuggestedGroundTile()))return null;
        minimum=Math.Max(minimum,level);
        if(EntitySuggestionUtil.GetMetLocationSuggestionMessage(p,level,location,minimum,encounter.Encounter).Count<=1)return null;
        var before=State(p);byte metLevel=encounter.GetSuggestedMetLevel(p);
        p.MetLocation=location;p.MetLevel=metLevel;
        if(p.MetLocation!=location||p.MetLevel!=metLevel)throw new ArgumentException("Suggested met fields cannot be stored by this format.");
        if(p.Format>=3&&encounter.HasGroundTile(p.Format))
        {
            if(p is not IGroundTile tile)throw new ArgumentException("Suggested ground tile is unavailable.");
            tile.GroundTile=encounter.GetSuggestedGroundTile();
            if(tile.GroundTile!=encounter.GetSuggestedGroundTile())throw new ArgumentException("Suggested ground tile cannot be stored.");
        }
        if(p is PK2 crystal){int time=location==0?0:encounter.GetSuggestedMetTimeOfDay();crystal.MetTimeOfDay=time;if(crystal.MetTimeOfDay!=time)throw new ArgumentException("Suggested encounter time cannot be stored.");}
        bool memory=p is{Gen6:true,WasEgg:true};if(memory)p.SetHatchMemory6();
        if(p.CurrentLevel<minimum){if(minimum is <1 or >100)throw new ArgumentException("Suggested level is outside the normal editor range.");p.CurrentLevel=(byte)minimum;p.ResetPartyStats();}
        p.RefreshChecksum();return new(p,before,State(p),memory);
    }
}

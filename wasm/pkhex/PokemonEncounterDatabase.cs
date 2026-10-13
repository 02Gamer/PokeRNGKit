// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.CompilerServices;
using PKHeX.Core;
using PKHeX.Core.Searching;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonEncounterDatabaseOptions(bool ReturnNoneIfEmptySearch=true,
    bool FilterUnavailableSpecies=true,bool UseTabsAsCriteria=true,bool UseTabsAsCriteriaAnySpecies=true,int GridRows=9);
internal sealed record PokemonEncounterDatabaseQuery(ushort Species=0,int Version=0,ushort[]? Moves=null,
    bool? Egg=null,bool? Shiny=null,EncounterTypeGroup[]? Types=null,string Instructions="");

// Source SAV_Encounters.SearchDatabase/GetEncounters/ClickView. This is owned by
// one Worker, which consumes searches synchronously before resetting Core globals.
internal sealed class PokemonEncounterDatabase
{
    private readonly SaveFile save;
    private readonly PKM editor;
    private readonly TrainerDatabase trainers=new();
    private readonly PokemonEncounterDatabaseOptions options;
    private EncounterCriteria criteria;
    internal EncounterCriteria Criteria=>criteria;
    internal EncounterCriteria EditorCriteria=>BuildCriteria(editor);
    internal PokemonSearchFormat[] EditorFormats=>PokemonSearchCatalogReader.Formats(editor);
    internal void SetCriteria(EncounterCriteria value)=>criteria=value;
    internal IEncounterInfo[] Results {get;private set;}=[];
    internal int GridRows {get;}
    internal PokemonEncounterDatabase(SaveFile source,PKM prepared,EncounterCriteria? criteria=null,
        IReadOnlyList<ITrainerInfo>? training=null,PokemonEncounterDatabaseOptions? options=null)
    {
        save=PokemonDatabase.Copy(source);editor=prepared.Clone();this.options=options??new();
        this.criteria=criteria??BuildCriteria(editor);GridRows=Math.Clamp(this.options.GridRows,5,20);
        if(training is {Count:>1024})throw new ArgumentException("Encounter trainer database exceeds the browser limit.");
        foreach(var trainer in training??[])trainers.RegisterCopy(trainer);
    }
    internal static EncounterCriteria BuildCriteria(PKM editor)
    {
        var set=new ShowdownSet(editor);var mutations=EncounterMutationUtil.GetSuggested(editor.Context,set.Level);
        var criteria=EncounterCriteria.GetCriteria(set,editor.PersonalInfo,mutations);
        return editor.Context.IsHyperTrainingAvailable(100)?criteria.ReviseIVsHyperTrainAvailable():criteria;
    }
    internal IEncounterInfo[] Search(PokemonEncounterDatabaseQuery query)
    {
        Results=[];
        if(query is null || query.Instructions is null || query.Instructions.Length>32767 || query.Moves is {Length:>4}
            || query.Species>=GameInfo.GetStrings("en").Species.Count || query.Version!=0 && (query.Version is <0 or >255 || !((GameVersion)query.Version).IsValidSavedVersion()))
            throw new ArgumentException("Invalid encounter search inputs.");
        var types=query.Types??Enum.GetValues<EncounterTypeGroup>().Where(type=>type!=0).ToArray();
        if(types.Any(type=>type==0 || !Enum.IsDefined(type)) || types.Distinct().Count()!=types.Length)
            throw new ArgumentException("Invalid encounter type selection.");
        var settings=new SearchSettings{Context=save.Context,Generation=save.Generation,Species=query.Species,
            Version=(GameVersion)query.Version,BatchInstructions=query.Instructions,SearchEgg=query.Egg,SearchShiny=query.Shiny};
        foreach(ushort move in query.Moves??[]){if(move>=GameInfo.GetStrings("en").Move.Count)throw new ArgumentException("Invalid encounter move.");settings.AddMove(move);}
        if(types.Length==0 || options.ReturnNoneIfEmptySearch && settings.Species==0 && settings.Moves.Count==0)return Results;
        try {
            EncounterMovesetGenerator.PriorityList=types;
            var versions=settings.GetVersions(save);var moves=settings.Moves.ToArray();var blank=save.BlankPKM;
            var species=query.Species==0?Enumerable.Range(1,save.MaxSpeciesID).Select(value=>(ushort)value):new[]{query.Species};
            IEnumerable<IEncounterInfo> encounters=Enumerate(species,moves,versions,blank);
            if(query.Egg is {} egg)encounters=encounters.Where(encounter=>encounter.IsEgg==egg);
            if(query.Shiny is {} shiny)encounters=encounters.Where(encounter=>encounter.IsShiny==shiny);
            encounters=encounters.Distinct(new SourceReferenceComparer());
            if(options.FilterUnavailableSpecies && EntityPresenceFilters.GetFilterGeneric<IEncounterInfo>(save.Context) is {} available)
                encounters=encounters.Where(available);
            if(query.Instructions.Length!=0 && !StringInstructionSet.HasEmptyLine(query.Instructions)) {
                var filters=StringInstruction.GetFilters(query.Instructions);EntityBatchEditor.ScreenStrings(filters);
                encounters=encounters.Where(encounter=>BatchEditingUtil.IsFilterMatch(filters,encounter));
            }
            // Explicit resource boundary, never silently truncate a search result set.
            var result=encounters.Take(100001).ToArray();if(result.Length>100000)throw new ArgumentException("Encounter search exceeds 100000 results. Narrow the filters.");
            return Results=result;
        } finally {EncounterMovesetGenerator.ResetFilters();}
    }
    private IEnumerable<IEncounterInfo> Enumerate(IEnumerable<ushort> species,ReadOnlyMemory<ushort> moves,
        ReadOnlyMemory<GameVersion> versions,PKM blank)
    {
        foreach(ushort value in species) {
            var personal=save.Personal.GetFormEntry(value,0);byte count=personal.FormCount;
            if(count==0 && !options.FilterUnavailableSpecies)count=PersonalTable.USUM.GetFormEntry(value,0).FormCount;
            for(byte form=0;form<count;form++) {
                if(FormInfo.IsBattleOnlyForm(value,form,blank.Format))continue;
                blank.Species=value;blank.Form=form;blank.SetGender(blank.GetSaneGender());
                EncounterMovesetGenerator.OptimizeCriteria(blank,save);
                foreach(var encounter in EncounterMovesetGenerator.GenerateEncounters(blank,moves,versions))yield return encounter;
            }
        }
    }
    internal EncounterCriteria CriteriaFor(IEncounterTemplate encounter)
    {
        if(!options.UseTabsAsCriteria)return EncounterCriteria.Unrestricted;
        bool inChain=EvolutionTree.GetEvolutionTree(editor.Context).IsSpeciesDerivedFrom(editor.Species,editor.Form,encounter.Species,encounter.Form);
        if(!options.UseTabsAsCriteriaAnySpecies && !inChain)return EncounterCriteria.Unrestricted;
        var result=criteria;
        if(!inChain || EntityGender.IsSingleGender(encounter.Species))result=result with{Gender=Gender.Random};
        if(!result.Mutations.CanGetAbility(encounter.Ability,result.Ability))result=result with{Ability=AbilityPermission.Any12H};
        return result;
    }
    internal PKM Generate(int id)
    {
        if((uint)id>=Results.Length)throw new ArgumentException("Invalid encounter result id.");
        var encounter=Results[id];var selected=TrainerFor(encounter);
        var original=encounter.ConvertToPKM(selected,CriteriaFor(encounter));
        var converted=EntityConverter.ConvertToType(original,save.PKMType,out var result)
            ??throw new ArgumentException($"Encounter conversion is unsupported: {result}.");
        save.AdaptToSaveFile(converted);converted.RefreshChecksum();return converted;
    }
    internal ITrainerInfo TrainerFor(IEncounterTemplate encounter)=>trainers.GetTrainer(encounter.Version,encounter.Generation<=2?(LanguageID)save.Language:null)??save;
    private sealed class SourceReferenceComparer:IEqualityComparer<IEncounterInfo>
    {
        public bool Equals(IEncounterInfo? x,IEncounterInfo? y)=>x is not null && y is not null && RuntimeHelpers.GetHashCode(x)==RuntimeHelpers.GetHashCode(y);
        public int GetHashCode(IEncounterInfo value)=>RuntimeHelpers.GetHashCode(value);
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonEncounterCriteria(byte Gender,sbyte Ability,byte Nature,byte Shiny,
    sbyte Hp,sbyte Atk,sbyte Def,sbyte Spa,sbyte Spd,sbyte Spe,byte LevelMin,byte LevelMax,
    sbyte HiddenPowerType,sbyte Form,byte Mutations)
{
    internal static PokemonEncounterCriteria From(EncounterCriteria value)=>new((byte)value.Gender,(sbyte)value.Ability,(byte)value.Nature,(byte)value.Shiny,
        value.IV_HP,value.IV_ATK,value.IV_DEF,value.IV_SPA,value.IV_SPD,value.IV_SPE,value.LevelMin,value.LevelMax,value.HiddenPowerType,value.Form,(byte)value.Mutations);
    internal EncounterCriteria ToCore()
    {
        if(!Enum.IsDefined((Gender)Gender)||!Enum.IsDefined((AbilityPermission)Ability)||!Enum.IsDefined((Nature)Nature)||!Enum.IsDefined((Shiny)Shiny))throw new ArgumentException("Invalid encounter criteria enum.");
        // Source PropertyGrid uses the full CLR numeric ranges, including byte
        // flags; retain them rather than silently clamping to inferred limits.
        return new(){Gender=(Gender)Gender,Ability=(AbilityPermission)Ability,Nature=(Nature)Nature,Shiny=(Shiny)Shiny,
            IV_HP=Hp,IV_ATK=Atk,IV_DEF=Def,IV_SPA=Spa,IV_SPD=Spd,IV_SPE=Spe,
            LevelMin=LevelMin,LevelMax=LevelMax,HiddenPowerType=HiddenPowerType,Form=Form,Mutations=(EncounterMutation)Mutations};
    }
}
internal sealed record PokemonEncounterEnum(int Id,string Name);
internal sealed record PokemonEncounterCatalog(OriginChoice[] Species,OriginChoice[] Games,OriginChoice[] Moves,OriginChoice[] Languages,
    OriginChoice[] Natures,OriginChoice[] HiddenPowerTypes,PokemonEncounterEnum[] Types,
    PokemonEncounterEnum[] Genders,PokemonEncounterEnum[] Abilities,PokemonEncounterEnum[] Shinies,
    PokemonEncounterEnum[] Mutations,PokemonEncounterCriteria Unrestricted,PokemonEncounterCriteria FromEditor,
    PokemonSearchFormat[] Formats,string[] Prefixes);
internal static class PokemonEncounterCatalogReader
{
    internal static PokemonEncounterCatalog Read(SaveFile save,EncounterCriteria editor,PokemonSearchFormat[] formats)
    {
        var search=PokemonSearchCatalogReader.Read(save,save.BlankPKM);
        static PokemonEncounterEnum[] Values<T>()where T:struct,Enum=>Enum.GetValues<T>().Select(value=>new PokemonEncounterEnum(Convert.ToInt32(value),value.ToString())).ToArray();
        var languages=new[]{"zh-Hans","en","ja"}.Select(language=>new GameDataSource(GameInfo.GetStrings(language)).LanguageDataSource(9,EntityContext.Gen9a)).ToArray();
        var names=languages.Select(list=>list.ToDictionary(value=>value.Value,value=>value.Text)).ToArray();
        var choices=languages[1].Select(value=>new OriginChoice(value.Value,new(names[0][value.Value],names[1][value.Value],names[2][value.Value]))).ToArray();
        return new(search.Species,search.Games,search.Moves,choices,search.Natures,search.HiddenPowerTypes,
            Values<EncounterTypeGroup>().Where(value=>value.Id!=0).ToArray(),
            [new(0,"Male"),new(1,"Female"),new(2,"Random")],Values<AbilityPermission>(),Values<Shiny>(),Values<EncounterMutation>(),
            PokemonEncounterCriteria.From(EncounterCriteria.Unrestricted),PokemonEncounterCriteria.From(editor),formats,
            StringInstruction.Prefixes[1..].ToArray().Select(value=>value.ToString()).ToArray());
    }
}
internal sealed record PokemonEncounterTrainer(int Version,string Name,ushort Tid,ushort Sid,byte Gender,int Language,
    byte ConsoleRegion=0,byte Country=0,byte Region=0)
{
    internal ITrainerInfo ToCore()
    {
        if(!((GameVersion)Version).IsValidSavedVersion()||Name is null||Name.Length>32767||Gender>1||!Enum.IsDefined((LanguageID)Language)||Language==0)
            throw new ArgumentException("Invalid encounter trainer reference.");
        return new SimpleTrainerInfo((GameVersion)Version){OT=Name,TID16=Tid,SID16=Sid,Gender=Gender,Language=Language,
            ConsoleRegion=ConsoleRegion,Country=Country,Region=Region};
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonIdentityEdit(ushort Species, byte Form, byte Gender, bool UseSpeciesName);
public sealed record SpeciesChoice(ushort Id, LocalizedText Name, FormChoice[] Forms, bool? Selectable = null);
public sealed record FormChoice(LocalizedText Name, byte[] Genders, LocalizedText[] Abilities);

internal static class PokemonIdentity
{
    private static LocalizedText Text(Func<GameStrings, string> read) => new(
        read(GameInfo.GetStrings("zh-Hans")), read(GameInfo.GetStrings("en")), read(GameInfo.GetStrings("ja")));

    public static string[] Forms(SaveFile save, ushort species, GameStrings strings,bool semantic=false)
    {
        if (!FormInfo.HasFormSelection(save.Personal[species], species, save.BlankPKM.Format))
            return [string.Empty];
        var names = FormConverter.GetFormList(species, strings.Types, strings.forms, semantic?GameInfo.GenderSymbolUnicode:PokemonDisplay.GenderSymbols,save.Context);
        return names.Length == 0 ? [string.Empty] : names;
    }

    public static byte[] Genders(SaveFile save, ushort species, byte form)
    {
        var names = Forms(save, species, GameInfo.GetStrings("en"),true);
        if (names.Length == 2 && names[0] == "♂" && names[1] == "♀") return [form];
        return save.Personal.GetFormEntry(species, form).Gender switch
        {
            PersonalInfo.RatioMagicGenderless => [2],
            PersonalInfo.RatioMagicFemale => [1],
            PersonalInfo.RatioMagicMale => [0],
            _ => [0, 1],
        };
    }

    public static SpeciesChoice[] Choices(SaveFile save)
    {
        var directory=PokemonChoiceCatalog.Read(save);
        return Enumerable.Range(PokemonEditorMode.HaX?0:1, save.BlankPKM.MaxSpeciesID+(PokemonEditorMode.HaX?1:0))
        .Select(id =>
        {
            var species = (ushort)id;
            var forms = Forms(save, species, GameInfo.GetStrings("en"));
            return new SpeciesChoice(species, Text(s => s.specieslist[id]), Enumerable.Range(0, forms.Length).Select(f =>
            {
                var personal = save.Personal.GetFormEntry(species, (byte)f);
                return new FormChoice(Text(s => Forms(save, species, s)[f]), Genders(save, species, (byte)f),
                    Enumerable.Range(0, personal.AbilityCount).Select(a => Text(s => s.abilitylist[personal.GetAbilityAtIndex(a)])).ToArray());
            }).ToArray(),directory.Species.Contains(id));
        }).ToArray();
    }

    public static void Apply(SaveFile save, PKM p, PokemonIdentityEdit edit, int box)
    {
        if ((!PokemonEditorMode.HaX && edit.Species == 0) || edit.Species > p.MaxSpeciesID || (!(PokemonEditorMode.HaX&&p.Format>=4)&&edit.Form >= Forms(save, edit.Species, GameInfo.GetStrings("en")).Length))
            throw new ArgumentException("Pokemon species or form is outside the format limits.");
        if (!Genders(save, edit.Species, edit.Form).Contains(edit.Gender))
            throw new ArgumentException("Pokemon gender is outside the species limits.");
        ApplyIdentity(p, edit, box);
    }

    // Standalone entities use their own personal data/context, never a fabricated save.
    private static PKM SpeciesCopy(PKM p, ushort species, byte form)
    {
        var copy = p.Clone(); copy.Species = species; copy.Form = form;
        return copy;
    }
    public static string[] Forms(PKM p, ushort species, GameStrings strings,bool semantic=false)
    {
        var copy = SpeciesCopy(p, species, 0);
        if (!FormInfo.HasFormSelection(copy.PersonalInfo, species, p.Format)) return [string.Empty];
        var names = FormConverter.GetFormList(species, strings.Types, strings.forms, semantic?GameInfo.GenderSymbolUnicode:PokemonDisplay.GenderSymbols,p.Context);
        return names.Length == 0 ? [string.Empty] : names;
    }
    public static byte[] Genders(PKM p, ushort species, byte form)
    {
        var names = Forms(p, species, GameInfo.GetStrings("en"),true);
        if (names.Length == 2 && names[0] == "♂" && names[1] == "♀") return [form];
        return SpeciesCopy(p, species, form).PersonalInfo.Gender switch
        {
            PersonalInfo.RatioMagicGenderless => [2], PersonalInfo.RatioMagicFemale => [1],
            PersonalInfo.RatioMagicMale => [0], _ => [0, 1],
        };
    }
    public static SpeciesChoice[] Choices(PKM p)
    {
        var directory=PokemonChoiceCatalog.Read(p);
        return Enumerable.Range(PokemonEditorMode.HaX?0:1, p.MaxSpeciesID+(PokemonEditorMode.HaX?1:0)).Select(id =>
    {
        var species = (ushort)id;
        var forms = Forms(p, species, GameInfo.GetStrings("en"));
        return new SpeciesChoice(species, Text(s => s.specieslist[id]), Enumerable.Range(0, forms.Length).Select(f =>
        {
            var personal = SpeciesCopy(p, species, (byte)f).PersonalInfo;
            return new FormChoice(Text(s => Forms(p, species, s)[f]), Genders(p, species, (byte)f),
                Enumerable.Range(0, personal.AbilityCount).Select(a => Text(s => s.abilitylist[personal.GetAbilityAtIndex(a)])).ToArray());
        }).ToArray(),directory.Species.Contains(id));
    }).ToArray();
    }
    public static void Apply(PKM p, PokemonIdentityEdit edit, int box)
    {
        if ((!PokemonEditorMode.HaX && edit.Species == 0) || edit.Species > p.MaxSpeciesID || (!(PokemonEditorMode.HaX&&p.Format>=4)&&edit.Form >= Forms(p, edit.Species, GameInfo.GetStrings("en")).Length))
            throw new ArgumentException("Pokemon species or form is outside the format limits.");
        if (!Genders(p, edit.Species, edit.Form).Contains(edit.Gender))
            throw new ArgumentException("Pokemon gender is outside the species limits.");
        ApplyIdentity(p, edit, box);
    }
    private static void ApplyIdentity(PKM p, PokemonIdentityEdit edit, int box)
    {
        var changed = p.Species != edit.Species || p.Form != edit.Form || p.Gender != edit.Gender;
        var oldSpecies = p.Species;
        var oldForm = p.Form;
        p.Species = edit.Species;
        if (p.Form != edit.Form) p.Form = edit.Form;
        if(p.Form!=edit.Form)throw new ArgumentException("Form cannot be stored by this format.");
        if(!PokemonEditorMode.HaX)PokemonFormArgument.NormalizeIdentityChange(p, oldSpecies, oldForm, box);
        if (changed && p.Format <= 5 && (!PokemonEditorMode.HaX || oldSpecies != edit.Species || p.Gender != edit.Gender)) p.SetPIDGender(edit.Gender);
        p.Gender = edit.Gender;
    }
}

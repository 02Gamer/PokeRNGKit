// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;

public sealed record Dex9aState([property: JsonRequired] int Species, bool[][] Forms, bool[] Languages, bool[] Genders, bool[] Mega,
    [property: JsonRequired] bool IsNew, [property: JsonRequired] bool Alpha,
    [property: JsonRequired] uint DisplayForm, [property: JsonRequired] uint DisplayGender, [property: JsonRequired] bool DisplayShiny);
public sealed record Dex9aEntry(Dex9aState State, int Number, LocalizedText Name, LocalizedText[] FormChoices, LocalizedText[] MegaChoices);
public sealed record Dex9aCatalog(bool CanEdit, Dex9aEntry[] Entries);
public sealed record Dex9aEdit(string Action, Dex9aState? Entry = null, int Species = 0, bool Shiny = false);

internal static class ZaPokedex
{
    private const uint Key = 0x2D87BE5C;
    private static readonly int[] Languages = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11];
    private static ArgumentException Invalid() => new("Pokedex choices are invalid.");
    public static bool Supports(SaveFile save) => save is SAV9ZA za &&
        za.Blocks.GetBlock(SaveBlockAccessor9ZA.KSaveRevision).Type == SCTypeCode.UInt64 && za.GetValue<ulong>(SaveBlockAccessor9ZA.KSaveRevision) <= 2;
    private static SAV9ZA Require(SaveFile save) => Supports(save) ? (SAV9ZA)save : throw Invalid();
    private static bool Valid(SAV9ZA save, int species) => species > 0 && species <= save.MaxSpeciesID && save.Personal.IsSpeciesInGame((ushort)species);
    private static LocalizedText Text(Func<GameStrings, string> f) => new(f(GameInfo.GetStrings("zh-Hans")), f(GameInfo.GetStrings("en")), f(GameInfo.GetStrings("ja")));
    private static string[] Mega(ushort species, int revision, GameStrings s)
    {
        var m = FormConverter.GetMegaFormNames(s.forms, GameInfo.GenderSymbolASCII, s.Types);
        if (Zukan9a.IsMegaFormXY(species, revision)) return [m.X, m.Y];
        if (Zukan9a.IsMegaFormZA(species, revision)) return [m.Regular, m.Z];
        return species switch { (ushort)Species.Meowstic => [m.MeowsticM, m.MeowsticF], (ushort)Species.Magearna => [m.Magearna0, m.Magearna1], (ushort)Species.Tatsugiri => [m.Tatsu0, m.Tatsu1, m.Tatsu2], _ => [m.Regular] };
    }
    private static string[] FormNames(ushort species, GameStrings s) => FormConverter.GetFormList(species, s.Types, s.forms, GameInfo.GenderSymbolASCII, EntityContext.Gen9a);
    public static Dex9aState State(SAV9ZA save, ushort species)
    {
        Require(save);
        if (!Valid(save, species)) throw Invalid(); // Core otherwise aliases out-of-range species to entry zero.
        var e = save.Zukan.GetEntry(species);
        bool[][] forms = [new bool[32], new bool[32], new bool[32]];
        for (byte f = 0; f < 32; f++) { forms[0][f] = e.GetIsFormCaught(f); forms[1][f] = e.GetIsFormSeen(f); forms[2][f] = e.GetIsShinySeen(f); }
        var languages = new bool[10]; for (int l = 0; l < 10; l++) languages[l] = e.GetLanguageFlag(Languages[l]);
        var genders = new bool[3]; for (byte g = 0; g < 3; g++) genders[g] = e.GetIsGenderSeen(g);
        var mega = new bool[Mega(species, save.SaveRevision, GameInfo.GetStrings("en")).Length];
        for (byte m = 0; m < mega.Length; m++) mega[m] = e.GetIsSeenMega(m);
        return new(species, forms, languages, genders, mega, e.GetDisplayIsNew(), e.GetIsSeenAlpha(), e.DisplayForm, (byte)e.DisplayGender, e.GetDisplayIsShiny());
    }
    public static Dex9aCatalog Read(SaveFile input)
    {
        var save = Require(input);
        return new(save.State.Exportable && SaveChecksums.Valid(save), Enumerable.Range(1, save.MaxSpeciesID).Where(s => Valid(save, s)).Select(s => {
            ushort species = (ushort)s; var state = State(save, species); int number = 0;
            for (byte f = 0; f < save.Personal[species].FormCount; f++) { var pi = save.Personal[species, f]; if (pi.DexIndex != 0) { number = pi.DexIndex; break; } }
            int names = FormNames(species, GameInfo.GetStrings("en")).Length;
            return new Dex9aEntry(state, number, Text(t => t.specieslist[species]), Enumerable.Range(0, 32).Select(f => f < names
                ? Text(t => { var name = FormNames(species, t)[f]; return name.Length == 0 ? t.Types[0] : name; })
                : new LocalizedText("未命名形态", "Unnamed form", "名称のないフォルム")).ToArray(), Enumerable.Range(0, state.Mega.Length).Select(m => Text(t => Mega(species, save.SaveRevision, t)[m])).ToArray());
        }).OrderBy(e => e.Number == 0 ? int.MaxValue : e.Number).ThenBy(e => e.State.Species).ToArray());
    }
    public static string Snapshot(SAV9ZA save) => Convert.ToHexString(save.Blocks.GetBlock(Key).Data);
    public static string Apply(SaveFile input, Dex9aEdit edit)
    {
        var save = Require(input); var d = save.Zukan;
        if (edit.Action == "entry")
        {
            if (edit.Entry is null || edit.Species != 0 || edit.Shiny) throw Invalid();
            SetEntry(save, edit.Entry);
        }
        else
        {
            if (edit.Entry is not null || (edit.Action != "give" && edit.Species != 0) || (edit.Shiny && edit.Action is not ("give" or "seen" or "caught" or "complete"))) throw Invalid();
            switch (edit.Action)
            {
                case "give": if (!Valid(save, edit.Species)) throw Invalid(); d.SetDexEntryAll((ushort)edit.Species, edit.Shiny); break;
                case "clear": d.SeenNone(); break;
                case "seen": d.SeenAll(edit.Shiny); break;
                case "caught": d.CaughtAll(edit.Shiny); break;
                case "complete": d.CompleteDex(edit.Shiny); break;
                // Core CaughtNone uses SetAllCaught(false), which re-adds extra form bits and removes seen flags.
                // The entry-level operation actually clears every caught bit and retains seen/Mega/Alpha records.
                case "uncaught": for (ushort s = 1; s <= save.MaxSpeciesID; s++) d.GetEntry(s).ClearCaught(); break;
                default: throw Invalid();
            }
        }
        return Snapshot(save);
    }
    private static void SetEntry(SAV9ZA save, Dex9aState state)
    {
        if (!Valid(save, state.Species)) throw Invalid();
        ushort species = (ushort)state.Species; var old = State(save, species);
        if (state.Forms is not { Length: 3 } || state.Forms.Any(r => r is not { Length: 32 }) || state.Languages is not { Length: 10 } ||
            state.Genders is not { Length: 3 } || state.Mega is null || state.Mega.Length != old.Mega.Length ||
            (state.DisplayForm != old.DisplayForm && state.DisplayForm > 31) || (state.DisplayGender != old.DisplayGender && state.DisplayGender > 3)) throw Invalid();
        var e = save.Zukan.GetEntry(species);
        for (byte f = 0; f < 32; f++)
        {
            if (state.Forms[0][f] != old.Forms[0][f]) e.SetIsFormCaught(f, state.Forms[0][f]);
            if (state.Forms[1][f] != old.Forms[1][f]) e.SetIsFormSeen(f, state.Forms[1][f]);
            if (state.Forms[2][f] != old.Forms[2][f]) e.SetIsShinySeen(f, state.Forms[2][f]);
        }
        for (int l = 0; l < 10; l++) if (state.Languages[l] != old.Languages[l]) e.SetLanguageFlag(Languages[l], state.Languages[l]);
        for (byte g = 0; g < 3; g++) if (state.Genders[g] != old.Genders[g]) e.SetIsGenderSeen(g, state.Genders[g]);
        for (byte m = 0; m < state.Mega.Length; m++) if (state.Mega[m] != old.Mega[m]) e.SetIsSeenMega(m, state.Mega[m]);
        if (state.IsNew != old.IsNew) e.SetDisplayIsNew(state.IsNew);
        if (state.Alpha != old.Alpha) e.SetIsSeenAlpha(state.Alpha);
        if (state.DisplayShiny != old.DisplayShiny) e.SetDisplayIsShiny(state.DisplayShiny);
        if (state.DisplayForm != old.DisplayForm) e.DisplayForm = (byte)state.DisplayForm;
        if (state.DisplayGender != old.DisplayGender) e.DisplayGender = (DisplayGender9a)state.DisplayGender;
    }
}

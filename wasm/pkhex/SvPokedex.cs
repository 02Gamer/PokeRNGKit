// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;

public sealed record Dex9Display([property: JsonRequired] uint Form, [property: JsonRequired] uint Gender, [property: JsonRequired] bool Shiny);
public sealed record Dex9State([property: JsonRequired] int Species,
    [property: JsonRequired] uint? Status, [property: JsonRequired] bool? IsNew, [property: JsonRequired] bool? Different,
    bool[] Genders, [property: JsonRequired] bool Shiny, bool[] Languages, bool[][] Forms, Dex9Display[] Displays);
public sealed record Dex9Entry(Dex9State State, LocalizedText Name, LocalizedText[] FormChoices, int[] Regions);
public sealed record Dex9Catalog(bool CanEdit, bool Modern, Dex9Entry[] Entries);
public sealed record Dex9Edit(string Action, Dex9State? Entry = null, int Species = 0, bool Shiny = false);

internal static class SvPokedex
{
    private const uint Paldea = 0x0DEAAEBD, Kitakami = 0xF5D7C0E2;
    private static readonly int[] Languages = [1, 2, 3, 4, 5, 7, 8, 9, 10];
    private static SAV9SV Require(SaveFile s) => s as SAV9SV ?? throw Invalid();
    private static ArgumentException Invalid() => new("Pokedex choices are invalid.");
    private static bool Modern(SAV9SV s) => s.Zukan.GetRevision() == 1;
    private static bool SpeciesValid(SAV9SV s, int species) => species > 0 && species <= s.MaxSpeciesID && s.Personal.IsSpeciesInGame((ushort)species);
    private static LocalizedText Text(Func<GameStrings, string> f) => new(f(GameInfo.GetStrings("zh-Hans")), f(GameInfo.GetStrings("en")), f(GameInfo.GetStrings("ja")));
    private static string[] Forms(ushort species, bool modern, GameStrings s) => !modern && species == (ushort)Species.Alcremie
        ? FormConverter.GetAlcremieFormList(s.forms) : FormConverter.GetFormList(species, s.Types, s.forms, GameInfo.GenderSymbolASCII, EntityContext.Gen9);
    private static int[] Regions(SAV9SV save, ushort species)
    {
        int[] result = [0, 0, 0];
        for (byte f = 0; f < save.Personal[species].FormCount; f++)
        {
            var p = save.Personal.GetFormEntry(species, f);
            int[] values = [p.DexPaldea, p.DexKitakami, p.DexBlueberry];
            for (int r = 0; r < 3; r++) if (result[r] == 0) result[r] = values[r];
        }
        return result;
    }
    public static Dex9State State(SAV9SV save, ushort species)
    {
        if (!SpeciesValid(save, species)) throw Invalid();
        bool[] genders = new bool[3], langs = new bool[9];
        bool[][] forms = Enumerable.Range(0, Modern(save) ? 4 : 1).Select(_ => new bool[32]).ToArray();
        if (!Modern(save))
        {
            var e = save.Zukan.DexPaldea.Get(species);
            for (byte i = 0; i < 3; i++) genders[i] = e.GetIsGenderSeen(i);
            for (int i = 0; i < 9; i++) langs[i] = e.GetLanguageFlag(Languages[i]);
            for (byte f = 0; f < 32; f++) forms[0][f] = e.GetIsFormSeen(f);
            return new(species, e.GetState(), e.GetDisplayIsNew(), e.GetDisplayGenderIsDifferent(), genders, e.GetSeenIsShiny(), langs, forms,
                [new(e.GetDisplayForm(), save.Blocks.GetBlock(Paldea).Data[SpeciesConverter.GetInternal9(species) * PokeDexEntry9Paldea.SIZE + 0x14], e.GetDisplayIsShiny())]);
        }
        else
        {
            var e = save.Zukan.DexKitakami.Get(species);
            for (byte i = 0; i < 3; i++) genders[i] = e.GetIsGenderSeen(i);
            for (int i = 0; i < 9; i++) langs[i] = e.GetLanguageFlag(Languages[i]);
            for (byte f = 0; f < 32; f++) { forms[0][f] = e.GetSeenForm(f); forms[1][f] = e.GetObtainedForm(f); forms[2][f] = e.GetHeardForm(f); forms[3][f] = e.GetCheckedForm(f); }
            return new(species, null, null, null, genders, e.GetIsModelSeen(true), langs, forms,
                [new(e.DisplayedPaldeaForm, e.DisplayedPaldeaGender, e.DisplayedPaldeaShiny != 0),
                 new(e.DisplayedKitakamiForm, e.DisplayedKitakamiGender, e.DisplayedKitakamiShiny != 0),
                 new(e.DisplayedBlueberryForm, e.DisplayedBlueberryGender, e.DisplayedBlueberryShiny != 0)]);
        }
    }
    public static Dex9Catalog Read(SaveFile input)
    {
        var save = Require(input); bool modern = Modern(save);
        return new(save.State.Exportable && SaveChecksums.Valid(save), modern,
            Enumerable.Range(1, save.MaxSpeciesID).Where(s => SpeciesValid(save, s)).Select(s =>
            {
                var species = (ushort)s;
                int count = Forms(species, modern, GameInfo.GetStrings("en")).Length;
                return new Dex9Entry(State(save, species), Text(t => t.specieslist[species]),
                    Enumerable.Range(0, count).Select(f => Text(t => { var name = Forms(species, modern, t)[f]; return name.Length == 0 ? t.Types[0] : name; })).ToArray(), Regions(save, species));
            }).OrderBy(e => Array.FindIndex(e.Regions, x => x != 0) is var r && r >= 0 ? r : 3)
              .ThenBy(e => e.Regions.FirstOrDefault(x => x != 0)).ThenBy(e => e.State.Species).ToArray());
    }
    public static string Snapshot(SAV9SV save) => string.Join(":", new[] { Paldea, Kitakami }.Select(k => save.Blocks.TryGetBlock(k, out var b) ? Convert.ToHexString(b.Data) : ""));
    public static string Apply(SaveFile input, Dex9Edit edit)
    {
        var save = Require(input);
        if (edit.Action == "entry")
        {
            if (edit.Entry is null || edit.Species != 0 || edit.Shiny) throw Invalid();
            SetEntry(save, edit.Entry);
        }
        else
        {
            if (edit.Entry is not null || (edit.Action != "give" && edit.Species != 0) ||
                (edit.Shiny && edit.Action is not ("give" or "seen" or "caught" or "complete"))) throw Invalid();
            switch (edit.Action)
            {
                case "give": if (!SpeciesValid(save, edit.Species)) throw Invalid(); Give(save, (ushort)edit.Species, edit.Shiny); break;
                case "clear": save.Zukan.SeenNone(); break;
                case "uncaught":
                    // Upstream calls the missing DLC block even for a base-game save.
                    for (ushort s = 0; s <= save.MaxSpeciesID; s++)
                    {
                        save.Zukan.DexPaldea.Get(s).ClearCaught();
                        if (Modern(save)) save.Zukan.DexKitakami.Get(s).ClearCaught();
                    }
                    break;
                case "seen": case "caught": case "complete":
                    for (ushort s = 0; s <= save.MaxSpeciesID; s++)
                    {
                        if (save.Zukan.GetDexIndex(s).Index == 0) continue;
                        if (edit.Action != "complete")
                        {
                            if (Modern(save)) save.Zukan.DexKitakami.SeenAll(s, save.Personal[s].FormCount, true, edit.Shiny);
                            else save.Zukan.DexPaldea.SeenAll(s, save.Personal[s].FormCount, true, edit.Shiny);
                        }
                        if (edit.Action != "seen" && SpeciesValid(save, s)) Give(save, s, edit.Shiny);
                    }
                    break;
                default: throw Invalid();
            }
        }
        return Snapshot(save);
    }
    private static void Give(SAV9SV save, ushort species, bool shiny)
    {
        if (!Modern(save)) { save.Zukan.SetDexEntryAll(species, shiny); return; }
        save.Zukan.DexKitakami.SeenAll(species, save.Personal[species].FormCount, true, shiny);
        var e = save.Zukan.DexKitakami.Get(species);
        // Retain the Core's union of seen genders and use each form's own regional membership.
        for (byte f = 0; f < save.Personal[species].FormCount; f++)
        {
            var pi = save.Personal.GetFormEntry(species, f);
            if (!pi.IsPresentInGame) continue;
            e.SetObtainedForm(f, true);
            e.SetLocalStates(pi, f, pi.RandomGender(), shiny);
        }
        e.SetAllLanguageFlags();
    }
    private static void SetEntry(SAV9SV save, Dex9State state)
    {
        if (!SpeciesValid(save, state.Species)) throw Invalid();
        ushort species = (ushort)state.Species; bool modern = Modern(save);
        var old = State(save, species);
        if (state.Genders is not { Length: 3 } || state.Languages is not { Length: 9 } ||
            state.Forms is null || state.Forms.Length != (modern ? 4 : 1) || state.Forms.Any(r => r is not { Length: 32 }) ||
            state.Displays is null || state.Displays.Length != (modern ? 3 : 1) || state.Displays.Any(d => d is null) ||
            state.Status.HasValue != !modern || state.IsNew.HasValue != !modern || state.Different.HasValue != !modern ||
            (state.Status != old.Status && state.Status > 3)) throw Invalid();
        int formCount = Forms(species, modern, GameInfo.GetStrings("en")).Length;
        var regions = Regions(save, species);
        for (int r = 0; r < state.Displays.Length; r++)
        {
            var a = state.Displays[r]; var b = old.Displays[r];
            if ((modern && regions[r] == 0 && a != b) || (a.Form != b.Form && a.Form >= formCount) || (a.Gender != b.Gender && a.Gender > 2)) throw Invalid();
        }
        // Validate the complete request before any writes; unchanged setters are deliberately skipped.
        if (!modern)
        {
            var e = save.Zukan.DexPaldea.Get(species);
            if (state.Status != old.Status) e.SetState(state.Status!.Value);
            if (state.IsNew != old.IsNew) e.SetDisplayIsNew(state.IsNew!.Value);
            if (state.Different != old.Different) e.SetDisplayGenderIsDifferent(state.Different!.Value);
            if (state.Shiny != old.Shiny) e.SetSeenIsShiny(state.Shiny);
            for (byte i = 0; i < 3; i++) if (state.Genders[i] != old.Genders[i]) e.SetIsGenderSeen(i, state.Genders[i]);
            for (int i = 0; i < 9; i++) if (state.Languages[i] != old.Languages[i]) e.SetLanguageFlag(Languages[i], state.Languages[i]);
            for (byte f = 0; f < 32; f++) if (state.Forms[0][f] != old.Forms[0][f]) e.SetIsFormSeen(f, state.Forms[0][f]);
            var a = state.Displays[0]; var b = old.Displays[0];
            if (a.Form != b.Form) e.SetDisplayForm(a.Form);
            if (a.Gender != b.Gender) e.SetDisplayGender((int)a.Gender);
            if (a.Shiny != b.Shiny) e.SetDisplayIsShiny(a.Shiny);
        }
        else
        {
            var e = save.Zukan.DexKitakami.Get(species);
            if (state.Shiny != old.Shiny) e.SetIsModelSeen(true, state.Shiny);
            for (byte i = 0; i < 3; i++) if (state.Genders[i] != old.Genders[i]) e.SetIsGenderSeen(i, state.Genders[i]);
            for (int i = 0; i < 9; i++) if (state.Languages[i] != old.Languages[i]) e.SetLanguageFlag(Languages[i], state.Languages[i]);
            for (byte f = 0; f < 32; f++)
            {
                if (state.Forms[0][f] != old.Forms[0][f]) e.SetSeenForm(f, state.Forms[0][f]);
                if (state.Forms[1][f] != old.Forms[1][f]) e.SetObtainedForm(f, state.Forms[1][f]);
                if (state.Forms[2][f] != old.Forms[2][f]) e.SetHeardForm(f, state.Forms[2][f]);
                if (state.Forms[3][f] != old.Forms[3][f]) e.SetCheckedForm(f, state.Forms[3][f]);
            }
            for (int r = 0; r < 3; r++)
            {
                var a = state.Displays[r]; var b = old.Displays[r];
                // Per-field writes retain raw boolean/gender values in the other two fields.
                if (r == 0) { if (a.Form != b.Form) e.DisplayedPaldeaForm = (byte)a.Form; if (a.Gender != b.Gender) e.DisplayedPaldeaGender = (byte)a.Gender; if (a.Shiny != b.Shiny) e.DisplayedPaldeaShiny = a.Shiny ? (byte)1 : (byte)0; }
                if (r == 1) { if (a.Form != b.Form) e.DisplayedKitakamiForm = (byte)a.Form; if (a.Gender != b.Gender) e.DisplayedKitakamiGender = (byte)a.Gender; if (a.Shiny != b.Shiny) e.DisplayedKitakamiShiny = a.Shiny ? (byte)1 : (byte)0; }
                if (r == 2) { if (a.Form != b.Form) e.DisplayedBlueberryForm = (byte)a.Form; if (a.Gender != b.Gender) e.DisplayedBlueberryGender = (byte)a.Gender; if (a.Shiny != b.Shiny) e.DisplayedBlueberryShiny = a.Shiny ? (byte)1 : (byte)0; }
            }
        }
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;

public sealed record Dex8State(
    [property: JsonRequired] int Index, bool[][] Seen, bool[] Languages,
    [property: JsonRequired] bool Caught, [property: JsonRequired] bool Gigantamaxed,
    [property: JsonRequired] uint Form, [property: JsonRequired] uint Gender,
    [property: JsonRequired] bool DisplayGigantamax, [property: JsonRequired] bool DisplayShiny,
    [property: JsonRequired] uint Battled, bool? Gigantamaxed1);
public sealed record Dex8Entry(Dex8State State, int Species, int Region, int Number, bool Primary, LocalizedText Name, LocalizedText[] FormChoices);
public sealed record Dex8Catalog(bool CanEdit, Dex8Entry[] Entries);
public sealed record Dex8Edit(string Action, Dex8State? Entry = null, int Index = 0, bool Shiny = false, uint? Battled = null);

internal static class SwshPokedex
{
    private static readonly uint[] Keys = [0x4716C404, 0x3F936BA9, 0x3C9366F0];
    private static SAV8SWSH Require(SaveFile save) => save as SAV8SWSH ?? throw new ArgumentException("Pokedex format is unsupported.");
    private static List<Zukan8EntryInfo> Entries(SAV8SWSH save) => Zukan8.GetRawIndexes(save.Personal, save.SaveRevision, Zukan8Index.TotalCount);
    private static LocalizedText Text(Func<GameStrings, string> f) => new(f(GameInfo.GetStrings("zh-Hans")), f(GameInfo.GetStrings("en")), f(GameInfo.GetStrings("ja")));
    private static string[] Forms(ushort species, GameStrings s) => species == (ushort)Species.Alcremie
        ? FormConverter.GetAlcremieFormList(s.forms) : FormConverter.GetFormList(species, s.Types, s.forms, GameInfo.GenderSymbolASCII, EntityContext.Gen8);
    private static string FormName(ushort species, int bit, GameStrings s)
    {
        var forms = Forms(species, s);
        if (species == (ushort)Species.Urshifu && bit >= 62) return $"{FormConverter.GetGigantamaxName(s.forms)} · {forms[bit == 62 ? 1 : 0]}";
        if (bit == 63) return FormConverter.GetGigantamaxName(s.forms);
        return bit < forms.Length ? forms[bit].Length == 0 ? s.Types[0] : forms[bit] : "N/A";
    }
    public static Dex8State State(SAV8SWSH save, Zukan8EntryInfo info)
    {
        var d = save.Zukan; var e = info.Entry;
        return new(e.AbsoluteIndex,
            Enumerable.Range(0, 4).Select(r => Enumerable.Range(0, 64).Select(f => d.GetSeenRegion(e, (byte)f, r)).ToArray()).ToArray(),
            Enumerable.Range(0, 9).Select(l => d.GetIsLanguageIndexObtained(e, l)).ToArray(),
            d.GetCaught(e), d.GetCaughtGigantamaxed(e), d.GetFormDisplayed(e), d.GetGenderDisplayed(e),
            d.GetDisplayDynamaxInstead(e), d.GetDisplayShiny(e), d.GetBattledCount(e),
            info.Species == (ushort)Species.Urshifu ? d.GetCaughtGigantamax1(e) : null);
    }
    public static Dex8Catalog Read(SaveFile input)
    {
        var save = Require(input);
        return new(save.State.Exportable && SaveChecksums.Valid(save), Entries(save).OrderBy(e => e.Entry.AbsoluteIndex).Select(e => new Dex8Entry(
            State(save, e), e.Species, (int)e.Entry.DexType, e.Entry.Index, save.Zukan.DexLookup[e.Species] == e.Entry,
            Text(s => s.specieslist[e.Species]), Enumerable.Range(0, 64).Select(i => Text(s => FormName(e.Species, i, s))).ToArray())).ToArray());
    }
    public static string Snapshot(SAV8SWSH save) => string.Join(":", Keys.Select(k => save.Blocks.TryGetBlock(k, out var b) ? Convert.ToHexString(b.Data) : ""));
    public static string Apply(SaveFile input, Dex8Edit edit)
    {
        var save = Require(input); var d = save.Zukan;
        if (edit.Action == "entry")
        {
            if (edit.Entry is null || edit.Index != 0 || edit.Shiny || edit.Battled.HasValue) throw Invalid();
            ApplyEntry(save, edit.Entry);
        }
        else
        {
            if (edit.Entry is not null || (edit.Shiny && edit.Action is not ("give" or "seen" or "caught" or "complete")) ||
                (edit.Action != "give" && edit.Index != 0) || (edit.Action != "counts" && edit.Battled.HasValue)) throw Invalid();
            switch (edit.Action)
            {
                // Match the desktop's species-based action: target its primary dex entry, even when a duplicate is selected.
                case "give": var info = Entries(save).SingleOrDefault(e => e.Entry.AbsoluteIndex == edit.Index); if (info.Species == 0) throw Invalid(); d.SetDexEntryAll(info.Species, edit.Shiny); break;
                case "clear": d.SeenNone(); break;
                case "seen": d.SeenAll(edit.Shiny); break;
                case "caught": d.CaughtAll(edit.Shiny); break;
                case "uncaught": d.CaughtNone(); break;
                case "complete": d.CompleteDex(edit.Shiny); break;
                case "counts": if (!edit.Battled.HasValue || edit.Battled > int.MaxValue) throw Invalid(); d.SetAllBattledCount(edit.Battled.Value); break;
                default: throw Invalid();
            }
        }
        return Snapshot(save);
    }
    private static ArgumentException Invalid() => new("Pokedex choices are invalid.");
    private static void ApplyEntry(SAV8SWSH save, Dex8State state)
    {
        var info = Entries(save).SingleOrDefault(e => e.Entry.AbsoluteIndex == state.Index);
        if (info.Species == 0 || state.Seen is not { Length: 4 } || state.Seen.Any(r => r is not { Length: 64 }) || state.Languages is not { Length: 9 }) throw Invalid();
        var old = State(save, info); var e = info.Entry; var d = save.Zukan;
        // The desktop NumericUpDown has default form range 0..100; battled explicitly uses int.MaxValue.
        // Keep existing larger raw values without allowing their introduction or using them as batch templates.
        if ((state.Form != old.Form && state.Form > 100) || (state.Gender != old.Gender && state.Gender > 2) ||
            (state.Battled != old.Battled && state.Battled > int.MaxValue) || state.Gigantamaxed1.HasValue != old.Gigantamaxed1.HasValue) throw Invalid();
        for (int r = 0; r < 4; r++) for (byte f = 0; f < 64; f++) if (state.Seen[r][f] != old.Seen[r][f]) d.SetSeenRegion(e, f, r, state.Seen[r][f]);
        for (int l = 0; l < 9; l++) if (state.Languages[l] != old.Languages[l]) d.SetIsLanguageIndexObtained(e, l, state.Languages[l]);
        if (state.Form != old.Form) d.SetFormDisplayed(e, state.Form);
        if (state.Gender != old.Gender) d.SetGenderDisplayed(e, state.Gender);
        if (state.Battled != old.Battled) d.SetBattledCount(e, state.Battled);
        if (state.Caught != old.Caught) d.SetCaught(e, state.Caught);
        if (state.Gigantamaxed != old.Gigantamaxed) d.SetCaughtGigantamax(e, state.Gigantamaxed);
        if (state.DisplayGigantamax != old.DisplayGigantamax) d.SetDisplayDynamaxInstead(e, state.DisplayGigantamax);
        if (state.DisplayShiny != old.DisplayShiny) d.SetDisplayShiny(e, state.DisplayShiny);
        if (state.Gigantamaxed1 != old.Gigantamaxed1) d.SetCaughtGigantamax1(e, state.Gigantamaxed1!.Value);
    }
}

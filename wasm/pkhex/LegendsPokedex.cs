// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using PKHeX.Core;
using static PKHeX.Core.PokedexResearchTaskType8a;
namespace PokeRNGKit.SaveEditor;

public sealed record Dex8aFormState([property: JsonRequired] int Form, bool[][] Flags, [property: JsonRequired] bool HasMax, string[] Sizes);
public sealed record Dex8aState([property: JsonRequired] int Species, [property: JsonRequired] bool Solitude,
    [property: JsonRequired] int DisplayForm, [property: JsonRequired] bool DisplayFemale,
    [property: JsonRequired] bool DisplayShiny, [property: JsonRequired] bool DisplayAlpha, Dex8aFormState[] Forms, int[] Tasks);
public sealed record Dex8aForm(int Form, LocalizedText Name, string[] Theory, int ObtainedGenderMask);
public sealed record Dex8aTask(LocalizedText Name, bool Editable, bool DerivedForms, int[] Thresholds, int Reported, int Reached, int Points, bool Required);
public sealed record Dex8aCounter(LocalizedText Name, int Value);
public sealed record Dex8aResearch(bool Updated, bool Complete, bool Perfect, int UpdateIndex, int Reported, int Pending);
public sealed record Dex8aEntry(Dex8aState State, int Number, LocalizedText Name, bool CanSelectGender, Dex8aForm[] Forms, Dex8aTask[] Tasks, Dex8aCounter[] Advanced, Dex8aResearch Research);
public sealed record Dex8aCatalog(bool CanEdit, Dex8aEntry[] Entries);
public sealed record Dex8aEdit(string Action, Dex8aState? Entry = null, int Species = 0, int[]? Counters = null);

internal static class LegendsPokedex
{
    internal const uint DexKey = 0x02168706;
    private static readonly CultureInfo Culture = CultureInfo.InvariantCulture;
    private static readonly (PokedexResearchTaskType8a Type, int Index)[] Advanced =
    [
        (Catch,-1),(CatchAlpha,-1),(CatchLarge,-1),(CatchSmall,-1),(CatchHeavy,-1),(CatchLight,-1),(CatchAtTime,-1),(CatchSleeping,-1),(CatchInAir,-1),(CatchNotSpotted,-1),
        (UseMove,0),(UseMove,1),(UseMove,2),(UseMove,3),(DefeatWithMoveType,0),(DefeatWithMoveType,1),(DefeatWithMoveType,2),(Defeat,-1),(UseStrongStyleMove,-1),(UseAgileStyleMove,-1),
        (Evolve,-1),(GiveFood,-1),(StunWithItems,-1),(ScareWithScatterBang,-1),(LureWithPokeshiDoll,-1),(LeapFromTrees,-1),(LeapFromLeaves,-1),(LeapFromSnow,-1),(LeapFromOre,-1),(LeapFromTussocks,-1),
    ];
    private static SAV8LA Require(SaveFile save) => save as SAV8LA ?? throw Invalid();
    private static ArgumentException Invalid() => new("Pokedex choices are invalid.");
    private static ushort Species(int species)
    {
        if (species < 1 || species > PersonalTable.LA.MaxSpeciesID || PokedexSave8a.GetDexIndex(PokedexType8a.Hisui, (ushort)species) == 0) throw Invalid();
        return (ushort)species;
    }
    private static PokedexResearchTask8a[] Tasks(ushort species) => PokedexConstants8a.ResearchTasks[PokedexSave8a.GetDexIndex(PokedexType8a.Hisui, species) - 1];
    private static LocalizedText Local(Func<string, string> f) => new(f("zh-Hans"), f("en"), f("ja"));
    private static string Float(float value) => value.ToString("R", Culture);
    private static string[] FormNames(ushort species, string lang) { var s = GameInfo.GetStrings(lang); return FormConverter.GetFormList(species, s.types, s.forms, GameInfo.GenderSymbolASCII, EntityContext.Gen8a); }
    public static byte[] Forms(SAV8LA save, ushort species)
    {
        var names = FormNames(species, "en");
        if (!FormInfo.HasFormSelection(save.Personal[species], species, 8) || names is [""]) return [0];
        return Enumerable.Range(0, save.Personal[species].FormCount).Select(i => (byte)i).Where(f => save.Blocks.PokedexSave.HasFormStorage(species, f) && !save.Blocks.PokedexSave.IsBlacklisted(species, f)).ToArray();
    }
    private static int[] Values(PokedexSave8a dex, ushort species) => Tasks(species).Select((task, i) => { dex.GetResearchTaskLevel(species, i, out _, out var v, out _); return v; }).ToArray();
    public static Dex8aState State(SAV8LA save, ushort species)
    {
        var d = save.Blocks.PokedexSave;
        return new(species, d.GetSolitudeComplete(species), d.GetSelectedForm(species), d.GetSelectedGender1(species), d.GetSelectedShiny(species), d.GetSelectedAlpha(species),
            Forms(save, species).Select(f => {
                d.GetSizeStatistics(species, f, out var maximum, out var h0, out var h1, out var w0, out var w1);
                byte[] flags = [d.GetPokeSeenInWildFlags(species, f), d.GetPokeObtainFlags(species, f), d.GetPokeCaughtInWildFlags(species, f)];
                return new Dex8aFormState(f, flags.Select(v => Enumerable.Range(0, 8).Select(i => (v & (1 << i)) != 0).ToArray()).ToArray(), maximum, [Float(h0), Float(h1), Float(w0), Float(w1)]);
            }).ToArray(), Values(d, species));
    }
    private static string TaskName(PokedexResearchTaskType8a type, int index, PokedexResearchTask8a? task, string lang)
    {
        var strings = GameInfo.GetStrings(lang); var names = Util.GetStringList("tasks8a", lang); var times = Util.GetStringList("time_tasks8a", lang);
        // Core's generic labels use the global GameInfo.Strings for moves/types. Use the requested language explicitly.
        return type switch
        {
            UseMove => string.Format(Culture, names[(int)type], task is null ? $"(idx={index})" : strings.Move[task.Move]),
            DefeatWithMoveType => string.Format(Culture, names[(int)type], task is null ? $"(idx={index})" : strings.Types[(int)task.Type]),
            CatchAtTime => times[task is null ? 0 : (int)task.TimeOfDay],
            SpeciesQuest => task!.GetTaskLabelString(names, times, Util.GetStringList("species_tasks8a", lang)),
            _ => names[(int)type],
        };
    }
    public static Dex8aCatalog Read(SaveFile input)
    {
        var save = Require(input); var d = save.Blocks.PokedexSave;
        var species = Enumerable.Range(1, PersonalTable.LA.MaxSpeciesID).Select(i => (ushort)i).Where(s => PokedexSave8a.GetDexIndex(PokedexType8a.Hisui, s) != 0).OrderBy(s => PokedexSave8a.GetDexIndex(PokedexType8a.Hisui, s));
        return new(save.State.Exportable && SaveChecksums.Valid(save), species.Select(s => {
            var tasks = Tasks(s); int pending = d.GetPokeResearchRate(s);
            var taskInfo = tasks.Select((task, i) => {
                int delta = d.GetResearchTaskLevel(s, i, out int reported, out _, out int unreported);
                int points = task.PointsSingle + task.PointsBonus; pending += delta * points;
                return new Dex8aTask(Local(l => TaskName(task.Task, task.Index, task, l)), task.Task.CanSetCurrentValue(), task.Task == ObtainForms, task.TaskThresholds.Select(v => (int)v).ToArray(), reported - 1, unreported - 1, points, task.RequiredForCompletion);
            }).ToArray();
            var forms = Forms(save, s).Select(f => {
                var p = save.Personal.GetFormEntry(s, f); int pos = PokedexConstants8a.PokemonInfoIds.BinarySearch((ushort)(s | (f << 11)));
                return new Dex8aForm(f, Local(l => { var names = FormNames(s, l); return f < names.Length && names[f].Length > 0 ? names[f] : GameInfo.GetStrings(l).types[0]; }),
                    [Float(PA8.GetHeightAbsolute(p,0)),Float(PA8.GetHeightAbsolute(p,255)),Float(PA8.GetWeightAbsolute(p,0,0)),Float(PA8.GetWeightAbsolute(p,255,255))],
                    pos < 0 ? 0 : PokedexConstants8a.PokemonInfoGenders[pos]);
            }).ToArray();
            var advanced = Advanced.Select(pair => {
                d.GetResearchTaskProgressByForce(s, pair.Type, pair.Index, out int value); var task = tasks.FirstOrDefault(t => t.Task == pair.Type && t.Index == pair.Index);
                return new Dex8aCounter(Local(l => TaskName(pair.Type, pair.Index, task, l)), value);
            }).ToArray();
            return new Dex8aEntry(State(save, s), PokedexSave8a.GetDexIndex(PokedexType8a.Hisui, s), Local(l => GameInfo.GetStrings(l).specieslist[s]), PokedexSave8a.HasMultipleGenders(s), forms, taskInfo, advanced,
                new(d.HasPokeEverBeenUpdated(s), d.IsComplete(s), d.IsPerfect(s), d.GetUpdateIndex(s), d.GetPokeResearchRate(s), pending));
        }).ToArray());
    }
    public static string Snapshot(SAV8LA save) => Convert.ToHexString(save.Blocks.GetBlock(DexKey).Data);
    public static string Apply(SaveFile input, Dex8aEdit edit)
    {
        var save = Require(input); var d = save.Blocks.PokedexSave;
        if (edit.Action == "entry")
        {
            if (edit.Entry is null || edit.Species != 0 || edit.Counters is not null) throw Invalid();
            ApplyEntry(save, edit.Entry);
        }
        else
        {
            if (edit.Entry is not null) throw Invalid(); ushort species = Species(edit.Species);
            switch (edit.Action)
            {
                case "report": if (edit.Counters is not null) throw Invalid(); d.UpdateSpecificReportPoke(species); break;
                case "advanced":
                    if (edit.Counters is not { Length: 30 }) throw Invalid();
                    var old = Advanced.Select(p => { d.GetResearchTaskProgressByForce(species, p.Type, p.Index, out int v); return v; }).ToArray();
                    for (int i = 0; i < old.Length; i++) if (edit.Counters[i] != old[i] && edit.Counters[i] is < 0 or > 60000) throw Invalid();
                    for (int i = 0; i < old.Length; i++) if (edit.Counters[i] != old[i]) d.SetResearchTaskProgressByForce(species, Advanced[i].Type, edit.Counters[i], Advanced[i].Index);
                    break;
                default: throw Invalid();
            }
        }
        return Snapshot(save);
    }
    private static float Parse(string text, float original)
    {
        if (text == Float(original)) return original; // preserves NaN payload and signed zero
        return float.TryParse(text, NumberStyles.Float | NumberStyles.AllowThousands, Culture, out var value) ? value : original;
    }
    private static void ApplyEntry(SAV8LA save, Dex8aState state)
    {
        ushort species = Species(state.Species); var d = save.Blocks.PokedexSave; var old = State(save, species); var tasks = Tasks(species);
        if (state.Forms is null || state.Forms.Length != old.Forms.Length || state.Tasks is null || state.Tasks.Length != tasks.Length ||
            (state.DisplayForm != old.DisplayForm && !old.Forms.Any(f => f.Form == state.DisplayForm)) ||
            (state.DisplayFemale != old.DisplayFemale && !PokedexSave8a.HasMultipleGenders(species))) throw Invalid();
        bool displayChanged = state.DisplayForm != old.DisplayForm || state.DisplayFemale != old.DisplayFemale || state.DisplayShiny != old.DisplayShiny || state.DisplayAlpha != old.DisplayAlpha;
        if (displayChanged && state.DisplayForm >= PokedexSave8a.MAX_FORM) throw Invalid();
        for (int i = 0; i < state.Forms.Length; i++)
        {
            var f = state.Forms[i];
            if (f is null || f.Form != old.Forms[i].Form || f.Flags is not { Length: 3 } || f.Flags.Any(r => r is not { Length: 8 }) ||
                f.Sizes is not { Length: 4 } || f.Sizes.Any(v => v is null || v.Length > 32767)) throw Invalid();
        }
        for (int i = 0; i < tasks.Length; i++)
            if (state.Tasks[i] != old.Tasks[i] && (!tasks[i].Task.CanSetCurrentValue() || state.Tasks[i] is < 0 or > 60000)) throw Invalid();
        // Validate the whole request before touching any block. Only changed groups call Core setters.
        for (int i = 0; i < state.Forms.Length; i++)
        {
            var f = state.Forms[i]; var before = old.Forms[i]; byte form = (byte)f.Form;
            if (f.Flags.Where((r, n) => !r.SequenceEqual(before.Flags[n])).Any())
            {
                byte Pack(int r) => (byte)f.Flags[r].Select((v, bit) => v ? 1 << bit : 0).Sum();
                d.SetPokeSeenInWildFlags(species, form, Pack(0)); d.SetPokeObtainFlags(species, form, Pack(1)); d.SetPokeCaughtInWildFlags(species, form, Pack(2));
                if (f.Flags.Any(r => r.Any(v => v))) d.SetPokeHasBeenUpdated(species);
            }
            if (f.HasMax != before.HasMax || !f.Sizes.SequenceEqual(before.Sizes))
            {
                d.GetSizeStatistics(species, form, out _, out float h0, out float h1, out float w0, out float w1);
                float[] values = [Parse(f.Sizes[0], h0), Parse(f.Sizes[1], h1), Parse(f.Sizes[2], w0), Parse(f.Sizes[3], w1)];
                if (f.HasMax != before.HasMax || !values.Select(BitConverter.SingleToInt32Bits).SequenceEqual(new[]{h0,h1,w0,w1}.Select(BitConverter.SingleToInt32Bits)))
                    d.SetSizeStatistics(species, form, f.HasMax, values[0], values[1], values[2], values[3]);
            }
        }
        if (state.Solitude != old.Solitude) d.SetSolitudeComplete(species, state.Solitude);
        if (displayChanged)
        {
            d.SetSelectedGenderForm(species, (byte)state.DisplayForm, state.DisplayFemale, state.DisplayShiny, state.DisplayAlpha);
            if (state.DisplayFemale || state.DisplayShiny || state.DisplayAlpha) d.SetPokeHasBeenUpdated(species);
        }
        for (int i = 0; i < tasks.Length; i++) if (state.Tasks[i] != old.Tasks[i]) d.SetResearchTaskProgressByForce(species, tasks[i], state.Tasks[i]);
    }
}

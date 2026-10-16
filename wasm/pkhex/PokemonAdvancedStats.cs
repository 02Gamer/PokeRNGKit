// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonBoostStats(int[] Values, int Maximum, int[]? LegalMaximum = null);
public sealed record PokemonTeraStats(int Original, int Override, int Effective, int Primary, int Secondary, OriginChoice[] Choices);
public sealed record PokemonAdvancedStatsInfo(PokemonBoostStats? Awakening, PokemonBoostStats? Ganbaru, int? DynamaxLevel, bool? Gigantamax, bool? Alpha, bool? Noble, PokemonTeraStats? Tera);
public sealed record PokemonAdvancedStatsEdit(string Action, int[]? Awakening = null, int[]? Ganbaru = null, int? DynamaxLevel = null, bool? Gigantamax = null, bool? Alpha = null, bool? Noble = null, int? TeraOriginal = null, int? TeraOverride = null, int? Index = null);

internal static class PokemonAdvancedStats
{
    private static readonly int[] Order = [0, 1, 2, 4, 5, 3]; // Product: HP/Atk/Def/SpA/SpD/Spe.
    private static readonly Lazy<OriginChoice[]> TeraChoices = new(() =>
        new[] { new OriginChoice(TeraTypeUtil.OverrideNone, new("---", "---", "---")) }
        .Concat(Enumerable.Range(0, 18).Select(id => new OriginChoice(id, PokemonReader.Text(s => s.Types[id]))))
        .Append(new(TeraTypeUtil.Stellar, PokemonReader.Text(s => s.Types[TeraTypeUtil.StellarTypeDisplayStringIndex]))).ToArray());

    public static PokemonAdvancedStatsInfo? Read(PKM p)
    {
        if (p is not (IAwakened or IGanbaru or IDynamaxLevel or IGigantamax or IAlpha or INoble or ITeraType)) return null;
        return new(
            p is IAwakened av ? new(Order.Select(av.GetAV).Select(v => (int)v).ToArray(), AwakeningUtil.AwakeningMax) : null,
            p is IGanbaru gv ? new(Order.Select(gv.GetGV).Select(v => (int)v).ToArray(), GanbaruExtensions.TrueMax, Order.Select(i => (int)gv.GetMax(p, i)).ToArray()) : null,
            p is IDynamaxLevel d ? d.DynamaxLevel : null,
            p is IGigantamax g ? g.CanGigantamax : null,
            p is IAlpha a ? a.IsAlpha : null,
            p is INoble n ? n.IsNoble : null,
            p is ITeraType t ? new((int)t.TeraTypeOriginal, (int)t.TeraTypeOverride, (int)t.TeraType, p.PersonalInfo.Type1, p.PersonalInfo.Type2, TeraChoices.Value) : null);
    }

    public static void Apply(PKM p, PokemonAdvancedStatsEdit edit, bool party)
    {
        if (Read(p) is null) throw new ArgumentException("Advanced statistics are unavailable for this format.");
        var copy = p.Clone(); // Keep direct calls atomic as well as the public working-copy API.
        ApplyCore(copy, edit);
        if (party)
        {
            Span<ushort> before = stackalloc ushort[6], after = stackalloc ushort[6];
            p.LoadStats(p.PersonalInfo, before); copy.LoadStats(copy.PersonalInfo, after);
            if (!before.SequenceEqual(after))
            {
                copy.ResetPartyStats(); copy.Stat_HPCurrent = Math.Min(p.Stat_HPCurrent, copy.Stat_HPMax); copy.Status_Condition = p.Status_Condition;
            }
        }
        copy.Data.CopyTo(p.Data);
    }

    private static void ApplyCore(PKM p, PokemonAdvancedStatsEdit edit)
    {
        bool values = edit.Awakening is not null || edit.Ganbaru is not null || edit.DynamaxLevel is not null || edit.Gigantamax is not null || edit.Alpha is not null || edit.Noble is not null || edit.TeraOriginal is not null || edit.TeraOverride is not null;
        bool indexed = edit.Action is "avToggle" or "avZero" or "gvToggle" or "gvZero";
        if (edit.Action == "values")
        {
            if (!values || edit.Index is not null) throw new ArgumentException("Advanced statistic values are empty or have unexpected parameters.");
            ApplyValues(p, edit);
            return;
        }
        if (values || (indexed ? edit.Index is not (>= 0 and < 6) : edit.Index is not null))
            throw new ArgumentException("Advanced statistic action parameters are invalid.");
        switch (edit.Action)
        {
            case "avRandom" when p is IAwakened av: av.AwakeningSetRandom(); break;
            case "avMinimum" when p is IAwakened av: av.AwakeningMinimum(); break;
            case "avSuggested" when p is IAwakened av: av.SetSuggestedAwakenedValues(p); break;
            case "avMax" when p is IAwakened av: av.AwakeningMaximize(); break;
            case "avClear" when p is IAwakened av: av.AwakeningClear(); break;
            case "avToggle" when p is IAwakened av:
                int ai = Order[edit.Index!.Value]; av.SetAV(ai, av.GetAV(ai) == AwakeningUtil.AwakeningMax ? (byte)0 : AwakeningUtil.AwakeningMax); break;
            case "avZero" when p is IAwakened av: av.SetAV(Order[edit.Index!.Value], 0); break;
            case "gvSuggested" when p is IGanbaru gv: gv.SetSuggestedGanbaruValues(p); break;
            case "gvMax" when p is IGanbaru gv: foreach (int i in Order) gv.SetGV(i, gv.GetMax(p, i)); break;
            case "gvClear" when p is IGanbaru gv: gv.ClearGanbaruValues(); break;
            case "gvToggle" when p is IGanbaru gv:
                int gi = Order[edit.Index!.Value]; byte max = gv.GetMax(p, gi); gv.SetGV(gi, gv.GetGV(gi) == max ? (byte)0 : max); break;
            case "gvZero" when p is IGanbaru gv: gv.SetGV(Order[edit.Index!.Value], 0); break;
            case "dynamaxToggle" when p is IDynamaxLevel d: d.DynamaxLevel = d.DynamaxLevel == 0 ? (byte)10 : (byte)0; break;
            case "teraToggle" when p is ITeraType:
                SetOriginal(p, p.SV ? p.PersonalInfo.Type1 == (byte)((ITeraType)p).TeraTypeOriginal ? p.PersonalInfo.Type2 : p.PersonalInfo.Type1 : (int)TeraTypeUtil.GetTeraTypeImport(p.PersonalInfo.Type1, p.PersonalInfo.Type2)); break;
            case "teraPrimary" when p is ITeraType: SetOriginal(p, p.PersonalInfo.Type1); break;
            case "teraSecondary" when p is ITeraType: SetOriginal(p, p.PersonalInfo.Type2); break;
            case "teraReset" when p is ITeraType t:
                int value = p.SV ? TeraTypeUtil.OverrideNone : (int)t.TeraTypeOriginal;
                CheckTera(value); t.TeraTypeOverride = (MoveType)value; break;
            default: throw new ArgumentException("Advanced statistic action is unavailable.");
        }
    }

    private static void SetOriginal(PKM p, int value)
    {
        CheckTera(value); var t = (ITeraType)p; t.TeraTypeOriginal = (MoveType)value; t.TeraTypeOverride = (MoveType)TeraTypeUtil.OverrideNone;
    }
    private static void CheckTera(int value)
    {
        if (!TeraChoices.Value.Any(c => c.Id == value)) throw new ArgumentException("Tera type is outside the source catalog.");
    }
    private static void ApplyValues(PKM p, PokemonAdvancedStatsEdit edit)
    {
        var info = Read(p)!;
        CheckBoost(edit.Awakening, info.Awakening); CheckBoost(edit.Ganbaru, info.Ganbaru);
        if (edit.DynamaxLevel is int level && (info.DynamaxLevel is null || (level != info.DynamaxLevel && level is < 0 or > 10))) throw new ArgumentException("Dynamax level is unavailable or outside 0-10.");
        if ((edit.Gigantamax is not null && info.Gigantamax is null) || (edit.Alpha is not null && info.Alpha is null) || (edit.Noble is not null && info.Noble is null)) throw new ArgumentException("Statistic flag is unavailable.");
        if (edit.TeraOriginal is int original) { if (info.Tera is null) throw new ArgumentException("Tera type is unavailable."); if (original != info.Tera.Original) CheckTera(original); }
        if (edit.TeraOverride is int over) { if (info.Tera is null) throw new ArgumentException("Tera type is unavailable."); if (over != info.Tera.Override) CheckTera(over); }
        if (edit.Awakening is { } av) for (int i = 0; i < 6; i++) if (av[i] != info.Awakening!.Values[i]) ((IAwakened)p).SetAV(Order[i], (byte)av[i]);
        if (edit.Ganbaru is { } gv) for (int i = 0; i < 6; i++) if (gv[i] != info.Ganbaru!.Values[i]) ((IGanbaru)p).SetGV(Order[i], (byte)gv[i]);
        if (edit.DynamaxLevel is int d && d != info.DynamaxLevel) ((IDynamaxLevel)p).DynamaxLevel = (byte)d;
        if (edit.Gigantamax is bool g && g != info.Gigantamax) ((IGigantamax)p).CanGigantamax = g;
        if (edit.Alpha is bool a && a != info.Alpha) ((IAlpha)p).IsAlpha = a;
        if (edit.Noble is bool n && n != info.Noble) ((INoble)p).IsNoble = n;
        if (edit.TeraOriginal is int ot && ot != info.Tera!.Original) ((ITeraType)p).TeraTypeOriginal = (MoveType)ot;
        if (edit.TeraOverride is int ov && ov != info.Tera!.Override) ((ITeraType)p).TeraTypeOverride = (MoveType)ov;
        var actual = Read(p)!;
        if ((edit.Awakening is { } avs && !avs.SequenceEqual(actual.Awakening!.Values)) || (edit.Ganbaru is { } gvs && !gvs.SequenceEqual(actual.Ganbaru!.Values)) ||
            (edit.DynamaxLevel is int dl && actual.DynamaxLevel != dl) || (edit.Gigantamax is bool gm && actual.Gigantamax != gm) || (edit.Alpha is bool al && actual.Alpha != al) || (edit.Noble is bool no && actual.Noble != no) ||
            (edit.TeraOriginal is int to && actual.Tera!.Original != to) || (edit.TeraOverride is int tv && actual.Tera!.Override != tv)) throw new ArgumentException("Advanced statistics cannot be represented.");
    }
    private static void CheckBoost(int[]? values, PokemonBoostStats? info)
    {
        if (values is null) return;
        if (info is null || values.Length != 6 || values.Where((v, i) => v != info.Values[i]).Any(v => v < 0 || v > info.Maximum)) throw new ArgumentException("Boost statistics are unavailable or outside the input range.");
    }
}

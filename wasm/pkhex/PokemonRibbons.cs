// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record RibbonEntry(string Key, LocalizedText Name, int Value, int Max, string Status = "unchecked");
public sealed record RibbonChoice(int Id, LocalizedText Name);
public sealed record RibbonCatalog(RibbonEntry[] Entries, int? Affixed, RibbonChoice[] AffixedChoices, bool AnalysisComplete = false);
public sealed record RibbonValue(string Key, int Value);
public sealed record RibbonEdit(RibbonValue[] Values, int? Affixed = null, string Mode = "values");

internal static partial class PokemonRibbons
{
    private static LocalizedText Name(string key) => new(
        GameInfo.GetStrings("zh-Hans").Ribbons.GetName(key),
        GameInfo.GetStrings("en").Ribbons.GetName(key),
        GameInfo.GetStrings("ja").Ribbons.GetName(key));

    public static RibbonCatalog Read(PKM p, bool analyze = false)
    {
        Dictionary<string, string> status = [];
        var complete = false;
        if (analyze && p.Species != 0 && p.ChecksumValid)
        {
            var analysis = new LegalityAnalysis(p);
            if (analysis.Parsed)
            {
                Span<RibbonResult> results = stackalloc RibbonResult[RibbonVerifier.MaxRibbonCount];
                var args = new RibbonVerifierArguments(p, analysis.EncounterOriginal, analysis.Info.EvoChainsAllGens);
                var count = RibbonVerifier.GetRibbonResults(args, results);
                foreach (var result in results[..count]) status[result.PropertyName] = result.IsMissing ? "missing" : "invalid";
                var possible = p.Clone();
                RibbonApplicator.SetAllValidRibbons(possible);
                foreach (var field in Fields(possible))
                    if (!status.ContainsKey(field.Key))
                        status[field.Key] = field.Key.StartsWith("RibbonMark", StringComparison.Ordinal) ? "mark" : field.Read() > 0 ? "possible" : "unmarked";
                complete = true;
            }
        }
        return new(
            Fields(p).Select(f => new RibbonEntry(f.Key, Name(f.Key), f.Read(), f.Max, status.GetValueOrDefault(f.Key, "unchecked"))).ToArray(),
            p is IRibbonSetAffixed a ? a.AffixedRibbon : null,
            p is IRibbonSetAffixed ? Enumerable.Range(0, AffixedRibbon.Max + 1)
                .Select(i => new RibbonChoice(i, Name($"Ribbon{(RibbonIndex)i}"))).ToArray() : [], complete);
    }

    public static void Apply(PKM p, RibbonEdit edit)
    {
        if (edit.Mode != "values")
        {
            if (edit.Mode is not ("suggest" or "minimal") || edit.Values is not { Length: 0 } || edit.Affixed is not null)
                throw new ArgumentException("Pokemon ribbon suggestion cannot be combined with manual values.");
            var analysis = new LegalityAnalysis(p);
            if (!analysis.Parsed) throw new ArgumentException("Pokemon ribbon analysis could not complete.");
            RibbonApplicator.RemoveAllValidRibbons(analysis);
            if (edit.Mode == "suggest") RibbonApplicator.SetAllValidRibbons(p);
            else if (p is IRibbonSetAffixed targetAffixed) targetAffixed.AffixedRibbon = AffixedRibbon.None;
            return;
        }
        var fields = Fields(p).ToDictionary(f => f.Key);
        if (edit.Values is null || edit.Values.Length > fields.Count ||
            edit.Values.Any(v => v is null || !fields.TryGetValue(v.Key ?? "", out var f) || v.Value < 0 || v.Value > f.Max) ||
            edit.Values.Select(v => v.Key).Distinct().Count() != edit.Values.Length)
            throw new ArgumentException("Pokemon ribbon values are invalid for this format.");
        if (edit.Affixed is int index && (p is not IRibbonSetAffixed || index < AffixedRibbon.None || index > AffixedRibbon.Max))
            throw new ArgumentException("Pokemon affixed ribbon is invalid for this format.");
        foreach (var value in edit.Values) fields[value.Key].Write(value.Value);
        if (edit.Affixed is int affixed) ((IRibbonSetAffixed)p).AffixedRibbon = (sbyte)affixed;
        if (edit.Values.Any(v => fields[v.Key].Read() != v.Value) ||
            (edit.Affixed is int expected && ((IRibbonSetAffixed)p).AffixedRibbon != expected))
            throw new ArgumentException("Pokemon ribbon values cannot be represented.");
    }
}

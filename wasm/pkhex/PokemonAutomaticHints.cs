// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record PokemonAutomaticHints(bool Parsed,bool Valid,bool[] Moves,bool[] Relearn);
internal static class PokemonHints
{
    // PKMEditor.UpdateLegality uses RequestSaveFile.Personal. A standalone
    // editor without a bound save retains Core's independent-entity context.
    internal static LegalityAnalysis Analyze(PKM p)=>PokemonEditorContext.Save is{} save
        ?new(p.Clone(),save.Personal,StorageSlotType.None):new(p.Clone(),StorageSlotType.None);
    internal static PokemonAutomaticHints? Read(PKM p)
    {
        if(!PokemonModeRules.Read(p).AutomaticHints||p.Species==0)return null;
        var analysis=Analyze(p);
        return new(analysis.Parsed,analysis.Parsed&&analysis.Valid,
            analysis.Parsed?Enumerable.Range(0,4).Select(i=>analysis.Info.Moves[i].Valid).ToArray():[],
            analysis.Parsed&&PokemonRelearn.Supported(p)?Enumerable.Range(0,4).Select(i=>analysis.Info.Relearn[i].Valid).ToArray():[]);
    }
}

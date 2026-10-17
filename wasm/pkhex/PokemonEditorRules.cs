// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

// WinForms PKMEditor.ToggleInterface / FinalizeInterface. Storage format, not
// the origin game, decides whether these fields exist in the active editor.
public sealed record PokemonEditorRules(bool HeldItem,bool OriginRegion,bool ManualAbility,bool AbilityNumber,bool AutomaticHints);
internal static class PokemonModeRules
{
    internal static PokemonEditorRules Read(PKM p)
    {
        bool manual=p is PA9||PokemonEditorMode.HaX&&p.Format>3;
        return new(p.Format>=2&&(PokemonEditorMode.HaX||p is not (PB7 or PA8)),p is IRegionOrigin&&(PokemonEditorMode.HaX||p is not PB7),
            manual,manual&&p.Format>=6,!PokemonEditorMode.HaX);
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal static class PokemonEditorFinalizing
{
    // WinForms EditPK*.PreparePK*: run only after all editor sections have
    // contributed, on an owned clone. Intermediate edits preserve their buffer.
    internal static void Apply(PKM p)
    {
        if (PokemonEditorMode.HaX && p is PK5 fifth)
            fifth.HiddenAbility = fifth.PersonalInfo.HasHiddenAbility && fifth.Ability == fifth.PersonalInfo.AbilityH;
        p.FixMoves(); // Dispatch the concrete format override, including PA9.
        p.RefreshChecksum();
    }
}

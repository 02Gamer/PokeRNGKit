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
        // These reserved party bytes are cleared by PreparePK6/PreparePK7.
        // PB7 shares G6PKM, but its layout must not receive this cleanup.
        if (p is PK6 or PK7) p.Data[0xFE..].Clear();
        p.FixMoves(); // Dispatch the concrete format override, including PA9.
        switch (p)
        {
            case G6PKM sixth: sixth.FixRelearn(); break;
            case G8PKM eighth: eighth.FixRelearn(); break;
            case PA8 legends: legends.FixRelearn(); break;
            case PK9 ninth: ninth.FixRelearn(); break;
            case PA9 za: za.FixRelearn(); break;
        }
        // Main.InitializeSettings binds PKMEditor.ModifyPKM to SlotWrite.
        // Use the applied Core setting so both program and Core-only scopes work.
        if (SaveFile.SetUpdateSettings.UpdateToSaveFile == EntityImportOption.Enable)
        {
            switch (p)
            {
                case PK6 sixth: sixth.FixMemories(); break;
                case PK7 seventh: seventh.FixMemories(); break;
                case PB7 letsGo: letsGo.FixMemories(); break;
                case PK8 eighth: eighth.FixMemories(); break;
                case PB8 sinnoh: sinnoh.FixMemories(); break;
                case PA8 legends: legends.FixMemories(); break;
                case PK9 ninth: ninth.FixMemories(); break;
                case PA9 za: za.FixMemories(); break;
            }
        }
        p.RefreshChecksum();
    }
}

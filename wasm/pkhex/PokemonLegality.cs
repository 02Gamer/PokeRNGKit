// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonPosition(int Box, int Slot);
public sealed record PokemonLegalityReport(int Box, int Slot, bool Parsed, bool Valid, LocalizedText Summary, LocalizedText Details,
    LocalizedText? Clipboard=null,bool AlwaysVerbose=false,bool HideReport=false,bool CanCopy=true);

internal static class PokemonLegality
{
    public static PokemonLegalityReport Analyze(SaveFile save, PokemonPosition position)
    {
        var pokemon = PokemonEditorMode.Read(save,position);
        if (!PokemonEditorMode.HaX && pokemon.Species == 0)
            throw new ArgumentException("Pokemon slot is empty.");
        // Use the save's personal table, just like the desktop editor. Explicit slot
        // context also preserves party-only checks instead of treating every PKM as a box entry.
        var analysis = new LegalityAnalysis(pokemon.Clone(), save.Personal,
            position.Box == -1 ? StorageSlotType.Party : StorageSlotType.Box);
        return Report(analysis, position);
    }

    public static PokemonLegalityReport Report(LegalityAnalysis analysis, PokemonPosition position)
    {
        LocalizedText Report(bool verbose) => new(
            analysis.Report("zh-Hans", verbose), analysis.Report("en", verbose), analysis.Report("ja", verbose));
        var summary=Report(false);var details=Report(true);
        var settings=SaveProgramSettingsRuntime.Current?.Display;
        bool copy=settings?.ExportLegalityNeverClipboard!=true;
        string Clipboard(string language,string report) => report+Environment.NewLine+Environment.NewLine+string.Join(Environment.NewLine,
            analysis.EncounterOriginal.GetTextLines(settings?.ExportLegalityVerboseProperties==true,language));
        var clipboard=copy?new LocalizedText(Clipboard("zh-Hans",details.Zh),Clipboard("en",details.En),Clipboard("ja",details.Ja)):null;
        return new(position.Box, position.Slot, analysis.Parsed, analysis.Parsed && analysis.Valid, summary,details,clipboard,
            settings?.ExportLegalityAlwaysVerbose==true,settings?.IgnoreLegalPopup==true&&analysis.Valid,copy);
    }
}

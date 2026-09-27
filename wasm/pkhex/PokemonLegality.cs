// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonPosition(int Box, int Slot);
public sealed record PokemonLegalityReport(int Box, int Slot, bool Parsed, bool Valid, LocalizedText Summary, LocalizedText Details);

internal static class PokemonLegality
{
    public static PokemonLegalityReport Analyze(SaveFile save, PokemonPosition position)
    {
        var pokemon = PokemonEditing.Read(save, position.Box, position.Slot);
        if (pokemon.Species == 0)
            throw new ArgumentException("Pokemon slot is empty.");
        // Use the save's personal table, just like the desktop editor. Explicit slot
        // context also preserves party-only checks instead of treating every PKM as a box entry.
        var analysis = new LegalityAnalysis(pokemon, save.Personal,
            position.Box == -1 ? StorageSlotType.Party : StorageSlotType.Box);
        return Report(analysis, position);
    }

    public static PokemonLegalityReport Report(LegalityAnalysis analysis, PokemonPosition position)
    {
        LocalizedText Report(bool verbose) => new(
            analysis.Report("zh-Hans", verbose), analysis.Report("en", verbose), analysis.Report("ja", verbose));
        return new(position.Box, position.Slot, analysis.Parsed, analysis.Parsed && analysis.Valid, Report(false), Report(true));
    }
}

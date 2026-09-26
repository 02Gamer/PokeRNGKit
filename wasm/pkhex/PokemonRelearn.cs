// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record RelearnEdit(int[] Moves);

internal static class PokemonRelearn
{
    public static bool Supported(PKM p) => p is PK6 or PK7 or PB7 or G8PKM or PA8 or PK9 or PA9;
    public static ushort[]? Read(PKM p) => Supported(p) ? p.RelearnMoves : null;
    public static void Apply(PKM p, RelearnEdit edit)
    {
        if (!Supported(p)) throw new ArgumentException("Pokemon relearn moves are unavailable in this format.");
        if (edit.Moves is not { Length: 4 } || edit.Moves.Any(m => m < 0 || m > p.MaxMoveID))
            throw new ArgumentException("Pokemon relearn moves require four valid move IDs.");
        var moves = edit.Moves.Select(m => (ushort)m).ToArray();
        p.SetRelearnMoves(moves);
        if (!p.RelearnMoves.SequenceEqual(moves))
            throw new ArgumentException("Pokemon relearn moves cannot be represented.");
    }
    public static ushort[] Suggest(SaveFile save, PokemonPosition position)
    {
        var p = PokemonEditing.Read(save, position.Box, position.Slot);
        if (p.Species == 0 || !p.ChecksumValid || !Supported(p))
            throw new ArgumentException("Pokemon relearn suggestion requires valid supported data.");
        var analysis = new LegalityAnalysis(p, save.Personal, position.Box == -1 ? StorageSlotType.Party : StorageSlotType.Box);
        if (!analysis.Parsed) throw new ArgumentException("Pokemon relearn analysis could not complete.");
        ushort[] moves = new ushort[4];
        analysis.GetSuggestedRelearnMoves(moves);
        return moves;
    }
}

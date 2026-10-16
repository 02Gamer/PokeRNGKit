// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal static class PokemonAlphaMove
{
    public static int? Read(PKM entity) => entity is PA8 pa8 ? pa8.AlphaMove : null;

    // FilteredGameDataSource.GetFilteredMoves: normal PA8 combo excludes special
    // battle-only moves and context-specific dummied moves. Do not port the list to JS.
    public static bool IsSelectable(PKM entity, int move) => entity is PA8 &&
        move >= 0 && move <= entity.MaxMoveID && MoveInfo.IsMoveKnowable((ushort)move) &&
        !MoveInfo.IsDummiedMove(entity, (ushort)move);

    public static void Apply(PKM entity, int move)
    {
        if (entity is not PA8 pa8)
            throw new ArgumentException("Alpha initial mastery is only available for PA8.");
        if (!IsSelectable(pa8, move))
            throw new ArgumentException("Alpha initial mastery move is outside the format move catalog.");
        // PKMEditor's CB_AlphaMastered writes this field independently of Move Shop flags.
        pa8.AlphaMove = (ushort)move;
        if (pa8.AlphaMove != move)
            throw new ArgumentException("Alpha initial mastery move cannot be represented.");
    }
}

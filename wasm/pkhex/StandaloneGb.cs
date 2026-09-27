// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record GbPokemonEdit(int Species, string Nickname, string Ot, int Tid, int Level,
    int[] Dvs, int[] StatExperience, ushort[] Moves, int[] MovePp, int[] MovePpUps,
    int? Friendship = null, int? HeldItem = null);

internal static class StandaloneGb
{
    public static GBPKML Read(byte[] data, string extension)
    {
        var gen1 = extension == ".pk1";
        if (!gen1 && extension != ".pk2") throw new ArgumentException("GB format is unsupported.");
        var jpSize = gen1 ? PokeList1.GetListLengthSingle(true) : PokeList2.GetListLengthSingle(true);
        var intlSize = gen1 ? PokeList1.GetListLengthSingle(false) : PokeList2.GetListLengthSingle(false);
        if ((data.Length != jpSize && data.Length != intlSize) || data[0] != 1 || data[2] != 0xFF)
            throw new ArgumentException("GB entity must be a complete single-entry list.");
        GBPKML p = gen1 ? PokeList1.ReadFromSingle(data) : PokeList2.ReadFromSingle(data);
        var marker = p is PK1 first ? PokeList1.GetHeaderIdentifierMark(first) : PokeList2.GetHeaderIdentifierMark((PK2)p);
        if (!p.Valid || p.Species == 0 || p.Species > p.MaxSpeciesID || data[1] != marker)
            throw new ArgumentException("GB list header conflicts with entity data.");
        return p;
    }

    public static bool Equal(GBPKML a, GBPKML b) => a.GetType() == b.GetType() && a.Japanese == b.Japanese && a.IsEgg == b.IsEgg &&
        a.Data.SequenceEqual(b.Data) && a.NicknameTrash.SequenceEqual(b.NicknameTrash) && a.OriginalTrainerTrash.SequenceEqual(b.OriginalTrainerTrash);

    public static byte[] Edit(byte[] input, StandalonePokemonRequest request)
    {
        if (StandalonePokemon.Open(input, request.FileName, request.InputEncrypted, request.UseFileFormat).Entity is not GBPKML p)
            throw new ArgumentException("GB editing requires a first- or second-generation file.");
        if ((request.Gb is null) == (request.GbSpecial is null)) throw new ArgumentException("GB edit requires exactly one operation.");
        if (request.GbSpecial is { } special) { StandaloneGbSpecial.Apply(p, special); return Write(p); }
        var edit = request.Gb!;
        var original = p.Clone();
        if (edit.Species < 1 || edit.Species > p.MaxSpeciesID || edit.Tid is < 0 or > 65535 || edit.Level is < 1 or > 100)
            throw new ArgumentException("GB identity value is outside the format limits.");
        Values(edit.Dvs, 4, 15); Values(edit.StatExperience, 5, 65535);
        Values(edit.MovePp, 4, 63); Values(edit.MovePpUps, 4, 3);
        if (edit.Moves is null || edit.Moves.Length != 4 || edit.Moves.Any(m => m > p.MaxMoveID))
            throw new ArgumentException("GB move value is outside the format limits.");
        if (edit.Friendship is < 0 or > 255 || edit.HeldItem < 0 || edit.HeldItem > p.MaxItemID ||
            (p is PK1 && (edit.Friendship is not null || edit.HeldItem is not null)))
            throw new ArgumentException("GB field is unavailable or outside its range.");
        for (int i = 0; i < 4; i++)
            if (edit.MovePp[i] > p.GetMovePP(edit.Moves[i], edit.MovePpUps[i]) ||
                (edit.Moves[i] == 0 && (edit.MovePp[i] != 0 || edit.MovePpUps[i] != 0)))
                throw new ArgumentException("GB PP is outside the move limits.");
        Name(edit.Nickname, p.MaxStringLengthNickname); Name(edit.Ot, p.MaxStringLengthTrainer);
        p.Species = (ushort)edit.Species;
        if (p.Nickname != edit.Nickname) p.Nickname = edit.Nickname;
        if (p.OriginalTrainerName != edit.Ot) p.OriginalTrainerName = edit.Ot;
        if (p.Nickname != edit.Nickname || p.OriginalTrainerName != edit.Ot)
            throw new ArgumentException("GB name contains unsupported characters.");
        p.TID16 = (ushort)edit.Tid;
        if (p.CurrentLevel != edit.Level || original.PersonalInfo.EXPGrowth != p.PersonalInfo.EXPGrowth) p.CurrentLevel = (byte)edit.Level;
        p.IV_ATK = edit.Dvs[0]; p.IV_DEF = edit.Dvs[1]; p.IV_SPE = edit.Dvs[2]; p.IV_SPC = edit.Dvs[3];
        p.EV_HP = edit.StatExperience[0]; p.EV_ATK = edit.StatExperience[1]; p.EV_DEF = edit.StatExperience[2];
        p.EV_SPE = edit.StatExperience[3]; p.EV_SPC = edit.StatExperience[4];
        p.Move1 = edit.Moves[0]; p.Move2 = edit.Moves[1]; p.Move3 = edit.Moves[2]; p.Move4 = edit.Moves[3];
        p.Move1_PPUps = edit.MovePpUps[0]; p.Move2_PPUps = edit.MovePpUps[1]; p.Move3_PPUps = edit.MovePpUps[2]; p.Move4_PPUps = edit.MovePpUps[3];
        p.Move1_PP = edit.MovePp[0]; p.Move2_PP = edit.MovePp[1]; p.Move3_PP = edit.MovePp[2]; p.Move4_PP = edit.MovePp[3];
        if (edit.Friendship is int friendship) p.CurrentFriendship = (byte)friendship;
        if (edit.HeldItem is int item) p.HeldItem = item;
        Span<ushort> before = stackalloc ushort[6]; Span<ushort> after = stackalloc ushort[6];
        original.LoadStats(original.PersonalInfo, before); p.LoadStats(p.PersonalInfo, after);
        if (original.CurrentLevel != p.CurrentLevel || !before.SequenceEqual(after))
        {
            p.ResetPartyStats(); p.Stat_HPCurrent = Math.Min(original.Stat_HPCurrent, p.Stat_HPMax); p.Status_Condition = original.Status_Condition;
        }
        return Write(p);
    }

    public static byte[] Write(GBPKML p)
    {
        var output = new byte[p.SIZE_STORED]; p.WriteDecryptedDataStored(output);
        if (!Equal(p, Read(output, "." + p.Extension))) throw new InvalidOperationException("GB export verification failed.");
        return output;
    }

    private static void Values(int[] values, int length, int max)
    {
        if (values is null || values.Length != length || values.Any(v => v < 0 || v > max)) throw new ArgumentException("GB values are outside the format limits.");
    }
    private static void Name(string value, int max)
    {
        if (string.IsNullOrEmpty(value) || value.Length > max || value.Any(char.IsControl)) throw new ArgumentException("GB name is invalid.");
    }
}

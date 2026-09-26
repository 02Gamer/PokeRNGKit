// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonEdit(
    int Box, int Slot, string Nickname, byte Level, byte Friendship,
    string Ot, ushort Tid, ushort Sid, int[] Ivs, int[] Evs, ushort[] Moves, int[] MovePp,
    int[]? MovePpUps = null, int? Nature = null, int? StatAlignment = null,
    int? AbilityIndex = null, int? HeldItem = null, PokemonIdentityEdit? Identity = null);

internal static class PokemonEditing
{
    public static PKM Read(SaveFile save, int box, int slot)
    {
        if (box == -1)
        {
            if (!save.HasParty || (uint)slot >= save.PartyCount)
                throw new ArgumentException("Pokemon position is outside the party.");
            return save.GetPartySlotAtIndex(slot);
        }
        if (!save.HasBox || (uint)box >= save.BoxCount || (uint)slot >= save.BoxSlotCount)
            throw new ArgumentException("Pokemon position is outside the box.");
        return save.GetBoxSlotAtIndex(box, slot);
    }

    public static PokemonEdit Apply(SaveFile save, PokemonEdit edit)
    {
        var p = Read(save, edit.Box, edit.Slot);
        var requestedForm = edit.Identity?.Form ?? p.Form;
        if (edit.Box >= 0 && save.IsBoxSlotLocked(edit.Box, edit.Slot))
            throw new ArgumentException("Storage slot is locked.");
        if (p.Species == 0 || !p.ChecksumValid)
            throw new ArgumentException("Pokemon slot must contain valid data.");
        if (edit.Level is < 1 or > 100)
            throw new ArgumentException("Pokemon level must be between 1 and 100.");
        if (edit.Identity is not null)
        {
            PokemonIdentity.Apply(save, p, edit.Identity, edit.Box);
            if (edit.Identity.UseSpeciesName)
                edit = edit with { Nickname = SpeciesName.GetSpeciesNameGeneration(p.Species, p.Language, p.Format) };
            // Changing species/form must select an ability from the new personal entry.
            edit = edit with { AbilityIndex = edit.AbilityIndex ?? Math.Clamp(p.AbilityNumber >> 1, 0, p.PersonalInfo.AbilityCount - 1) };
        }
        if (edit.Nature is < 0 or > 24 || edit.StatAlignment is < 0 or > 24)
            throw new ArgumentException("Pokemon nature is outside the format limits.");
        if (edit.StatAlignment is not null && p.Format < 8)
            throw new ArgumentException("Pokemon stat nature is unavailable in this format.");
        if (edit.HeldItem is int item)
        {
            if (item < 0 || item > p.MaxItemID)
                throw new ArgumentException("Pokemon item is outside the format limits.");
            p.HeldItem = item;
        }
        if (edit.Nature is int nature && (int)p.Nature != nature)
        {
            if (p.Format <= 4) p.SetPIDNature((Nature)nature);
            p.Nature = (Nature)nature;
        }
        if (edit.StatAlignment is int alignment) p.StatAlignment = (Nature)alignment;
        if (edit.AbilityIndex is int ability)
        {
            if ((uint)ability >= p.PersonalInfo.AbilityCount)
                throw new ArgumentException("Pokemon ability is outside the species limits.");
            if (p is PK5 pk5) pk5.HiddenAbility = ability == 2;
            p.SetAbilityIndex(ability);
            // Desktop EditPK3 writes the selected bit after the PID helper.
            if (p is G3PKM gen3) gen3.AbilityBit = ability != 0;
        }
        CheckValues(edit.Ivs, 6, p.MaxIV, "IV");
        if (p is G3PKM && p.Species == (ushort)Species.Unown && p.Form != requestedForm)
        {
            // FR selects the core's Unown PID constraints; the stored origin stays unchanged.
            p.PID = EntityPID.GetRandomPID(Util.Rand, p.Species, 2, GameVersion.FR, p.Nature, requestedForm, p.PID);
        }
        CheckValues(edit.Evs, 6, p.MaxEV, "EV");
        if (p.Format >= 3 && edit.Evs.Sum() > EffortValues.Max510)
            throw new ArgumentException("Pokemon EV total cannot exceed 510.");
        if (edit.Moves is null || edit.Moves.Length != 4 || edit.Moves.Any(m => m > p.MaxMoveID))
            throw new ArgumentException("Pokemon move value is outside the format limits.");
        CheckValues(edit.MovePp, 4, 255, "PP");
        var ups = edit.MovePpUps ?? new[] { p.Move1_PPUps, p.Move2_PPUps, p.Move3_PPUps, p.Move4_PPUps };
        CheckValues(ups, 4, 3, "PP Ups");
        for (var i = 0; i < 4; i++)
            if (edit.Moves[i] == 0 && (ups[i] != 0 || edit.MovePp[i] != 0))
                throw new ArgumentException("Pokemon empty move must have zero PP and PP Ups.");
        if (edit.Nickname != p.Nickname)
        {
            CheckName(edit.Nickname, p.MaxStringLengthNickname);
            p.Nickname = edit.Nickname;
            p.IsNicknamed = true;
        }
        CheckName(edit.Ot, p.MaxStringLengthTrainer);
        p.OriginalTrainerName = edit.Ot;
        if (p.Nickname != edit.Nickname || p.OriginalTrainerName != edit.Ot)
            throw new ArgumentException("Pokemon name contains characters unsupported by this game.");
        if (edit.Identity?.UseSpeciesName == true) p.ClearNickname();
        else if (edit.Identity is not null) p.IsNicknamed = true;
        p.TID16 = edit.Tid;
        p.SID16 = edit.Sid;
        p.CurrentLevel = edit.Level;
        if (p.IsEgg) p.OriginalTrainerFriendship = edit.Friendship;
        else p.CurrentFriendship = edit.Friendship;
        p.IV_HP = edit.Ivs[0]; p.IV_ATK = edit.Ivs[1]; p.IV_DEF = edit.Ivs[2];
        p.IV_SPA = edit.Ivs[3]; p.IV_SPD = edit.Ivs[4]; p.IV_SPE = edit.Ivs[5];
        p.EV_HP = edit.Evs[0]; p.EV_ATK = edit.Evs[1]; p.EV_DEF = edit.Evs[2];
        p.EV_SPA = edit.Evs[3]; p.EV_SPD = edit.Evs[4]; p.EV_SPE = edit.Evs[5];
        p.Move1 = edit.Moves[0]; p.Move2 = edit.Moves[1]; p.Move3 = edit.Moves[2]; p.Move4 = edit.Moves[3];
        p.Move1_PPUps = ups[0]; p.Move2_PPUps = ups[1]; p.Move3_PPUps = ups[2]; p.Move4_PPUps = ups[3];
        p.Move1_PP = edit.MovePp[0]; p.Move2_PP = edit.MovePp[1]; p.Move3_PP = edit.MovePp[2]; p.Move4_PP = edit.MovePp[3];
        for (var i = 0; i < 4; i++)
            if (edit.MovePp[i] > p.GetMovePP(edit.Moves[i], ups[i]))
                throw new ArgumentException("Pokemon PP exceeds the move maximum.");
        p.ResetPartyStats();
        p.RefreshChecksum();
        if (edit.Box == -1) save.SetPartySlotAtIndex(p, edit.Slot, EntityImportSettings.None);
        else save.SetBoxSlotAtIndex(p, edit.Box, edit.Slot, EntityImportSettings.None);
        return edit;
    }

    public static void Verify(SaveFile save, PokemonEdit edit)
    {
        var p = Read(save, edit.Box, edit.Slot);
        if (edit.Identity is { } identity && (p.Species != identity.Species || p.Form != identity.Form || p.Gender != identity.Gender || ((p.Format >= 4 || identity.UseSpeciesName) && p.IsNicknamed == identity.UseSpeciesName)))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        if ((edit.Nature is int nature && (int)p.Nature != nature) ||
            (edit.StatAlignment is int alignment && (int)p.StatAlignment != alignment) ||
            (edit.HeldItem is int item && p.HeldItem != item) ||
            (edit.AbilityIndex is int ability && (p.Ability != p.PersonalInfo.GetAbilityAtIndex(ability) || p.AbilityNumber != 1 << ability)))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        if (!p.ChecksumValid || p.Nickname != edit.Nickname || p.OriginalTrainerName != edit.Ot ||
            p.CurrentLevel != edit.Level || (p.IsEgg ? p.OriginalTrainerFriendship : p.CurrentFriendship) != edit.Friendship ||
            p.TID16 != edit.Tid || p.SID16 != edit.Sid ||
            !new[] { p.IV_HP, p.IV_ATK, p.IV_DEF, p.IV_SPA, p.IV_SPD, p.IV_SPE }.SequenceEqual(edit.Ivs) ||
            !new[] { p.EV_HP, p.EV_ATK, p.EV_DEF, p.EV_SPA, p.EV_SPD, p.EV_SPE }.SequenceEqual(edit.Evs) ||
            !p.Moves.SequenceEqual(edit.Moves) ||
            (edit.MovePpUps is not null && !new[] { p.Move1_PPUps, p.Move2_PPUps, p.Move3_PPUps, p.Move4_PPUps }.SequenceEqual(edit.MovePpUps)) ||
            !new[] { p.Move1_PP, p.Move2_PP, p.Move3_PP, p.Move4_PP }.SequenceEqual(edit.MovePp))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
    }

    private static void CheckValues(int[] values, int count, int maximum, string label)
    {
        if (values is null || values.Length != count || values.Any(v => v < 0 || v > maximum))
            throw new ArgumentException($"Pokemon {label} values are outside the format limits.");
    }

    private static void CheckName(string value, int maximum)
    {
        if (string.IsNullOrEmpty(value) || value.Length > maximum || value.Any(char.IsControl))
            throw new ArgumentException("Pokemon name is empty, too long, or contains control characters.");
    }
}

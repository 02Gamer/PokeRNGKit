// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record LocalizedText(string Zh, string En, string Ja);
public sealed record PokemonEntry(
    int Box, int Slot, ushort Species, byte Form, string Nickname, byte Level,
    byte Gender, bool Shiny, bool Egg, bool Valid, string Ot, ushort Tid, ushort Sid,
    uint Pid, uint EncryptionConstant, uint Experience, byte Friendship,
    LocalizedText SpeciesName, LocalizedText Nature, LocalizedText Ability,
    LocalizedText Item, LocalizedText[] Moves, int[] MovePp, int[] Ivs, int[] Evs);

internal static class PokemonReader
{
    private static LocalizedText Text(Func<GameStrings, string> read) =>
        new(read(GameInfo.GetStrings("zh-Hans")), read(GameInfo.GetStrings("en")), read(GameInfo.GetStrings("ja")));
    private static string Name(string[] names, int id) => (uint)id < names.Length ? names[id] : $"#{id}";

    public static PokemonEntry[] Read(SaveFile save)
    {
        var entries = new List<PokemonEntry>();
        if (save.HasParty)
            for (var slot = 0; slot < save.PartyCount; slot++)
                Add(save.GetPartySlotAtIndex(slot), -1, slot);
        if (save.HasBox)
            for (var box = 0; box < save.BoxCount; box++)
                for (var slot = 0; slot < save.BoxSlotCount; slot++)
                    Add(save.GetBoxSlotAtIndex(box, slot), box, slot);
        return entries.ToArray();

        void Add(PKM p, int box, int slot)
        {
            if (p.Species == 0) return;
            entries.Add(new(box, slot, p.Species, p.Form, p.Nickname, p.CurrentLevel,
                p.Gender, p.IsShiny, p.IsEgg, p.ChecksumValid, p.OriginalTrainerName, p.TID16, p.SID16,
                p.PID, p.EncryptionConstant, p.EXP, p.CurrentFriendship,
                Text(s => Name(s.specieslist, p.Species)), Text(s => Name(s.natures, (int)p.Nature)),
                Text(s => Name(s.abilitylist, p.Ability)), Text(s => Name(s.GetItemStrings(p.Context, p.Version), p.HeldItem)),
                p.Moves.Select(m => Text(s => Name(s.movelist, m))).ToArray(),
                [p.Move1_PP, p.Move2_PP, p.Move3_PP, p.Move4_PP],
                [p.IV_HP, p.IV_ATK, p.IV_DEF, p.IV_SPA, p.IV_SPD, p.IV_SPE],
                [p.EV_HP, p.EV_ATK, p.EV_DEF, p.EV_SPA, p.EV_SPD, p.EV_SPE]));
        }
    }
}

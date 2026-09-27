// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record EggEdit(string Action, int? Cycles = null);
public sealed record EggInfo(int Cycles, int SuggestedMinimum);

internal static class PokemonEgg
{
    public static EggInfo? Read(PKM p) => p.IsEgg ? new(p.OriginalTrainerFriendship, EggStateLegality.GetMinimumEggHatchCycles(p)) : null;
    private static void MakeEgg(ITrainerInfo save, PKM p)
    {
        var alreadyMetAsEgg = EncounterStateUtil.IsMetAsEgg(p);
        p.IsEgg = true; // PK3 also applies the upstream Japanese egg language/name.
        p.OriginalTrainerFriendship = (byte)EggStateLegality.GetMinimumEggHatchCycles(p);
        if (p.Format >= 4)
        {
            if (!alreadyMetAsEgg)
            {
                p.EggMetDate = EncounterDate.GetDate(p.Context.Console);
                p.EggLocation = EncounterSuggestion.GetSuggestedEncounterEggLocationEgg(p, p.Version != save.Version);
            }
            var traded = save.OT != p.OriginalTrainerName || save.TID16 != p.TID16 || save.SID16 != p.SID16;
            p.MetLocation = traded ? Locations.TradedEggLocation(save.Generation, save.Version) : LocationEdits.GetNoneLocation(p);
            p.MetDate = p.MetLocation == LocationEdits.GetNoneLocation(p) ? null : new DateOnly(2000, 1, 1);
        }
        p.IsNicknamed = EggStateLegality.IsNicknameFlagSet(p);
        p.Nickname = SpeciesName.GetEggName(p.Language, p.Format);
        if (p.Format >= 6) p.ClearMemories();
        if (p is PK9) p.Version = 0;
        if (!p.IsEgg) throw new ArgumentException("Pokemon egg state cannot be represented.");
    }

    public static void Apply(ITrainerInfo save, PKM p, EggEdit edit)
    {
        if (edit.Action == "makeEgg" && edit.Cycles is null)
        {
            if (p.IsEgg) throw new ArgumentException("Pokemon is already an egg.");
            MakeEgg(save, p);
            return;
        }
        if (!p.IsEgg) throw new ArgumentException("Pokemon must be an egg for this operation.");
        switch (edit.Action)
        {
            case "cycles":
                if (edit.Cycles is not int cycles || cycles is < 0 or > 255)
                    throw new ArgumentException("Pokemon hatch counter must be between 0 and 255.");
                p.OriginalTrainerFriendship = (byte)cycles;
                if (p.OriginalTrainerFriendship != cycles)
                    throw new ArgumentException("Pokemon hatch counter cannot be represented.");
                break;
            case "hatch" when edit.Cycles is null:
                p.ForceHatchPKM(save);
                if (p.IsEgg) throw new ArgumentException("Pokemon could not be hatched in this format.");
                break;
            default:
                throw new ArgumentException("Pokemon egg operation is unavailable.");
        }
    }
}

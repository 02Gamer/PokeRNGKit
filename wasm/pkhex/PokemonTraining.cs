// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record TrainingInfo(int[]? Contest, bool CanEditContest, bool[]? Hyper);
public sealed record TrainingEdit(int[]? Contest = null, bool[]? Hyper = null);
internal static class PokemonTraining
{
    // Product stat order is HP/Atk/Def/SpA/SpD/Spe, unlike Core's HP/Atk/Def/Spe/SpA/SpD indices.
    public static TrainingInfo Read(PKM p) => new(
        p is IContestStatsReadOnly c ? [c.ContestCool, c.ContestBeauty, c.ContestCute, c.ContestSmart, c.ContestTough, c.ContestSheen] : null,
        p is IContestStats,
        p is IHyperTrain h ? [h.HT_HP, h.HT_ATK, h.HT_DEF, h.HT_SPA, h.HT_SPD, h.HT_SPE] : null);
    public static void Apply(PKM p, TrainingEdit edit)
    {
        var before = Read(p);
        if (edit.Contest is null && edit.Hyper is null) throw new ArgumentException("Pokemon training edit is empty.");
        if (edit.Contest is { } contest && (!before.CanEditContest || contest.Length != 6 || contest.Any(v => v < 0 || v > 255)))
            throw new ArgumentException("Pokemon contest values are unavailable or outside 0-255.");
        if (edit.Hyper is { } hyper && (before.Hyper is null || hyper.Length != 6))
            throw new ArgumentException("Pokemon hyper training is unavailable or has invalid length.");
        if (edit.Contest is { } values)
        {
            var c = (IContestStats)p;
            if (values[0] != before.Contest![0]) c.ContestCool = (byte)values[0];
            if (values[1] != before.Contest![1]) c.ContestBeauty = (byte)values[1];
            if (values[2] != before.Contest![2]) c.ContestCute = (byte)values[2];
            if (values[3] != before.Contest![3]) c.ContestSmart = (byte)values[3];
            if (values[4] != before.Contest![4]) c.ContestTough = (byte)values[4];
            if (values[5] != before.Contest![5]) c.ContestSheen = (byte)values[5];
        }
        if (edit.Hyper is { } flags)
        {
            var h = (IHyperTrain)p;
            h.HT_HP = flags[0]; h.HT_ATK = flags[1]; h.HT_DEF = flags[2]; h.HT_SPA = flags[3]; h.HT_SPD = flags[4]; h.HT_SPE = flags[5];
        }
        var actual = Read(p);
        if ((edit.Contest is not null && !edit.Contest.SequenceEqual(actual.Contest!)) || (edit.Hyper is not null && !edit.Hyper.SequenceEqual(actual.Hyper!)))
            throw new ArgumentException("Pokemon training values cannot be represented.");
    }
}

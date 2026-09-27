// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record PokeBlocks6Catalog(uint[] Values, LocalizedText[] Names, int OccupiedPlots, int PlotCount);
internal static class PokeBlocks6
{
    public static PokeBlocks6Catalog Read(SAV6AO save)
    {
        var zh = GameInfo.GetStrings("zh-Hans").pokeblocks; var en = GameInfo.GetStrings("en").pokeblocks; var ja = GameInfo.GetStrings("ja").pokeblocks;
        return new(Enumerable.Range(0, Contest6.CountBlock).Select(save.Contest.GetBlockCount).ToArray(),
            Enumerable.Range(94, Contest6.CountBlock).Select(i => new LocalizedText(zh[i], en[i], ja[i])).ToArray(),
            Enumerable.Range(0, BerryField6AO.Count).Count(i => save.BerryField.GetPlot(i).HasBerry), BerryField6AO.Count);
    }
    public static void Apply(SaveFile save, SaveFoodEdit edit)
    {
        if (save is not SAV6AO oras) throw new ArgumentException("Food block editing is unavailable for this format.");
        if (edit.Values is not null || edit.Count is not null) throw new ArgumentException("Food action contains unrelated fields.");
        if (edit.Action == "blocksEdit")
        {
            if (edit.BlockValues is not { Length: Contest6.CountBlock } values ||
                values.Where((v, i) => v > Contest6.MaxBlock && v != oras.Contest.GetBlockCount(i)).Any())
                throw new ArgumentException("Food block counts are out of range.");
            for (int i = 0; i < values.Length; i++)
                if (values[i] != oras.Contest.GetBlockCount(i)) oras.Contest.SetBlockCount(i, values[i]);
            return;
        }
        if (edit.BlockValues is not null) throw new ArgumentException("Food action contains unrelated fields.");
        switch (edit.Action)
        {
            case "blocksFill":
            case "blocksClear":
                for (int i = 0; i < Contest6.CountBlock; i++) oras.Contest.SetBlockCount(i, edit.Action == "blocksFill" ? Contest6.MaxBlock : 0);
                break;
            case "berries": oras.BerryField.ResetAndRandomize(Util.Rand, ItemStorage6XY.Berry); break;
            default: throw new ArgumentException("Food action is invalid.");
        }
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record TrainerGameVersionState(int Value, OriginChoice[] Choices);

internal static class TrainerGameVersion
{
    // SAV_Trainer7/8/8b CB_Game. Gen6 deliberately disables this control.
    private static GameVersion[] Allowed(SaveFile save) => save switch
    {
        SAV7SM or SAV7USUM => [GameVersion.SN, GameVersion.MN, GameVersion.US, GameVersion.UM],
        SAV8SWSH => [GameVersion.SW, GameVersion.SH],
        SAV8BS => [GameVersion.BD, GameVersion.SP],
        _ => [],
    };
    private static readonly Lazy<Dictionary<int, string>[]> Names = new(() => new[] { "zh-Hans", "en", "ja" }
        .Select(language => new GameDataSource(GameInfo.GetStrings(language)).VersionDataSource
            .GroupBy(c => c.Value).ToDictionary(g => g.Key, g => g.First().Text)).ToArray());
    public static TrainerGameVersionState Read(SaveFile save) => new((int)save.Version,
        Allowed(save).Select(v => new OriginChoice((int)v, new(
            Names.Value[0][(int)v], Names.Value[1][(int)v], Names.Value[2][(int)v]))).ToArray());
    public static void Apply(SaveFile save, int version)
    {
        if (version == (int)save.Version) return;
        if (!Allowed(save).Any(v => (int)v == version))
            throw new ArgumentException("Trainer game version is unsupported for this save.");
        save.Version = (GameVersion)version;
        if ((int)save.Version != version) throw new ArgumentException("Trainer game version could not be stored.");
    }
}

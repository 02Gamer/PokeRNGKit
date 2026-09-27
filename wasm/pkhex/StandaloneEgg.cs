// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record StandaloneEggTrainer(int Version, string Name, int Tid, int Sid);
internal sealed record StandaloneEggCatalog(OriginChoice[] Games, StandaloneEggTrainer Trainer, int MaximumName);

internal static class StandaloneEgg
{
    public static StandaloneEggCatalog Read(PKM p)
    {
        if (!StandalonePokemon.CanEdit(p)) throw new ArgumentException("Entity egg editing is unavailable.");
        var versions = GameUtil.GetVersionsInGeneration(p.Context, p.Version).ToHashSet();
        var games = PokemonOrigin.Catalog(p).Games.Where(c => versions.Contains((GameVersion)c.Id)).ToArray();
        if (games.Length == 0) throw new ArgumentException("Entity egg context has no supported game.");
        var version = games.Any(c => c.Id == (int)p.Version) ? (int)p.Version : (int)p.Context.GetSingleGameVersion();
        if (!games.Any(c => c.Id == version)) version = games[0].Id;
        return new(games, new(version, p.OriginalTrainerName, p.TID16, p.SID16), p.MaxStringLengthTrainer);
    }

    public static void Apply(PKM p, EggEdit edit, StandaloneEggTrainer trainer)
    {
        var catalog = Read(p);
        if (!catalog.Games.Any(c => c.Id == trainer.Version) || trainer.Tid is < 0 or > 65535 || trainer.Sid is < 0 or > 65535)
            throw new ArgumentException("Entity egg trainer values are outside the supported range.");
        if (string.IsNullOrEmpty(trainer.Name) || trainer.Name.Length > catalog.MaximumName || trainer.Name.Any(char.IsControl))
            throw new ArgumentException("Entity egg trainer name is invalid.");
        // This is operation context, not a replacement for the entity's OT fields.
        var info = new SimpleTrainerInfo((GameVersion)trainer.Version)
        {
            OT = trainer.Name, TID16 = (ushort)trainer.Tid, SID16 = (ushort)trainer.Sid,
            Gender = p.OriginalTrainerGender, Language = p.Language,
            ConsoleRegion = 0, Country = 0, Region = 0,
        };
        PokemonEgg.Apply(info, p, edit);
    }
}

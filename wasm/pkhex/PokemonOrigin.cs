// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record OriginInfo(int Version, int Ball, int MetLocation, int EggLocation, bool CanEggLocation);
public sealed record OriginEdit(int? Version = null, int? Ball = null, int? MetLocation = null, int? EggLocation = null);
public sealed record OriginQuery(int Box, int Slot, int? Version = null);
public sealed record OriginChoice(int Id, LocalizedText Name);
public sealed record OriginCatalog(int Version, OriginChoice[] Games, OriginChoice[] Balls, OriginChoice[] MetLocations, OriginChoice[] EggLocations);

internal static class PokemonOrigin
{
    private static readonly Lazy<GameDataSource[]> Sources = new(() => new[] { "zh-Hans", "en", "ja" }
        .Select(language => new GameDataSource(GameInfo.GetStrings(language))).ToArray());
    public static OriginInfo Read(PKM p) => new((int)p.Version, p.Ball, p.MetLocation, p.EggLocation, p.Format >= 4);

    internal static OriginChoice[] Localize(Func<GameDataSource, IEnumerable<ComboItem>> get)
    {
        var lists = Sources.Value.Select(s => get(s).GroupBy(c => c.Value).Select(g => g.First()).ToArray()).ToArray();
        var en = lists[1].ToDictionary(c => c.Value, c => c.Text);
        var ja = lists[2].ToDictionary(c => c.Value, c => c.Text);
        return lists[0].Select(c => new OriginChoice(c.Value, new(c.Text,
            en.GetValueOrDefault(c.Value, $"#{c.Value}"), ja.GetValueOrDefault(c.Value, $"#{c.Value}")))).ToArray();
    }

    private static bool CanVersion(PKM p, int value)
    {
        if (value is < 0 or > byte.MaxValue) return false;
        var copy = p.Clone(); copy.Version = (GameVersion)value;
        return (int)copy.Version == value;
    }
    private static bool CanBall(PKM p, int value)
    {
        if (value is < 0 or > byte.MaxValue) return false;
        var copy = p.Clone(); copy.Ball = (byte)value;
        return copy.Ball == value;
    }
    private static OriginChoice[] Games(IGameValueLimit limits, EntityContext context, PKM p)
    {
        var allowed = GameUtil.GetVersionsWithinRange(limits, context).ToHashSet();
        return Localize(s => s.VersionDataSource.Where(c =>
            (c.Value == 0 || allowed.Contains((GameVersion)c.Value)) && CanVersion(p, c.Value)));
    }

    public static OriginCatalog Catalog(SaveFile save, OriginQuery query)
    {
        var p = PokemonEditing.Read(save, query.Box, query.Slot);
        if (p.Species == 0 || !p.ChecksumValid) throw new ArgumentException("Pokemon slot must contain valid data.");
        return Catalog(save, p, query.Version);
    }
    private static OriginCatalog Catalog(SaveFile save, PKM p, int? version)
        => Catalog(save, save.Context, save.Version, p, version);

    public static OriginCatalog Catalog(PKM p, int? version = null)
        => Catalog(p, p.Context, GameVersion.Invalid, p, version);

    private static OriginCatalog Catalog(IGameValueLimit limits, EntityContext context, GameVersion fallback, PKM p, int? version)
    {
        var games = Games(limits, context, p);
        var chosen = version ?? (int)p.Version;
        if (chosen != (int)p.Version && !games.Any(c => c.Id == chosen))
            throw new ArgumentException("Origin game is unavailable in this format.");
        p = p.Clone(); p.Version = (GameVersion)chosen;
        var balls = Localize(s => s.BallDataSource.Where(c => c.Value <= limits.MaxBallID && CanBall(p, c.Value)));
        // The desktop falls back to the save/context for an unknown origin group.
        var locationVersion = p.Version;
        if (GameUtil.GetMetLocationVersionGroup(locationVersion) == GameVersion.Invalid)
        {
            locationVersion = GameUtil.GetMetLocationVersionGroup(fallback);
            if (locationVersion == GameVersion.Invalid || p.Version == GameVersion.Any)
                locationVersion = p.Context.GetSingleGameVersion();
        }
        var maxLocation = p is PK3 ? byte.MaxValue : ushort.MaxValue;
        var met = Localize(s => s.Met.GetLocationList(locationVersion, p.Context).Where(c => c.Value >= 0 && c.Value <= maxLocation));
        var egg = p.Format >= 4 ? Localize(s => s.Met.GetLocationList(locationVersion, p.Context, true)) : [];
        return new(chosen, games, balls, met, egg);
    }

    public static void Apply(SaveFile save, PKM p, OriginEdit edit)
        => Apply(p, edit, Catalog(save, p, edit.Version));

    public static void Apply(PKM p, OriginEdit edit)
        => Apply(p, edit, Catalog(p, edit.Version));

    private static void Apply(PKM p, OriginEdit edit, OriginCatalog catalog)
    {
        if (edit.Version is null && edit.Ball is null && edit.MetLocation is null && edit.EggLocation is null)
            throw new ArgumentException("Origin edit requires a changed value.");
        static void Check(int? value, int current, OriginChoice[] choices)
        {
            if (value is int v && v != current && !choices.Any(c => c.Id == v))
                throw new ArgumentException("Origin option is unavailable in this format.");
        }
        Check(edit.Ball, p.Ball, catalog.Balls);
        Check(edit.MetLocation, p.MetLocation, catalog.MetLocations);
        if (edit.EggLocation is not null && p.Format < 4)
            throw new ArgumentException("Egg location is unavailable in this format.");
        Check(edit.EggLocation, p.EggLocation, catalog.EggLocations);
        var before = Read(p);
        var gender = p.OriginalTrainerGender;
        var metLevel = p.MetLevel;
        if (edit.Version is int version && version != (int)p.Version)
        {
            p.Version = (GameVersion)version;
            if (p is IGroundTile ground && !p.Gen4) ground.GroundTile = GroundTileType.None;
        }
        if (edit.Ball is int ball && ball != p.Ball) p.Ball = (byte)ball;
        if (edit.MetLocation is int met && met != p.MetLocation) p.MetLocation = (ushort)met;
        if (edit.EggLocation is int egg && egg != p.EggLocation) p.EggLocation = (ushort)egg;
        if ((int)p.Version != (edit.Version ?? before.Version) || p.Ball != (edit.Ball ?? before.Ball) ||
            p.MetLocation != (edit.MetLocation ?? before.MetLocation) || p.EggLocation != (edit.EggLocation ?? before.EggLocation) ||
            p.OriginalTrainerGender != gender || p.MetLevel != metLevel)
            throw new ArgumentException("Origin value cannot be represented by this format.");
    }
}

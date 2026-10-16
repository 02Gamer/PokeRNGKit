// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonLegacyInfo(int? GroundTile, OriginChoice[] GroundTiles, int? ShinyLeaf, int? WalkingMood);
public sealed record PokemonLegacyEdit(int? GroundTile = null, int? LeafFlags = null, int? WalkingMood = null);
internal static class PokemonLegacyDetails
{
    private static readonly Lazy<OriginChoice[]> Tiles = new(() => PokemonOrigin.Localize(s => s.GroundTileDataSource));
    public static PokemonLegacyInfo? Read(PKM p)
    {
        bool ground = p is IGroundTile && p.Gen4;
        if (!ground && p is not G4PKM) return null;
        return new(ground ? (int)((IGroundTile)p).GroundTile : null, ground ? Tiles.Value : [], p is G4PKM leaf ? leaf.ShinyLeaf : null, p is G4PKM mood ? mood.WalkingMood : null);
    }
    public static void Apply(PKM p, PokemonLegacyEdit edit)
    {
        var source = Read(p) ?? throw new ArgumentException("Legacy encounter details are unavailable.");
        if (edit.GroundTile is null && edit.LeafFlags is null && edit.WalkingMood is null) throw new ArgumentException("Legacy detail edit is empty.");
        if (edit.GroundTile is int tile && (source.GroundTile is null || tile != source.GroundTile && !source.GroundTiles.Any(c => c.Id == tile))) throw new ArgumentException("Ground tile is outside the source catalog or origin group.");
        if (edit.WalkingMood is int mood && (source.WalkingMood is null || mood != source.WalkingMood && mood is < -127 or > 127)) throw new ArgumentException("Walking mood is outside the source control range.");
        if (edit.LeafFlags is int flags && (source.ShinyLeaf is null || flags is < 0 or > 63 ||
            (flags & 32) != 0 && (flags & 31) != 31 && ((source.ShinyLeaf.Value & 32) == 0 || ((source.ShinyLeaf.Value & 31) & ~flags) != 0))) throw new ArgumentException("A new leaf crown requires all five leaves.");
        var copy = p.Clone();
        if (edit.GroundTile is int ground && ground != source.GroundTile) ((IGroundTile)copy).GroundTile = (GroundTileType)ground;
        if (edit.LeafFlags is int leaves && leaves != (source.ShinyLeaf & 63)) ((G4PKM)copy).ShinyLeaf = (source.ShinyLeaf!.Value & ~63) | leaves;
        if (edit.WalkingMood is int walking && walking != source.WalkingMood) ((G4PKM)copy).WalkingMood = (sbyte)walking;
        copy.Data.CopyTo(p.Data);
    }
}

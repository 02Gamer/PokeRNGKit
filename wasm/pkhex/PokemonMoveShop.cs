// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record MoveShopRow(int Index, int Move, int Type, bool Permitted, bool Purchased, bool Mastered, LocalizedText Name, LocalizedText TypeName);
public sealed record MoveShopCatalog(string SourceHash, int Species, int Form, int Level, MoveShopRow[] Rows, string PurchasedRaw, string MasteredRaw);
public sealed record MoveShopRowEdit([property: JsonRequired] int Index, [property: JsonRequired] bool Purchased, [property: JsonRequired] bool Mastered);
public sealed record MoveShopEdit([property: JsonRequired] string Action, [property: JsonRequired] MoveShopRowEdit[] Rows);

internal static class PokemonMoveShop
{
    internal static bool Supports(PKM entity) => entity is IMoveShop8Mastery;
    private static IMoveShop8Mastery Shop(PKM entity) => entity as IMoveShop8Mastery ?? throw new ArgumentException("Move Shop is unavailable for this Pokemon.");
    internal static MoveShopCatalog Read(PKM source, string hash)
    {
        var entity = source.Clone(); var shop = Shop(entity); var indexes = shop.Permit.RecordPermitIndexes;
        var zh = GameInfo.GetStrings("zh-Hans").Move; var en = GameInfo.GetStrings("en").Move; var ja = GameInfo.GetStrings("ja").Move;
        var rows = new MoveShopRow[indexes.Length];
        for (int i = 0; i < rows.Length; i++) {
            int move = indexes[i]; int type = MoveInfo.GetType((ushort)move, entity.Context);
            rows[i] = new(i, move, type, shop.Permit.IsRecordPermitted(i), shop.GetPurchasedRecordFlag(i), shop.GetMasteredRecordFlag(i), new(zh[move], en[move], ja[move]), new(GameInfo.GetStrings("zh-Hans").Types[type], GameInfo.GetStrings("en").Types[type], GameInfo.GetStrings("ja").Types[type]));
        }
        return new(hash, entity.Species, entity.Form, entity.CurrentLevel, rows, source is PA8 pa ? Convert.ToHexString(pa.PurchasedRecord) : "", source is PA8 pm ? Convert.ToHexString(pm.MasteredRecord) : "");
    }
    internal static PKM Prepare(PKM source, MoveShopEdit edit)
    {
        if (source.Species == 0 || source.Species > source.MaxSpeciesID || !source.Valid || !source.ChecksumValid) throw new ArgumentException("Move Shop requires valid Pokemon data.");
        var copy = source.Clone(); var shop = Shop(copy); int count = shop.Permit.RecordPermitIndexes.Length;
        if (edit.Rows is null || edit.Rows.Length != (edit.Action == "encounterReset" ? 0 : count) || edit.Rows.Any(r => r is null || (uint)r.Index >= count) || edit.Rows.Select(r => r.Index).Distinct().Count() != edit.Rows.Length) throw new ArgumentException("Invalid Move Shop rows.");
        if (edit.Action != "encounterReset") foreach (var row in edit.Rows) { shop.SetPurchasedRecordFlag(row.Index, row.Purchased); shop.SetMasteredRecordFlag(row.Index, row.Mastered); }
        switch (edit.Action)
        {
            case "save": break;
            case "current": shop.SetMoveShopFlags(copy); break;
            case "all": shop.SetPurchasedFlagsAll(copy); shop.SetMoveShopFlagsAll(copy); break;
            case "clearCurrent": shop.ClearMoveShopFlags(); shop.SetMoveShopFlags(copy); break;
            case "none": shop.ClearMoveShopFlags(); break;
            case "encounterReset":
                var legality = new LegalityAnalysis(copy); var encounter = legality.EncounterMatch;
                shop.ClearMoveShopFlags(); if (encounter is IMasteryInitialMoveShop8 initial) initial.SetInitialMastery(copy, encounter); shop.SetMoveShopFlags(copy); break;
            default: throw new ArgumentException("Unknown Move Shop action.");
        }
        if (copy is PA8 after && source is PA8 before && ((after.PurchasedRecord[^1] & 0xE0) != (before.PurchasedRecord[^1] & 0xE0) || (after.MasteredRecord[^1] & 0xE0) != (before.MasteredRecord[^1] & 0xE0))) throw new InvalidOperationException("Move Shop reserved bits changed.");
        copy.RefreshChecksum(); return copy;
    }
}

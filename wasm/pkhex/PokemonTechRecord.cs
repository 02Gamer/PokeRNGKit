// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record TechRecordRow(int Index, int Number, int Move, int Type, bool Flag, string Permission, bool CurrentMove, LocalizedText Name, LocalizedText TypeName);
public sealed record TechRecordCatalog(string SourceHash, string Format, int Species, int Form, int Level, int CountUsed, int CountTotal, TechRecordRow[] Rows, string Raw);
public sealed record TechRecordRowEdit([property: JsonRequired] int Index, [property: JsonRequired] bool Flag);
public sealed record TechRecordEdit([property: JsonRequired] string Action, [property: JsonRequired] TechRecordRowEdit[] Rows);

internal static class PokemonTechRecord
{
    internal static bool Supports(PKM entity) => entity is ITechRecord;
    private static ITechRecord Record(PKM entity) => entity as ITechRecord ?? throw new ArgumentException("Technical records are unavailable for this Pokemon.");
    private static void Validate(PKM entity) {
        if (entity.Species == 0 || entity.Species > entity.MaxSpeciesID || !entity.Valid || !entity.ChecksumValid) throw new ArgumentException("Technical records require valid Pokemon data.");
        _ = Record(entity);
    }
    internal static TechRecordCatalog Read(PKM source, string hash) {
        Validate(source); var entity = source.Clone(); var record = Record(entity); var indexes = record.Permit.RecordPermitIndexes;
        var legality = new LegalityAnalysis(entity); var evos = legality.Info.EvoChainsAllGens.Get(entity.Context);
        Span<ushort> moves = stackalloc ushort[4]; entity.GetMoves(moves);
        var zh = GameInfo.GetStrings("zh-Hans"); var en = GameInfo.GetStrings("en"); var ja = GameInfo.GetStrings("ja");
        var rows = new TechRecordRow[indexes.Length];
        for (int i = 0; i < rows.Length; i++) {
            int move = indexes[i]; int type = MoveInfo.GetType((ushort)move, entity.Context);
            string permission = record.Permit.IsRecordPermitted(i) ? "current" : record.IsRecordPermitted(evos, i) ? "evolution" : "suspect";
            // Core indexes remain zero-based. ZA's 001 display must not shift the stored flag.
            rows[i] = new(i, i + (entity.Context == EntityContext.Gen9a ? 1 : 0), move, type, record.GetMoveRecordFlag(i), permission, moves.Contains((ushort)move), new(zh.Move[move], en.Move[move], ja.Move[move]), new(zh.Types[type], en.Types[type], ja.Types[type]));
        }
        return new(hash, entity.GetType().Name, entity.Species, entity.Form, entity.CurrentLevel, record.Permit.RecordCountUsed, record.Permit.RecordCountTotal, rows, Raw(entity));
    }
    internal static PKM Prepare(PKM source, TechRecordEdit edit) {
        Validate(source);
        if (edit is null || edit.Rows is null || !new[] { "save", "legalAll", "forceAll", "legalCurrent", "clearAfterSave", "none", "parentCurrent" }.Contains(edit.Action)) throw new ArgumentException("Invalid technical record action.");
        var copy = source.Clone(); var record = Record(copy); int count = record.Permit.RecordPermitIndexes.Length;
        bool save = edit.Action is not ("none" or "parentCurrent");
        if (edit.Rows.Length != (save ? count : 0) || edit.Rows.Any(r => r is null || (uint)r.Index >= count) || edit.Rows.Select(r => r.Index).Distinct().Count() != edit.Rows.Length) throw new ArgumentException("Invalid technical record rows.");
        if (save) foreach (var row in edit.Rows) record.SetMoveRecordFlag(row.Index, row.Flag);
        switch (edit.Action) {
            case "save": break;
            case "none": record.ClearRecordFlags(); break;
            case "clearAfterSave": record.SetRecordFlags(copy, TechnicalRecordApplicatorOption.None); break;
            case "forceAll": record.SetRecordFlags(copy, TechnicalRecordApplicatorOption.ForceAll); break;
            case "legalAll": record.SetRecordFlags(copy, TechnicalRecordApplicatorOption.LegalAll); break;
            case "legalCurrent": case "parentCurrent": record.SetRecordFlags(copy, TechnicalRecordApplicatorOption.LegalCurrent); break;
        }
        copy.RefreshChecksum(); return copy;
    }
    internal static string Raw(PKM entity) => entity switch {
        G8PKM p => Convert.ToHexString(p.RecordFlags),
        PA8 p => Convert.ToHexString(p.MoveRecordFlags),
        PK9 p => Convert.ToHexString(p.RecordFlagsBase) + Convert.ToHexString(p.RecordFlagsDLC),
        PA9 p => Convert.ToHexString(p.RecordFlagsBase) + Convert.ToHexString(p.RecordFlagsDLC),
        _ => throw new ArgumentException("Unknown technical record buffer."),
    };
}

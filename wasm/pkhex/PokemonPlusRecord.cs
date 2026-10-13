// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record PlusRecordRow(int Index, int Move, int Type, bool Flag, bool CurrentMove, bool Learnable, LocalizedText Name, LocalizedText TypeName);
public sealed record PlusRecordCatalog(string SourceHash, string Format, int Species, int Form, int Level, int CountUsed, int CountTotal, PlusRecordRow[] Rows, string Raw, bool HasImpossibleFlags);
public sealed record PlusRecordRowEdit([property: JsonRequired] int Index, [property: JsonRequired] bool Flag);
public sealed record PlusRecordEdit([property: JsonRequired] string Action, [property: JsonRequired] PlusRecordRowEdit[] Rows);

internal static class PokemonPlusRecord
{
    private static PA9 Validate(PKM entity) {
        if (entity is not PA9 p || p.PersonalInfo is not IPermitPlus || p.Species == 0 || p.Species > p.MaxSpeciesID || !p.Valid || !p.ChecksumValid)
            throw new ArgumentException("Plus records require valid Legends: Z-A Pokemon data.");
        return p;
    }
    internal static PlusRecordCatalog Read(PKM source, string hash) {
        var entity = (PA9)Validate(source).Clone(); var permit = (IPermitPlus)entity.PersonalInfo;
        var legality = new LegalityAnalysis(entity); var learnable = new bool[entity.MaxMoveID + 1];
        LearnPossible.Get(entity, legality.EncounterMatch, legality.Info.EvoChainsAllGens, learnable);
        Span<ushort> current = stackalloc ushort[4]; entity.GetMoves(current);
        var zh = GameInfo.GetStrings("zh-Hans"); var en = GameInfo.GetStrings("en"); var ja = GameInfo.GetStrings("ja");
        var indexes = permit.PlusMoveIndexes; var rows = new PlusRecordRow[indexes.Length];
        for (int i = 0; i < rows.Length; i++) {
            ushort move = indexes[i]; int type = MoveInfo.GetType(move, entity.Context);
            rows[i] = new(i, move, type, entity.GetMovePlusFlag(i), current.Contains(move), learnable[move], new(zh.Move[move], en.Move[move], ja.Move[move]), new(zh.Types[type], en.Types[type], ja.Types[type]));
        }
        return new(hash, "PA9", entity.Species, entity.Form, entity.CurrentLevel, permit.PlusCountUsed, permit.PlusCountTotal, rows, Raw(entity), entity.GetMovePlusFlagAnyImpossible());
    }
    internal static PA9 Prepare(PKM source, PlusRecordEdit edit) {
        var entity = Validate(source);
        if (edit is null || edit.Rows is null || !new[] { "save", "legalCurrent", "legalCurrentTM", "legalSeedTM", "clearAfterSave", "none", "parentCurrent" }.Contains(edit.Action))
            throw new ArgumentException("Invalid plus record action.");
        var copy = (PA9)entity.Clone(); var permit = (IPermitPlus)copy.PersonalInfo;
        bool save = edit.Action is not ("none" or "parentCurrent"); int count = permit.PlusMoveIndexes.Length;
        if (edit.Rows.Length != (save ? count : 0) || edit.Rows.Any(r => r is null || (uint)r.Index >= count) || edit.Rows.Select(r => r.Index).Distinct().Count() != edit.Rows.Length)
            throw new ArgumentException("Invalid plus record rows.");
        if (save) foreach (var row in edit.Rows) copy.SetMovePlusFlag(row.Index, row.Flag);
        switch (edit.Action) {
            case "save": break;
            case "none": ((IPlusRecord)copy).ClearPlusFlags(permit.PlusCountTotal); break;
            case "clearAfterSave": copy.SetPlusFlags(permit, PlusRecordApplicatorOption.None); break;
            case "legalCurrent": case "parentCurrent": copy.SetPlusFlags(permit, PlusRecordApplicatorOption.LegalCurrent); break;
            case "legalCurrentTM": copy.SetPlusFlags(permit, PlusRecordApplicatorOption.LegalCurrentTM); break;
            case "legalSeedTM": copy.SetPlusFlags(permit, PlusRecordApplicatorOption.LegalSeedTM); break;
        }
        copy.RefreshChecksum(); return copy;
    }
    internal static string Raw(PA9 p) => Convert.ToHexString(p.PlusFlags0) + Convert.ToHexString(p.PlusFlags1);
}

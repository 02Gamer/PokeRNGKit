// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record TechRecordTarget([property: JsonRequired] string Kind, int Box = 0, int Slot = 0, string? FileName = null, bool InputEncrypted = false, bool UseFileFormat = false);
public sealed record TechRecordRequest([property: JsonRequired] string SourceHash, [property: JsonRequired] TechRecordTarget Target, [property: JsonRequired] TechRecordEdit Edit);
public sealed record TechRecordConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash, [property: JsonRequired] TechRecordTarget Target);
public sealed record TechRecordTicket(string Token, string SourceHash, string TargetHash, TechRecordTarget Target, TechRecordCatalog Before, TechRecordCatalog Result, int[] ChangedRows, int[] ChangedFlags, int ChangedBytes);

internal static class TechRecordSession
{
    private static byte[]? output;
    private static TechRecordConfirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    private static string FileName(TechRecordTarget target) => target.FileName is { Length: > 0 and <= 1024 } name ? name : throw new ArgumentException("Missing technical record file name.");
    internal static TechRecordCatalog Read(byte[] input, TechRecordTarget target) {
        if (target is null) throw new ArgumentException("Missing technical record target.");
        PKM entity;
        if (target.Kind == "file") entity = StandalonePokemon.Open(input, FileName(target), target.InputEncrypted, target.UseFileFormat).Entity;
        else if (target.Kind == "save") entity = PokemonEditing.Read(SaveUtil.GetSaveFile(input.ToArray()) ?? throw new ArgumentException("Unrecognized technical record save."), target.Box, target.Slot);
        else throw new ArgumentException("Unknown technical record target.");
        return PokemonTechRecord.Read(entity, Br4Editing.Hash(input));
    }
    internal static TechRecordTicket Prepare(byte[] input, TechRecordRequest request) {
        Reset(); Validate(input, request);
        if (request.Target.Kind == "file") {
            var file = StandalonePokemon.Open(input, FileName(request.Target), request.Target.InputEncrypted, request.Target.UseFileFormat);
            var prepared = PokemonTechRecord.Prepare(file.Entity, request.Edit);
            return Freeze(input, request, file.Entity, prepared, StandalonePokemon.Serialize(prepared, file.Party, false));
        }
        if (request.Target.Kind != "save") throw new ArgumentException("Unknown technical record target.");
        return Prepare(SaveUtil.GetSaveFile(input.ToArray()) ?? throw new ArgumentException("Unrecognized technical record save."), input, request);
    }
    internal static TechRecordTicket Prepare(SaveFile source, byte[] input, TechRecordRequest request) {
        Reset(); Validate(input, request);
        if (request.Target.Kind != "save" || source is not (SAV8SWSH or SAV8BS or SAV8LA or SAV9SV or SAV9ZA) || !source.State.Exportable || !SaveChecksums.Valid(source)) throw new ArgumentException("Technical records require a supported exportable save with valid checksums.");
        var target = request.Target; var original = PokemonEditing.Read(source, target.Box, target.Slot);
        if (target.Box >= 0 && source.IsBoxSlotLocked(target.Box, target.Slot)) throw new ArgumentException("Technical record storage slot is locked.");
        var prepared = PokemonTechRecord.Prepare(original, request.Edit); var copy = source.Clone();
        if (target.Box == -1) copy.SetPartySlotAtIndex(prepared, target.Slot, EntityImportSettings.None);
        else copy.SetBoxSlotAtIndex(prepared, target.Box, target.Slot, EntityImportSettings.None);
        var expected = StorageEditing.StoredData(copy, new(target.Box, target.Slot));
        byte[] bytes = copy.Write().ToArray(); var reopened = Reopen(source, bytes);
        if (bytes.Length != input.Length || !SaveChecksums.Valid(reopened) || reopened.PartyCount != copy.PartyCount || !StorageEditing.StoredData(reopened, new(target.Box, target.Slot)).SequenceEqual(expected)) throw new InvalidOperationException("Technical record save export verification failed.");
        return Freeze(input, request, original, prepared, bytes);
    }
    private static SaveFile Reopen(SaveFile source, byte[] bytes) => source switch {
        SAV8SWSH => new SAV8SWSH(bytes.ToArray()), SAV8BS => new SAV8BS(bytes.ToArray()), SAV8LA => new SAV8LA(bytes.ToArray()), SAV9SV => new SAV9SV(bytes.ToArray()), SAV9ZA => new SAV9ZA(bytes.ToArray()),
        _ => throw new ArgumentException("Unsupported technical record save."),
    };
    private static void Validate(byte[] input, TechRecordRequest request) {
        if (request is null || request.Target is null || request.Edit is null || request.SourceHash != Br4Editing.Hash(input)) throw new ArgumentException("Technical record request is missing or stale.");
    }
    private static TechRecordTicket Freeze(byte[] input, TechRecordRequest request, PKM before, PKM after, byte[] bytes) {
        string hash = Br4Editing.Hash(input); if (request.SourceHash != hash) throw new ArgumentException("Technical record preview is stale.");
        string targetHash = Br4Editing.Hash(bytes); var original = PokemonTechRecord.Read(before, hash); var result = PokemonTechRecord.Read(after, targetHash);
        int[] rows = original.Rows.Where((row, i) => row.Flag != result.Rows[i].Flag).Select(row => row.Index).ToArray();
        byte[] beforeRaw = Convert.FromHexString(original.Raw); byte[] afterRaw = Convert.FromHexString(result.Raw);
        int[] flags = Enumerable.Range(0, beforeRaw.Length * 8).Where(i => ((beforeRaw[i >> 3] ^ afterRaw[i >> 3]) & (1 << (i & 7))) != 0).ToArray();
        int changed = Math.Abs(input.Length - bytes.Length); for (int i = 0; i < Math.Min(input.Length, bytes.Length); i++) if (input[i] != bytes[i]) changed++;
        string token = "tech-record:" + (++revision).ToString(CultureInfo.InvariantCulture); current = new(token, hash, targetHash, request.Target); output = bytes;
        return new(token, hash, targetHash, request.Target, original, result, rows, flags, changed);
    }
    internal static byte[] Commit(byte[] input, TechRecordConfirmation confirmation) {
        if (current is null || output is null || confirmation != current) throw new ArgumentException("Technical record preview is missing or replaced.");
        if (Br4Editing.Hash(input) != current.SourceHash) throw new ArgumentException("Technical record preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Technical record frozen output verification failed.");
        byte[] result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

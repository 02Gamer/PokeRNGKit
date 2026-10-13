// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record PlusRecordTarget([property: JsonRequired] string Kind, int Box = 0, int Slot = 0, string? FileName = null, bool InputEncrypted = false, bool UseFileFormat = false);
public sealed record PlusRecordRequest([property: JsonRequired] string SourceHash, [property: JsonRequired] PlusRecordTarget Target, [property: JsonRequired] PlusRecordEdit Edit);
public sealed record PlusRecordConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash, [property: JsonRequired] PlusRecordTarget Target);
public sealed record PlusRecordTicket(string Token, string SourceHash, string TargetHash, PlusRecordTarget Target, PlusRecordCatalog Before, PlusRecordCatalog Result, int[] ChangedRows, int[] ChangedFlags, int ChangedBytes);

internal static class PlusRecordSession
{
    private static byte[]? output;
    private static PlusRecordConfirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    private static string FileName(PlusRecordTarget target) => target.FileName is { Length: > 0 and <= 1024 } name ? name : throw new ArgumentException("Missing plus record file name.");
    internal static PlusRecordCatalog Read(byte[] input, PlusRecordTarget target) {
        if (target is null) throw new ArgumentException("Missing plus record target.");
        PKM entity;
        if (target.Kind == "file") entity = StandalonePokemon.Open(input, FileName(target), target.InputEncrypted, target.UseFileFormat).Entity;
        else if (target.Kind == "save") entity = PokemonEditing.Read(SaveUtil.GetSaveFile(input.ToArray()) ?? throw new ArgumentException("Unrecognized plus record save."), target.Box, target.Slot);
        else throw new ArgumentException("Unknown plus record target.");
        return PokemonPlusRecord.Read(entity, Br4Editing.Hash(input));
    }
    internal static PlusRecordTicket Prepare(byte[] input, PlusRecordRequest request) {
        Reset(); Validate(input, request);
        if (request.Target.Kind == "file") {
            var file = StandalonePokemon.Open(input, FileName(request.Target), request.Target.InputEncrypted, request.Target.UseFileFormat);
            var prepared = PokemonPlusRecord.Prepare(file.Entity, request.Edit);
            return Freeze(input, request, file.Entity, prepared, StandalonePokemon.Serialize(prepared, file.Party, false));
        }
        if (request.Target.Kind != "save") throw new ArgumentException("Unknown plus record target.");
        return Prepare(SaveUtil.GetSaveFile(input.ToArray()) ?? throw new ArgumentException("Unrecognized plus record save."), input, request);
    }
    internal static PlusRecordTicket Prepare(SaveFile source, byte[] input, PlusRecordRequest request) {
        Reset(); Validate(input, request);
        if (request.Target.Kind != "save" || source is not SAV9ZA || !source.State.Exportable || !SaveChecksums.Valid(source)) throw new ArgumentException("Plus records require a supported exportable save with valid checksums.");
        var target = request.Target; var original = PokemonEditing.Read(source, target.Box, target.Slot);
        if (target.Box >= 0 && source.IsBoxSlotLocked(target.Box, target.Slot)) throw new ArgumentException("Plus record storage slot is locked.");
        var prepared = PokemonPlusRecord.Prepare(original, request.Edit); var copy = source.Clone();
        if (target.Box == -1) copy.SetPartySlotAtIndex(prepared, target.Slot, EntityImportSettings.None);
        else copy.SetBoxSlotAtIndex(prepared, target.Box, target.Slot, EntityImportSettings.None);
        var expected = StorageEditing.StoredData(copy, new(target.Box, target.Slot));
        byte[] bytes = copy.Write().ToArray(); var reopened = Reopen(source, bytes);
        if (bytes.Length != input.Length || !SaveChecksums.Valid(reopened) || reopened.PartyCount != copy.PartyCount || !StorageEditing.StoredData(reopened, new(target.Box, target.Slot)).SequenceEqual(expected)) throw new InvalidOperationException("Plus record save export verification failed.");
        return Freeze(input, request, original, prepared, bytes);
    }
    private static SaveFile Reopen(SaveFile source, byte[] bytes) => source switch {
        SAV9ZA => new SAV9ZA(bytes.ToArray()),
        _ => throw new ArgumentException("Unsupported plus record save."),
    };
    private static void Validate(byte[] input, PlusRecordRequest request) {
        if (request is null || request.Target is null || request.Edit is null || request.SourceHash != Br4Editing.Hash(input)) throw new ArgumentException("Plus record request is missing or stale.");
    }
    private static PlusRecordTicket Freeze(byte[] input, PlusRecordRequest request, PKM before, PKM after, byte[] bytes) {
        string hash = Br4Editing.Hash(input); if (request.SourceHash != hash) throw new ArgumentException("Plus record preview is stale.");
        string targetHash = Br4Editing.Hash(bytes); var original = PokemonPlusRecord.Read(before, hash); var result = PokemonPlusRecord.Read(after, targetHash);
        int[] rows = original.Rows.Where((row, i) => row.Flag != result.Rows[i].Flag).Select(row => row.Index).ToArray();
        byte[] beforeRaw = Convert.FromHexString(original.Raw); byte[] afterRaw = Convert.FromHexString(result.Raw);
        int[] flags = Enumerable.Range(0, beforeRaw.Length * 8).Where(i => ((beforeRaw[i >> 3] ^ afterRaw[i >> 3]) & (1 << (i & 7))) != 0).ToArray();
        int changed = Math.Abs(input.Length - bytes.Length); for (int i = 0; i < Math.Min(input.Length, bytes.Length); i++) if (input[i] != bytes[i]) changed++;
        string token = "plus-record:" + (++revision).ToString(CultureInfo.InvariantCulture); current = new(token, hash, targetHash, request.Target); output = bytes;
        return new(token, hash, targetHash, request.Target, original, result, rows, flags, changed);
    }
    internal static byte[] Commit(byte[] input, PlusRecordConfirmation confirmation) {
        if (current is null || output is null || confirmation != current) throw new ArgumentException("Plus record preview is missing or replaced.");
        if (Br4Editing.Hash(input) != current.SourceHash) throw new ArgumentException("Plus record preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Plus record frozen output verification failed.");
        byte[] result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

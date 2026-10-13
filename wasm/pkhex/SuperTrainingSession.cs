// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record SuperTrainingTarget([property: JsonRequired] string Kind, int Box = 0, int Slot = 0, string? FileName = null, bool InputEncrypted = false, bool UseFileFormat = false);
public sealed record SuperTrainingRequest([property: JsonRequired] string SourceHash, [property: JsonRequired] SuperTrainingTarget Target, [property: JsonRequired] SuperTrainingEdit Edit);
public sealed record SuperTrainingConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash, [property: JsonRequired] SuperTrainingTarget Target);
public sealed record SuperTrainingTicket(string Token, string SourceHash, string TargetHash, SuperTrainingTarget Target, SuperTrainingCatalog Before, SuperTrainingCatalog Result, int[] ChangedRows, string[] ChangedFields, int[] ChangedFlags, int ChangedBytes);

internal static class SuperTrainingSession
{
    private static byte[]? output;
    private static SuperTrainingConfirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    private static string FileName(SuperTrainingTarget target) => target.FileName is { Length: > 0 and <= 1024 } name ? name : throw new ArgumentException("Missing super training file name.");
    internal static SuperTrainingCatalog Read(byte[] input, SuperTrainingTarget target) {
        if (target is null) throw new ArgumentException("Missing super training target.");
        PKM entity;
        if (target.Kind == "file") entity = StandalonePokemon.Open(input, FileName(target), target.InputEncrypted, target.UseFileFormat).Entity;
        else if (target.Kind == "save") entity = PokemonEditing.Read(SaveUtil.GetSaveFile(input.ToArray()) ?? throw new ArgumentException("Unrecognized super training save."), target.Box, target.Slot);
        else throw new ArgumentException("Unknown super training target.");
        return PokemonSuperTraining.Read(entity, Br4Editing.Hash(input));
    }
    internal static SuperTrainingTicket Prepare(byte[] input, SuperTrainingRequest request) {
        Reset(); Validate(input, request);
        if (request.Target.Kind == "file") {
            var file = StandalonePokemon.Open(input, FileName(request.Target), request.Target.InputEncrypted, request.Target.UseFileFormat);
            var prepared = PokemonSuperTraining.Prepare(file.Entity, request.Edit);
            return Freeze(input, request, file.Entity, prepared, StandalonePokemon.Serialize(prepared, file.Party, false));
        }
        if (request.Target.Kind != "save") throw new ArgumentException("Unknown super training target.");
        return Prepare(SaveUtil.GetSaveFile(input.ToArray()) ?? throw new ArgumentException("Unrecognized super training save."), input, request);
    }
    internal static SuperTrainingTicket Prepare(SaveFile source, byte[] input, SuperTrainingRequest request) {
        Reset(); Validate(input, request);
        if (request.Target.Kind != "save" || source is not (SAV6XY or SAV6AO or SAV6AODemo or SAV7SM or SAV7USUM) || !source.State.Exportable || !SaveChecksums.Valid(source)) throw new ArgumentException("Super training require a supported exportable save with valid checksums.");
        var target = request.Target; var original = PokemonEditing.Read(source, target.Box, target.Slot);
        if (target.Box >= 0 && source.IsBoxSlotLocked(target.Box, target.Slot)) throw new ArgumentException("Super training storage slot is locked.");
        var prepared = PokemonSuperTraining.Prepare(original, request.Edit); var copy = source.Clone();
        if (target.Box == -1) copy.SetPartySlotAtIndex(prepared, target.Slot, EntityImportSettings.None);
        else copy.SetBoxSlotAtIndex(prepared, target.Box, target.Slot, EntityImportSettings.None);
        var expected = StorageEditing.StoredData(copy, new(target.Box, target.Slot));
        byte[] bytes = copy.Write().ToArray(); var reopened = Reopen(source, bytes);
        if (bytes.Length != input.Length || !SaveChecksums.Valid(reopened) || reopened.PartyCount != copy.PartyCount || !StorageEditing.StoredData(reopened, new(target.Box, target.Slot)).SequenceEqual(expected)) throw new InvalidOperationException("Super training save export verification failed.");
        return Freeze(input, request, original, prepared, bytes);
    }
    private static SaveFile Reopen(SaveFile source, byte[] bytes) => source switch {
        SAV6XY => new SAV6XY(bytes.ToArray()), SAV6AO => new SAV6AO(bytes.ToArray()), SAV6AODemo => new SAV6AODemo(bytes.ToArray()), SAV7SM => new SAV7SM(bytes.ToArray()), SAV7USUM => new SAV7USUM(bytes.ToArray()),
        _ => throw new ArgumentException("Unsupported super training save."),
    };
    private static void Validate(byte[] input, SuperTrainingRequest request) {
        if (request is null || request.Target is null || request.Edit is null || request.SourceHash != Br4Editing.Hash(input)) throw new ArgumentException("Super training request is missing or stale.");
    }
    private static SuperTrainingTicket Freeze(byte[] input, SuperTrainingRequest request, PKM before, PKM after, byte[] bytes) {
        string hash = Br4Editing.Hash(input); if (request.SourceHash != hash) throw new ArgumentException("Super training preview is stale.");
        string targetHash = Br4Editing.Hash(bytes); var original = PokemonSuperTraining.Read(before, hash); var result = PokemonSuperTraining.Read(after, targetHash);
        int[] rows = original.Rows.Where((row, i) => row.StoredFlag != result.Rows[i].StoredFlag).Select((row) => Array.IndexOf(original.Rows, row)).ToArray();
        byte[] beforeRaw = Convert.FromHexString(original.Raw); byte[] afterRaw = Convert.FromHexString(result.Raw);
        int[] flags = Enumerable.Range(0, beforeRaw.Length * 8).Where(i => ((beforeRaw[i >> 3] ^ afterRaw[i >> 3]) & (1 << (i & 7))) != 0).ToArray();
        int changed = Math.Abs(input.Length - bytes.Length); for (int i = 0; i < Math.Min(input.Length, bytes.Length); i++) if (input[i] != bytes[i]) changed++;
        string token = "super-training:" + (++revision).ToString(CultureInfo.InvariantCulture); current = new(token, hash, targetHash, request.Target); output = bytes;
        var fields = new List<string>(); if(original.Stored.Unlocked!=result.Stored.Unlocked)fields.Add("unlocked");if(original.Stored.Complete!=result.Stored.Complete)fields.Add("complete");if(original.Stored.Bag!=result.Stored.Bag)fields.Add("bag");if(original.Stored.Hits!=result.Stored.Hits)fields.Add("hits");
        return new(token, hash, targetHash, request.Target, original, result, rows, fields.ToArray(), flags, changed);
    }
    internal static byte[] Commit(byte[] input, SuperTrainingConfirmation confirmation) {
        if (current is null || output is null || confirmation != current) throw new ArgumentException("Super training preview is missing or replaced.");
        if (Br4Editing.Hash(input) != current.SourceHash) throw new ArgumentException("Super training preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Super training frozen output verification failed.");
        byte[] result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

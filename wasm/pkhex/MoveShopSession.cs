// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record MoveShopTarget([property: JsonRequired] string Kind, int Box = 0, int Slot = 0, string? FileName = null, bool InputEncrypted = false, bool UseFileFormat = false);
public sealed record MoveShopRequest([property: JsonRequired] string SourceHash, [property: JsonRequired] MoveShopTarget Target, [property: JsonRequired] MoveShopEdit Edit);
public sealed record MoveShopConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash, [property: JsonRequired] MoveShopTarget Target);
public sealed record MoveShopTicket(string Token, string SourceHash, string TargetHash, MoveShopTarget Target, MoveShopCatalog Before, MoveShopCatalog Result, int[] ChangedRows, int ChangedBytes);

internal static class MoveShopSession
{
    private static byte[]? output;
    private static MoveShopConfirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    private static string FileName(MoveShopTarget target) => target.FileName is { Length: > 0 and <= 1024 } name ? name : throw new ArgumentException("Missing Move Shop entity file name.");
    internal static PKM Entity(byte[] data, MoveShopTarget target)
    {
        if (target.Kind == "file") return StandalonePokemon.Open(data, FileName(target), target.InputEncrypted, target.UseFileFormat).Entity;
        if (target.Kind != "save") throw new ArgumentException("Unknown Move Shop target.");
        var source = SaveDetectionContext.OpenCurrent(data) ?? throw new ArgumentException("Move Shop save is unrecognized.");
        return PokemonEditing.Read(source, target.Box, target.Slot);
    }
    internal static MoveShopCatalog Read(byte[] data, MoveShopTarget target)
    {
        var entity = Entity(data, target);
        if (entity.Species == 0 || entity.Species > entity.MaxSpeciesID || !entity.Valid || !entity.ChecksumValid) throw new ArgumentException("Move Shop requires valid Pokemon data.");
        return PokemonMoveShop.Read(entity, Br4Editing.Hash(data));
    }
    internal static MoveShopTicket Prepare(byte[] input, MoveShopRequest request)
    {
        Reset();
        Validate(input, request);
        if (request.Target.Kind == "file") {
            var file = StandalonePokemon.Open(input, FileName(request.Target), request.Target.InputEncrypted, request.Target.UseFileFormat);
            var prepared = PokemonMoveShop.Prepare(file.Entity, request.Edit);
            return Freeze(input, request, file.Entity, prepared, StandalonePokemon.Serialize(prepared, file.Party, false));
        }
        if (request.Target.Kind != "save") throw new ArgumentException("Unknown Move Shop target.");
        return Prepare(SaveDetectionContext.OpenCurrent(input) ?? throw new ArgumentException("Move Shop save is unrecognized."), input, request);
    }
    internal static MoveShopTicket Prepare(SaveFile source, byte[] input, MoveShopRequest request)
    {
        Reset();
        Validate(input, request);
        if (request.Target.Kind != "save" || source is not SAV8LA || !source.State.Exportable || !SaveChecksums.Valid(source)) throw new ArgumentException("Move Shop editing requires an exportable Legends save with valid checksums.");
        var target = request.Target;
        var original = PokemonEditing.Read(source, target.Box, target.Slot);
        if (target.Box >= 0 && source.IsBoxSlotLocked(target.Box, target.Slot)) throw new ArgumentException("Move Shop storage slot is locked.");
        var prepared = PokemonMoveShop.Prepare(original, request.Edit);
        var copy = source.Clone();
        if (target.Box == -1) copy.SetPartySlotAtIndex(prepared, target.Slot, EntityImportSettings.None);
        else copy.SetBoxSlotAtIndex(prepared, target.Box, target.Slot, EntityImportSettings.None);
        var expected = StorageEditing.StoredData(copy, new(target.Box, target.Slot));
        byte[] bytes = copy.Write().ToArray(); var reopened = new SAV8LA(bytes.ToArray());
        if (bytes.Length != input.Length || !SaveChecksums.Valid(reopened) || reopened.PartyCount != copy.PartyCount || !StorageEditing.StoredData(reopened, new(target.Box, target.Slot)).SequenceEqual(expected)) throw new InvalidOperationException("Move Shop save export verification failed.");
        return Freeze(input, request, original, prepared, bytes);
    }
    private static void Validate(byte[] input, MoveShopRequest request)
    {
        if (request is null || request.Target is null || request.Edit is null || request.SourceHash != Br4Editing.Hash(input)) throw new ArgumentException("Move Shop request is missing or stale.");
    }
    private static MoveShopTicket Freeze(byte[] input, MoveShopRequest request, PKM before, PKM after, byte[] bytes)
    {
        string hash = Br4Editing.Hash(input); if (request.SourceHash != hash) throw new ArgumentException("Move Shop preview is stale.");
        string targetHash = Br4Editing.Hash(bytes); var original = PokemonMoveShop.Read(before, hash); var result = PokemonMoveShop.Read(after, targetHash);
        int[] rows = original.Rows.Where((row, i) => row.Purchased != result.Rows[i].Purchased || row.Mastered != result.Rows[i].Mastered).Select(row => row.Index).ToArray();
        int changed = Math.Abs(input.Length - bytes.Length); for (int i = 0; i < Math.Min(input.Length, bytes.Length); i++) if (input[i] != bytes[i]) changed++;
        string token = "move-shop:" + (++revision).ToString(CultureInfo.InvariantCulture);
        current = new(token, hash, targetHash, request.Target); output = bytes;
        return new(token, hash, targetHash, request.Target, original, result, rows, changed);
    }
    internal static byte[] Commit(byte[] input, MoveShopConfirmation confirmation)
    {
        if (current is null || output is null || confirmation != current) throw new ArgumentException("Move Shop preview is missing or replaced.");
        if (Br4Editing.Hash(input) != current.SourceHash) throw new ArgumentException("Move Shop preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Move Shop frozen output verification failed.");
        byte[] result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

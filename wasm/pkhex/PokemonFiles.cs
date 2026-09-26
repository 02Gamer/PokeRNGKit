// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonImport(int Box, int Slot, string FileName, string Data);
public sealed record PokemonFile(string FileName, string Data);

internal static class PokemonFiles
{
    public const int MaximumSize = 1024 * 1024;

    public static PokemonFile Export(SaveFile save, PokemonPosition position)
    {
        var pokemon = PokemonEditing.Read(save, position.Box, position.Slot);
        if (pokemon.Species == 0) throw new ArgumentException("Entity file slot is empty.");
        pokemon.ForcePartyData();
        var bytes = new byte[pokemon.SIZE_PARTY];
        // Same decrypted party representation as desktop PKM export.
        pokemon.WriteDecryptedDataParty(bytes);
        return new($"{pokemon.Species:D4}-{pokemon.PID:X8}.{pokemon.Extension}", Convert.ToBase64String(bytes));
    }

    public static PokemonPosition Import(SaveFile save, PokemonImport request)
    {
        if (request.Data is null || request.Data.Length > ((MaximumSize + 2) / 3) * 4)
            throw new ArgumentException("Entity file is too large.");
        byte[] bytes;
        try { bytes = Convert.FromBase64String(request.Data); }
        catch (FormatException) { throw new ArgumentException("Entity file data is invalid."); }
        if (bytes.Length == 0 || bytes.Length > MaximumSize)
            throw new ArgumentException("Entity file size is invalid.");
        var extension = Path.GetExtension(request.FileName ?? string.Empty).ToLowerInvariant();
        // Desktop's memory-based loader also handles ambiguous generations and gift-size collisions.
        if (!FileUtil.TryGetPKM(bytes, out var pokemon, extension, save) || pokemon.Species == 0 || !pokemon.ChecksumValid)
            throw new ArgumentException("Entity file is unrecognized or has invalid checksums.");
        pokemon = EntityConverter.ConvertToType(pokemon, save.PKMType, out var conversion)
            ?? throw new ArgumentException($"Entity file conversion is unsupported: {conversion}.");
        var position = StorageEditing.Target(save, new(request.Box, request.Slot));
        StorageEditing.Writable(save, position);
        if (position.Box == -1)
        {
            if (pokemon.IsEgg && save.IsPartyAllEggs(position.Slot))
                throw new ArgumentException("Storage party must contain a non-egg Pokemon when adding an egg.");
            save.SetPartySlotAtIndex(pokemon, position.Slot, EntityImportSettings.None);
        }
        else save.SetBoxSlotAtIndex(pokemon, position.Box, position.Slot, EntityImportSettings.None);
        return position;
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record BagEdit(int Pouch, int Slot, int Id, int Count, bool? Favorite = null,
    bool? IsNew = null, bool? FreeSpace = null, uint? FreeSpaceIndex = null, bool? NewShop = null, bool? Held = null);

internal static class InventoryEditing
{
    internal static Span<byte> Buffer(SaveFile save) => save switch
    {
        SAV3RS s => s.LargeBlock.Inventory, SAV3E s => s.LargeBlock.Inventory, SAV3FRLG s => s.LargeBlock.Inventory,
        SAV3Colosseum s => s.Data, SAV3XD s => s.Data, SAV4 s => s.General,
        SAV5BW s => s.Items.Data, SAV5B2W2 s => s.Items.Data,
        SAV6XY s => s.Items.Data, SAV6AO s => s.Items.Data,
        SAV7SM s => s.Items.Data, SAV7USUM s => s.Items.Data,
        SAV8SWSH s => s.Items.Data, SAV8BS s => s.Items.Data,
        _ => throw new ArgumentException("Inventory editing is not supported for this save."),
    };

    public static string Apply(SaveFile save, BagEdit edit)
    {
        var bag = save.Inventory;
        if ((uint)edit.Pouch >= bag.Pouches.Count) throw new ArgumentException("Inventory pouch is out of range.");
        var pouch = bag.Pouches[edit.Pouch];
        if ((uint)edit.Slot >= pouch.Items.Length) throw new ArgumentException("Inventory slot is out of range.");
        var item = pouch.Items[edit.Slot];
        var removeSlot = item.Index != 0 && edit.Id == 0 && item is not IItemNewFlag;
        if (edit.Id < 0 || edit.Id > ushort.MaxValue || (edit.Id != 0 && !pouch.CanContain((ushort)edit.Id)))
            throw new ArgumentException("Item is not available in this pouch.");
        if (edit.Count < 0 || edit.Count > bag.GetMaxCount(pouch.Type,edit.Id) || (edit.Id == 0 && edit.Count != 0) ||
            (edit.Id != 0 && edit.Count == 0 && item is not IItemNewFlag))
            throw new ArgumentException("Inventory quantity is out of range.");
        // Indexed BDSP records cannot represent two independently editable copies of one ID.
        if (save is SAV8BS && edit.Id != 0 && pouch.Items.Where((_,i) => i != edit.Slot).Any(i => i.Index == edit.Id))
            throw new ArgumentException("This item already exists in the pouch.");
        if ((edit.Favorite.HasValue && item is not IItemFavorite) || (edit.IsNew.HasValue && item is not IItemNewFlag) ||
            (edit.FreeSpace.HasValue && item is not IItemFreeSpace) || (edit.FreeSpaceIndex.HasValue && item is not IItemFreeSpaceIndex) ||
            (edit.NewShop.HasValue && item is not IItemNewShopFlag) || (edit.Held.HasValue && item is not IItemHeldFlag))
            throw new ArgumentException("Inventory flag is unsupported.");
        if (edit.FreeSpaceIndex > 1023) throw new ArgumentException("Free space order must be between 0 and 1023.");

        var buffer = Buffer(save);
        var original = buffer.ToArray();
        bag.CopyTo(save);
        var baseline = buffer.ToArray();
        original.CopyTo(buffer);
        item.Index = edit.Id; item.Count = edit.Count;
        if (item is IItemFavorite favorite && edit.Favorite is bool f) favorite.IsFavorite = f;
        if (item is IItemNewFlag fresh && edit.IsNew is bool n) fresh.IsNew = n;
        if (item is IItemFreeSpace free && edit.FreeSpace is bool fs) free.IsFreeSpace = fs;
        if (item is IItemFreeSpaceIndex order && edit.FreeSpaceIndex is uint fi) order.FreeSpaceIndex = fi;
        if (item is IItemNewShopFlag shop && edit.NewShop is bool ns) shop.IsNewShop = ns;
        if (item is IItemHeldFlag held && edit.Held is bool h) held.IsHeld = h;
        if (removeSlot)
        {
            for (int i = edit.Slot; i < pouch.Items.Length - 1; i++) pouch.Items[i] = pouch.Items[i + 1];
            pouch.Items[^1] = pouch.GetEmpty();
        }
        bag.CopyTo(save);
        var expected = Snapshot(save);
        // Apply only bits changed by the requested edit, excluding Core's unchanged normalization.
        for (int i = 0; i < buffer.Length; i++)
        {
            var mask = baseline[i] ^ buffer[i];
            buffer[i] = (byte)((original[i] & ~mask) | (buffer[i] & mask));
        }
        if (Snapshot(save) != expected)
            throw new InvalidOperationException("Inventory edit cannot preserve the other stored values.");
        return expected;
    }

    internal static string Snapshot(SaveFile save) => JsonSerializer.Serialize(InventoryReader.Read(save), SaveJsonContext.Default.BagReport);
}

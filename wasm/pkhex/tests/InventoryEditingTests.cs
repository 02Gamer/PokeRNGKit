// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class InventoryEditingTests
{
    private static void Require(bool value,string message) { if (!value) throw new Exception(message); }
    private static byte[] Apply(byte[] data,BagEdit edit) => SaveService.EditInventory(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.BagEdit));
    public static void Run()
    {
        foreach(var version in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD"})
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var bag = save.Inventory; var pouch = bag.Pouches[0]; var ids = pouch.GetAllItems().ToArray();
            pouch.Items[0].Index = ids[0]; pouch.Items[0].Count = 1;
            bag.CopyTo(save);
            var data = save.Write().ToArray(); var original = data.ToArray();
            foreach(var edit in new[]{new BagEdit(0,0,ids[0],bag.GetMaxCount(pouch.Type,ids[0])),new BagEdit(0,0,ids[1],1),new BagEdit(0,0,0,0)})
            {
                var expectedSave = SaveUtil.GetSaveFile(data.ToArray())!;
                var expectedBag = expectedSave.Inventory; var target = expectedBag.Pouches[0].Items[0];
                target.Index = edit.Id; target.Count = edit.Count;
                if(edit.Id == 0 && target is not IItemNewFlag)
                {
                    var expectedSlots = expectedBag.Pouches[0].Items;
                    Array.Copy(expectedSlots,1,expectedSlots,0,expectedSlots.Length-1);
                    expectedSlots[^1] = expectedBag.Pouches[0].GetEmpty();
                }
                expectedBag.CopyTo(expectedSave);
                var expected = expectedSave.Write().ToArray();
                var output = Apply(data,edit); var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Require(output.SequenceEqual(expected), $"{version}/{edit.Id}/{edit.Count}: full output matches requested Core edit");
                Require(after.ChecksumsValid && data.SequenceEqual(original), "Checksums and original input");
            }
            var source = SaveUtil.GetSaveFile(data.ToArray())!.Inventory.Pouches[0].Items[0];
            if(source is not IItemNewFlag)
            {
                var multiple = SaveUtil.GetSaveFile(data.ToArray())!;
                var multiBag = multiple.Inventory; var slots = multiBag.Pouches[0].Items;
                multiBag.Pouches[0].RemoveAll();
                slots[0].Index = ids[0]; slots[0].Count = 1;
                slots[1].Index = ids[1]; slots[1].Count = 1;
                slots[2].Index = ids[2]; slots[2].Count = 1;
                multiBag.CopyTo(multiple); var multiData = multiple.Write().ToArray();
                slots[1] = slots[2]; slots[2] = multiBag.Pouches[0].GetEmpty();
                multiBag.CopyTo(multiple); var expectedRemoval = multiple.Write().ToArray();
                var removed = Apply(multiData,new(0,1,0,0));
                Require(removed.SequenceEqual(expectedRemoval),"Clearing middle slot compacts later items in order");
            }
            if(source is IItemNewFlag)
            {
                var flagData = data.ToArray();
                foreach(var enabled in new[]{true,false})
                {
                    var edit = new BagEdit(0,0,ids[0],1,Favorite: source is IItemFavorite ? enabled : null,
                        IsNew: enabled,FreeSpaceIndex: source is IItemFreeSpaceIndex ? enabled ? 1023u : 0u : null);
                    var flagExpected = SaveUtil.GetSaveFile(flagData.ToArray())!;
                    var flagBag = flagExpected.Inventory; var flagItem = flagBag.Pouches[0].Items[0];
                    ((IItemNewFlag)flagItem).IsNew = enabled;
                    if(flagItem is IItemFavorite favorite) favorite.IsFavorite = enabled;
                    if(flagItem is IItemFreeSpaceIndex order) order.FreeSpaceIndex = enabled ? 1023u : 0u;
                    flagBag.CopyTo(flagExpected);
                    flagData = Apply(flagData,edit);
                    Require(flagData.SequenceEqual(flagExpected.Write().ToArray()),"Flags preserve full output while setting and clearing");
                    var after = SaveUtil.GetSaveFile(flagData.ToArray())!.Inventory.Pouches[0].Items[0];
                    Require(((IItemNewFlag)after).IsNew == enabled,"New flag");
                    if(after is IItemFavorite f) Require(f.IsFavorite == enabled,"Favorite flag");
                    if(after is IItemFreeSpaceIndex fi) Require(fi.FreeSpaceIndex == (enabled ? 1023u : 0u),"Free space order");
                }
            }
            foreach(var edit in new[]{new BagEdit(-1,0,ids[0],1),new BagEdit(0,-1,ids[0],1),new BagEdit(0,0,65535,1),new BagEdit(0,0,ids[0],-1),new BagEdit(0,0,ids[0],int.MaxValue),new BagEdit(0,0,0,1),new BagEdit(0,0,ids[0],1,NewShop:true),new BagEdit(0,0,ids[0],1,FreeSpaceIndex:1024)})
            {
                try { Apply(data,edit); throw new Exception("Invalid bag edit was accepted"); }
                catch(ArgumentException) { Require(data.SequenceEqual(original),"Rejected edit preserves original"); }
            }
            if(save is SAV7SM or SAV7USUM)
            {
                var reservedSave = SaveUtil.GetSaveFile(data.ToArray())!;
                InventoryEditing.Buffer(reservedSave)[3] |= 0x80;
                InventoryEditing.Buffer(reservedSave)[7] |= 0x80;
                var reservedBytes = reservedSave.Write().ToArray();
                var after = SaveUtil.GetSaveFile(Apply(reservedBytes,new(0,0,ids[0],2)))!;
                Require((InventoryEditing.Buffer(after)[3] & 0x80) != 0 && (InventoryEditing.Buffer(after)[7] & 0x80) != 0,"Edited and untouched reserved bits preserved");
            }
            Console.WriteLine($"PASS {version}: inventory ID/count/clear, supported flags, bounds, full output, original and reserved bits");
        }
    }
}

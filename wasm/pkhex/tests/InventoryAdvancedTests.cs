// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class InventoryAdvancedTests
{
    private static void Require(bool value,string message) { if (!value) throw new Exception(message); }
    private static byte[] Apply(byte[] data,BagEdit edit) => SaveService.EditInventory(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.BagEdit));
    private static void Reject(byte[] data,BagEdit edit)
    {
        var original = data.ToArray();
        try { Apply(data,edit); throw new Exception("Unrepresentable/invalid advanced edit was accepted"); }
        catch (ArgumentException) { Require(data.SequenceEqual(original),"Rejected advanced edit preserves source"); }
    }
    public static void Run()
    {
        foreach(var version in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD"})
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var bag = save.Inventory; var pouch = bag.Pouches[0];
            int id = pouch.GetAllItems()[0];
            pouch.RemoveAll(); pouch.Items[0].Index = id; pouch.Items[0].Count = 1;
            bag.CopyTo(save); var data = save.Write().ToArray(); var original = data.ToArray();
            var report = JsonSerializer.Deserialize(SaveService.ReadInventory(data),SaveJsonContext.Default.BagReport)!;
            var names = GameInfo.GetStrings("en").GetItemStrings(save.Context,save.Version);
            Require(report.AdvancedChoices.Length == names.Length,"Complete version-specific advanced catalog");
            Require(report.AdvancedChoices.All(c => c.MaxCount == bag.MaxQuantityHaX),"Core HaX quantity maximum");
            Require(report.AdvancedChoices.Select(c => c.Id).SequenceEqual(Enumerable.Range(0,names.Length)),"Advanced IDs preserve source order and unused entries");
            int wide = save.Generation == 7 ? 1023 : bag.MaxQuantityHaX;
            foreach(int count in new[]{0,wide})
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!; var expectedBag = expected.Inventory;
                expectedBag.Pouches[0].Items[0].Count = count; expectedBag.CopyTo(expected);
                var output = Apply(data,new(0,0,id,count,Advanced:true));
                Require(output.SequenceEqual(expected.Write().ToArray()),$"{version}: advanced count {count} full output matches Core");
                var reopened = SaveUtil.GetSaveFile(output.ToArray())!;
                Require(reopened.ChecksumsValid && reopened.Inventory.Pouches[0].Items[0].Count == count,"Requested count retained exactly");
                Require(data.SequenceEqual(original),"Advanced edits preserve source");
            }
            int other = Enumerable.Range(1,Math.Min(names.Length,1024)-1).First(i => !pouch.CanContain((ushort)i));
            if(save is SAV8BS) Reject(data,new(0,0,other,1,Advanced:true));
            else
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!; var expectedBag = expected.Inventory;
                expectedBag.Pouches[0].Items[0].Index = other; expectedBag.CopyTo(expected);
                Require(Apply(data,new(0,0,other,1,Advanced:true)).SequenceEqual(expected.Write().ToArray()),"Advanced wrong-pouch item retained without unrelated changes");
            }
            Reject(data,new(0,0,other,1));
            Reject(data,new(0,0,id,wide));
            Reject(data,new(0,0,names.Length,1,Advanced:true));
            Reject(data,new(0,0,id,bag.MaxQuantityHaX+1,Advanced:true));
            Reject(data,new(0,0,id,-1,Advanced:true));
            if(save.Generation == 7) Reject(data,new(0,0,id,65535,Advanced:true));
            if(pouch.Items[0] is not IItemNewFlag)
                Require(Apply(data,new(0,0,0,15,Advanced:true)).SequenceEqual(Apply(data,new(0,0,0,0))),"Non-remembered empty IDs follow desktop removal semantics");
            else if(save is not SAV8BS)
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!; var expectedBag = expected.Inventory;
                expectedBag.Pouches[0].Items[0].Index = 0; expectedBag.Pouches[0].Items[0].Count = 15;
                expectedBag.CopyTo(expected);
                Require(Apply(data,new(0,0,0,15,Advanced:true)).SequenceEqual(expected.Write().ToArray()),"Remembered empty slot retains advanced count");
            }
            else
            {
                Reject(data,new(0,0,0,15,Advanced:true));
                var multiple = SaveUtil.GetSaveFile(data.ToArray())!; var multiBag = multiple.Inventory;
                multiBag.Pouches[0].Items[1].Index = pouch.GetAllItems()[1];
                multiBag.Pouches[0].Items[1].Count = 1;
                multiBag.CopyTo(multiple); var multiData = multiple.Write().ToArray();
                Require(Apply(multiData,new(0,0,0,0,Advanced:true)).SequenceEqual(Apply(multiData,new(0,0,0,0))),"BDSP advanced clear accepts Core's remaining-item reorder");
            }
            Console.WriteLine($"PASS {version}: HaX catalog, zero/over-normal quantities, wrong-pouch behavior, representability and complete output");
        }

        var pcSave = SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!;
        var pcBag = pcSave.Inventory;
        int pcIndex = Enumerable.Range(0,pcBag.Pouches.Count).First(i => pcBag.Pouches[i].Type == InventoryType.PCItems);
        var pc = pcBag.Pouches[pcIndex]; pc.RemoveAll(); pc.Items[0].Index = pc.GetAllItems()[0]; pc.Items[0].Count = 1;
        pcBag.CopyTo(pcSave); var pcData = pcSave.Write().ToArray();
        foreach(var action in new[]{"setCount","giveAll"})
        {
            var expected = SaveUtil.GetSaveFile(pcData.ToArray())!; var expectedBag = expected.Inventory; var target = expectedBag.Pouches[pcIndex];
            if(action == "setCount") target.ModifyAllCount(expectedBag,2);
            else target.GiveAllItems(expectedBag,target.GetAllItems().ToArray(),2);
            expectedBag.CopyTo(expected);
            var request = new BagOperation(pcIndex,action,2,Advanced:true);
            var actual = SaveService.EditInventoryBatch(pcData,JsonSerializer.Serialize(request,SaveJsonContext.Default.BagOperation));
            Require(actual.SequenceEqual(expected.Write().ToArray()),"Advanced PC bulk action keeps normal Core item/count rules");
        }
        Console.WriteLine("PASS advanced PC bulk quantity and give-all access");
    }
}

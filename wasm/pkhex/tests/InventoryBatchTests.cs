// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class InventoryBatchTests
{
    private static void Require(bool value,string message) { if(!value) throw new Exception(message); }
    private static byte[] Apply(byte[] data,BagOperation edit) => SaveService.EditInventoryBatch(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.BagOperation));
    public static void Run()
    {
        foreach(var version in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD"})
        {
            var save=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var bag=save.Inventory; var pouch=bag.Pouches[0]; var ids=pouch.GetAllItems().ToArray();
            pouch.RemoveAll();
            for(int i=0;i<3;i++)
            {
                var item=pouch.Items[i]; item.Index=ids[2-i]; item.Count=Math.Min(i+1,bag.GetMaxCount(pouch.Type,item.Index));
                if(item is IItemNewFlag n) n.IsNew=i==1;
                if(item is IItemFavorite f) f.IsFavorite=i==2;
                if(item is IItemFreeSpaceIndex fi) fi.FreeSpaceIndex=(uint)(i+10);
            }
            bag.CopyTo(save); var data=save.Write().ToArray(); var original=data.ToArray();
            foreach(var action in new[]{"sortName","sortNameReverse","sortCount","sortCountReverse","sortId","sortIdReverse","setCount","giveAll","clear"})
            foreach(var lang in action.StartsWith("sortName") ? new[]{"zh-Hans","en","ja"} : new[]{"en"})
            {
                int? count=action is "setCount" or "giveAll" ? Math.Min(7,pouch.MaxCount) : null;
                var expectedSave=SaveUtil.GetSaveFile(data.ToArray())!; var expectedBag=expectedSave.Inventory; var expectedPouch=expectedBag.Pouches[0];
                switch(action)
                {
                    case "sortName":case "sortNameReverse": expectedPouch.SortByName(GameInfo.GetStrings(lang).GetItemStrings(expectedSave.Context,expectedSave.Version),action=="sortNameReverse");break;
                    case "sortCount":case "sortCountReverse":expectedPouch.SortByCount(action=="sortCountReverse");break;
                    case "sortId":case "sortIdReverse":expectedPouch.SortByIndex(action=="sortIdReverse");break;
                    case "setCount":expectedPouch.ModifyAllCount(expectedBag,count!.Value);break;
                    case "giveAll":expectedPouch.GiveAllItems(expectedBag,expectedPouch.GetAllItems(),count!.Value);break;
                    case "clear":expectedPouch.RemoveAll();break;
                }
                expectedBag.CopyTo(expectedSave); var expected=expectedSave.Write().ToArray();
                var output=Apply(data,new(0,action,count,lang));
                Require(output.SequenceEqual(expected),$"{version}/{action}/{lang}: full Core output and unrelated data");
                Require(SaveUtil.GetSaveFile(output.ToArray())!.ChecksumsValid && data.SequenceEqual(original),"Checksums and original");
            }
            for(int p=0;p<bag.Pouches.Count;p++)
            {
                var limitedPouch=bag.Pouches[p];
                var limited=limitedPouch.GetAllItems().ToArray().FirstOrDefault(id=>bag.GetMaxCount(limitedPouch.Type,id)<limitedPouch.MaxCount);
                if(limited==0) continue;
                var limitSave=SaveUtil.GetSaveFile(data.ToArray())!; var limitBag=limitSave.Inventory;
                limitBag.Pouches[p].Items[0].Index=limited; limitBag.Pouches[p].Items[0].Count=1;
                limitBag.CopyTo(limitSave); var limitData=limitSave.Write().ToArray();
                var output=Apply(limitData,new(p,"setCount",limitedPouch.MaxCount));
                limitBag.Pouches[p].ModifyAllCount(limitBag,limitedPouch.MaxCount); limitBag.CopyTo(limitSave);
                Require(output.SequenceEqual(limitSave.Write().ToArray()),"Per-item count clamp preserves full output");
                var actual=SaveUtil.GetSaveFile(output.ToArray())!.Inventory.Pouches[p].Items[0];
                Require(actual.Count==bag.GetMaxCount(limitedPouch.Type,limited),"Special item uses individual maximum");
                Console.WriteLine($"PASS {version}: item {limited} count clamped below pouch maximum");
            }
            if(pouch.IsCramped)
            {
                var output=Apply(data,new(0,"giveAll",1,Shuffle:true));
                var after=SaveUtil.GetSaveFile(output.ToArray())!; var actual=after.Inventory.Pouches[0];
                var actualIds=actual.Items.Where(i=>i.Index!=0).Select(i=>(ushort)i.Index).ToArray();
                int legalCount=ids.Count(id=>bag.IsLegal(pouch.Type,id,1));
                Require(actualIds.Length==Math.Min(legalCount,pouch.Items.Length) && actualIds.Distinct().Count()==actualIds.Length,"Random fill capacity and unique IDs");
                Require(actualIds.All(id=>ids.Contains(id) && bag.IsLegal(pouch.Type,id,1)),"Random fill legal catalog membership");
                var expectedSave=SaveUtil.GetSaveFile(data.ToArray())!; var expectedBag=expectedSave.Inventory;
                expectedBag.Pouches[0].GiveAllItems(expectedBag,actualIds,1); expectedBag.CopyTo(expectedSave);
                Require(output.SequenceEqual(expectedSave.Write().ToArray()),"Random fill preserves all unrelated data");
            }
            foreach(var edit in new[]{new BagOperation(-1,"clear"),new BagOperation(0,"unknown"),new BagOperation(0,"giveAll"),new BagOperation(0,"setCount",0),new BagOperation(0,"giveAll",pouch.MaxCount+1),new BagOperation(0,"sortCount",1),new BagOperation(0,"sortName",Language:"fr"),new BagOperation(0,"clear",Shuffle:true)})
            {
                try{Apply(data,edit);throw new Exception("Invalid inventory batch accepted");}
                catch(ArgumentException){Require(data.SequenceEqual(original),"Invalid operation leaves original");}
            }
            if(save is SAV7SM or SAV7USUM)
            {
                var reserved=SaveUtil.GetSaveFile(data.ToArray())!; InventoryEditing.Buffer(reserved)[3]|=0x80;
                var output=Apply(reserved.Write().ToArray(),new(0,"clear")); var reopened=SaveUtil.GetSaveFile(output.ToArray())!;
                Require((InventoryEditing.Buffer(reopened)[3]&0x80)!=0,"Clear preserves reserved bits");
            }
            Console.WriteLine($"PASS {version}: six sorts/three languages, count/give/clear, random capacity, bounds and full output preservation");
        }
        var emerald=SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!;
        int pc=emerald.Inventory.Pouches.ToList().FindIndex(p=>p.Type==InventoryType.PCItems);
        foreach(var action in new[]{"giveAll","setCount"})
        {
            try{Apply(emerald.Write().ToArray(),new(pc,action,1));throw new Exception("PC bulk give/count accepted");}
            catch(ArgumentException){}
        }
        Console.WriteLine("PASS PC pouch bulk quantity restriction");
    }
}

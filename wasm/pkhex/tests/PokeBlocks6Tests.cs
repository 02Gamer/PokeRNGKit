// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Buffers.Binary;
using System.Text.Json;
internal static class PokeBlocks6Tests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static byte[] Apply(byte[] input, SaveFoodEdit edit)
    {
        var original = input.ToArray();
        try { return SaveService.EditFood(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.SaveFoodEdit)); }
        finally { Check(input.SequenceEqual(original), "Blocks/berries input preservation on success and rejection"); }
    }
    private static void Reject(byte[] input, SaveFoodEdit edit)
    {
        try { Apply(input, edit); throw new Exception("Invalid block request accepted"); } catch (ArgumentException) { }
    }
    public static void Run()
    {
        foreach (var version in new[] { GameVersion.OR, GameVersion.AS })
        {
            var save = (SAV6AO)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/OR.sav"))!;
            save.Version = version;
            save.Contest.Data.Fill(0xAD); save.BerryField.Data.Fill(0xBC);
            for (int i=0;i<12;i++) save.Contest.SetBlockCount(i,(uint)(i*73));
            for (int i=0;i<90;i++) save.BerryField.GetPlot(i).Berry = i % 3 == 0 ? (ushort)0 : i % 3 == 1 ? ushort.MaxValue : ItemStorage6XY.Berry[0];
            var input = save.Write().ToArray();
            var catalog = JsonSerializer.Deserialize(SaveService.ReadFood(input), SaveJsonContext.Default.SaveFoodCatalog)!.Blocks!;
            Check(catalog.Values.Length == 12 && catalog.Names.Length == 12 && catalog.PlotCount == 90 && catalog.OccupiedPlots == 30,"Complete block names and real plot count");
            for(int i=0;i<12;i++) Check(catalog.Names[i] == new LocalizedText(GameInfo.GetStrings("zh-Hans").pokeblocks[94+i],GameInfo.GetStrings("en").pokeblocks[94+i],GameInfo.GetStrings("ja").pokeblocks[94+i]), "Upstream three-language block order");
            foreach(int index in Enumerable.Range(0,12)) foreach(uint value in new uint[]{0,1,999})
            {
                var counts = catalog.Values.ToArray(); counts[index]=value;
                var expected=(SAV6AO)SaveUtil.GetSaveFile(input.ToArray())!; expected.Contest.SetBlockCount(index,value);
                var output=Apply(input,new("blocksEdit",BlockValues:counts));
                Check(output.SequenceEqual(expected.Write().ToArray()),"Every block and boundaries: entire Core output including untouched food and berry fields");
            }
            foreach(var action in new[]{"blocksFill","blocksClear"})
            {
                var expected=(SAV6AO)SaveUtil.GetSaveFile(input.ToArray())!;
                for(int i=0;i<12;i++) expected.Contest.SetBlockCount(i,action=="blocksFill" ? 999u : 0);
                Check(Apply(input,new(action)).SequenceEqual(expected.Write().ToArray()),"Bulk blocks match Core output");
            }
            for(int attempt=0;attempt<2;attempt++)
            {
                var output=Apply(input,new("berries")); var after=(SAV6AO)SaveUtil.GetSaveFile(output.ToArray())!;
                var expected=(SAV6AO)SaveUtil.GetSaveFile(input.ToArray())!;
                for(int i=0;i<90;i++)
                {
                    var actual=after.BerryField.GetPlot(i); Check(ItemStorage6XY.Berry.Contains(actual.Berry),"Only upstream berry pool");
                    Check(actual.GrowthStage==5 && actual.Count==4 && actual.Time==0 && actual.Water==0 && actual.IsDefault,"All 90 plots reset to Core defaults");
                    var target=expected.BerryField.GetPlot(i); target.SetAsDefault(); target.Berry=actual.Berry;
                }
                Check(output.SequenceEqual(expected.Write().ToArray()),"Random plots preserve ten unused slots, block counts and all unrelated save bytes");
                Check(SaveFood.Read(after).Blocks!.OccupiedPlots==90 && after.ChecksumsValid,"Reread complete berry count and checksums");
            }
            BinaryPrimitives.WriteUInt32LittleEndian(save.Contest.Data,uint.MaxValue); var unusual=save.Write().ToArray();
            var kept=PokeBlocks6.Read(save).Values; kept[1]=999;
            var keptOutput=Apply(unusual,new("blocksEdit",BlockValues:kept));
            var keptSave=(SAV6AO)SaveUtil.GetSaveFile(keptOutput.ToArray())!;
            Check(keptSave.Contest.GetBlockCount(0)==uint.MaxValue && keptSave.Contest.GetBlockCount(1)==999,"Existing raw UInt32 count remains unchanged");
            kept[1]=uint.MaxValue; Reject(unusual,new("blocksEdit",BlockValues:kept));
            foreach(var edit in new[]{new SaveFoodEdit("blocksEdit"),new("blocksEdit",BlockValues:[]),new("blocksEdit",BlockValues:Enumerable.Repeat(1000u,12).ToArray()),new("blocksEdit",Count:0,BlockValues:catalog.Values),new("blocksFill",BlockValues:catalog.Values),new("berries",Values:[]),new("berries",Count:0),new("berries",BlockValues:[]),new("edit",BlockValues:catalog.Values)}) Reject(input,edit);
            Console.WriteLine($"PASS {version}: 12 block counts, all positions/boundaries, bulk operations, 90 berry plots, unused slots, full Core parity, unusual values and original preservation");
        }
        foreach(var version in new[]{"X","SN","US","E","GP"})
        {
            var input=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            foreach(var action in new[]{"blocksEdit","blocksFill","blocksClear","berries"}) Reject(input,new(action));
            if(version is "X" or "SN" or "US") Check(JsonSerializer.Deserialize(SaveService.ReadFood(input),SaveJsonContext.Default.SaveFoodCatalog)!.Blocks is null,"No ORAS controls in other games");
        }
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class InventoryReaderTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var bag = save.Inventory;
            foreach (var pouch in bag.Pouches)
            {
                if (pouch.Items.Length == 0 || pouch.GetAllItems().Length == 0) continue;
                var item = pouch.Items[0];
                item.Index = pouch.GetAllItems()[0];
                item.Count = bag.GetMaxCount(pouch.Type, item.Index);
                if (item is IItemFavorite favorite) favorite.IsFavorite = true;
                if (item is IItemNewFlag fresh) fresh.IsNew = true;
                if (item is IItemFreeSpace free) free.IsFreeSpace = true;
                if (item is IItemFreeSpaceIndex order) order.FreeSpaceIndex = 17;
            }
            bag.CopyTo(save);
            var data = save.Write().ToArray(); var original = data.ToArray();
            var reopened = SaveUtil.GetSaveFile(data.ToArray())!;
            var expected = reopened.Inventory;
            var report = JsonSerializer.Deserialize(SaveService.ReadInventory(data), SaveJsonContext.Default.BagReport)!;
            Require(report.Pouches.Length == expected.Pouches.Count, $"{version}: pouch count");
            for (int p = 0; p < report.Pouches.Length; p++)
            {
                var actual = report.Pouches[p]; var source = expected.Pouches[p];
                Require(actual.Index == p && actual.Type == source.Type.ToString() && actual.MaxCount == source.MaxCount, "Pouch metadata");
                Require(actual.Items.Length == source.Items.Length, "All slots including empty retained");
                for (int slot = 0; slot < actual.Items.Length; slot++)
                {
                    var a = actual.Items[slot]; var s = source.Items[slot];
                    Require(a.Slot == slot && a.Id == s.Index && a.Count == s.Count && a.MaxCount == expected.GetMaxCount(source.Type,s.Index), "Item identity, count and limit");
                    Require(a.Favorite == (s is IItemFavorite f ? f.IsFavorite : null) && a.IsNew == (s is IItemNewFlag n ? n.IsNew : null), "Favorite/new flag capabilities");
                    Require(a.FreeSpace == (s is IItemFreeSpace fs ? fs.IsFreeSpace : null) && a.FreeSpaceIndex == (s is IItemFreeSpaceIndex fi ? fi.FreeSpaceIndex : null), "Free space capabilities");
                    Require(a.NewShop == (s is IItemNewShopFlag ns ? ns.IsNewShop : null) && a.Held == (s is IItemHeldFlag h ? h.IsHeld : null), "Shop/held capabilities");
                    foreach (var lang in new[] {"zh-Hans","en","ja"})
                    {
                        var names = GameInfo.GetStrings(lang).GetItemStrings(reopened.Context,reopened.Version);
                        var name = lang == "zh-Hans" ? a.Name.Zh : lang == "ja" ? a.Name.Ja : a.Name.En;
                        Require(name == names[s.Index], "Context-specific localized item name");
                    }
                }
            }
            Require(data.SequenceEqual(original), "Read leaves input unchanged");
            Console.WriteLine($"PASS {version}: inventory pouches, all slots, counts, localized names, capabilities and original data preservation");
        }
        // Do not silently sanitize unknown IDs or excessive counts during inspection.
        var emerald = SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!;
        var invalidBag = emerald.Inventory;
        invalidBag.Pouches[0].Items[0].Index = 65535;
        invalidBag.Pouches[0].Items[0].Count = 1000;
        invalidBag.CopyTo(emerald);
        var bytes = emerald.Write().ToArray(); var originalBytes = bytes.ToArray();
        var unknown = JsonSerializer.Deserialize(SaveService.ReadInventory(bytes), SaveJsonContext.Default.BagReport)!.Pouches[0].Items[0];
        Require(unknown.Id == 65535 && unknown.Count == 1000 && !unknown.Allowed && unknown.Name.Zh == "#65535", "Unknown item and excess quantity preserved");
        Require(bytes.SequenceEqual(originalBytes), "Unknown item read preserves input");
        Console.WriteLine("PASS inventory unknown ID and excessive count preserved without cleanup");
    }
}

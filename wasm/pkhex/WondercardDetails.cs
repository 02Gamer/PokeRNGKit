// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static class WondercardDetails
{
    internal static LocalizedText[] Read(DataMysteryGift gift)
    {
        var zh = Lines(gift, "zh-Hans"); var en = Lines(gift, "en"); var ja = Lines(gift, "ja");
        int count = Math.Max(zh.Length, Math.Max(en.Length, ja.Length));
        return Enumerable.Range(0, count).Select(i => new LocalizedText(i < zh.Length ? zh[i] : "", i < en.Length ? en[i] : "", i < ja.Length ? ja[i] : "")).ToArray();
    }
    private static string[] Lines(DataMysteryGift gift, string language)
    {
        bool zh = language == "zh-Hans", ja = language == "ja"; var strings = GameInfo.GetStrings(language);
        if (gift.IsEmpty) return [zh ? "空卡片" : ja ? "空のカード" : "Empty card"];
        var result = gift.GetDescription(strings).ToArray();
        // Keep the card's original title; only generated labels are localized.
        result[0] = (zh ? "卡片编号" : ja ? "カード番号" : "Card ID") + ": " + gift.CardID + " / " + gift.CardTitle;
        var labels = new (string Source, string Zh, string Ja)[] {
            ("Item: ", "道具：", "道具："), ("Quantity: ", "数量：", "個数："), ("Collected: ", "已领取：", "受け取り済み："),
            ("Repeatable: ", "可重复领取：", "繰り返し受取："), ("Once Per Day: ", "每天一次：", "1日1回："),
            ("Bean ID: ", "宝可豆编号：", "ポケマメ番号："), ("Goods: ", "装饰：", "グッズ："), ("Seal: ", "贴纸：", "シール："),
            ("Accessory: ", "饰品：", "アクセサリー："), ("Backdrop: ", "背景：", "背景："), ("Pokétch App: ", "宝可表应用：", "ポケッチアプリ："), ("Route Map: ", "路线：", "コース：") };
        for (int i = 1; i < result.Length; i++)
        {
            foreach (var label in labels)
                if (result[i].StartsWith(label.Source, StringComparison.Ordinal)) { result[i] = (zh ? label.Zh : ja ? label.Ja : label.Source) + result[i][label.Source.Length..]; break; }
            if (zh || ja) {
                if (result[i].Contains("(Quantity: ", StringComparison.Ordinal)) result[i] = result[i].Replace("(Quantity: ", zh ? "（数量：" : "（個数：").TrimEnd(')') + "）";
                bool booleanLine = result[i].StartsWith(zh ? "已领取：" : "受け取り済み：", StringComparison.Ordinal) || result[i].StartsWith(zh ? "可重复领取：" : "繰り返し受取：", StringComparison.Ordinal) || result[i].StartsWith(zh ? "每天一次：" : "1日1回：", StringComparison.Ordinal);
                if (booleanLine && result[i].EndsWith("True", StringComparison.Ordinal)) result[i] = result[i][..^4] + (zh ? "是" : "はい");
                else if (booleanLine && result[i].EndsWith("False", StringComparison.Ordinal)) result[i] = result[i][..^5] + (zh ? "否" : "いいえ");
            }
        }
        // PGT special gift labels use global GameInfo.Strings upstream. Resolve them explicitly per language.
        var pgt = gift switch { PGT value => value, PCD value => value.Gift, _ => null };
        if (pgt is not null && !gift.IsItem && !gift.IsEntity)
        {
            string Name(string[] values, int index) => (uint)index < values.Length ? values[index] : "#" + index;
            string? value = pgt.GiftType switch {
                GiftType4.Goods => (zh ? "装饰：" : ja ? "グッズ：" : "Goods: ") + Name(strings.uggoods, pgt.ItemID),
                GiftType4.PokétchApp => (zh ? "宝可表应用：" : ja ? "ポケッチアプリ：" : "Pokétch App: ") + Name(strings.poketchapps, (int)pgt.PoketchApp),
                GiftType4.PokéwalkerCourse => (zh ? "路线：" : ja ? "コース：" : "Route Map: ") + Name(strings.walkercourses, pgt.PokewalkerCourseID),
                GiftType4.HasSubType => pgt.GiftSubType switch {
                    GiftSubType4.Seal => (zh ? "贴纸：" : ja ? "シール：" : "Seal: ") + Name(strings.seals, (int)pgt.Seal),
                    GiftSubType4.Accessory => (zh ? "饰品：" : ja ? "アクセサリー：" : "Accessory: ") + Name(strings.accessories, (int)pgt.Accessory),
                    GiftSubType4.Backdrop => (zh ? "背景：" : ja ? "背景：" : "Backdrop: ") + Name(strings.backdrops, (int)pgt.Backdrop), _ => null }, _ => null };
            if (value is not null && result.Length > 1) result[1] = value;
        }
        return result;
    }
}

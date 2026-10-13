// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PersonalChartTests
{
    internal static void Run()
    {
        SaveFile[] saves = [new SAV1(), new SAV1(LanguageID.English, GameVersion.YW), new SAV2(),
            new SAV3RS(), new SAV3E(), new SAV3FRLG(), new SAV3Colosseum(new byte[ColoCrypto.SAVE_SIZE], false), new SAV3XD(), new SAV3RSBox(),
            new SAV4DP(), new SAV4Pt(), new SAV4HGSS(), new SAV4BR(), new SAV5BW(), new SAV5B2W2(),
            new SAV6XY(), new SAV6AO(), new SAV7SM(), new SAV7USUM(), new SAV7b(),
            new SAV8SWSH(), new SAV8BS(), new SAV8LA(), new SAV9SV(), new SAV9ZA()];
        foreach (var save in saves)
        {
            var original = save.Data.ToArray();
            var table = save.Personal;
            var entries = Enumerable.Range(0, table.Count).Select(i => table[i].Write()).ToArray();
            var actual = PersonalChart.Read(save);
            var expected = new List<(ushort Species, byte Form)>();
            for (ushort s = 1; s <= table.MaxSpeciesID; s++)
                for (byte f = 0; f < table[s, 0].FormCount; f++)
                    if (table.IsPresentInGame(s, f)) expected.Add((s, f));
            Check(actual.Rows.Select(r => (r.Species, r.Form)).SequenceEqual(expected), "Every present species/form once in source order");
            Check(actual.HasAlphaMove == (save is SAV9ZA), "ZA-only alpha column");
            foreach (var row in actual.Rows)
            {
                var p = table.GetFormEntry(row.Species, row.Form);
                bool native = p switch { PersonalInfo7 => PersonalInfo7.IsPastGenNative(row.Species), PersonalInfo8SWSH sw => sw.IsInDex, PersonalInfo8BDSP bd => bd.IsInDex, PersonalInfo8LA la => la.IsPresentInGame, PersonalInfo9SV sv => sv.IsInDex, PersonalInfo9ZA nativeZa => nativeZa.IsLumioseNative, _ => true };
                Check(row.Native == native, "Source native rule for every row");
                string number = row.Species.ToString(save.MaxSpeciesID >= 1000 ? "0000" : "000") + (row.Form == 0 ? "" : "-" + row.Form.ToString("00"));
                Check(row.Number == number && row.Sprite == "b" + PKHeX.Drawing.PokeSprite.SpriteName.GetResourceStringSprite(row.Species, row.Form, 0, 0, save.Context), "Source number and sprite for every row");
                string Hex(System.Drawing.Color color) => $"#{color.R:X2}{color.G:X2}{color.B:X2}";
                Check(row.BstColor == Hex(PKHeX.Drawing.ColorUtil.ColorBaseStatTotal(p.BST)), "Unmodified upstream BST color");
                Check(row.StatColors.SequenceEqual(row.Stats.Select(s => Hex(PKHeX.Drawing.ColorUtil.ColorBaseStat(s)))), "Unmodified upstream stat colors");
                Check(row.Stats.SequenceEqual(new[] { p.HP, p.ATK, p.DEF, p.SPA, p.SPD, p.SPE }), "All stats/order");
                Check(row.Bst == p.BST && row.CatchRate == p.CatchRate, "BST/catch rate");
                Check(row.Type1.Id == (int)((MoveType)p.Type1).GetMoveTypeGeneration(save.Generation), "Old-generation type mapping");
                Check((row.Type2 is null) == (p.Type1 == p.Type2), "Single type leaves second cell empty");
                for (int i = 0; i < 3; i++) Check(row.AbilityIds[i] == (i < p.AbilityCount ? p.GetAbilityAtIndex(i) : 0), "Ability slots/None");
                var languages = new[] { "zh-Hans", "en", "ja" };
                var names = new[] { row.Name.Zh, row.Name.En, row.Name.Ja };
                for (int i = 0; i < 3; i++)
                {
                    var strings = GameInfo.GetStrings(languages[i]);
                    var forms = FormConverter.GetFormList(row.Species, strings.types, strings.forms, ["♂", "♀", "-"], save.Context);
                    string name = strings.specieslist[row.Species] + (row.Form == 0 ? "" : "-" + (row.Form < forms.Length ? forms[row.Form] : row.Form.ToString()));
                    Check(names[i] == name, "Source trilingual form names");
                }
                Check(row.AlphaMove == (p is PersonalInfo9ZA za ? za.AlphaMove : null), "ZA alpha move");
            }
            Check(save.Data.SequenceEqual(original), "Full save remains unchanged");
            for (int i = 0; i < entries.Length; i++) Check(table[i].Write().SequenceEqual(entries[i]), "Shared personal data remains unchanged");
            Console.WriteLine($"PASS KChart {save.GetType().Name}: {actual.Rows.Length} present rows, types, names, stats, abilities, alpha and complete save/personal preservation");
        }
        Check(PersonalChart.StatColor(0) == "#FF9999" && PersonalChart.StatColor(90) == "#FFFF99" && PersonalChart.StatColor(180) == "#99FF99" && PersonalChart.StatColor(255) == "#99FF99", "Source stat palette endpoints/clamp");
        var red = PersonalChart.Read(new SAV1()).Rows.Single(r => r.Species == 6 && r.Form == 0);
        Check(red.Type1.Id == 9 && red.Type2?.Id == 2 && red.AbilityIds.All(a => a == 0), "Gen1 Charizard fire/flying, no abilities");
        foreach (string fixture in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD", "GP", "GE" })
        {
            string path = Path.Combine(".tmp/pkhex-fixtures", fixture + ".sav");
            byte[] data = File.ReadAllBytes(path), original = data.ToArray();
            var save = SaveUtil.GetSaveFile(data.ToArray()) ?? throw new Exception($"KChart fixture not recognized: {fixture}");
            var expected = PersonalChart.Read(save);
            var actual = System.Text.Json.JsonSerializer.Deserialize(SaveService.ReadPersonalChart(data), SaveJsonContext.Default.PersonalChartCatalog)!;
            Check(System.Text.Json.JsonSerializer.Serialize(actual, SaveJsonContext.Default.PersonalChartCatalog) == System.Text.Json.JsonSerializer.Serialize(expected, SaveJsonContext.Default.PersonalChartCatalog), "Public JSON complete source catalog and all fields");
            Check(data.SequenceEqual(original), "Public API preserves caller buffer");
            Console.WriteLine($"PASS KChart public {fixture}: {actual.Rows.Length} rows/all fields and original buffer");
        }
    }
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
}

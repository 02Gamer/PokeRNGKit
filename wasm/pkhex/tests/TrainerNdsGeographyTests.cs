// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerNdsGeographyTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile s) => new(s.OT, s.TID16, s.SID16, s.Money);
    private static byte[] Apply(byte[] data, TrainerEdit edit) => SaveService.Export(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.TrainerEdit));
    private static (int Country, int Region) Location(SaveFile save) => save switch
    {
        SAV4 s => (s.Country, s.Region),
        SAV5 s => (s.Country, s.Region),
        _ => throw new Exception("Wrong fixture"),
    };
    private static void Set(SaveFile save, int country, int region)
    {
        if (save is SAV4 s4) { s4.Country = country; s4.Region = region; }
        else if (save is SAV5 s5) { s5.Country = country; s5.Region = region; }
    }
    private static void CheckNames(OriginChoice[] choices, string resource)
    {
        var order = Util.GetCountryRegionList(resource, "zh-Hans");
        Require(choices.Select(c => c.Id).SequenceEqual(order.Select(c => c.Value)), "Catalog order/IDs match the generation-specific resource");
        foreach (var language in new[] { "zh-Hans", "en", "ja" })
        {
            var names = Util.GetCountryRegionList(resource, language).ToDictionary(c => c.Value, c => c.Text);
            Require(choices.All(c => (language == "zh-Hans" ? c.Name.Zh : language == "en" ? c.Name.En : c.Name.Ja) == names[c.Id]), "All localized names match source by ID");
        }
    }
    public static void Run()
    {
        foreach (var version in new[] { "D", "Pt", "HG", "B", "B2" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            save.OT = "A"; Set(save, 0, 0);
            var data = save.Write().ToArray(); var original = data.ToArray(); var basis = Original(save);
            var geo = TrainerEditing.Options(save).Geography!;
            string prefix = $"gen{save.Generation}";
            Require(geo.Value.ConsoleRegion is null && geo.Consoles.Length == 0 && !geo.KeepRegionWhenCountryZero, "DS has no console region and rebuilds country-zero list");
            CheckNames(geo.Countries, prefix + "_countries");
            int defaultCount = 0;
            foreach (var country in geo.Countries)
            {
                string resource = $"{prefix}_sr_{country.Id:000}";
                if (Util.GetCountryRegionList(resource, "zh-Hans").Count == 0) { resource = prefix + "_sr_default"; defaultCount++; }
                var regions = geo.Regions.Single(r => r.Country == country.Id).Choices;
                CheckNames(regions, resource);
                foreach (var region in regions)
                {
                    var probe = save.Clone();
                    TrainerEditing.Apply(probe, basis with { Country = country.Id, Region = region.Id });
                    Require(Location(probe) == (country.Id, region.Id), "Every NDS country/region combination is representable");
                }
            }
            Require(defaultCount > 0, "Default region resources exercised");
            // Full serialization for every country's first and last region, including the default and zero lists.
            foreach (var group in geo.Regions)
            foreach (var region in new[] { group.Choices[0].Id, group.Choices[^1].Id }.Distinct())
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!; Set(expected, group.Country, region);
                var output = Apply(data, basis with { Country = group.Country, Region = region });
                Require(output.SequenceEqual(expected.Write().ToArray()), "Complete output equals direct Core setters");
                var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Require(after.ChecksumsValid && Location(after) == (group.Country, region), "Pair and checksums survive complete export");
                Require(data.SequenceEqual(original), "Source file unchanged");
            }
            using (var report = JsonDocument.Parse(SaveService.Inspect(data)))
            {
                var value = report.RootElement.GetProperty("trainer").GetProperty("geography");
                Require(value.GetProperty("value").GetProperty("consoleRegion").ValueKind == JsonValueKind.Null && value.GetProperty("consoles").GetArrayLength() == 0, "No fictional console region in JSON");
            }
            foreach (var edit in new[] { basis with { Country = -1 }, basis with { Country = 256 }, basis with { Country = 255 }, basis with { Region = -1 }, basis with { Region = 256 }, basis with { Country = 0, Region = 255 }, basis with { ConsoleRegion = 0 }, basis with { ConsoleRegion = 255 } })
            {
                try { Apply(data, edit); throw new Exception("Invalid DS geography accepted"); }
                catch (ArgumentException) { Require(data.SequenceEqual(original), "Rejected request preserves source"); }
            }
            foreach (var pair in new[] { (255, 255), (0, 255) })
            {
                Set(save, pair.Item1, pair.Item2);
                var unusual = save.Write().ToArray();
                var kept = SaveUtil.GetSaveFile(Apply(unusual, basis with { Money = 1 }))!;
                Require(Location(kept) == pair, "Unchanged unusual pair survives unrelated edits");
                var same = Apply(unusual, basis with { Country = pair.Item1, Region = pair.Item2 });
                Require(same.SequenceEqual(unusual), "Explicit same pair does not normalize unknown bytes");
                var reset = SaveUtil.GetSaveFile(Apply(unusual, basis with { Country = 0, Region = 0 }))!;
                Require(Location(reset) == (0, 0) && reset.ChecksumsValid, "Explicit clearing writes the default pair");
            }
            Console.WriteLine($"PASS {version}: all DS catalogs/names/pairs, every country endpoints serialized, default regions, console rejection, unusual pairs and original");
        }
    }
}

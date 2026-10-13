// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonReportApiTests
{
    internal static void Run()
    {
        var catalog = JsonSerializer.Deserialize(SaveService.ReadPokemonReportCatalog(), SaveJsonContext.Default.PokemonReportCatalog)!;
        Check(catalog.Extra.SequenceEqual(EntityBatchEditor.Instance.Properties[0]), "Complete source extra property candidates");
        foreach (string fixture in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD", "GP", "GE" })
        {
            byte[] input = File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"), original = input.ToArray();
            var save = SaveUtil.GetSaveFile(input.ToArray())!;
            foreach (string lang in new[] { "zh-Hans", "en", "ja" })
            {
                var query = new PokemonReportQuery(lang, ["Species", "PID"], ["Nickname"], SortIndex: 2, Descending: true);
                string json = JsonSerializer.Serialize(query, SaveJsonContext.Default.PokemonReportQuery);
                var expected = PokemonReport.Read(save, query);
                var actual = SaveService.ReadPokemonReport(input, json);
                Check(actual == JsonSerializer.Serialize(expected, SaveJsonContext.Default.PokemonReportData), "Public complete report JSON");
                Check(SaveService.ExportPokemonReport(input, json) == PokemonReport.Csv(expected), "Public complete CSV");
                int last = expected.Columns.Length - 1;
                query = query with { SortIndex = last };
                Check(PokemonReport.Read(save, query).Rows.Length == expected.Rows.Length, "Duplicate extra property indexed sorting");
            }
            foreach (string json in new[] { "null", "{\"language\":null}", "{\"sortIndex\":0}", "{\"sortIndex\":9999}", "{\"extra\":[null]}" }) Reject(()=>SaveService.ReadPokemonReport(input,json));
            Check(input.SequenceEqual(original), "Public read/export/rejections preserve full caller buffer");
            Console.WriteLine($"PASS public ReportGrid {fixture}: all fields/three languages/CSV, duplicate indexed sort, malformed input and original buffer");
        }
        Reject(()=>SaveService.ReadPokemonReport([1],new string('x',65537)));
    }
    private static void Check(bool value,string message) {if(!value)throw new Exception(message);}
    private static void Reject(Action action) {try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid report query accepted");}
}

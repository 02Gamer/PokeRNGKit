// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;

public static partial class Program
{
    [JSExport] public static string ReadPokemonReportCatalog() => SaveService.ReadPokemonReportCatalog();
    [JSExport] public static string ReadPokemonReport(byte[] data, string json) => SaveService.ReadPokemonReport(data, json);
    [JSExport] public static string ExportPokemonReport(byte[] data, string json) => SaveService.ExportPokemonReport(data, json);
}
public static partial class SaveService
{
    private static PokemonReportQuery ReportQuery(string json)
    {
        if (json.Length > 65536) throw new ArgumentException("Report query exceeds the browser limit.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonReportQuery) ?? throw new ArgumentException("Missing report query.");
        PokemonReport.Validate(query);
        return query;
    }
    public static string ReadPokemonReportCatalog() => JsonSerializer.Serialize(PokemonReport.Catalog(), SaveJsonContext.Default.PokemonReportCatalog);
    public static string ReadPokemonReport(byte[] data, string json) => JsonSerializer.Serialize(PokemonReport.Read(Open(data), ReportQuery(json)), SaveJsonContext.Default.PokemonReportData);
    public static string ExportPokemonReport(byte[] data, string json) => PokemonReport.Csv(PokemonReport.Read(Open(data), ReportQuery(json)));
}

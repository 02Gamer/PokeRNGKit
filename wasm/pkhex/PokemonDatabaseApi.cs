// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public static partial class Program
{
    [JSExport]public static string OpenPokemonDatabase(byte[] data,byte[] files,string json)=>SaveService.OpenPokemonDatabase(data,files,json);
    [JSExport]public static string ReadPokemonDatabase(byte[] data,string json)=>SaveService.ReadPokemonDatabase(data,json);
    [JSExport]public static string ReadPokemonDatabaseCatalog(byte[] data,int id)=>SaveService.ReadPokemonDatabaseCatalog(data,id);
    [JSExport]public static string PreviewPokemonDatabase(byte[] data,byte[] files,string json)=>SaveService.PreviewPokemonDatabase(data,files,json);
    [JSExport]public static string CommitPokemonDatabase(byte[] data,byte[] files,string json)=>SaveService.CommitPokemonDatabase(data,files,json);
    [JSExport]public static string ExportPokemonDatabaseEntity(byte[] data,int id)=>SaveService.ExportPokemonDatabaseEntity(data,id);
    [JSExport]public static void DiscardPokemonDatabase(string token)=>PokemonDatabaseRuntime.Discard(token);
    [JSExport]public static void ResetPokemonDatabase()=>PokemonDatabaseRuntime.Reset();
    [JSExport]public static string ViewPokemonDatabaseEntity(byte[] data,int id)=>SaveService.ViewPokemonDatabaseEntity(data,id);
    [JSExport]public static byte[] ExportPokemonDatabaseArchive(byte[] data,string json)=>SaveService.ExportPokemonDatabaseArchive(data,json);
    [JSExport]public static string ReadPokemonDatabaseReport(byte[] data,string json)=>SaveService.ReadPokemonDatabaseReport(data,json);
    [JSExport]public static string ExportPokemonDatabaseReport(byte[] data,string json)=>SaveService.ExportPokemonDatabaseReport(data,json);
}
public static partial class SaveService
{
    internal static SaveFile OpenDatabaseSave(byte[] data)=>Open(data);
    public static string OpenPokemonDatabase(byte[] data,byte[] files,string json)=>PokemonDatabaseRuntime.Open(data,files,json);
    public static string ReadPokemonDatabase(byte[] data,string json){PokemonDatabaseRuntime.AssertSource(data);return PokemonDatabaseRuntime.Read(json);}
    public static string ReadPokemonDatabaseCatalog(byte[] data,int id){PokemonDatabaseRuntime.AssertSource(data);if(id< -1)throw new ArgumentException("Invalid database catalog target.");return PokemonDatabaseRuntime.Catalog(id);}
    public static string PreviewPokemonDatabase(byte[] data,byte[] files,string json)=>PokemonDatabaseRuntime.Preview(data,files,json);
    public static string CommitPokemonDatabase(byte[] data,byte[] files,string json)=>PokemonDatabaseRuntime.CommitDelta(data,files,json);
    public static string ExportPokemonDatabaseEntity(byte[] data,int id){PokemonDatabaseRuntime.AssertSource(data);return JsonSerializer.Serialize(PokemonDatabaseRuntime.Export(id),PokemonDatabaseJson.Default.PokemonFile);}
    public static string ViewPokemonDatabaseEntity(byte[] data,int id)=>JsonSerializer.Serialize(PokemonDatabaseRuntime.ViewEntity(data,id),PokemonDatabaseJson.Default.PokemonFile);
    public static byte[] ExportPokemonDatabaseArchive(byte[] data,string json){PokemonDatabaseRuntime.AssertSource(data);return PokemonDatabaseRuntime.Archive(json);}
    public static string ReadPokemonDatabaseReport(byte[] data,string json){PokemonDatabaseRuntime.AssertSource(data);return PokemonDatabaseRuntime.Report(json,false);}
    public static string ExportPokemonDatabaseReport(byte[] data,string json){PokemonDatabaseRuntime.AssertSource(data);return PokemonDatabaseRuntime.Report(json,true);}
}

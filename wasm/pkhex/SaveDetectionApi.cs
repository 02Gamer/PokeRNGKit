// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record SaveDetectionRequest([property:JsonRequired] SaveFileType Type,
    [property:JsonRequired] GameVersion SubVersion, [property:JsonRequired] LanguageID Language,
    [property:JsonRequired] string Handler, [property:JsonRequired] string FileName);
internal sealed record SaveDetectionUnsupported(GameVersion SubVersion, LanguageID Language);
internal sealed record SaveDetectionType(SaveFileType Id, string Name, OriginChoice[] Versions, SaveDetectionUnsupported[] Unsupported);
internal sealed record SaveDetectionCatalog(int ApiVersion, SaveDetectionType[] Types, OriginChoice[] Languages, string[] Handlers);

public static partial class Program
{
    [JSExport] public static string ReadSaveDetectionCatalog() => SaveService.ReadSaveDetectionCatalog();
    [JSExport] public static void ConfigureSaveDetection(byte[] data, string json) => SaveService.ConfigureSaveDetection(data,json);
    [JSExport] public static void ClearSaveDetection() => SaveDetectionContext.Clear();
}
public static partial class SaveService
{
    public static void ConfigureSaveDetection(byte[] data,string json)
    {
        SaveDetectionContext.Clear();
        if (json.Length > 256 * 1024) throw new ArgumentException("Manual recognition request is too large.");
        if (json.Length == 0) return;
        var request = JsonSerializer.Deserialize(json, SaveDetectionJson.Default.SaveDetectionRequest)
            ?? throw new ArgumentException("Missing manual recognition request.");
        SaveDetectionContext.Configure(data,new(request.Type,request.SubVersion,request.Language,request.Handler,request.FileName));
    }
    public static string ReadSaveDetectionCatalog()
    {
        string Name(GameVersion version,string language) {
            var source = new GameDataSource(GameInfo.GetStrings(language)).VersionDataSource;
            return source.FirstOrDefault(value=>value.Value==(int)version)?.Text ?? version.ToString();
        }
        var types = Enum.GetValues<SaveFileType>().Where(type=>type!=SaveFileType.None)
            .Select(type=>new SaveDetectionType(type,type.ToString(),SaveDetection.Versions(type)
                .Select(version=>new OriginChoice((int)version,new(Name(version,"zh-Hans"),Name(version,"en"),Name(version,"ja")))).ToArray(),type==SaveFileType.GSC?[new(GameVersion.C,LanguageID.Korean)]:[])).ToArray();
        string LanguageName(LanguageID language,string ui) {
            var names = GameInfo.GetStrings(ui).languageNames;
            int id=(int)language;
            return id>=0&&id<names.Length&&!string.IsNullOrWhiteSpace(names[id])?names[id]:language.ToString();
        }
        var languages=Enum.GetValues<LanguageID>().Select(language=>new OriginChoice((int)language,
            new(LanguageName(language,"zh-Hans"),LanguageName(language,"en"),LanguageName(language,"ja")))).ToArray();
        return JsonSerializer.Serialize(new SaveDetectionCatalog(ApiVersion,types,languages,
            SaveDetection.Handlers.Select(SaveDetection.HandlerName).ToArray()),SaveDetectionJson.Default.SaveDetectionCatalog);
    }
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveDetectionRequest))]
[JsonSerializable(typeof(SaveDetectionCatalog))]
internal partial class SaveDetectionJson : JsonSerializerContext { }

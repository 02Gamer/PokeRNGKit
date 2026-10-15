// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;

internal sealed record SaveSettingsBundle(int ApiVersion,string Json,SaveSettingsCatalog Catalog);
public static partial class Program
{
    [JSExport]public static string ReadProgramSettings()=>SaveService.ReadProgramSettings();
    [JSExport]public static string ValidateProgramSettings(string json)=>SaveService.ValidateProgramSettings(json);
    [JSExport]public static void ConfigureProgramSettings(string json)=>SaveProgramSettingsRuntime.Configure(json);
    [JSExport]public static void ClearProgramSettings()=>SaveProgramSettingsRuntime.Clear();
    [JSExport]public static void ConfigureSpriteMode(string mode)=>SaveSpriteView.Configure(mode);
    [JSExport]public static string ReadSaveBackupName(byte[] data,string name)=>SaveService.ReadSaveBackupName(data,name);
}
public static partial class SaveService
{
    public static string ReadSaveBackupName(byte[] data,string name)
    {
        if(string.IsNullOrWhiteSpace(name)||name.Length>4096||name.IndexOfAny(['/', '\\', '\0'])>=0)
            throw new ArgumentException("Expected a save file name without a directory.");
        var save=Open(data);
        if(!save.State.Exportable)return "";
        save.Metadata.SetExtraInfo(name);
        return save.Metadata.GetBackupFileName("");
    }
    public static string ReadProgramSettings()
    {
        var settings=SaveProgramSettingsCodec.Defaults();
        var json=JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings);
        return JsonSerializer.Serialize(new SaveSettingsBundle(ApiVersion,json,SaveSettingsCatalogBuilder.Read(settings)),SaveSettingsBundleJson.Default.SaveSettingsBundle);
    }
    public static string ValidateProgramSettings(string json)=>JsonSerializer.Serialize(SaveProgramSettingsCodec.Decode(json),SaveProgramSettingsJson.Default.SaveProgramSettings);
}
internal static class SaveProgramSettingsRuntime
{
    private static string? signature;
    private static IDisposable? scope;
    private static bool? oldShiny;
    internal static SaveProgramSettings? Current {get;private set;}
    internal static void Configure(string json)
    {
        Clear();
        var settings=json.Length==0?SaveProgramSettingsCodec.Defaults():SaveProgramSettingsCodec.Decode(json);
        string normalized=JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings);
        string fingerprint=Br4Editing.Hash(Encoding.UTF8.GetBytes(normalized));
        // Frozen editor tickets live in this Worker. A settings change requires
        // a new Worker, so a ticket cannot be confirmed under a different policy.
        if(signature is not null&&signature!=fingerprint)throw new ArgumentException("Settings changed. Restart the save Worker before continuing.");
        var lease=SaveCoreSettingsRuntime.Begin(settings.Core());
        bool shiny=SpriteName.AllowShinySprite;
        try {
            if(settings.Startup.ForceHaXOnLaunch)EntityConverter.AllowIncompatibleConversion=EntityCompatibilitySetting.AllowIncompatibleAll;
            SpriteName.AllowShinySprite=settings.Sprite.ShinySprites;
            signature=fingerprint;scope=lease;Current=settings;oldShiny=shiny;
        }catch{SpriteName.AllowShinySprite=shiny;lease.Dispose();throw;}
    }
    internal static void Clear(){scope?.Dispose();scope=null;Current=null;if(oldShiny is { } shiny)SpriteName.AllowShinySprite=shiny;oldShiny=null;}
    internal static void Reset(){Clear();signature=null;}
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveSettingsBundle))]
internal partial class SaveSettingsBundleJson:JsonSerializerContext{}

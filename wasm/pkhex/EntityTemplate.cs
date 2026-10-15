// SPDX-License-Identifier: GPL-3.0-or-later
// Source: Main.LoadBlankSaveFile, ResetSAVPKMEditors and SaveExtensions.LoadTemplate.
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record EntityTemplateQuery(int Version=0,string? TemplateName=null,string? TemplateData=null);
internal sealed record EntityTemplateCatalog(int ApiVersion,string SourceHash,int Version,OriginChoice[] Versions,string Directory,string ExpectedFileName,string Format);
internal sealed record EntityTemplateCreated(int ApiVersion,string SourceHash,int Version,string Directory,string ExpectedFileName,bool UsedCustom,string Fallback,string FileName,string Data);
internal static class EntityTemplate
{
    internal static EntityTemplateQuery Query(string json)
    {
        if(json is null||json.Length>2*1024*1024)throw new ArgumentException("Template request is too large.");
        return JsonSerializer.Deserialize(json,EntityTemplateJson.Default.EntityTemplateQuery)??throw new ArgumentException("Missing template request.");
    }
    internal static OriginChoice[] Versions()
    {
        var languages=new[]{"zh-Hans","en","ja"}.Select(l=>new GameDataSource(GameInfo.GetStrings(l)).VersionDataSource.ToDictionary(v=>v.Value,v=>v.Text)).ToArray();
        return new GameDataSource(GameInfo.GetStrings("en")).VersionDataSource
            .Where(v=>(GameVersion)v.Value is not (0 or GameVersion.GO or GameVersion.CP))
            .Select(v=>new OriginChoice(v.Value,new(languages[0][v.Value],languages[1][v.Value],languages[2][v.Value]))).ToArray();
    }
    internal static int Version(EntityTemplateQuery query)
    {
        int version=query.Version==0?(int)(SaveProgramSettingsRuntime.Current?.Startup.DefaultSaveVersion??Latest.Version):query.Version;
        if(!Versions().Any(v=>v.Id==version))throw new ArgumentException("Invalid template game version.");
        return version;
    }
    internal static string Directory()
    {
        var path=SaveProgramSettingsRuntime.Current?.LocalResources.TemplatePath??"template";
        var normalized=path.Trim().Replace('\\','/').TrimEnd('/');
        return normalized.Length==0?"local":normalized;
    }
    internal static string Expected(SaveFile save)
    {
        var directory=Directory();string name=directory[(directory.LastIndexOf('/')+1)..];
        return name+"."+save.PKMType.Name.ToLowerInvariant();
    }
    internal static (PKM Pokemon,bool UsedCustom,string Fallback) Create(SaveFile save,EntityTemplateQuery query)
    {
        PKM Default(){var pk=save.BlankPKM;EntityTemplates.TemplateFields(pk,save);return pk;}
        if(query.TemplateData is null)return(Default(),false,"none");
        if(!string.Equals(query.TemplateName,Expected(save),StringComparison.OrdinalIgnoreCase))return(Default(),false,"name");
        byte[] data;try{data=Convert.FromBase64String(query.TemplateData);}catch(FormatException){throw new ArgumentException("Invalid template file data.");}
        if(data.Length>PokemonFiles.MaximumSize)throw new ArgumentException("Template file exceeds the entity size limit.");
        if(!EntityDetection.IsSizePlausible(data.Length))return(Default(),false,"size");
        var prefer=EntityFileExtension.GetContextFromExtension(Path.GetExtension(query.TemplateName),save.Context);
        var entity=EntityFormat.GetFromBytes(data.ToArray(),prefer);
        if(entity?.Species is not >0)return(Default(),false,"unrecognized");
        var converted=EntityConverter.ConvertToType(entity,save.PKMType,out _);
        return converted is null?(Default(),false,"conversion"):(converted,true,"none");
    }
}
public static partial class SaveService
{
    private static SaveFile TemplateSave(byte[] source,int version)=>BlankSaveFile.Get((GameVersion)version,source.Length==0?null:Open(source));
    public static string ReadEntityTemplateCatalog(byte[] source,string json)
    {
        var query=EntityTemplate.Query(json);int version=EntityTemplate.Version(query);var save=TemplateSave(source,version);
        return JsonSerializer.Serialize(new EntityTemplateCatalog(ApiVersion,Br4Editing.Hash(source),version,EntityTemplate.Versions(),EntityTemplate.Directory(),EntityTemplate.Expected(save),save.PKMType.Name),EntityTemplateJson.Default.EntityTemplateCatalog);
    }
    public static string CreateEntityTemplate(byte[] source,string json)
    {
        var query=EntityTemplate.Query(json);int version=EntityTemplate.Version(query);var save=TemplateSave(source,version);
        var (pokemon,custom,fallback)=EntityTemplate.Create(save,query);
        SaveSpriteView.Select(save);
        var bytes=pokemon is GBPKML gb?StandaloneGb.Write(gb):StandalonePokemon.Serialize(pokemon,false,false);
        string filename="template."+pokemon.Extension;
        _=StandalonePokemon.Inspect(bytes,filename,useFileFormat:true);
        return JsonSerializer.Serialize(new EntityTemplateCreated(ApiVersion,Br4Editing.Hash(source),version,EntityTemplate.Directory(),EntityTemplate.Expected(save),custom,fallback,filename,Convert.ToBase64String(bytes)),EntityTemplateJson.Default.EntityTemplateCreated);
    }
}
public static partial class Program
{
    [JSExport]public static string ReadEntityTemplateCatalog(byte[] source,string json)=>SaveService.ReadEntityTemplateCatalog(source,json);
    [JSExport]public static string CreateEntityTemplate(byte[] source,string json)=>SaveService.CreateEntityTemplate(source,json);
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(EntityTemplateQuery))]
[JsonSerializable(typeof(EntityTemplateCatalog))]
[JsonSerializable(typeof(EntityTemplateCreated))]
internal partial class EntityTemplateJson:JsonSerializerContext{}

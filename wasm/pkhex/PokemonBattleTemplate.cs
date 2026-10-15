// SPDX-License-Identifier: GPL-3.0-or-later
// Source: Main.ClickShowdownExportPKM and SAVEditor.ExportShowdownText.
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record BattleTemplateQuery([property:JsonRequired]string Scope,int? Box=null,int? Slot=null);
internal sealed record BattleTemplateReport(int ApiVersion,string SourceHash,string Scope,int? Box,int? Slot,int Count,LocalizedText Text);
internal static class PokemonBattleTemplate
{
    internal static BattleTemplateReport Read(SaveFile save,byte[] source,BattleTemplateQuery query)
    {
        PKM[] entities;
        bool single=query.Scope=="single";
        switch(query.Scope) {
            case "single" when query.Box is not null && query.Slot is not null:
                entities=[PokemonEditing.Read(save,query.Box.Value,query.Slot.Value)];break;
            case "party" when query.Box is null && query.Slot is null && save.HasParty:
                entities=save.PartyData.ToArray();break;
            case "box" when query.Box is >=0 && query.Slot is null && save.HasBox && query.Box<save.BoxCount:
                entities=save.GetBoxData(query.Box.Value).ToArray();break;
            case "allBoxes" when query.Box is null && query.Slot is null && save.HasBox:
                entities=save.BoxData.ToArray();break;
            default:throw new ArgumentException("Invalid battle template scope or position.");
        }
        return Create(source,query,entities,save.Context,single);
    }
    internal static BattleTemplateReport Standalone(byte[] source,string json)
    {
        var request=StandalonePokemonRequests.Read(json);
        var pk=StandalonePokemon.Open(source,request.FileName,request.InputEncrypted,request.UseFileFormat).Entity;
        return Create(source,new("single"),[pk],pk.Context,true);
    }
    private static BattleTemplateReport Create(byte[] source,BattleTemplateQuery query,PKM[] entities,EntityContext context,bool single)
    {
        var template=SaveProgramSettingsRuntime.Current?.BattleTemplate.Export??new BattleTemplateSettings().Export;
        string Text(LanguageID language) {
            var settings=template.GetSettings(language,context);
            // Core's single and collection paths differ; preserve the source choice.
            return single?ShowdownParsing.GetShowdownText(entities[0],settings):
                ShowdownParsing.GetShowdownSets(entities,Environment.NewLine+Environment.NewLine,settings);
        }
        return new(SaveService.ApiVersion,Br4Editing.Hash(source),query.Scope,query.Box,query.Slot,
            entities.Count(pk=>pk.Species!=0),new(Text(LanguageID.ChineseS),Text(LanguageID.English),Text(LanguageID.Japanese)));
    }
    internal static string Serialize(BattleTemplateReport value)=>JsonSerializer.Serialize(value,BattleTemplateJson.Default.BattleTemplateReport);
}
public static partial class SaveService
{
    public static string ReadBattleTemplate(byte[] data,string json)
    {
        if(json is null || json.Length>1024)throw new ArgumentException("Invalid battle template request.");
        var query=JsonSerializer.Deserialize(json,BattleTemplateJson.Default.BattleTemplateQuery)??throw new ArgumentException("Missing battle template request.");
        return PokemonBattleTemplate.Serialize(PokemonBattleTemplate.Read(Open(data),data,query));
    }
}
public static partial class Program
{
    [JSExport]public static string ReadBattleTemplate(byte[] data,string json)=>SaveService.ReadBattleTemplate(data,json);
    [JSExport]public static string ReadStandaloneBattleTemplate(byte[] data,string json)=>PokemonBattleTemplate.Serialize(PokemonBattleTemplate.Standalone(data,json));
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(BattleTemplateQuery))]
[JsonSerializable(typeof(BattleTemplateReport))]
internal partial class BattleTemplateJson:JsonSerializerContext{}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record SaveSettingEnumChoice(int Value,string Name);
internal sealed record SaveSettingField(string Path,string Name,string Kind,double? Minimum,double? Maximum,SaveSettingEnumChoice[] Choices,string? EnumType=null);
internal sealed record SaveSettingGroup(string Id,SaveSettingField[] Fields);
internal sealed record SaveSettingsCatalog(SaveSettingGroup[] Groups);
internal static class SaveSettingsCatalogBuilder
{
    internal static SaveSettingsCatalog Read(SaveProgramSettings settings)
    {
        var groups=new List<SaveSettingGroup>();
        foreach(var group in SaveProgramSettingsJson.Default.SaveProgramSettings.Properties) {
            if(group.Get is null||group.Set is null)continue;
            var fields=new List<SaveSettingField>();
            Walk(group.Get(settings)??throw new ArgumentException("Missing settings group."),group.Name,fields);
            groups.Add(new(group.Name,fields.ToArray()));
        }
        return new(groups.ToArray());
    }
    private static void Walk(object value,string path,List<SaveSettingField> fields)
    {
        var info=SaveProgramSettingsJson.Default.GetTypeInfo(value.GetType())??throw new ArgumentException("Unsupported settings type.");
        if(info.Kind==JsonTypeInfoKind.Object) {
            foreach(var property in info.Properties) {
                if(property.Get is null||property.Set is null)continue;
                Walk(property.Get(value)??throw new ArgumentException("Missing settings value."),path+"."+property.Name,fields);
            }
            return;
        }
        var type=info.Type;
        string kind=type==typeof(bool)?"boolean":type.IsEnum?"enum":type==typeof(string)?"text":
            info.Kind==JsonTypeInfoKind.Enumerable?"list":type==typeof(float)||type==typeof(double)?"number":"integer";
        double? min=type==typeof(byte)?byte.MinValue:type==typeof(uint)?uint.MinValue:type==typeof(int)?int.MinValue:null;
        double? max=type==typeof(byte)?byte.MaxValue:type==typeof(uint)?uint.MaxValue:type==typeof(int)?int.MaxValue:null;
        if(path=="startup.recentlyLoadedMaxCount"){min=1;max=1000;}
        if(path is "entityDb.resultsGridRowCount" or "encounterDb.resultsGridRowCount" or "mysteryDb.resultsGridRowCount"){min=5;max=20;}
        if(path is "draw.invalidSelection" or "draw.markBlue" or "draw.markPink")kind="color";
        var choices=type.IsEnum?Choices(type):type==typeof(BattleTemplateToken[])?Choices(typeof(BattleTemplateToken)):[];
        if(path=="startup.defaultSaveVersion") choices=new GameDataSource(GameInfo.GetStrings("en")).VersionDataSource
            .Where(value=>(GameVersion)value.Value is not (0 or GameVersion.GO or GameVersion.CP))
            .Select(value=>new SaveSettingEnumChoice(value.Value,((GameVersion)value.Value).ToString())).ToArray();
        string? enumType=type.IsEnum?type.Name:type==typeof(BattleTemplateToken[])?nameof(BattleTemplateToken):null;
        if(type==typeof(BrowserSpritePreference))enumType="SpriteBuilderPreference";
        if(type==typeof(BrowserSpriteBackground))enumType="SpriteBackgroundType";
        fields.Add(new(path,path[(path.LastIndexOf('.')+1)..],kind,min,max,choices,enumType));
    }
    private static SaveSettingEnumChoice[] EnumChoices<T>() where T:struct,Enum => Enum.GetValues<T>().Select(value=>new SaveSettingEnumChoice(Convert.ToInt32(value),value.ToString())).ToArray();
    private static SaveSettingEnumChoice[] Choices(Type type) => type==typeof(Severity)?EnumChoices<Severity>():
        type==typeof(LanguageID)?EnumChoices<LanguageID>():type==typeof(GameVersion)?EnumChoices<GameVersion>():
        type==typeof(EntityCompatibilitySetting)?EnumChoices<EntityCompatibilitySetting>():type==typeof(EntityRejuvenationSetting)?EnumChoices<EntityRejuvenationSetting>():
        type==typeof(SaveFileLoadSetting)?EnumChoices<SaveFileLoadSetting>():type==typeof(DatabaseSortMode)?EnumChoices<DatabaseSortMode>():
        type==typeof(BrowserSpritePreference)?EnumChoices<BrowserSpritePreference>():type==typeof(BrowserSpriteBackground)?EnumChoices<BrowserSpriteBackground>():
        type==typeof(BattleTemplateDisplayStyle)?EnumChoices<BattleTemplateDisplayStyle>():type==typeof(BattleTemplateToken)?EnumChoices<BattleTemplateToken>():
        type==typeof(StatDisplayStyle)?EnumChoices<StatDisplayStyle>():type==typeof(MoveDisplayStyle)?EnumChoices<MoveDisplayStyle>():
        type==typeof(BoxExportScope)?EnumChoices<BoxExportScope>():type==typeof(BoxExportFolderMode)?EnumChoices<BoxExportFolderMode>():
        type==typeof(BoxExportFolderNaming)?EnumChoices<BoxExportFolderNaming>():type==typeof(BoxExportEmptySlots)?EnumChoices<BoxExportEmptySlots>():
        type==typeof(BoxExportIndexPrefix)?EnumChoices<BoxExportIndexPrefix>():type==typeof(BoxExportNofify)?EnumChoices<BoxExportNofify>():
        throw new ArgumentException("Unsupported settings enum.");
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveSettingsCatalog))]
internal partial class SaveSettingsCatalogJson:JsonSerializerContext {}

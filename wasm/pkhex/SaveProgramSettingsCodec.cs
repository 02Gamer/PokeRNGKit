// SPDX-License-Identifier: GPL-3.0-or-later
using System.Collections;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal static class SaveProgramSettingsCodec
{
    internal static SaveProgramSettings Defaults() => Copy(new());
    internal static SaveProgramSettings Copy(SaveProgramSettings source) => Decode(JsonSerializer.Serialize(source,SaveProgramSettingsJson.Default.SaveProgramSettings));
    internal static SaveProgramSettings Decode(string json)
    {
        if(json.Length is 0 or > 2097152) throw new ArgumentException("Settings request is too large or empty.");
        using var doc=JsonDocument.Parse(json);
        Shape(doc.RootElement,SaveProgramSettingsJson.Default.SaveProgramSettings);
        var result=JsonSerializer.Deserialize(json,SaveProgramSettingsJson.Default.SaveProgramSettings)??throw Invalid();
        if(result.Draw is not null) {
            result.Draw.InvalidSelection=Color(result.Draw.InvalidSelection);
            result.Draw.MarkBlue=Color(result.Draw.MarkBlue);
            result.Draw.MarkPink=Color(result.Draw.MarkPink);
        }
        Validate(result);
        // Match the existing browser report request limits. These are product
        // protection limits, not inferred WinForms PropertyGrid constraints.
        foreach(var properties in new[]{result.Report.ExtraProperties,result.Report.HiddenProperties})
            if(properties.Count>256||properties.Any(name=>name.Length>128))throw Invalid();
        return result;
    }
    private static void Shape(JsonElement value,JsonTypeInfo info)
    {
        if(info.Type.IsEnum) {
            Validate(JsonSerializer.Deserialize(value.GetRawText(),info));
            return;
        }
        if(info.Kind==JsonTypeInfoKind.Enumerable) {
            if(value.ValueKind!=JsonValueKind.Array||value.GetArrayLength()>8192)throw Invalid();
            Type element=info.Type==typeof(List<string>)||info.Type==typeof(string[])?typeof(string):
                info.Type==typeof(BattleTemplateToken[])?typeof(BattleTemplateToken):throw Invalid();
            var child=SaveProgramSettingsJson.Default.GetTypeInfo(element)??throw Invalid();
            foreach(var entry in value.EnumerateArray())Shape(entry,child);
            return;
        }
        if(info.Kind!=JsonTypeInfoKind.Object)return;
        if(value.ValueKind!=JsonValueKind.Object)throw Invalid();
        var fields=info.Properties.Where(p=>p.Get is not null&&p.Set is not null).ToDictionary(p=>p.Name,StringComparer.Ordinal);
        var seen=new HashSet<string>(StringComparer.Ordinal);
        foreach(var entry in value.EnumerateObject()) {
            if(!seen.Add(entry.Name)||!fields.TryGetValue(entry.Name,out var field))throw Invalid();
            Shape(entry.Value,SaveProgramSettingsJson.Default.GetTypeInfo(field.PropertyType)??throw Invalid());
        }
        if(seen.Count!=fields.Count)throw Invalid();
    }
    private static void Validate(object? value)
    {
        if(value is null)throw Invalid();
        bool valid=value switch {
            Severity e=>Enum.IsDefined(e),LanguageID e=>Enum.IsDefined(e),GameVersion e=>Enum.IsDefined(e),
            EntityCompatibilitySetting e=>Enum.IsDefined(e),EntityRejuvenationSetting e=>Enum.IsDefined(e),
            SaveFileLoadSetting e=>Enum.IsDefined(e),DatabaseSortMode e=>Enum.IsDefined(e),
            BrowserSpritePreference e=>Enum.IsDefined(e),BrowserSpriteBackground e=>Enum.IsDefined(e),
            BattleTemplateDisplayStyle e=>Enum.IsDefined(e),BattleTemplateToken e=>Enum.IsDefined(e),
            StatDisplayStyle e=>Enum.IsDefined(e),MoveDisplayStyle e=>Enum.IsDefined(e),
            BoxExportScope e=>Enum.IsDefined(e),BoxExportFolderMode e=>Enum.IsDefined(e),BoxExportFolderNaming e=>Enum.IsDefined(e),
            BoxExportEmptySlots e=>Enum.IsDefined(e),BoxExportIndexPrefix e=>Enum.IsDefined(e),BoxExportNofify e=>Enum.IsDefined(e),
            string s=>s.Length<=32767,float f=>float.IsFinite(f),double d=>double.IsFinite(d),_=>true,
        };
        if(!valid)throw Invalid();
        if(value is IEnumerable entries && value is not string) {foreach(var entry in entries)Validate(entry);return;}
        var info=SaveProgramSettingsJson.Default.GetTypeInfo(value.GetType())??throw Invalid();
        if(info.Kind!=JsonTypeInfoKind.Object)return;
        foreach(var p in info.Properties)if(p.Get is not null&&p.Set is not null)Validate(p.Get(value));
        if(value is BrowserDrawSettings draw) foreach(var color in new[]{draw.InvalidSelection,draw.MarkBlue,draw.MarkPink})
            if(color.Length!=7||color[0]!='#'||color.AsSpan(1).ContainsAnyExcept("0123456789abcdefABCDEF"))throw Invalid();
    }
    private static ArgumentException Invalid()=>new("Settings fields or values are invalid.");
    private static string Color(string value)
    {
        if(value is null)throw Invalid();
        if(value.Length==7&&value[0]=='#'&&!value.AsSpan(1).ContainsAnyExcept("0123456789abcdefABCDEF"))return value.ToLowerInvariant();
        if(Enum.TryParse<System.Drawing.KnownColor>(value,true,out var known)&&Enum.IsDefined(known)) {
            var color=System.Drawing.Color.FromKnownColor(known);
            return $"#{color.R:x2}{color.G:x2}{color.B:x2}";
        }
        throw Invalid();
    }
}

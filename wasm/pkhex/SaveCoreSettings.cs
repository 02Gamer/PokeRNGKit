// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

// Pure Core portion of SettingsEditor. Disk scanning from StartupUtil is not
// part of a static Worker; file resources are supplied by explicit selection.
internal sealed record SaveCoreSettings(LegalitySettings Legality, EntityConverterSettings Converter,
    SetImportSettings Import, SlotWriteSettings SlotWrite, SaveLanguageSettings SaveLanguage)
{
    internal static SaveCoreSettings Defaults() => new(new(),new(),new(),new(),new());
}
internal static class SaveCoreSettingsRuntime
{
    internal static SaveCoreSettings Decode(string json)
    {
        if (json.Length is 0 or > 262144) throw new ArgumentException("Core settings request is too large or empty.");
        using var document = JsonDocument.Parse(json);
        ValidateShape(document.RootElement, SaveCoreSettingsJson.Default.SaveCoreSettings);
        var value = JsonSerializer.Deserialize(json, SaveCoreSettingsJson.Default.SaveCoreSettings)
            ?? throw new ArgumentException("Missing Core settings.");
        Validate(value);
        return value;
    }
    private static void ValidateShape(JsonElement value, System.Text.Json.Serialization.Metadata.JsonTypeInfo info)
    {
        if (info.Kind != System.Text.Json.Serialization.Metadata.JsonTypeInfoKind.Object) return;
        if (value.ValueKind != JsonValueKind.Object) throw new ArgumentException("Missing Core settings object.");
        var properties = info.Properties.Where(property => property.Get is not null && property.Set is not null)
            .ToDictionary(property => property.Name,StringComparer.Ordinal);
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var field in value.EnumerateObject()) {
            if (!seen.Add(field.Name) || !properties.TryGetValue(field.Name,out var property))
                throw new ArgumentException("Unknown or duplicate Core settings field.");
            var child = SaveCoreSettingsJson.Default.GetTypeInfo(property.PropertyType)
                ?? throw new ArgumentException("Unsupported Core settings type.");
            ValidateShape(field.Value,child);
        }
        if (seen.Count != properties.Count) throw new ArgumentException("Missing Core settings field.");
    }
    internal static void Apply(SaveCoreSettings input)
    {
        // The Worker must own settings: neither later UI edits nor restored
        // snapshots can mutate Core's live nested legality objects.
        var owned = JsonSerializer.Deserialize(JsonSerializer.Serialize(input,
            SaveCoreSettingsJson.Default.SaveCoreSettings),SaveCoreSettingsJson.Default.SaveCoreSettings)
            ?? throw new ArgumentException("Missing Core settings.");
        Validate(owned);
        var previous = Capture();
        try { ApplyOwned(owned); }
        catch { Restore(previous); throw; }
    }
    private static void Validate(object? value)
    {
        if (value is null) throw new ArgumentException("Missing Core settings group.");
        bool defined = value switch {
            Severity e => Enum.IsDefined(e), LanguageID e => Enum.IsDefined(e),
            GameVersion e => Enum.IsDefined(e), EntityCompatibilitySetting e => Enum.IsDefined(e),
            EntityRejuvenationSetting e => Enum.IsDefined(e), _ => true,
        };
        if (!defined) throw new ArgumentException("Invalid Core settings enum value.");
        var info = SaveCoreSettingsJson.Default.GetTypeInfo(value.GetType())
            ?? throw new ArgumentException("Unsupported Core settings type.");
        if (info.Kind != System.Text.Json.Serialization.Metadata.JsonTypeInfoKind.Object) return;
        foreach (var property in info.Properties)
            if (property.Get is not null && property.Set is not null) Validate(property.Get(value));
    }
    internal static IDisposable Begin(SaveCoreSettings input)
    {
        var previous = Capture();
        Apply(input);
        return new Scope(previous);
    }
    private sealed record Snapshot(SaveCoreSettings Settings, EntityImportSettings Imports);
    private sealed class Scope(Snapshot previous) : IDisposable
    {
        private Snapshot? value = previous;
        public void Dispose() { if (value is not { } snapshot) return; value = null; Restore(snapshot); }
    }
    private static Snapshot Capture()
    {
        var write = SaveFile.SetUpdateSettings;
        var settings = new SaveCoreSettings(ParseSettings.Settings, new() {
            AllowIncompatibleConversion=EntityConverter.AllowIncompatibleConversion,
            AllowGuessRejuvenateHOME=EntityConverter.RejuvenateHOME,
            VirtualConsoleSourceGen1=EntityConverter.VirtualConsoleSourceGen1,
            VirtualConsoleSourceGen2=EntityConverter.VirtualConsoleSourceGen2,
            RetainMetDateTransfer45=EntityConverter.RetainMetDateTransfer45,
        }, new() { ApplyMarkings=CommonEdits.ShowdownSetIVMarkings, ApplyStatAlignment=CommonEdits.ShowdownSetBehaviorNature },
        new() { SetUpdateDex=write.UpdatePokeDex==EntityImportOption.Enable,
            SetUpdatePKM=write.UpdateToSaveFile==EntityImportOption.Enable,SetUpdateRecords=write.UpdateRecord==EntityImportOption.Enable },
        new() {
            OverrideGen1=new() { Language=SaveLanguage.OverrideLanguageGen1,Version=SaveLanguage.OverrideVersionGen1 },
            OverrideGen2=new() { Language=SaveLanguage.OverrideLanguageGen2,Version=SaveLanguage.OverrideVersionGen2 },
            OverrideGen3RS=new() { Language=SaveLanguage.OverrideLanguageGen3RS,Version=SaveLanguage.OverrideVersionGen3RS },
            OverrideGen3FRLG=new() { Language=SaveLanguage.OverrideLanguageGen3FRLG,Version=SaveLanguage.OverrideVersionGen3FRLG },
        });
        return new(settings,write);
    }
    private static void Restore(Snapshot snapshot)
    {
        var previous = snapshot.Settings;
        ApplyOwned(previous);
        SaveFile.SetUpdateDex=snapshot.Imports.UpdatePokeDex;
        SaveFile.SetUpdatePKM=snapshot.Imports.UpdateToSaveFile;
        SaveFile.SetUpdateRecords=snapshot.Imports.UpdateRecord;
        // Source Apply deliberately ignores some version values (including Any).
        // Restoration must recover exact grouped fallbacks rather than retain a
        // version selected by the disposed request.
        SaveLanguage.OverrideVersionGen1=previous.SaveLanguage.OverrideGen1.Version;
        SaveLanguage.OverrideVersionGen2=previous.SaveLanguage.OverrideGen2.Version;
        SaveLanguage.OverrideVersionGen3RS=previous.SaveLanguage.OverrideGen3RS.Version;
        SaveLanguage.OverrideVersionGen3FRLG=previous.SaveLanguage.OverrideGen3FRLG.Version;
    }
    private static void ApplyOwned(SaveCoreSettings owned)
    {
        owned.SaveLanguage.Apply();
        SaveFile.SetUpdateDex = owned.SlotWrite.SetUpdateDex ? EntityImportOption.Enable : EntityImportOption.Disable;
        SaveFile.SetUpdatePKM = owned.SlotWrite.SetUpdatePKM ? EntityImportOption.Enable : EntityImportOption.Disable;
        SaveFile.SetUpdateRecords = owned.SlotWrite.SetUpdateRecords ? EntityImportOption.Enable : EntityImportOption.Disable;
        CommonEdits.ShowdownSetIVMarkings = owned.Import.ApplyMarkings;
        CommonEdits.ShowdownSetBehaviorNature = owned.Import.ApplyStatAlignment;
        ParseSettings.Initialize(owned.Legality);
        EntityConverter.AllowIncompatibleConversion = owned.Converter.AllowIncompatibleConversion;
        EntityConverter.RejuvenateHOME = owned.Converter.AllowGuessRejuvenateHOME;
        EntityConverter.VirtualConsoleSourceGen1 = owned.Converter.VirtualConsoleSourceGen1;
        EntityConverter.VirtualConsoleSourceGen2 = owned.Converter.VirtualConsoleSourceGen2;
        EntityConverter.RetainMetDateTransfer45 = owned.Converter.RetainMetDateTransfer45;
    }
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveCoreSettings))]
internal partial class SaveCoreSettingsJson : JsonSerializerContext { }

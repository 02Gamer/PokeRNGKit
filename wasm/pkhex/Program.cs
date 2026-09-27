using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

// SPDX-License-Identifier: GPL-3.0-or-later
namespace PokeRNGKit.SaveEditor;

public static partial class Program
{
    public static void Main() { }

    [JSExport]
    public static void ConfigureBrowserCrypto()
    {
        RuntimeCryptographyProvider.Aes = new BrowserAesProvider();
        RuntimeCryptographyProvider.Md5 = new BrowserMd5Provider();
    }

    [JSExport]
    public static string Inspect(byte[] data) => SaveService.Inspect(data);

    [JSExport]
    public static string ReadInventory(byte[] data) => SaveService.ReadInventory(data);

    [JSExport]
    public static string ReadRecords(byte[] data) => SaveService.ReadRecords(data);

    [JSExport]
    public static byte[] EditRecord(byte[] data,string json) => SaveService.EditRecord(data,json);

    [JSExport]
    public static byte[] EditInventory(byte[] data, string json) => SaveService.EditInventory(data, json);

    [JSExport]
    public static byte[] EditInventoryBatch(byte[] data, string json) => SaveService.EditInventoryBatch(data, json);

    [JSExport]
    public static byte[] Export(byte[] data, string json) => SaveService.Export(data, json);

    [JSExport]
    public static string AnalyzePokemon(byte[] data, string json) => SaveService.AnalyzePokemon(data, json);

    [JSExport]
    public static byte[] EditPokemon(byte[] data, string json) => SaveService.EditPokemon(data, json);

    [JSExport]
    public static byte[] EditPokemonRaw(byte[] data, string json) => SaveService.EditPokemonRaw(data, json);

    [JSExport]
    public static byte[] EditBox(byte[] data, string json) => SaveService.EditBox(data, json);

    [JSExport]
    public static byte[] EditStorage(byte[] data, string json) => SaveService.EditStorage(data, json);

    [JSExport]
    public static string ExportPokemon(byte[] data, string json) => SaveService.ExportPokemon(data, json);

    [JSExport]
    public static string ReadHistory(byte[] data, string json) => SaveService.ReadHistory(data, json);

    [JSExport]
    public static string ReadMemory(byte[] data, string json) => SaveService.ReadMemory(data, json);

    [JSExport]
    public static string ReadRibbons(byte[] data, string json) => SaveService.ReadRibbons(data, json);

    [JSExport]
    public static string SuggestRelearn(byte[] data, string json) => SaveService.SuggestRelearn(data, json);

    [JSExport]
    public static string ReadOrigin(byte[] data, string json) => SaveService.ReadOrigin(data, json);

    [JSExport]
    public static byte[] ImportPokemon(byte[] data, string json) => SaveService.ImportPokemon(data, json);
}

public static class SaveService
{
    public const int MaximumSize = 32 * 1024 * 1024;

    public static string ReadRecords(byte[] data) => JsonSerializer.Serialize(SaveRecords.Read(Open(data)),SaveJsonContext.Default.SaveRecordCatalog);
    public static byte[] EditRecord(byte[] data,string json)
    {
        var save=Open(data);
        if(!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.SaveRecordEdit) ?? throw new ArgumentException("Missing game record edit.");
        var expected=SaveRecords.Apply(save,edit);
        var output=save.Write().ToArray(); var check=Open(output);
        if(!check.ChecksumsValid || check.GetType()!=save.GetType() || SaveRecords.Snapshot(check)!=expected)
            throw new InvalidOperationException("Game record export verification failed.");
        return output;
    }

    public static string ReadInventory(byte[] data) =>
        JsonSerializer.Serialize(InventoryReader.Read(Open(data)), SaveJsonContext.Default.BagReport);

    public static byte[] EditInventory(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.BagEdit) ?? throw new ArgumentException("Missing inventory edit.");
        var expected = InventoryEditing.Apply(save, edit);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!check.ChecksumsValid || check.GetType() != save.GetType() || InventoryEditing.Snapshot(check) != expected)
            throw new InvalidOperationException("Inventory export verification failed.");
        return output;
    }

    public static byte[] EditInventoryBatch(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.BagOperation) ?? throw new ArgumentException("Missing inventory action.");
        var expected = InventoryBatch.Apply(save,edit);
        var output = save.Write().ToArray(); var check = Open(output);
        if (!check.ChecksumsValid || check.GetType() != save.GetType() || InventoryEditing.Snapshot(check) != expected)
            throw new InvalidOperationException("Inventory export verification failed.");
        return output;
    }

    private static SaveFile Open(byte[] data)
    {
        if (data.Length is 0 or > MaximumSize)
            throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        if (data.Length >= 4 && data[0] == 0x50 && data[1] == 0x4B && data[2] == 3 && data[3] == 4)
            throw new ArgumentException("Extract the save from its ZIP archive before opening it.");
        // PKHeX owns this copy. Never pass the caller's original buffer to a parser.
        return SaveUtil.GetSaveFile(data.ToArray())
            ?? throw new ArgumentException("Unrecognized save file. Open decrypted save data, not a ROM or encrypted console container.");
    }

    private static bool CanEdit(SaveFile save) => save is
        SAV3RS or SAV3E or SAV3FRLG or SAV3Colosseum or SAV3XD or
        SAV4DP or SAV4Pt or SAV4HGSS or SAV5BW or SAV5B2W2 or
        SAV6XY or SAV6AO or SAV7SM or SAV7USUM or SAV8SWSH or SAV8BS;

    public static string ReadHistory(byte[] data, string json)
    {
        var save = Open(data);
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition) ?? throw new ArgumentException("Missing history query.");
        return JsonSerializer.Serialize(PokemonHistory.Read(PokemonEditing.Read(save, query.Box, query.Slot)), SaveJsonContext.Default.HistoryCatalog);
    }

    public static string ReadMemory(byte[] data, string json)
    {
        var save = Open(data);
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.MemoryQuery) ?? throw new ArgumentException("Missing memory query.");
        return JsonSerializer.Serialize(PokemonMemories.Read(PokemonEditing.Read(save, query.Box, query.Slot), query.Handler, query.Memory), SaveJsonContext.Default.MemoryCatalog);
    }

    public static string ReadRibbons(byte[] data, string json)
    {
        var save = Open(data);
        var position = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition) ?? throw new ArgumentException("Missing Pokemon position.");
        return JsonSerializer.Serialize(PokemonRibbons.Read(PokemonEditing.Read(save, position.Box, position.Slot), analyze: true), SaveJsonContext.Default.RibbonCatalog);
    }

    public static string SuggestRelearn(byte[] data, string json)
    {
        var save = Open(data);
        var position = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition)
            ?? throw new ArgumentException("Missing Pokemon position.");
        return JsonSerializer.Serialize(PokemonRelearn.Suggest(save, position), SaveJsonContext.Default.UInt16Array);
    }

    public static string ReadOrigin(byte[] data, string json)
    {
        var save = Open(data);
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.OriginQuery)
            ?? throw new ArgumentException("Missing origin query.");
        return JsonSerializer.Serialize(PokemonOrigin.Catalog(save, query), SaveJsonContext.Default.OriginCatalog);
    }

    public static string AnalyzePokemon(byte[] data, string json)
    {
        var save = Open(data);
        var position = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition)
            ?? throw new ArgumentException("Missing Pokemon position.");
        return JsonSerializer.Serialize(PokemonLegality.Analyze(save, position), SaveJsonContext.Default.PokemonLegalityReport);
    }

    public static byte[] EditPokemon(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonEdit)
            ?? throw new ArgumentException("Missing Pokemon values.");
        edit = PokemonEditing.Apply(save, edit);
        var position = new PokemonPosition(edit.Box, edit.Slot);
        var expected = StorageEditing.StoredData(save, position);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!check.ChecksumsValid || check.GetType() != save.GetType() || !StorageEditing.StoredData(check, position).SequenceEqual(expected))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        PokemonEditing.Verify(check, edit);
        return output;
    }

    public static string Inspect(byte[] data)
    {
        var save = Open(data);
        var valid = save.ChecksumsValid;
        var report = new SaveReport(
            43, save.GetType().Name, save.Generation, save.Version.ToString(),
            save.OT, save.TID16, save.SID16, save.DisplayTID, save.DisplaySID,
            save.Language, save.Gender, save.Money, save.MaxMoney,
            save is SAV3 { Japanese: true } ? 5 : save.MaxStringLengthTrainer,
            save.BoxCount, save.PartyCount, save.PlayTimeString, valid,
            valid && CanEdit(save) && save.State.Exportable,
            save.Extension, save is SAV4 gen4 ? gen4.NationalDex : null,
            PokemonReader.Read(save), save.BoxSlotCount, PokemonReader.Boxes(save), PokemonReader.MoveChoices(save), BoxEditing.Options(save), PokemonReader.Attributes(save), TrainerEditing.Options(save));
        return JsonSerializer.Serialize(report, SaveJsonContext.Default.SaveReport);
    }

    public static string ExportPokemon(byte[] data, string json)
    {
        var save = Open(data);
        var position = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition)
            ?? throw new ArgumentException("Missing Pokemon position.");
        return JsonSerializer.Serialize(PokemonFiles.Export(save, position), SaveJsonContext.Default.PokemonFile);
    }

    public static byte[] ImportPokemon(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonImport)
            ?? throw new ArgumentException("Missing Pokemon file.");
        var position = PokemonFiles.Import(save, request);
        var expected = StorageEditing.StoredData(save, position);
        var partyCount = save.PartyCount;
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!check.ChecksumsValid || check.GetType() != save.GetType() || check.PartyCount != partyCount ||
            !StorageEditing.StoredData(check, position).SequenceEqual(expected))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }

    public static byte[] EditPokemonRaw(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonRawEdit)
            ?? throw new ArgumentException("Missing Pokemon values.");
        PokemonRawEditing.Apply(save, edit);
        var position = new PokemonPosition(edit.Box, edit.Slot);
        var expected = StorageEditing.StoredData(save, position);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!check.ChecksumsValid || check.GetType() != save.GetType() || check.PartyCount != save.PartyCount ||
            !StorageEditing.StoredData(check, position).SequenceEqual(expected))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }

    public static byte[] EditStorage(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.StorageEdit)
            ?? throw new ArgumentException("Missing storage values.");
        if (edit.Source is null) throw new ArgumentException("Storage source is missing.");
        var positions = StorageEditing.Apply(save, edit);
        var expected = positions.Select(p => StorageEditing.StoredData(save, p)).ToArray();
        var partyCount = save.PartyCount;
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!check.ChecksumsValid || check.GetType() != save.GetType() || check.PartyCount != partyCount ||
            positions.Where((position, index) => !StorageEditing.StoredData(check, position).SequenceEqual(expected[index])).Any())
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }

    public static byte[] EditBox(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.BoxEdit)
            ?? throw new ArgumentException("Missing box values.");
        BoxEditing.Apply(save, edit);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!check.ChecksumsValid || check.GetType() != save.GetType())
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        BoxEditing.Verify(check, edit);
        return output;
    }

    public static byte[] Export(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.TrainerEdit)
            ?? throw new ArgumentException("Missing trainer values.");
        TrainerEditing.Apply(save,edit);
        var expected = TrainerEditing.Snapshot(save);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!check.ChecksumsValid || check.GetType() != save.GetType() ||
            TrainerEditing.Snapshot(check) != expected)
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }
}

public sealed record SaveReport(
    int ApiVersion, string Format, byte Generation, string Version, string Ot,
    ushort Tid, ushort Sid, uint DisplayTid, uint DisplaySid, int Language,
    byte Gender, uint Money, int MaxMoney, int MaxNameLength, int BoxCount,
    int PartyCount, string PlayTime, bool ChecksumsValid, bool CanEdit,
    string Extension, bool? NationalDex, PokemonEntry[] Pokemon, int BoxSlotCount, BoxEntry[] Boxes, MoveChoice[] MoveChoices, BoxOptions BoxOptions, AttributeChoices AttributeChoices, TrainerOptions Trainer);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveReport))]
[JsonSerializable(typeof(SaveRecordCatalog))]
[JsonSerializable(typeof(SaveRecordEdit))]
[JsonSerializable(typeof(BagReport))]
[JsonSerializable(typeof(BagEdit))]
[JsonSerializable(typeof(BagOperation))]
[JsonSerializable(typeof(RibbonCatalog))]
[JsonSerializable(typeof(MemoryQuery))]
[JsonSerializable(typeof(MemoryCatalog))]
[JsonSerializable(typeof(HistoryCatalog))]
[JsonSerializable(typeof(ushort[]))]
[JsonSerializable(typeof(OriginQuery))]
[JsonSerializable(typeof(OriginCatalog))]
[JsonSerializable(typeof(TrainerEdit))]
[JsonSerializable(typeof(PokemonEdit))]
[JsonSerializable(typeof(PokemonRawEdit))]
[JsonSerializable(typeof(BoxEdit))]
[JsonSerializable(typeof(StorageEdit))]
[JsonSerializable(typeof(PokemonImport))]
[JsonSerializable(typeof(PokemonFile))]
[JsonSerializable(typeof(PokemonPosition))]
[JsonSerializable(typeof(PokemonLegalityReport))]
internal partial class SaveJsonContext : JsonSerializerContext;

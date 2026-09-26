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
    public static byte[] Export(byte[] data, string json) => SaveService.Export(data, json);
}

public static class SaveService
{
    public const int MaximumSize = 32 * 1024 * 1024;

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

    public static string Inspect(byte[] data)
    {
        var save = Open(data);
        var valid = save.ChecksumsValid;
        var report = new SaveReport(
            2, save.GetType().Name, save.Generation, save.Version.ToString(),
            save.OT, save.TID16, save.SID16, save.DisplayTID, save.DisplaySID,
            save.Language, save.Gender, save.Money, save.MaxMoney,
            save is SAV3 { Japanese: true } ? 5 : save.MaxStringLengthTrainer,
            save.BoxCount, save.PartyCount, save.PlayTimeString, valid,
            valid && CanEdit(save) && save.State.Exportable,
            save.Extension, save is SAV4 gen4 ? gen4.NationalDex : null,
            PokemonReader.Read(save));
        return JsonSerializer.Serialize(report, SaveJsonContext.Default.SaveReport);
    }

    public static byte[] Export(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !save.ChecksumsValid)
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.TrainerEdit)
            ?? throw new ArgumentException("Missing trainer values.");
        var maxName = save is SAV3 { Japanese: true } ? 5 : save.MaxStringLengthTrainer;
        if (edit.Ot.Length == 0 || edit.Ot.Length > maxName || edit.Ot.Any(char.IsControl))
            throw new ArgumentException($"Trainer name must contain 1–{maxName} supported characters.");
        if (edit.Money > save.MaxMoney)
            throw new ArgumentException($"Money must be between 0 and {save.MaxMoney}.");

        save.OT = edit.Ot;
        save.TID16 = edit.Tid;
        save.SID16 = edit.Sid;
        save.Money = edit.Money;
        // A name can be the right length but unrepresentable in an older game's charset.
        if (save.OT != edit.Ot)
            throw new ArgumentException("This game cannot represent the requested trainer name.");

        var output = save.Write().ToArray();
        var check = Open(output);
        if (!check.ChecksumsValid || check.GetType() != save.GetType() ||
            check.OT != edit.Ot || check.TID16 != edit.Tid ||
            check.SID16 != edit.Sid || check.Money != edit.Money)
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }
}

public sealed record TrainerEdit(string Ot, ushort Tid, ushort Sid, uint Money);
public sealed record SaveReport(
    int ApiVersion, string Format, byte Generation, string Version, string Ot,
    ushort Tid, ushort Sid, uint DisplayTid, uint DisplaySid, int Language,
    byte Gender, uint Money, int MaxMoney, int MaxNameLength, int BoxCount,
    int PartyCount, string PlayTime, bool ChecksumsValid, bool CanEdit,
    string Extension, bool? NationalDex, PokemonEntry[] Pokemon);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveReport))]
[JsonSerializable(typeof(TrainerEdit))]
internal partial class SaveJsonContext : JsonSerializerContext;

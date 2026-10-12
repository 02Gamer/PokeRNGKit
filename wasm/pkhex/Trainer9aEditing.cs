// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
using static PKHeX.Core.SaveBlockAccessor9ZA;

namespace PokeRNGKit.SaveEditor;

public sealed record Trainer9aMap(bool Editable, string Name, string X, string Y, string Z, string Rotation, float[] Quaternion);
public sealed record Trainer9aDlc(uint SurveyPoints, string StreetName);
public sealed record Trainer9aImage(string FileName, Trainer9Image Image);
public sealed record Trainer9aScrew(string FieldItem, float X, float Y, float Z);
public sealed record Trainer9aCatalog(bool CanEdit, string SourceHash, int Revision, string Name, string NameTrash, uint Id, uint Tid, uint Sid, uint Tsv, byte Gender, int Language, uint Money, uint RoyaleRegular, uint RoyaleInfinite, int Hours, int Minutes, int Seconds, string Saved, Trainer9aMap Map, Trainer9aDlc? Dlc, Trainer9aImage[] Images, Trainer9aScrew[] RemainingScrews, uint ScrewQuantity, string[] Fashion, OriginChoice[] Languages, OriginChoice[] TrashSpecies, OriginChoice[] TrashLanguages)
{
    // PKHeX.WinForms Subforms/PKM Editors/Text.cs: SpecialCharsGen8 for all Switch contexts.
    public int[] SpecialChars { get; init; } = "…♂♀♠♣♥♦★◎○□△◇♪☀☁☂☃".Select(c => (int)c).ToArray();
}

internal static class Trainer9aEditing
{
    internal static bool Supports(SaveFile save) => save is SAV9ZA za && za.GetValue<ulong>(KSaveRevision) <= 2;

    internal static Trainer9aCatalog Read(SaveFile source, string hash)
    {
        if (source is not SAV9ZA save || !Supports(save))
            throw new ArgumentException("Trainer9a tools are unsupported for this save.");
        string saved;
        try { saved = save.LastSaved.Timestamp.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture); }
        catch (ArgumentOutOfRangeException) { saved = ""; }
        var c = save.Coordinates;
        var values = new[] { (double)c.X, c.Y, c.Z, c.Rotation };
        bool editable = values.All(v => double.IsFinite(v) && v >= -99999999 && v <= 99999999);
        static string Value(double value) => value.ToString("0.######", CultureInfo.InvariantCulture);
        var languages = GameInfo.LanguageDataSource(save.Generation, save.Context).Select(v => new OriginChoice(v.Value, new(GameInfo.GetStrings("zh-Hans").languageNames[v.Value], GameInfo.GetStrings("en").languageNames[v.Value], GameInfo.GetStrings("ja").languageNames[v.Value]))).ToArray();
        var images = new[]
        {
            Image(save.Blocks, "current", nameof(KPictureSBCData), KPictureCurrentData, KPictureCurrentWidth, KPictureCurrentHeight),
            Image(save.Blocks, "sbc", nameof(KPictureInitialData), KPictureSBCData, KPictureSBCWidth, KPictureSBCHeight),
            Image(save.Blocks, "initial", nameof(KPictureCurrentData), KPictureInitialData, KPictureInitialWidth, KPictureInitialHeight),
        };
        var remaining = ColorfulScrew9a.GetScrewLocations(save, false).Select(v => new Trainer9aScrew(v.FieldItem, v.Point.X, v.Point.Y, v.Point.Z)).ToArray();
        var f = save.PlayerFashion;
        var fashion = new[] { f.Base, f.Accessory, f.Bag, f.Eyewear, f.Footwear, f.Gloves, f.Headwear, f.Hairstyle, f.Legwear, f.Clothing, f.Eyes, f.LowerBody, f.UpperBody }.Select(v => v.ToString("X16", CultureInfo.InvariantCulture)).ToArray();
        var dlc = save.SaveRevision == 0 ? null : new Trainer9aDlc(save.GetValue<uint>(KHyperspaceSurveyPoints), save.GetString(save.Blocks.GetBlock(KStreetName).Data));
        return new(save.State.Exportable && SaveChecksums.Valid(save), hash, save.SaveRevision, save.OT, Convert.ToHexString(save.MyStatus.OriginalTrainerTrash), save.ID32, save.GetTrainerTID7(), save.GetTrainerSID7(), save.GetTSV(9), save.Gender, save.Language, save.Money, save.TicketPointsRoyale, save.TicketPointsRoyaleInfinite, save.PlayedHours, save.PlayedMinutes, save.PlayedSeconds, saved, new(editable, c.Map, Value(values[0]), Value(values[1]), Value(values[2]), Value(values[3]), [c.RX, c.RY, c.RZ, c.RW]), dlc, images, remaining, save.Items.GetItemQuantity(ColorfulScrew9a.ColorfulScrewItemIndex), fashion, languages, Hall6TrashEditing.Species.Value, languages);
    }

    private static Trainer9aImage Image(SCBlockAccessor blocks, string key, string fileName, uint dataKey, uint widthKey, uint heightKey)
    {
        Trainer9aImage Unavailable(string error, int w = 0, int h = 0) => new(fileName, new(key, false, w, h, null, error));
        if (!blocks.TryGetBlock(dataKey, out var data) || !blocks.TryGetBlock(widthKey, out var widthBlock) || !blocks.TryGetBlock(heightKey, out var heightBlock))
            return Unavailable("missing");
        if (data.Type != SCTypeCode.Object || widthBlock.Type != SCTypeCode.UInt32 || heightBlock.Type != SCTypeCode.UInt32 || widthBlock.Data.Length != 4 || heightBlock.Data.Length != 4)
            return Unavailable("type");
        uint width = blocks.GetBlockValue<uint>(widthKey), height = blocks.GetBlockValue<uint>(heightKey);
        if (width == 0 && height == 0) return Unavailable("empty");
        // Browser resource bounds supplement DXT1's nonzero, multiple-of-four dimensions.
        if (width == 0 || height == 0 || width % 4 != 0 || height % 4 != 0 || width > 4096 || height > 4096 || (ulong)width * height > 4194304 || (ulong)data.Data.Length < (ulong)width * height / 2)
            return Unavailable("dimensions");
        var pixels = CGear5Editing.SwapRedBlue(DXT1.Decompress(data.Data, (int)width, (int)height));
        return new(fileName, new(key, true, (int)width, (int)height, Convert.ToBase64String(pixels), null));
    }
}

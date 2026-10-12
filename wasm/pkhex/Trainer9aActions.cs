// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using PKHeX.Core;
using static PKHeX.Core.SaveBlockAccessor9ZA;

namespace PokeRNGKit.SaveEditor;

public sealed record Trainer9aRequest(
    [property: JsonRequired] string SourceHash,
    [property: JsonRequired] string Name,
    [property: JsonRequired] uint Id,
    [property: JsonRequired] byte Gender,
    [property: JsonRequired] int Language,
    [property: JsonRequired] string Money,
    [property: JsonRequired] string RoyaleRegular,
    [property: JsonRequired] string RoyaleInfinite,
    [property: JsonRequired] string Hours,
    [property: JsonRequired] string Minutes,
    [property: JsonRequired] string Seconds,
    [property: JsonRequired] string Saved,
    [property: JsonRequired] bool MapUpdated,
    [property: JsonRequired] string MapName,
    [property: JsonRequired] string[] Map,
    string? SurveyPoints = null, string? StreetName = null,
    string[]? Operations = null, Trainer9IdEvent[]? IdEvents = null, Hall6Trash[]? NameEvents = null);
public sealed record Trainer9aOperation(string Key, int Count);

internal static class Trainer9aActions
{
    internal static byte[] Prepare(SAV9ZA source, byte[] original, Trainer9aRequest request, out Trainer9aOperation[] operations)
    {
        if (request.SourceHash != Br4Editing.Hash(original)) throw new ArgumentException("Trainer9a preview is stale.");
        if (!SwishCrypto.GetIsHashValid(original)) throw new ArgumentException("Trainer9a source hash is invalid.");
        // Clone the block array. Never mutate the caller while preparing a preview.
        var save = (SAV9ZA)source.Clone();
        operations = Apply(save, request);
        var output = save.Write().ToArray();
        var reread = new SAV9ZA(output.ToArray());
        if (!SwishCrypto.GetIsHashValid(output) || !SaveChecksums.Valid(reread) || !Trainer9aEditing.Supports(reread) || reread.Version != source.Version)
            throw new InvalidOperationException("Trainer9a export verification failed.");
        return output;
    }

    internal static Trainer9aOperation[] Apply(SAV9ZA save, Trainer9aRequest request)
    {
        if (!Trainer9aEditing.Supports(save) || !save.State.Exportable || !SaveChecksums.Valid(save) || request.Name is null || request.Name.Length > 12 || request.Gender > 1 || !GameInfo.LanguageDataSource(save.Generation, save.Context).Any(v => v.Value == request.Language))
            throw new ArgumentException("Invalid Trainer9a trainer fields.");
        static uint Number(string? text, int width)
        {
            if (text is null || text.Length > width || text.Any(c => c < '0' || c > '9')) throw new ArgumentException("Invalid Trainer9a numeric text.");
            return text.Length == 0 ? 0 : uint.Parse(text, CultureInfo.InvariantCulture);
        }
        uint money = Number(request.Money, 7), regular = Number(request.RoyaleRegular, 7), infinite = Number(request.RoyaleInfinite, 7), hours = Number(request.Hours, 5), minutes = Number(request.Minutes, 2), seconds = Number(request.Seconds, 2);
        if (request.Hours.Length == 0 || hours > ushort.MaxValue) throw new ArgumentException("Invalid Trainer9a played hours.");
        if (!DateTime.TryParseExact(request.Saved, "yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var saved) || saved.Date < new DateTime(1753, 1, 1) || saved.Year > 4095)
            throw new ArgumentException("Invalid Trainer9a date.");
        uint survey = 0;
        if (save.SaveRevision == 0)
        {
            if (request.SurveyPoints is not null || request.StreetName is not null) throw new ArgumentException("Trainer9a DLC is unavailable.");
        }
        else
        {
            survey = Number(request.SurveyPoints, 7);
            if (request.StreetName is null || request.StreetName.Length > 18) throw new ArgumentException("Invalid Trainer9a street name.");
        }
        decimal[]? map = null;
        if (request.MapUpdated)
        {
            if (!Trainer9aEditing.Read(save, request.SourceHash).Map.Editable || request.Map is null || request.Map.Length != 4 || request.MapName is null || request.MapName.Length > 32)
                throw new ArgumentException("Invalid Trainer9a map fields.");
            map = request.Map.Select(text =>
            {
                if (text is null || !decimal.TryParse(text, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value) || value < -99999999 || value > 99999999 || decimal.Round(value, 6) != value)
                    throw new ArgumentException("Invalid Trainer9a coordinate.");
                return value;
            }).ToArray();
        }
        if (request.Operations?.Length > 32 || request.NameEvents?.Length > 512) throw new ArgumentException("Too many Trainer9a events.");
        if (request.IdEvents is not null) { save.ID32 = request.Id; Trainer9Ids.Apply(save, request.IdEvents); }
        if (request.NameEvents is not null)
            foreach (var e in request.NameEvents) NameEvent(save, e);
        // Source buttons act on the cloned save before SaveTrainerInfo/SaveMap/SaveDLC.
        var results = new List<Trainer9aOperation>();
        foreach (string operation in request.Operations ?? [])
        {
            int count;
            switch (operation)
            {
                case "technicalMachines": count = TechnicalMachine9a.SetAllTechnicalMachines(save, true); break;
                case "screws": count = ColorfulScrew9a.CollectScrews(save); break;
                case "resetAndCollectScrews": ColorfulScrew9a.SetAllScrews(save); count = ColorfulScrew9a.CollectScrews(save); break;
                default: throw new ArgumentException("Invalid Trainer9a operation.");
            }
            results.Add(new(operation, count));
        }
        if (save.Gender != request.Gender) { save.Gender = request.Gender; save.PlayerFashion.Reset(); }
        save.Money = money;
        save.Language = request.Language;
        if (request.IdEvents is null) save.ID32 = request.Id;
        if (request.NameEvents is null && save.OT != request.Name) save.OT = request.Name;
        save.PlayedHours = (ushort)hours;
        save.PlayedMinutes = (ushort)minutes % 60;
        save.PlayedSeconds = (ushort)seconds % 60;
        save.LastSaved.Timestamp = saved;
        save.TicketPointsRoyale = regular;
        save.TicketPointsRoyaleInfinite = infinite;
        if (map is not null)
        {
            save.Coordinates.SetCoordinates((float)map[0], (float)map[1], (float)map[2]);
            save.Coordinates.SetPlayerRotation((double)map[3]);
            save.Coordinates.Map = request.MapName;
        }
        if (save.SaveRevision != 0)
        {
            save.SetValue(KHyperspaceSurveyPoints, survey);
            save.SetString(save.Blocks.GetBlock(KStreetName).Data, request.StreetName!, 18, StringConverterOption.ClearZero);
        }
        return results.ToArray();
    }

    private static void NameEvent(SAV9ZA save, Hall6Trash e)
    {
        if (e is null || e.Action != "layer" && (e.Species is not null || e.Language is not null || e.Generation is not null || e.UiLanguage is not null) || e.Action != "hex" && e.Hex is not null || e.Action != "text" && e.Text is not null)
            throw new ArgumentException("Invalid Trainer9a name fields.");
        var bytes = save.MyStatus.OriginalTrainerTrash.ToArray();
        string old = save.OT;
        byte[] Encode(string text) { var data = new byte[26]; int length = save.SetString(data, text, text.Length, StringConverterOption.None); return data[..length]; }
        switch (e.Action)
        {
            case "prepare": Encode(old).CopyTo(bytes, 0); break;
            case "text":
                if (e.Text is null || e.Text.Length > 12) throw new ArgumentException("Invalid Trainer9a name text.");
                Encode(e.Text).CopyTo(bytes, 0); break;
            case "hex":
                if (e.Hex is null || e.Hex.Length != 52 || e.Hex.Any(c => !char.IsAsciiHexDigit(c))) throw new ArgumentException("Invalid Trainer9a name hex.");
                bytes = Convert.FromHexString(e.Hex); break;
            case "clear": int start = Encode(old).Length; Array.Clear(bytes, start, 26 - start); break;
            case "layer":
                if (e.Species is null || !Hall6TrashEditing.Species.Value.Any(v => v.Id == e.Species) || e.Language is null || !GameInfo.LanguageDataSource(save.Generation, save.Context).Any(v => v.Value == e.Language) || e.Generation is null or < 0 or > 100 || e.UiLanguage is not ("zh" or "en" or "ja"))
                    throw new ArgumentException("Invalid Trainer9a name layer.");
                string name = SpeciesName.GetSpeciesNameGeneration((ushort)e.Species.Value, e.Language.Value, (byte)e.Generation.Value);
                if (name.Length == 0) { var choice = Hall6TrashEditing.Species.Value.Single(v => v.Id == e.Species); name = e.UiLanguage == "zh" ? choice.Name.Zh : e.UiLanguage == "ja" ? choice.Name.Ja : choice.Name.En; }
                var layer = Encode(name); int from = Encode(old).Length;
                if (layer.Length <= from || layer.Length > 26) throw new ArgumentException("Trainer9a name layer is hidden or too long.");
                layer.AsSpan(from).CopyTo(bytes.AsSpan(from)); break;
            default: throw new ArgumentException("Invalid Trainer9a name action.");
        }
        string next = save.GetString(bytes);
        if (next != old) save.OT = next;
        bytes.CopyTo(save.MyStatus.OriginalTrainerTrash);
    }
}

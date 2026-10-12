// SPDX-License-Identifier: GPL-3.0-or-later
using System.Reflection;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static PKHeX.Core.SaveBlockAccessor9ZA;
using static System.Buffers.Binary.BinaryPrimitives;

internal static class Trainer9aEditingTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { bool rejected = false; try { action(); } catch (ArgumentException) { rejected = true; } Check(rejected, "Invalid Trainer9a input accepted"); }
    private static SAV9ZA Open(byte[] bytes) => new(bytes.ToArray());

    internal static byte[] Create(int revision)
    {
        var seed = Open(ZaBlockFixtureTests.Create(revision));
        var scalars = new[] { KTicketPointsZARoyale, KTicketPointsZARoyaleInfinite, KHyperspaceSurveyPoints, KPictureCurrentWidth, KPictureCurrentHeight, KPictureSBCWidth, KPictureSBCHeight, KPictureInitialWidth, KPictureInitialHeight };
        var blocks = seed.AllBlocks.Select(b => b.Key == KPlayedSeconds ? SwshBlockFixtureTests.Typed(b.Key, b.Data.ToArray(), SCTypeCode.Double) : scalars.Contains(b.Key) ? SwshBlockFixtureTests.Typed(b.Key, b.Data.ToArray(), SCTypeCode.UInt32) : b.Clone()).ToArray();
        var save = new SAV9ZA(SwishCrypto.Encrypt(blocks));
        save.LastSaved.Timestamp = new DateTime(2024, 1, 2, 3, 4, 5);
        save.Played.RawSeconds = 3723.75;
        save.OT = "ORIGINAL";
        save.Gender = 0;
        save.Coordinates.Map = "a0101";
        save.Coordinates.SetCoordinates(11.25f, -22.5f, 33.75f);
        save.Coordinates.SetPlayerRotation(90);
        save.PlayerFashion.Data.Fill(0xA5);
        save.Items.ResetToDefault();
        save.Items.SetItemQuantity(ColorfulScrew9a.ColorfulScrewItemIndex, 9);
        save.TicketPointsRoyale = 111;
        save.TicketPointsRoyaleInfinite = 222;
        if (revision > 0) { save.SetValue(KHyperspaceSurveyPoints, 333u); save.SetString(save.Blocks.GetBlock(KStreetName).Data, "OLD STREET", 18, StringConverterOption.ClearZero); }
        // Fixture only: populate the exact read-only Core location keys; no product blocks are fabricated.
        var screws = ((string FieldItem, (float X, float Y, float Z) Point)[])typeof(ColorfulScrew9a).GetField("ColorfulScrews", BindingFlags.NonPublic | BindingFlags.Static)!.GetValue(null)!;
        var keys = screws.Select(v => FnvHash.HashFnv1a_64(v.FieldItem)).Concat(TechnicalMachine9a.TechnicalMachines.Select(v => FnvHash.HashFnv1a_64(v.FieldItem))).Distinct().ToArray();
        var field = save.Blocks.FieldItems.Data;
        Check(field.Length >= (keys.Length + 1) * 16, "Fixture holds all source collection keys");
        field.Clear();
        for (int i = 0; i < field.Length / 16; i++) WriteUInt64LittleEndian(field[(i * 16)..], FnvHash.HashEmpty);
        for (int i = 0; i < keys.Length; i++) WriteUInt64LittleEndian(field[(i * 16)..], keys[i]);
        foreach (var (data, width, height) in new[] { (KPictureCurrentData, KPictureCurrentWidth, KPictureCurrentHeight), (KPictureSBCData, KPictureSBCWidth, KPictureSBCHeight), (KPictureInitialData, KPictureInitialWidth, KPictureInitialHeight) })
        {
            save.SetValue(width, 4u); save.SetValue(height, 4u);
            var bytes = save.Blocks.GetBlock(data).Data;
            bytes[..8].Clear(); WriteUInt16LittleEndian(bytes, 0xF800); WriteUInt16LittleEndian(bytes[2..], 0x07E0);
        }
        return save.Write().ToArray();
    }

    internal static Trainer9aRequest Request(byte[] original)
    {
        var c = Trainer9aEditing.Read(Open(original), Br4Editing.Hash(original));
        return new(c.SourceHash, "TRAINER", 123456, 1, 2, "7654321", "310000", "50000", "65535", "99", "98", "2025-02-03T04:05:06", true, "a0202", ["-123.125", "456.25", "789.5", "180"], c.Dlc is null ? null : "100000", c.Dlc is null ? null : "NEW STREET");
    }

    private static void SourceSave(SAV9ZA save, Trainer9aRequest r)
    {
        // Independent transcription of SAV_Trainer9a.SaveTrainerInfo/SaveMap/SaveDLC.
        if (save.Gender != r.Gender) { save.Gender = r.Gender; save.PlayerFashion.Reset(); }
        save.Money = uint.Parse(r.Money);
        save.Language = r.Language;
        save.ID32 = r.Id;
        if (save.OT != r.Name) save.OT = r.Name;
        save.PlayedHours = ushort.Parse(r.Hours);
        save.PlayedMinutes = ushort.Parse(r.Minutes) % 60;
        save.PlayedSeconds = ushort.Parse(r.Seconds) % 60;
        save.LastSaved.Timestamp = DateTime.ParseExact(r.Saved, "yyyy-MM-ddTHH:mm:ss", System.Globalization.CultureInfo.InvariantCulture);
        save.TicketPointsRoyale = uint.Parse(r.RoyaleRegular);
        save.TicketPointsRoyaleInfinite = uint.Parse(r.RoyaleInfinite);
        if (r.MapUpdated) { var m = r.Map.Select(v => decimal.Parse(v, System.Globalization.CultureInfo.InvariantCulture)).ToArray(); save.Coordinates.SetCoordinates((float)m[0], (float)m[1], (float)m[2]); save.Coordinates.SetPlayerRotation((double)m[3]); save.Coordinates.Map = r.MapName; }
        if (save.SaveRevision != 0) { save.SetValue(KHyperspaceSurveyPoints, uint.Parse(r.SurveyPoints!)); save.SetString(save.Blocks.GetBlock(KStreetName).Data, r.StreetName!, 18, StringConverterOption.ClearZero); }
    }

    internal static void Run()
    {
        for (int revision = 0; revision < 3; revision++)
        {
            var original = Create(revision); var immutable = original.ToArray(); var source = Open(original); var hash = Br4Editing.Hash(original);
            var c = Trainer9aEditing.Read(source, hash);
            Check(c.Revision == revision && (c.Dlc is not null) == (revision != 0) && c.Map.Name == "a0101", "Revision/map/DLC catalog");
            Check(c.RemainingScrews.Length == 100 && c.ScrewQuantity == 9 && c.Fashion.Length == 13, "All source screws, inventory and fashion");
            Check(c.Languages.Any(v => v.Id == (int)LanguageID.SpanishL) && c.NameTrash.Length == 52, "Gen9a language and name bytes");
            Check(c.TrashLanguages.Any(v => v.Id == (int)LanguageID.SpanishL) && c.SpecialChars.SequenceEqual("…♂♀♠♣♥♦★◎○□△◇♪☀☁☂☃".Select(v => (int)v)), "Source Gen9a trash language and all 18 Switch special characters");
            foreach (var image in c.Images) { var pixels = Convert.FromBase64String(image.Image.Pixels!); Check(image.Image.Available && pixels.Length == 64 && Enumerable.Range(0, 16).All(i => pixels[i * 4] == 255 && pixels[i * 4 + 1] == 0 && pixels[i * 4 + 2] == 0 && pixels[i * 4 + 3] == 255), "Three actual DXT1 images converted to exact RGBA"); }
            Check(c.Images.Select(v => v.FileName).SequenceEqual(new[] { nameof(KPictureSBCData), nameof(KPictureInitialData), nameof(KPictureCurrentData) }), "Source image export names/order retained");
            Check(source.Write().Span.SequenceEqual(original), "Read immutable complete encrypted file");
            var request = JsonSerializer.Deserialize(JsonSerializer.Serialize(Request(original), SaveJsonContext.Default.Trainer9aRequest), SaveJsonContext.Default.Trainer9aRequest)!;
            Reject(() => Trainer9aActions.Prepare(source, original, request with { Hours = "" }, out _));
            var emptyMasked = request with { Money = "", RoyaleRegular = "", RoyaleInfinite = "", Minutes = "", Seconds = "", SurveyPoints = revision == 0 ? null : "" };
            var emptyOutput = Trainer9aActions.Prepare(source, original, emptyMasked, out _); var emptyExpected = Open(original);
            SourceSave(emptyExpected, emptyMasked with { Money = "0", RoyaleRegular = "0", RoyaleInfinite = "0", Minutes = "0", Seconds = "0", SurveyPoints = revision == 0 ? null : "0" });
            Check(emptyOutput.SequenceEqual(emptyExpected.Write().ToArray()), "Empty Util masks/Change255 normalize to zero, empty ushort hour rejects");
            var output = Trainer9aActions.Prepare(source, original, request, out var noOperations); var expected = Open(original); SourceSave(expected, request);
            Check(output.SequenceEqual(expected.Write().ToArray()) && noOperations.Length == 0 && SwishCrypto.GetIsHashValid(output), "Full independent source save oracle including gender reset, map and DLC");
            var reset = Open(output); Check(reset.Gender == 1 && reset.PlayerFashion.Clothing == 0x81769EA06D93234B && reset.PlayerFashion.Base == 0xA5A5A5A5A5A5A5A5, "Gender reset exact subset preserves unrelated fashion");
            Check(reset.Played.PlayedFractionalSeconds == 0.75, "Source play-time setters preserve fractional seconds");
            var unchangedGender = request with { Gender = 0, MapUpdated = false, MapName = new string('A', 99), Map = ["invalid"] }; output = Trainer9aActions.Prepare(source, original, unchangedGender, out _); expected = Open(original); SourceSave(expected, unchangedGender);
            Check(output.SequenceEqual(expected.Write().ToArray()) && Trainer9aEditing.Read(Open(output), "").Fashion.SequenceEqual(c.Fashion), "Unchanged gender/no map event preserves fashion/coordinates/raw map");
            foreach (string operation in new[] { "technicalMachines", "screws", "resetAndCollectScrews" })
            {
                var r = request with { Operations = [operation, operation] }; output = Trainer9aActions.Prepare(source, original, r, out var result); expected = Open(original);
                var counts = new List<int>();
                for (int i = 0; i < 2; i++) { if (operation == "resetAndCollectScrews") ColorfulScrew9a.SetAllScrews(expected); counts.Add(operation == "technicalMachines" ? TechnicalMachine9a.SetAllTechnicalMachines(expected, true) : ColorfulScrew9a.CollectScrews(expected)); }
                SourceSave(expected, request);
                Check(output.SequenceEqual(expected.Write().ToArray()) && result.Select(v => v.Count).SequenceEqual(counts), "Ordered source collection counts/inventory/full bytes");
                if (operation != "technicalMachines") Check(Open(output).Items.GetItemQuantity(ColorfulScrew9a.ColorfulScrewItemIndex) == 100, "Screw inventory source cap");
            }
            var rawName = Open(original); rawName.MyStatus.OriginalTrainerTrash[^1] = 0xA7; var nameOriginal = rawName.Write().ToArray(); var nameRequest = Request(nameOriginal) with { Name = rawName.OT, NameEvents = [new("clear")] };
            var nameExpected = Open(nameOriginal); Trainer7Editing.Trash(nameExpected, nameExpected.MyStatus.OriginalTrainerTrash, nameExpected.OT, v => nameExpected.OT = v, new("clear")); SourceSave(nameExpected, nameRequest);
            Check(Trainer9aActions.Prepare(rawName, nameOriginal, nameRequest, out _).SequenceEqual(nameExpected.Write().ToArray()), "Advanced trainer-name bytes preserved through final save");
            foreach (int generation in new[] { 0, 9, 100 })
            {
                var layerSource = Open(original); layerSource.OT = "A"; var layerOriginal = layerSource.Write().ToArray();
                var layerRequest = Request(layerOriginal) with { Name = "A", NameEvents = [new("layer", Species: 25, Language: (int)LanguageID.SpanishL, Generation: generation, UiLanguage: "en")] };
                var layerExpected = Open(layerOriginal); string text = SpeciesName.GetSpeciesNameGeneration(25, (int)LanguageID.SpanishL, (byte)generation);
                if (text.Length == 0) text = GameInfo.GetStrings("en").specieslist[25];
                var bytes = new byte[26]; int length = layerExpected.SetString(bytes, text, text.Length, StringConverterOption.None);
                var current = new byte[26]; int from = layerExpected.SetString(current, "A", 1, StringConverterOption.None);
                bytes.AsSpan(from, length - from).CopyTo(layerExpected.MyStatus.OriginalTrainerTrash[from..]);
                SourceSave(layerExpected, layerRequest);
                Check(Trainer9aActions.Prepare(layerSource, layerOriginal, layerRequest, out _).SequenceEqual(layerExpected.Write().ToArray()), "Native source generation 0/9/100 and SpanishL layer full-file oracle");
            }
            foreach (var bad in new[] { request with { Name = new string('A', 13) }, request with { Hours = "65536" }, request with { Money = "10000000" }, request with { Map = ["0.0000001", "0", "0", "0"] }, request with { MapName = new string('A', 33) }, request with { Language = 0 }, request with { Operations = ["unknown"] }, request with { Saved = "1752-12-31T00:00:00" }, request with { Saved = "4096-01-01T00:00:00" }, request with { StreetName = new string('A', 19) }, request with { SourceHash = new string('0', 64) } }) Reject(() => Trainer9aActions.Prepare(source, original, bad, out _));
            var imageSave = Open(original); imageSave.SetValue(KPictureCurrentWidth, 0u); Check(Trainer9aEditing.Read(imageSave, hash).Images[0].Image.Error == "dimensions", "Image dimension guard"); imageSave.SetValue(KPictureCurrentHeight, 0u); Check(Trainer9aEditing.Read(imageSave, hash).Images[0].Image.Error == "empty", "No image state");
            var unsupported = Open(original); unsupported.SetValue(KSaveRevision, 0x100000000UL); Check(!Trainer9aEditing.Supports(unsupported), "Raw revision before integer truncation");
            var ticket = Trainer9aSession.Prepare(source, original, request);
            ticket = JsonSerializer.Deserialize(JsonSerializer.Serialize(ticket, SaveJsonContext.Default.Trainer9aTicket), SaveJsonContext.Default.Trainer9aTicket)!;
            var confirmation = new Trainer9aConfirmation(ticket.Token, ticket.SourceHash, ticket.TargetHash); output = SaveService.CommitTrainer9a(original, JsonSerializer.Serialize(confirmation, SaveJsonContext.Default.Trainer9aConfirmation)); Check(Br4Editing.Hash(output) == ticket.TargetHash && output.SequenceEqual(Trainer9aActions.Prepare(source, original, request, out _)), "Frozen public JSON exact output"); Reject(() => Trainer9aSession.Commit(original, confirmation));
            var first = Trainer9aSession.Prepare(source, original, request); var second = Trainer9aSession.Prepare(source, original, request); Trainer9aSession.Discard(first.Token); Reject(() => Trainer9aSession.Commit(original, new(first.Token, first.SourceHash, first.TargetHash))); var altered = original.ToArray(); altered[0] ^= 1; Reject(() => Trainer9aSession.Commit(altered, new(second.Token, second.SourceHash, second.TargetHash))); Trainer9aSession.Commit(original, new(second.Token, second.SourceHash, second.TargetHash));
            var failed = Trainer9aSession.Prepare(source, original, request); Reject(() => Trainer9aSession.Prepare(source, original, request with { Name = new string('A', 13) })); Reject(() => Trainer9aSession.Commit(original, new(failed.Token, failed.SourceHash, failed.TargetHash)));
            var jsonFailed = Trainer9aSession.Prepare(source, original, request); bool missingRequired = false;
            try { SaveService.PreviewTrainer9a(original, "{}"); } catch (JsonException) { missingRequired = true; }
            Check(missingRequired, "Public source-generated required JSON"); Reject(() => Trainer9aSession.Commit(original, new(jsonFailed.Token, jsonFailed.SourceHash, jsonFailed.TargetHash)));
            Check(original.SequenceEqual(immutable) && source.Write().Span.SequenceEqual(original), "Original bytes/source stay immutable after reads/previews/failures");
            Console.WriteLine($"PASS Trainer9a revision {revision}: all fields, three DXT1 images, 100 locations, ordered collection/inventory/fashion/map/DLC source oracle, bounds and frozen session; typed synthetic only, not public recognition or real-save acceptance");
        }
    }
}

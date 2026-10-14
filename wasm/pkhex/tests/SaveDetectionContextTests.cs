// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
using PokeRNGKit.SaveEditor;

internal static class SaveDetectionContextTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); throw new Exception("Invalid context accepted"); } catch (ArgumentException) { } }
    internal static void Run()
    {
        var directory = JsonSerializer.Deserialize(SaveService.ReadSaveDetectionCatalog(), SaveDetectionJson.Default.SaveDetectionCatalog)!;
        Check(directory.ApiVersion == SaveService.ApiVersion && directory.Types.Length == 32 && directory.Handlers.Length == 6, "Public complete recognition directory and API");
        Check(directory.Languages.Length == Enum.GetValues<LanguageID>().Length, "Public source language directory");
        byte[] raw = File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav");
        // Wrong automatic footer signature is exactly why a user may choose a type manually.
        raw.AsSpan(0x40000 + SAV4DP.GeneralSize - 12, 4).Clear();
        raw.AsSpan(SAV4DP.GeneralSize - 12, 4).Clear();
        Check(SaveUtil.GetSaveFile(raw.ToArray()) is null, "Fixture needs explicit recognition");
        byte[] source = raw.ToArray(); var choice = new SaveDetectionChoice(SaveFileType.DP, GameVersion.D, LanguageID.English, "Default", "manual.sav");
        SaveDetectionContext.Configure(raw, choice);
        var publicRequest = new SaveDetectionRequest(choice.Type, choice.SubVersion, choice.Language, choice.Handler, choice.FileName);
        SaveService.ConfigureSaveDetection(raw, JsonSerializer.Serialize(publicRequest, SaveDetectionJson.Default.SaveDetectionRequest));
        var opened = SaveDetectionContext.OpenCurrent(raw)!;
        Check(opened is SAV4DP && opened.Metadata.FileName == "manual.sav", "Bound current-file recognition");
        using (var report = JsonDocument.Parse(SaveService.Inspect(raw))) {
            Check(report.RootElement.GetProperty("format").GetString() == "SAV4DP", "Production inspection uses manual recognition");
            Check(report.RootElement.GetProperty("checksumsValid").GetBoolean(), "Manual recognition retains checksum validation");
        }
        Check(SaveService.ExportWorkingCopy(raw).SequenceEqual(raw), "Production working export preserves exact container");
        var edit = new TrainerEdit(opened.OT, opened.TID16, opened.SID16, 456);
        var trainerOutput = SaveService.Export(raw, JsonSerializer.Serialize(edit, SaveJsonContext.Default.TrainerEdit));
        Check(SaveDetectionContext.OpenDerived(trainerOutput) is SAV4DP { Money: 456 }, "Production trainer export verifies with selected constructor");
        Check(SaveUtil.GetSaveFile(trainerOutput.ToArray()) is null, "Export still requires chosen recognition");
        SaveDetectionContext.Configure(raw, choice);
        var catalog = JsonSerializer.Deserialize(SaveService.ReadSimpleTrainer(raw), SaveJsonContext.Default.SimpleTrainerCatalog)!;
        var request = new SimpleTrainerRequest("resave", catalog.SourceHash);
        var preview = JsonSerializer.Deserialize(SaveService.PreviewSimpleTrainer(raw, JsonSerializer.Serialize(request, SaveJsonContext.Default.SimpleTrainerRequest)), SaveJsonContext.Default.SimpleTrainerPreview)!;
        var confirmation = new SimpleTrainerConfirmation(preview.Token, preview.SourceHash, preview.TargetHash);
        var committed = SaveService.CommitSimpleTrainer(raw, JsonSerializer.Serialize(confirmation, SaveJsonContext.Default.SimpleTrainerConfirmation));
        Check(SaveDetectionContext.OpenDerived(committed) is SAV4DP, "Frozen trainer confirmation retains recognition");
        opened.Money = 321; byte[] result = opened.Write().ToArray();
        Check(SaveDetectionContext.OpenDerived(result) is SAV4DP { Money: 321 }, "Output verification uses selected constructor");
        var emerald = File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        Check(SaveDetectionContext.OpenCurrent(emerald) is SAV3E, "Unrelated file never receives current type");
        Check(SaveDetectionContext.OpenDerived(emerald) is SAV3E, "An unrelated operation's result stays automatic");
        SaveDetectionContext.Clear();
        Check(SaveDetectionContext.OpenCurrent(raw) is null, "Task cleanup clears override");
        SaveDetectionContext.Configure(result, choice);
        Check(SaveDetectionContext.OpenCurrent(result) is SAV4DP { Money: 321 }, "Client can rebind output after Worker reconstruction");
        SaveDetectionContext.Configure(raw, choice);
        Check(SaveDetectionContext.OpenCurrent(raw) is SAV4DP, "Undo restores context for original working bytes");
        Reject(() => SaveDetectionContext.Configure(raw, choice with { Handler = "missing" }));
        Check(SaveDetectionContext.OpenCurrent(raw) is null, "Failed replacement removes old context");
        Check(raw.SequenceEqual(source), "Context and reconstruction preserve original input");
        SaveService.ConfigureSaveDetection(raw, "");
        Check(SaveDetectionContext.OpenCurrent(raw) is null, "Public automatic context clears manual recognition");
        try { SaveService.ConfigureSaveDetection(raw, "{}"); throw new Exception("Missing request accepted"); } catch (JsonException) { }
        Check(SaveDetectionContext.OpenCurrent(raw) is null, "Public decode failure cannot retain stale context");
        SaveDetectionContext.Clear();
        Console.WriteLine("PASS recognition context: malformed automatic detection, owned task binding, output/undo/recreation, external isolation and failed replacement cleanup");
    }
}

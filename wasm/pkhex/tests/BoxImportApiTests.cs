// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class BoxImportApiTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; } catch (JsonException) { return; }
        throw new Exception("Expected import session rejection");
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var source = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var save = SaveUtil.GetSaveFile(source.ToArray())!;
            var entity = save.GetBoxSlotAtIndex(0, 0);
            var data = new byte[entity.SIZE_STORED]; entity.WriteDecryptedDataStored(data);
            string Request(int update, int dex, int record) => JsonSerializer.Serialize(
                new BoxImportRequest([new($"test.{entity.Extension}", data)], 1, false, false, update, dex, record), BoxImportJson.Default.BoxImportRequest);
            for (int update = 0; update <= 2; update++)
                for (int dex = 0; dex <= 2; dex++)
                    for (int record = 0; record <= 2; record++)
                    {
                        var ticket = BoxImportSession.Prepare(source, Request(update, dex, record));
                        var result = BoxImportSession.Commit(source, new(ticket.Token, false, false, false));
                        var reference = SaveUtil.GetSaveFile(source.ToArray())!;
                        // BDSP boxes retain party stats; this input is a stored-format file.
                        // Compare with Core loading that same file, not the richer source slot.
                        Check(FileUtil.TryGetPKM(data.ToArray(), out var fileEntity, "." + entity.Extension, reference), "Core reads reference file");
                        reference.LoadBoxes([fileEntity!], out _, 1, false, false,
                            new((EntityImportOption)update, (EntityImportOption)dex, (EntityImportOption)record));
                        var expected = reference.Write().ToArray();
                        Check(result.SequenceEqual(expected), "All 27 import-setting combinations match Core bytes");
                        Reject(() => BoxImportSession.Commit(source, new(ticket.Token, true, true, true)));
                    }
            var first = BoxImportSession.Prepare(source, Request(2, 2, 2));
            var next = BoxImportSession.Prepare(source, Request(2, 2, 2));
            Reject(() => BoxImportSession.Commit(source, new(first.Token, true, true, true)));
            BoxImportSession.Discard(first.Token);
            var changed = source.ToArray(); changed[0] ^= 1;
            Reject(() => BoxImportSession.Commit(changed, new(next.Token, true, true, true)));
            BoxImportSession.Commit(source, new(next.Token, false, false, false));
            var discarded = BoxImportSession.Prepare(source, Request(2, 2, 2));
            BoxImportSession.Discard(discarded.Token);
            Reject(() => BoxImportSession.Commit(source, new(discarded.Token, true, true, true)));
            var beforeFailure = BoxImportSession.Prepare(source, Request(2, 2, 2));
            Reject(() => BoxImportSession.Prepare(source, Request(256, 2, 2)));
            Reject(() => BoxImportSession.Commit(source, new(beforeFailure.Token, true, true, true)));
            using var doc = JsonDocument.Parse(PokeRNGKit.SaveEditor.Program.PreviewBoxImport(source, Request(2, 2, 2)));
            var root = doc.RootElement;
            Check(root.GetProperty("summary").GetProperty("written").GetInt32() == 1 &&
                root.GetProperty("sources")[0].GetProperty("file").GetInt32() == 0 &&
                root.GetProperty("files")[0].GetProperty("path").GetString() == $"test.{entity.Extension}", "Camel-case JSON and base64 input");
            var confirmation = JsonSerializer.Serialize(new BoxImportConfirmation(root.GetProperty("token").GetString()!, false, false, false), BoxImportJson.Default.BoxImportConfirmation);
            Check(PokeRNGKit.SaveEditor.Program.CommitBoxImport(source, confirmation).Length == source.Length, "Public API commits complete save bytes");
            Console.WriteLine($"PASS {version}: 27 import settings, one-time commit, stale-source and replacement rejection, targeted discard, failed-preview cleanup and JSON API");
        }
    }
}

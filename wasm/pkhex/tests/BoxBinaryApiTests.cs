// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class BoxBinaryApiTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; } catch (JsonException) { return; }
        throw new Exception("Expected binary session rejection");
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var source = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var original = source.ToArray();
            var save = SaveUtil.GetSaveFile(source.ToArray())!;
            foreach (bool all in new[] { false, true })
            {
                var binary = PokeRNGKit.SaveEditor.Program.ExportBoxBinary(source,
                    JsonSerializer.Serialize(new BoxBinaryExportRequest(0, all), BoxBinaryJson.Default.BoxBinaryExportRequest));
                Check(binary.SequenceEqual(all ? save.GetPCBinary() : save.GetBoxBinary(0)), "Public binary export preserves Core bytes");
                string Request(int update = 2) => JsonSerializer.Serialize(new BoxBinaryRequest(binary, 0, all, update, 2, 2), BoxBinaryJson.Default.BoxBinaryRequest);
                using var document = JsonDocument.Parse(PokeRNGKit.SaveEditor.Program.PreviewBoxBinary(source, Request()));
                var root = document.RootElement;
                Check(root.GetProperty("summary").GetProperty("written").GetInt32() == (all ? save.SlotCount : save.BoxSlotCount), "JSON summary retains every slot");
                var token = root.GetProperty("token").GetString()!;
                string Confirmation(bool overwrite) => JsonSerializer.Serialize(new BoxImportConfirmation(token, true, overwrite, false), BoxBinaryJson.Default.BoxImportConfirmation);
                Reject(() => PokeRNGKit.SaveEditor.Program.CommitBoxBinary(source, Confirmation(false)));
                var output = PokeRNGKit.SaveEditor.Program.CommitBoxBinary(source, Confirmation(true));
                var expected = BoxBinary.Preview(source, binary, 0, all, EntityImportSettings.None).Commit(source, true, true, false);
                Check(output.SequenceEqual(expected), "JSON preview and commit return the exact frozen working copy");
                Reject(() => PokeRNGKit.SaveEditor.Program.CommitBoxBinary(source, Confirmation(true)));
                var first = BoxBinarySession.Prepare(source, Request());
                var next = BoxBinarySession.Prepare(source, Request());
                Reject(() => BoxBinarySession.Commit(source, new(first.Token, true, true, false)));
                BoxBinarySession.Discard(first.Token);
                var changed = source.ToArray(); changed[0] ^= 1;
                Reject(() => BoxBinarySession.Commit(changed, new(next.Token, true, true, false)));
                BoxBinarySession.Commit(source, new(next.Token, true, true, false));
                var discarded = BoxBinarySession.Prepare(source, Request());
                PokeRNGKit.SaveEditor.Program.DiscardBoxBinary(discarded.Token);
                Reject(() => BoxBinarySession.Commit(source, new(discarded.Token, true, true, false)));
                foreach (string invalid in new[] { Request(256), "{", "null", "{\"data\":null}", "{\"data\":\"!\"}" })
                {
                    var prior = BoxBinarySession.Prepare(source, Request());
                    Reject(() => BoxBinarySession.Prepare(source, invalid));
                    Reject(() => BoxBinarySession.Commit(source, new(prior.Token, true, true, false)));
                }
            }
            Check(source.SequenceEqual(original), "API operations preserve original input");
            Console.WriteLine($"PASS {version}: binary JSON export/preview/commit, confirmation, one-time tokens, stale source, replacement, targeted discard and failed-preview cleanup");
        }
        Reject(() => PokeRNGKit.SaveEditor.Program.ExportBoxBinary([], new string(' ', 4097)));
        Reject(() => PokeRNGKit.SaveEditor.Program.CommitBoxBinary([], new string(' ', 4097)));
    }
}

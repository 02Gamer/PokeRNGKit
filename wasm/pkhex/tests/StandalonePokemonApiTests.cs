// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using Api = PokeRNGKit.SaveEditor.Program;

internal static class StandalonePokemonApiTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; } catch (JsonException) { return; }
        throw new Exception("Expected entity API rejection");
    }
    private static string Json(StandalonePokemonRequest request) => JsonSerializer.Serialize(request, StandalonePokemonJson.Default.StandalonePokemonRequest);
    public static void Run()
    {
        var entities = new List<PKM>();
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
            entities.Add(SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!.GetBoxSlotAtIndex(0, 0));
        foreach (PKM p in new PKM[] {new CK3 {Version = GameVersion.CXD}, new XK3 {Version = GameVersion.CXD}, new BK4 {Version = GameVersion.D}, new PB7 {Version = GameVersion.GP}, new PK8 {Version = GameVersion.SW}, new PA8 {Version = GameVersion.PLA}, new PK9 {Version = GameVersion.SL}, new PA9 {Version = GameVersion.ZA}})
        {
            p.Species = 25; p.Language = 2; p.PID = 12345; p.CurrentLevel = 25;
            p.Nickname = "TEST"; p.OriginalTrainerName = "TEST"; p.ResetPartyStats(); p.RefreshChecksum(); entities.Add(p);
        }
        foreach (var p in entities)
        foreach (bool party in new[] {false, true})
        foreach (bool encrypted in new[] {false, true})
        {
            Console.WriteLine($"CHECK entity API {p.GetType().Name} party={party} encrypted={encrypted}");
            var input = new byte[party ? p.SIZE_PARTY : p.SIZE_STORED];
            if (party) { if (encrypted) p.WriteEncryptedDataParty(input); else p.WriteDecryptedDataParty(input); }
            else { if (encrypted) p.WriteEncryptedDataStored(input); else p.WriteDecryptedDataStored(input); }
            var original = input.ToArray();
            var request = new StandalonePokemonRequest("entity." + p.Extension, encrypted, party, encrypted);
            using var report = JsonDocument.Parse(Api.InspectStandalonePokemon(input, Json(request)));
            var root = report.RootElement;
            Check(root.GetProperty("apiVersion").GetInt32() == 189 && root.GetProperty("canEdit").GetBoolean(), "Public API version and editable format");
            Check(root.GetProperty("pokemon").GetProperty("speciesName").GetProperty("zh").GetString() == "皮卡丘", "Nested localized report survives source generation");
            Check(root.GetProperty("attributeChoices").GetProperty("species").GetArrayLength() == p.MaxSpeciesID, "Full entity catalog serialized");
            var expectedNoOp = ExportOracle(input, request.FileName, encrypted, party, encrypted);
            Check(Api.ExportStandalonePokemon(input, Json(request)).SequenceEqual(expectedNoOp), "Public final export matches the independent full-byte Core oracle");
            foreach (bool targetParty in new[] {false, true})
            foreach (bool targetEncrypted in new[] {false, true})
            {
                var expected = ExportOracle(input, request.FileName, encrypted, targetParty, targetEncrypted);
                Check(Api.ExportStandalonePokemon(input, Json(request with {Party = targetParty, Encrypted = targetEncrypted})).SequenceEqual(
                    expected), "Export options match Core serialization and BK4 party initialization");
            }
            var edit = new PokemonEdit(777, 777, "EDIT", 26, 70, "EDIT", 42, 43,
                [31, 30, 29, 28, 27, 26], [4, 8, 12, 16, 20, 24], [85, 0, 0, 0], [10, 0, 0, 0]);
            var output = Api.EditStandalonePokemon(input, Json(request with {Edit = edit}));
            PokemonEditing.Verify(StandalonePokemon.Open(output, request.FileName).Entity, edit);
            using var updated = JsonDocument.Parse(Api.InspectStandalonePokemon(output, Json(request with {InputEncrypted = false})));
            Check(updated.RootElement.GetProperty("pokemon").GetProperty("nickname").GetString() == "EDIT", "Edited bytes re-open as decrypted even after BK4 encrypted input");
            Reject(() => Api.EditStandalonePokemon(input, Json(request)));
            Reject(() => Api.EditStandalonePokemon(input, Json(request with {Edit = edit with {Level = 0}})));
            Check(input.SequenceEqual(original), "Every API call preserves input");
        }
        foreach (string invalid in new[] {"null", "{", "{}", "{\"fileName\":\"\"}", Json(new(new string('a', 1025))), new string(' ', 1024 * 1024 + 1)})
        {
            Reject(() => Api.InspectStandalonePokemon([], invalid));
            Reject(() => Api.EditStandalonePokemon([], invalid));
            Reject(() => Api.ExportStandalonePokemon([], invalid));
        }
        Console.WriteLine("PASS standalone API: 14 types, JSON catalogs, four input/export modes, edits, decrypted re-read, limits and original preservation");
    }
    private static byte[] ExportOracle(byte[] input, string fileName, bool inputEncrypted, bool party, bool encrypted)
    {
        var reference = StandalonePokemon.Open(input, fileName, inputEncrypted).Entity;
        if (party && input.Length != reference.SIZE_PARTY) reference.ForcePartyData();
        if (party && reference is BK4 bk4) bk4.IsDecryptedStateParty = true;
        EditorFinalizingReference.Apply(reference, SaveFile.SetUpdateSettings.UpdateToSaveFile == EntityImportOption.Enable);
        var expected = new byte[party ? reference.SIZE_PARTY : reference.SIZE_STORED];
        if (party) { if (encrypted) reference.WriteEncryptedDataParty(expected); else reference.WriteDecryptedDataParty(expected); }
        else { if (encrypted) reference.WriteEncryptedDataStored(expected); else reference.WriteDecryptedDataStored(expected); }
        return expected;
    }
}

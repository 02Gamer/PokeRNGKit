// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using Api = PokeRNGKit.SaveEditor.Program;

internal static class StandaloneGbTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Expected GB rejection");
    }
    private static string Json(StandalonePokemonRequest request) => JsonSerializer.Serialize(request, StandalonePokemonJson.Default.StandalonePokemonRequest);
    private static byte[] Bytes(PKM p) { var b = new byte[p.SIZE_STORED]; p.WriteDecryptedDataStored(b); return b; }
    private static GbPokemonEdit Draft(GBPKML p) => new(p.Species, p.Nickname, p.OriginalTrainerName, p.TID16, p.CurrentLevel,
        [p.IV_ATK, p.IV_DEF, p.IV_SPE, p.IV_SPC], [p.EV_HP, p.EV_ATK, p.EV_DEF, p.EV_SPE, p.EV_SPC], p.Moves,
        [p.Move1_PP, p.Move2_PP, p.Move3_PP, p.Move4_PP], [p.Move1_PPUps, p.Move2_PPUps, p.Move3_PPUps, p.Move4_PPUps],
        p is PK2 ? p.CurrentFriendship : null, p is PK2 ? p.HeldItem : null);

    public static void Run()
    {
        foreach (bool jp in new[] {false, true})
        foreach (bool zero in new[] {false, true})
        foreach (GBPKML p in new GBPKML[] {new PK1(jp), new PK2(jp), new PK2(jp) {IsEgg = true}})
        {
            if (zero) { p.NicknameTrash.Clear(); p.OriginalTrainerTrash.Clear(); }
            p.Species = 25; p.Nickname = jp ? "ピカ" : "TEST"; p.OriginalTrainerName = jp ? "ア" : "ASH";
            p.CurrentLevel = 25; p.EXP += 3; p.TID16 = 12345; p.IV_ATK = 12; p.IV_DEF = 3; p.IV_SPC = 7; p.IV_SPE = 10;
            p.Move1 = 85; p.Move1_PP = 4; p.Move1_PPUps = 1; p.EV_HP = 555;
            p.ResetPartyStats(); p.Stat_HPCurrent = 1; p.Status_Condition = 8;
            // Unknown party values and unused string bytes must survive unrelated edits.
            p.Stat_ATK = 432; p.NicknameTrash[^1] = 0x50;
            if (p is PK2 second) { second.CaughtData = 0xABCD; second.PokerusState = 0xA3; }
            var input = Bytes(p); var original = input.ToArray(); var filename = "test." + p.Extension;
            var request = new StandalonePokemonRequest(filename);
            var draft = Draft(p);
            foreach (bool explicitFormat in new[] {false, true})
            {
                var req = request with {UseFileFormat = explicitFormat, Gb = draft};
                var inspected = Api.InspectStandalonePokemon(input, Json(req));
                using var report = JsonDocument.Parse(inspected);
                Check(report.RootElement.GetProperty("canEdit").GetBoolean(), "GB dedicated editor available");
                Check(Api.EditStandalonePokemonGb(input, Json(req)).SequenceEqual(input), "GB no-op preserves complete list, names, EXP and unusual party stats");
                foreach (bool party in new[] {false, true}) foreach (bool encrypted in new[] {false, true})
                    Check(Api.ExportStandalonePokemon(input, Json(req with {Party = party, Encrypted = encrypted})).SequenceEqual(input), "GB export matches Core single list in every requested representation");
                var rename = draft with {Nickname = jp ? "イ" : "EDIT", Ot = jp ? "ウ" : "RED", Tid = 65535};
                var renamed = StandalonePokemon.Open(Api.EditStandalonePokemonGb(input, Json(req with {Gb = rename})), filename).Entity;
                var expectedRename = (GBPKML)p.Clone(); expectedRename.Nickname = rename.Nickname; expectedRename.OriginalTrainerName = rename.Ot; expectedRename.TID16 = 65535;
                Check(Bytes(renamed).SequenceEqual(Bytes(expectedRename)), "GB rename equals Core setters byte-for-byte without healing or normalizing");
                var change = draft with {Species = p.MaxSpeciesID, Level = 100, Dvs = [15, 14, 13, 12], StatExperience = [65535, 65534, 65533, 65532, 65531],
                    Moves = [1, 0, 0, 0], MovePp = [1, 0, 0, 0], MovePpUps = [3, 0, 0, 0], Friendship = p is PK2 ? 255 : null, HeldItem = p is PK2 ? p.MaxItemID : null};
                var result = Api.EditStandalonePokemonGb(input, Json(req with {Gb = change}));
                var after = (GBPKML)StandalonePokemon.Open(result, filename).Entity;
                var expected = (GBPKML)p.Clone(); expected.Species = (ushort)p.MaxSpeciesID; expected.CurrentLevel = 100;
                expected.IV_ATK = 15; expected.IV_DEF = 14; expected.IV_SPE = 13; expected.IV_SPC = 12;
                expected.EV_HP = 65535; expected.EV_ATK = 65534; expected.EV_DEF = 65533; expected.EV_SPE = 65532; expected.EV_SPC = 65531;
                expected.Move1 = 1; expected.Move1_PPUps = 3; expected.Move1_PP = 1;
                if (expected is PK2) { expected.CurrentFriendship = 255; expected.HeldItem = p.MaxItemID; }
                expected.ResetPartyStats(); expected.Stat_HPCurrent = 1; expected.Status_Condition = 8;
                Check(result.SequenceEqual(Bytes(expected)), "GB basic edits match complete Core serialization");
                Check(after.IV_HP == 10 && after.IV_SPA == 12 && after.IV_SPD == 12 && after.EV_SPA == 65531 && after.EV_SPD == 65531, "GB HP derived and special values shared");
                Check(after.IsEgg == p.IsEgg && after.Japanese == jp && after.Nickname == p.Nickname, "GB list metadata preserved");
                foreach (GbPokemonEdit invalid in new[] {draft with {Species = 0}, draft with {Species = p.MaxSpeciesID + 1}, draft with {Tid = -1}, draft with {Tid = 65536},
                    draft with {Level = 0}, draft with {Level = 101}, draft with {Dvs = [16, 0, 0, 0]}, draft with {Dvs = [1]}, draft with {StatExperience = [65536, 0, 0, 0, 0]},
                    draft with {StatExperience = [-1, 0, 0, 0, 0]}, draft with {MovePp = [64, 0, 0, 0]}, draft with {MovePpUps = [4, 0, 0, 0]},
                    draft with {Moves = [0, 0, 0, 0]}, draft with {Nickname = ""}, draft with {Ot = "\n"}, draft with {Nickname = new string('A', p.MaxStringLengthNickname + 1)},
                    draft with {Ot = "😀"}, draft with {Friendship = 256}, draft with {HeldItem = p.MaxItemID + 1}})
                    Reject(() => Api.EditStandalonePokemonGb(input, Json(req with {Gb = invalid})));
                if (p is PK1) { Reject(() => Api.EditStandalonePokemonGb(input, Json(req with {Gb = draft with {Friendship = 0}}))); Reject(() => Api.EditStandalonePokemonGb(input, Json(req with {Gb = draft with {HeldItem = 0}}))); }
            }
            foreach (int index in new[] {0, 1, 2})
            {
                var bad = input.ToArray(); bad[index] = index == 1 ? (byte)1 : (byte)0;
                Reject(() => StandalonePokemon.Open(bad, filename, useFileFormat: true));
                Reject(() => StandalonePokemon.Open(bad, filename));
            }
            Reject(() => StandalonePokemon.Open(input[..^1], filename, useFileFormat: true));
            Reject(() => StandalonePokemon.Open(p.Data.ToArray(), filename, useFileFormat: true));
            Reject(() => StandalonePokemon.Open(input, p is PK1 ? "wrong.pk2" : "wrong.pk1", useFileFormat: true));
            Reject(() => Api.EditStandalonePokemonGb(input, Json(request)));
            Reject(() => StandaloneEgg.Read(p));
            Check(input.SequenceEqual(original), "GB operations preserve original input");
            Console.WriteLine($"PASS {p.GetType().Name} jp={jp} zero={zero} egg={p.IsEgg}: names/list identity, Core bytes, derived DV, stat experience, health, bounds and original");
        }
    }
}

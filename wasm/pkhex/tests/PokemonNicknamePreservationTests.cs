// SPDX-License-Identifier: GPL-3.0-or-later
// Oracle: PKMEditor.UpdateIsNicknamed/UpdateNickname never selects an ability or rerolls PID.
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization.Metadata;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonNicknamePreservationTests
{
    private static void Check(bool value, string message)
    {
        if (!value) throw new Exception(message);
    }

    private static PokemonEdit Basic(PKM p, bool useSpeciesName) => new(
        0, 0, useSpeciesName ? p.Nickname : "UIAUDIT", p.CurrentLevel,
        p.CurrentFriendship, p.OriginalTrainerName, p.TID16, p.SID16,
        [p.IV_HP, p.IV_ATK, p.IV_DEF, p.IV_SPA, p.IV_SPD, p.IV_SPE],
        [p.EV_HP, p.EV_ATK, p.EV_DEF, p.EV_SPA, p.EV_SPD, p.EV_SPE],
        [p.Move1, p.Move2, p.Move3, p.Move4],
        [p.Move1_PP, p.Move2_PP, p.Move3_PP, p.Move4_PP],
        Identity: new(p.Species, p.Form, p.Gender, useSpeciesName));

    private static void Seed(PKM p, bool useSpeciesName)
    {
        p.Species = 328;
        p.Language = 2;
        p.Version = p.Context.GetSingleGameVersion();
        p.TID16 = 1234;
        p.SID16 = 5678;
        p.PID = ((uint)(0x1234 ^ p.TID16 ^ p.SID16) << 16) | 0x1234;
        p.EncryptionConstant = p.PID;
        p.RefreshAbility(0);
        p.CurrentLevel = 20;
        p.OriginalTrainerName = "OWNER";
        p.Move1 = 44;
        p.Move1_PP = p.GetMovePP(44, 0);
        if (useSpeciesName) { p.Nickname = "BEFORE"; p.IsNicknamed = true; }
        else p.ClearNickname();
        p.RefreshChecksum();
    }

    internal static void Run()
    {
        foreach (bool hax in new[] { false, true })
        {
            SaveProgramSettingsRuntime.Reset();
            var settings = SaveProgramSettingsCodec.Defaults();
            settings.Startup.ForceHaXOnLaunch = hax;
            SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings, SaveProgramSettingsJson.Default.SaveProgramSettings));
            try
            {
                foreach (bool useSpeciesName in new[] { false, true })
                foreach (PKM p in new PKM[] { new PK3(), new CK3(), new XK3(), new PK4(), new BK4(), new RK4(), new PK5(), new PK6(), new PK7(), new PB7(), new PK8(), new PB8(), new PA8(), new PK9(), new PA9() })
                {
                    Seed(p, useSpeciesName);
                    var before = p.Data.ToArray();
                    var expected = p.Clone();
                    if (useSpeciesName)
                    {
                        // WinForms SaveNickname writes the textbox via Nickname;
                        // CK3 also updates its separate display-name buffer here.
                        expected.IsNicknamed = false;
                        expected.Nickname = SpeciesName.GetSpeciesNameGeneration(expected.Species, expected.Language, expected.Format);
                    }
                    else { expected.Nickname = "UIAUDIT"; expected.IsNicknamed = true; }
                    expected.RefreshChecksum();
                    var actual = p.Clone();
                    var applied = PokemonEditing.Apply(actual, Basic(actual, useSpeciesName), false, identity => PokemonIdentity.Apply(actual, identity, 0));
                    Check(actual.PID == p.PID, $"Nickname-only edit rerolled PID: {p.GetType().Name}, hax={hax}, speciesName={useSpeciesName}");
                    Check(actual.IsShiny == p.IsShiny, "Nickname edit changed shiny state");
                    Check(actual.Data.SequenceEqual(expected.Data), $"Nickname-only edit changed unrelated bytes: {p.GetType().Name}, hax={hax}, speciesName={useSpeciesName}");
                    PokemonEditing.Verify(actual, applied);
                    Check(p.Data.SequenceEqual(before), "Nickname edit mutated the input entity");
                    if (!useSpeciesName && p.Format <= 5) Drafts(p);
                }
            }
            finally { SaveProgramSettingsRuntime.Reset(); PokemonEditorContext.Clear(); }
        }
        Real();
        Console.WriteLine("PASS nickname-only editing: 15 formats, normal/HaX, nickname/species-name toggle, complete independent byte oracle, PID/shiny and source preservation");
    }

    private static JsonElement Payload<T>(T value, JsonTypeInfo<T> type)
    {
        var json = JsonNode.Parse(JsonSerializer.Serialize(value, type))!.AsObject();
        json.Remove("box");
        json.Remove("slot");
        return JsonSerializer.SerializeToElement(json);
    }

    private static void Drafts(PKM p)
    {
        var before = p.Data.ToArray();
        uint pid = p.PID ^ 1;
        var basic = new PokemonDraftStep("basic", Payload(Basic(p, false), PokemonSetJson.Default.PokemonEdit), ["nickname", "identity"]);
        var raw = new PokemonDraftStep("raw", Payload(new PokemonRawEdit(0, 0, "values", Pid: pid), PokemonSetJson.Default.PokemonRawEdit));
        var capture = new PokemonDraftCapture("nickname", [new("basic", [basic]), new("raw", [raw])]);
        var prepared = PokemonDraftPreparing.PrepareFile(p, capture, false);
        Check(prepared.Nickname == "UIAUDIT" && prepared.PID == pid, "Naming draft falsely conflicts with an explicit PID draft");
        var identity = Basic(p, false) with { Identity = new(329, 0, p.Gender, false) };
        var incompatible = capture with { Sections = [new("basic", [basic with { Edit = Payload(identity, PokemonSetJson.Default.PokemonEdit) }]), new("raw", [raw])] };
        bool rejected = false;
        try { PokemonDraftPreparing.PrepareFile(p, incompatible, false); }
        catch (ArgumentException error) when (error.Message.Contains("Conflicting editor fields: pid", StringComparison.Ordinal)) { rejected = true; }
        Check(rejected, "Physical identity and explicit PID drafts no longer conflict");
        Check(p.Data.SequenceEqual(before), "Draft preparation changed the input entity");
    }

    private static void Real()
    {
        string? path = Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");
        if (string.IsNullOrEmpty(path)) return;
        byte[] input = File.ReadAllBytes(path), before = input.ToArray();
        var save = SaveService.OpenDatabaseSave(input);
        Check(save is SAV3E, "Expected the authorized Emerald work copy");
        var row = PokemonReader.Read(save).First(p => p.Box >= 0);
        var source = new PokemonPosition(row.Box, row.Slot);
        var p = PokemonEditing.Read(save, source.Box, source.Slot);
        var edit = Basic(p, false) with { Box = source.Box, Slot = source.Slot };
        var expected = p.Clone();
        expected.Nickname = "UIAUDIT";
        expected.IsNicknamed = true;
        expected.RefreshChecksum();
        foreach (bool party in new[] { false, true })
        foreach (bool encrypted in new[] { false, true })
        {
            byte[] file = StandalonePokemon.Serialize(p.Clone(), party, encrypted), originalFile = file.ToArray();
            var output = StandalonePokemon.Edit(file, "nickname.pk3", edit, encrypted, true);
            Check(output.SequenceEqual(StandalonePokemon.Serialize(expected.Clone(), party, false)), "Real PK3 decrypted edit-buffer oracle failed");
            var exported = StandalonePokemon.Export(output, "nickname.pk3", party, encrypted, false, true);
            Check(exported.SequenceEqual(StandalonePokemon.Serialize(expected.Clone(), party, encrypted)), "Real PK3 encoded export oracle failed");
            Check(file.SequenceEqual(originalFile), "Standalone nickname editing changed its source");
        }
        var expectedSave = SaveService.OpenDatabaseSave(input);
        expectedSave.SetBoxSlotAtIndex(expected.Clone(), source.Box, source.Slot, EntityImportSettings.None);
        byte[] edited = SaveService.EditPokemon(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.PokemonEdit));
        Check(edited.SequenceEqual(expectedSave.Write().ToArray()), "Real save nickname-only full-file oracle failed");
        int empty = Enumerable.Range(0, save.BoxSlotCount).First(i => save.GetBoxSlotAtIndex(0, i).Species == 0);
        var step = new PokemonDraftStep("basic", Payload(edit, PokemonSetJson.Default.PokemonEdit), ["nickname", "identity"]);
        var request = new PokemonSetRequest(Br4Editing.Hash(input), "nickname-real", source, new(0, empty), new("nickname-real", [new("basic", [step])]));
        var ticket = PokemonSetSession.Prepare(input, request);
        var committed = PokemonSetSession.Commit(input, new(ticket.Token, ticket.SourceHash, ticket.TargetHash, true));
        var reopened = SaveService.OpenPreparedOutput(committed);
        var target = reopened.GetBoxSlotAtIndex(0, empty);
        Check(target.PID == p.PID && target.IsShiny == p.IsShiny && target.Nickname == "UIAUDIT", "Frozen nickname set changed identity");
        Check(StorageEditing.StoredData(save, source).SequenceEqual(StorageEditing.StoredData(reopened, source)), "Frozen set changed its source slot");
        Check(input.SequenceEqual(before) && File.ReadAllBytes(path).SequenceEqual(before), "Nickname check wrote the work-copy file");
        Console.WriteLine("PASS real Emerald nickname: four entity layouts, independent full save oracle, frozen set/reopen, PID/shiny and original-slot/source-file preservation");
    }
}

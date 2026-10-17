// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonEditorFinalizingTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Mode(bool hax, bool modify = true)
    {
        SaveProgramSettingsRuntime.Reset();
        var settings = SaveProgramSettingsCodec.Defaults(); settings.Startup.ForceHaXOnLaunch = hax;
        settings.SlotWrite.SetUpdatePKM = modify;
        SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings, SaveProgramSettingsJson.Default.SaveProgramSettings));
    }
    private static PKM Seed(PKM p)
    {
        p.Species = 25; p.Language = 2; p.Version = p.Context.GetSingleGameVersion();
        p.Nickname = "TEST"; p.OriginalTrainerName = "OWNER"; p.CurrentLevel = 20;
        // Empty entries carry nonzero metadata, with two holes before real moves.
        p.Move1 = 0; p.Move2 = 33; p.Move3 = 0; p.Move4 = 45;
        p.Move1_PP = 7; p.Move2_PP = 9; p.Move3_PP = 5; p.Move4_PP = 11;
        p.Move1_PPUps = 1; p.Move2_PPUps = 2; p.Move3_PPUps = 3; p.Move4_PPUps = 1;
        p.RefreshChecksum(); return p;
    }
    private static PKM Expected(PKM source, bool hax)
    {
        var p = source.Clone();
        if (hax && p is PK5 fifth)
            fifth.HiddenAbility = fifth.PersonalInfo.HasHiddenAbility && fifth.Ability == fifth.PersonalInfo.AbilityH;
        EditorFinalizingReference.Apply(p, SaveFile.SetUpdateSettings.UpdateToSaveFile == EntityImportOption.Enable); return p;
    }
    internal static void Run()
    {
        try
        {
            foreach (PKM layout in new PKM[] { new PK1(), new PK2(), new SK2(), new PK3(), new CK3(), new XK3(), new PK4(), new BK4(), new RK4(), new PK5(), new PK6(), new PK7(), new PB7(), new PK8(), new PB8(), new PA8(), new PK9(), new PA9() })
            foreach (bool hax in new[] { false, true })
            {
                Mode(hax); PokemonEditorContext.Clear(); var p = Seed(layout.Clone()); var before = p.Data.ToArray();
                var expected = Expected(p, hax);
                var prepared = PokemonDraftPreparing.PrepareFile(p, new("final", []), true);
                Check(prepared.Data.SequenceEqual(expected.Data), "Final empty capture matches full concrete Core oracle: " + p.GetType().Name);
                if (p is PA9)
                    Check(prepared.Moves.SequenceEqual(p.Moves) && prepared.Move1_PP == 35 && prepared.Move3_PP == 35 && prepared.Move1_PPUps == 0, "ZA keeps move positions and uses its empty PP override");
                else
                    Check(prepared.Moves.SequenceEqual(new ushort[] { 33, 45, 0, 0 }) && prepared.Move1_PP == 9 && prepared.Move1_PPUps == 2 && prepared.Move2_PP == 11 && prepared.Move2_PPUps == 1 && prepared.Move3_PP == 0 && prepared.Move4_PPUps == 0, "Compaction preserves each move PP tuple and clears trailing metadata");
                foreach (bool party in new[] { false, true }) foreach (bool encrypted in new[] { false, true })
                {
                    var input = StandalonePokemon.Serialize(p.Clone(), party, encrypted); var original = input.ToArray();
                    var output = StandalonePokemon.Export(input, "test." + p.Extension, party, encrypted, encrypted, true);
                    var oracle = StandalonePokemon.Serialize(expected.Clone(), party, encrypted);
                    Check(output.SequenceEqual(oracle) && input.SequenceEqual(original), "Stored/party and encrypted/decrypted final export exact bytes and source preservation");
                }
                Check(p.Data.SequenceEqual(before), "Final preparation preserves original entity");
                Console.WriteLine($"PASS editor finalizing {p.GetType().Name}/HaX={hax}: complete clone oracle, four output layouts, PP tuples and source");
            }
            HiddenAbility(); Modern();
        }
        finally { PokemonEditorContext.Clear(); SaveProgramSettingsRuntime.Reset(); }
    }
    private static void Modern()
    {
        foreach (PKM layout in EditorFinalizingReference.Layouts())
        foreach (bool hax in new[] { false, true }) foreach (bool modify in new[] { false, true })
        foreach (string state in new[] { "egg", "untraded", "traded" })
        {
            Mode(hax, modify); PokemonEditorContext.Clear(); var p = Seed(layout.Clone());
            p.RelearnMoves = [0, 33, 0, 45]; p.IsEgg = state == "egg";
            p.HandlingTrainerName = state == "traded" ? "SECOND" : "";
            p.CurrentHandler = state == "traded" ? (byte)1 : (byte)0;
            p.HandlingTrainerGender = 1; p.HandlingTrainerFriendship = 123;
            if (p is IHandlerLanguage language) language.HandlingTrainerLanguage = 2;
            if (p is ITrainerMemories memory)
            {
                memory.OriginalTrainerMemory = 4; memory.OriginalTrainerMemoryVariable = 9; memory.OriginalTrainerMemoryFeeling = 5; memory.OriginalTrainerMemoryIntensity = 1;
                memory.HandlingTrainerMemory = 4; memory.HandlingTrainerMemoryVariable = 9; memory.HandlingTrainerMemoryFeeling = 5; memory.HandlingTrainerMemoryIntensity = 1;
            }
            if (p is PK6 or PK7 or PB7) p.Data[0xFE..].Fill(0xA5);
            p.RefreshChecksum(); var before = p.Data.ToArray(); var expected = p.Clone(); EditorFinalizingReference.Apply(expected, modify);
            var actual = PokemonDraftPreparing.PrepareFile(p, new("modern", []), true);
            Check(actual.Data.SequenceEqual(expected.Data), $"Full WinForms final-save oracle {p.GetType().Name}/{state}/modify={modify}/HaX={hax}");
            Check(actual.RelearnMoves.SequenceEqual(new ushort[] { 33, 45, 0, 0 }), "Relearn holes compact in source order independently of modification setting");
            if (p is PK6 or PK7) Check(actual.Data[0xFE..].IndexOfAnyExcept((byte)0) < 0, "PK6/PK7 reserved party tail cleared even when modification is off");
            if (p is PB7) Check(actual.Data[0xFE..].SequenceEqual(p.Data[0xFE..]), "LGPE tail is never cleared as PK7 party padding");
            if (!modify) Check(actual.HandlingTrainerFriendship == p.HandlingTrainerFriendship && actual.HandlingTrainerName == p.HandlingTrainerName, "Disabled modification preserves trainer data");
            else if (state == "untraded") Check(actual.HandlingTrainerFriendship == 0, "Enabled untraded cleanup actually clears handler friendship");
            foreach (bool party in new[] { false, true }) foreach (bool encrypted in new[] { false, true })
            {
                var input = StandalonePokemon.Serialize(p.Clone(), party, encrypted); var original = input.ToArray();
                var output = StandalonePokemon.Export(input, "modern." + p.Extension, party, encrypted, encrypted, true);
                var parsed = StandalonePokemon.Open(input, "modern." + p.Extension, encrypted, true).Entity;
                EditorFinalizingReference.Apply(parsed, modify);
                Check(output.SequenceEqual(StandalonePokemon.Serialize(parsed, party, encrypted)) && input.SequenceEqual(original), "Public final file bytes match source rules without changing input");
            }
            Check(p.Data.SequenceEqual(before), "Modern preparation preserves full source clone");
        }
        SaveProgramSettingsRuntime.Reset(); var sample = (PK6)Seed(new PK6()); sample.HandlingTrainerFriendship = 123; sample.RefreshChecksum();
        var settings = SaveCoreSettings.Defaults(); settings.SlotWrite.SetUpdatePKM = false;
        using (SaveCoreSettingsRuntime.Begin(settings)) Check(PokemonDraftPreparing.PrepareFile(sample, new("core-only", []), true).HandlingTrainerFriendship == 123, "Core-only settings scope controls final cleanup without program settings");
        Console.WriteLine("PASS modern final save: eight formats, ordinary/HaX, modify on/off, egg/untraded/traded, relearn, exact tails, four file layouts, Core-only scope and immutable inputs");
    }
    private static void HiddenAbility()
    {
        foreach (bool hax in new[] { false, true }) foreach (bool matching in new[] { false, true })
        {
            Mode(hax); var p = (PK5)Seed(new PK5()); p.Ability = matching ? p.PersonalInfo.AbilityH : p.PersonalInfo.Ability1;
            p.HiddenAbility = !matching; p.RefreshChecksum(); var before = p.Data.ToArray();
            var prepared = (PK5)PokemonDraftPreparing.PrepareFile(p, new("hidden", []), true);
            Check(prepared.HiddenAbility == (hax ? matching : !matching), "PK5 final HaX recomputes hidden flag; normal mode preserves selected flag");
            Check(p.Data.SequenceEqual(before), "PK5 final derived flag preserves original");
        }
        // ZA's concrete final output must remain editable on its next round trip.
        Mode(false); var za = (PA9)Seed(new PA9()); za.FixMoves(); za.RefreshChecksum();
        var edit = new PokemonEdit(0,0,za.Nickname,za.CurrentLevel,za.CurrentFriendship,za.OriginalTrainerName,za.TID16,za.SID16,
            [za.IV_HP,za.IV_ATK,za.IV_DEF,za.IV_SPA,za.IV_SPD,za.IV_SPE], [za.EV_HP,za.EV_ATK,za.EV_DEF,za.EV_SPA,za.EV_SPD,za.EV_SPE],
            za.Moves,[za.Move1_PP,za.Move2_PP,za.Move3_PP,za.Move4_PP],[za.Move1_PPUps,za.Move2_PPUps,za.Move3_PPUps,za.Move4_PPUps]);
        PokemonEditing.Apply(za,edit with { Nickname="NEXT" },true,id=>PokemonIdentity.Apply(za,id,0));
        Check(za.Nickname=="NEXT" && za.Move1_PP==35 && za.Move3_PP==35,"ZA empty PP35 survives unrelated basic editing");
        Console.WriteLine("PASS editor finalizing PK5: normal/HaX hidden-ability mismatch; ZA second-edit round trip");
    }
}

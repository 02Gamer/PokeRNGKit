// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonEditorFinalizingTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Mode(bool hax)
    {
        SaveProgramSettingsRuntime.Reset();
        var settings = SaveProgramSettingsCodec.Defaults(); settings.Startup.ForceHaXOnLaunch = hax;
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
        p.FixMoves(); p.RefreshChecksum(); return p;
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
            HiddenAbility();
        }
        finally { PokemonEditorContext.Clear(); SaveProgramSettingsRuntime.Reset(); }
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

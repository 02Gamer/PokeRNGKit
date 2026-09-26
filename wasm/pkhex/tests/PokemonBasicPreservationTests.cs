using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonBasicPreservationTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static PokemonEdit Draft(PKM p, int box) => new(box, 0, p.Nickname, p.CurrentLevel,
        p.IsEgg ? p.OriginalTrainerFriendship : p.CurrentFriendship, p.OriginalTrainerName, p.TID16, p.SID16,
        [p.IV_HP,p.IV_ATK,p.IV_DEF,p.IV_SPA,p.IV_SPD,p.IV_SPE], [p.EV_HP,p.EV_ATK,p.EV_DEF,p.EV_SPA,p.EV_SPD,p.EV_SPE],
        p.Moves, [p.Move1_PP,p.Move2_PP,p.Move3_PP,p.Move4_PP], [p.Move1_PPUps,p.Move2_PPUps,p.Move3_PPUps,p.Move4_PPUps]);
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        foreach (bool fainted in new[] { false, true })
        {
            var fixture = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var p = fixture.GetPartySlotAtIndex(0);
            p.CurrentLevel = 50; p.EXP += 37;
            p.OriginalTrainerName = "T";
            // Keep terminal name code units zero: PK6+ uses those to detect encrypted data.
            p.OriginalTrainerTrash[p.OriginalTrainerTrash.Length > 7 ? 6 : 3] = 0x42;
            p.ResetPartyStats(); p.Stat_HPCurrent = fainted ? 0 : p.Stat_HPMax / 2; p.Status_Condition = 8;
            p.Stat_ATK += 7; // Deliberately retain an existing cached stat during unrelated edits.
            p.RefreshChecksum(); fixture.SetPartySlotAtIndex(p,0,EntityImportSettings.None); fixture.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);
            var data = fixture.Write().ToArray(); var original = data.ToArray(); var before = SaveUtil.GetSaveFile(data.ToArray())!;
            foreach (var box in new[] {-1,0})
            {
                var source = PokemonEditing.Read(before,box,0);
                Require(source.ChecksumValid && source.OriginalTrainerName == "T", "Valid fixture with name padding");
                var draft = Draft(source,box);
                var edits = new[] {
                    draft with {Nickname = "RENAMED"},
                    draft with {Friendship = (byte)(draft.Friendship == 100 ? 101 : 100)},
                    draft with {Moves = [33,0,0,0], MovePp = [1,0,0,0], MovePpUps = [0,0,0,0]},
                    draft with {Ivs = [31,30,29,28,27,26]},
                    draft with {Level = 10},
                };
                foreach (var edit in edits)
                {
                    var output = SaveService.EditPokemon(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.PokemonEdit));
                    var after = SaveUtil.GetSaveFile(output.ToArray())!; var actual = PokemonEditing.Read(after,box,0);
                    var expected = source.Clone();
                    if (edit.Nickname != source.Nickname) { expected.Nickname = edit.Nickname; expected.IsNicknamed = true; }
                    expected.CurrentFriendship = edit.Friendship;
                    expected.Move1 = edit.Moves[0]; expected.Move2 = edit.Moves[1]; expected.Move3 = edit.Moves[2]; expected.Move4 = edit.Moves[3];
                    expected.Move1_PP = edit.MovePp[0]; expected.Move2_PP = edit.MovePp[1]; expected.Move3_PP = edit.MovePp[2]; expected.Move4_PP = edit.MovePp[3];
                    expected.Move1_PPUps = edit.MovePpUps![0]; expected.Move2_PPUps = edit.MovePpUps[1]; expected.Move3_PPUps = edit.MovePpUps[2]; expected.Move4_PPUps = edit.MovePpUps[3];
                    expected.IV_HP = edit.Ivs[0]; expected.IV_ATK = edit.Ivs[1]; expected.IV_DEF = edit.Ivs[2]; expected.IV_SPA = edit.Ivs[3]; expected.IV_SPD = edit.Ivs[4]; expected.IV_SPE = edit.Ivs[5];
                    if (edit.Level != draft.Level) expected.CurrentLevel = edit.Level;
                    bool statEdit = !edit.Ivs.SequenceEqual(draft.Ivs) || edit.Level != draft.Level;
                    if (box == -1 && statEdit) { expected.ResetPartyStats(); expected.Stat_HPCurrent = Math.Min(source.Stat_HPCurrent,expected.Stat_HPMax); expected.Status_Condition = source.Status_Condition; }
                    expected.RefreshChecksum();
                    Require(StorageEditing.StoredData(after,new(box,0)).SequenceEqual(expected.Data[..(box == -1 ? expected.SIZE_PARTY : expected.SIZE_STORED)].ToArray()), $"{version}/{box}: requested fields only");
                    Require(actual.EXP == (edit.Level == draft.Level ? source.EXP : Experience.GetEXP(edit.Level,actual.PersonalInfo.EXPGrowth)), "In-level EXP preserved or explicitly changed");
                    Require(actual.OriginalTrainerTrash.SequenceEqual(source.OriginalTrainerTrash), "Unchanged trainer bytes preserved");
                    if (box == -1) Require(actual.Stat_HPCurrent == expected.Stat_HPCurrent && actual.Status_Condition == 8, "Wounded/fainted HP and status preserved");
                    Require(after.ChecksumsValid && actual.ChecksumValid && data.SequenceEqual(original), "Original and checksums");
                    for (int b = 0; b < before.BoxCount; b++) for (int slot = 0; slot < before.BoxSlotCount; slot++)
                        if (b != box || slot != 0) Require(after.GetBoxSlotAtIndex(b,slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b,slot).Data), "Other box slots");
                    if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Other party");
                }
                foreach (ushort species in new ushort[] {26,1})
                {
                    var edit = draft with {Identity = new(species,0,0,true)};
                    var after = SaveUtil.GetSaveFile(SaveService.EditPokemon(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.PokemonEdit)))!;
                    var actual = PokemonEditing.Read(after,box,0);
                    uint expectedExp = actual.PersonalInfo.EXPGrowth == source.PersonalInfo.EXPGrowth ? source.EXP : Experience.GetEXP(draft.Level,actual.PersonalInfo.EXPGrowth);
                    Require(actual.EXP == expectedExp && actual.CurrentLevel == draft.Level, "Species growth curve handling");
                    if (box == -1) Require(actual.Stat_HPCurrent == Math.Min(source.Stat_HPCurrent,actual.Stat_HPMax) && actual.Status_Condition == 8, "Species edit preserves health");
                    Require(data.SequenceEqual(original), "Species edit leaves original input");
                }
            }
            Console.WriteLine($"PASS {version}/{(fainted ? "fainted" : "wounded")}: basic edits preserve EXP, trainer bytes, health and unrelated payload; stat and growth changes remain effective");
        }
    }
}

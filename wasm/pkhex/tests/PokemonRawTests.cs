using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonRawTests
{
    private static SaveFile Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray())!;
    private static byte[] Apply(byte[] data, PokemonRawEdit edit) => SaveService.EditPokemonRaw(data,
        JsonSerializer.Serialize(edit, SaveJsonContext.Default.PokemonRawEdit));
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }

    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var fixture = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            var wounded = fixture.GetPartySlotAtIndex(0);
            wounded.Stat_HPCurrent = Math.Max(1, wounded.Stat_HPMax / 2);
            wounded.Status_Condition = 8;
            wounded.RefreshChecksum();
            fixture.SetPartySlotAtIndex(wounded, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray();
            var original = data.ToArray();
            var before = Open(data);
            foreach (var box in new[] { -1, 0 })
            {
                var originalPokemon = PokemonEditing.Read(before, box, 0);
                foreach (var pid in new uint[] { 0, 0xABCDEF01, uint.MaxValue })
                {
                    uint? ec = originalPokemon.Format >= 6 ? pid ^ 0x12345678 : null;
                    var output = Apply(data, new(box, 0, "values", pid, ec));
                    var after = Open(output);
                    var pokemon = PokemonEditing.Read(after, box, 0);
                    Require(after.ChecksumsValid && pokemon.ChecksumValid && pokemon.PID == pid, $"{version}: exact raw PID");
                    Require(pokemon.EncryptionConstant == (ec ?? pid), $"{version}: EC value or old-format PID alias");
                    Require(pokemon.Species == originalPokemon.Species && pokemon.Nickname == originalPokemon.Nickname && pokemon.EXP == originalPokemon.EXP && pokemon.Moves.SequenceEqual(originalPokemon.Moves), $"{version}: other entity fields");
                    Require(data.SequenceEqual(original) && after.PartyCount == before.PartyCount, $"{version}: original and party count");
                    Require(after.GetPartySlotAtIndex(0).Stat_HPCurrent == before.GetPartySlotAtIndex(0).Stat_HPCurrent && after.GetPartySlotAtIndex(0).Status_Condition == before.GetPartySlotAtIndex(0).Status_Condition, $"{version}: current HP and status preserved");
                    for (var b = 0; b < before.BoxCount; b++)
                        for (var slot = 0; slot < before.BoxSlotCount; slot++)
                            if (b != box || slot != 0)
                                Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), $"{version}: other box slot");
                    if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), $"{version}: party preserved");
                }
                var rerolled = Open(Apply(data, new(box, 0, "rerollPid")));
                Require(rerolled.ChecksumsValid && !PokemonEditing.Read(rerolled, box, 0).IsShiny, $"{version}: core PID reroll");
                if (originalPokemon.Format >= 6)
                    Require(Open(Apply(data, new(box, 0, "rerollEc"))).ChecksumsValid, $"{version}: core EC reroll");
            }
            foreach (var invalid in new[] { new PokemonRawEdit(0, 0, "values"), new(0, 0, "invalid"), new(0, before.BoxSlotCount, "values", 1) })
            {
                try { Apply(data, invalid); throw new Exception("Invalid raw edit accepted"); }
                catch (ArgumentException) { Require(data.SequenceEqual(original), "Raw rejection modified input"); }
            }
            if (before.BlankPKM.Format < 6)
            {
                foreach (var invalid in new[] { new PokemonRawEdit(0, 0, "values", null, 1), new(0, 0, "rerollEc") })
                {
                    try { Apply(data, invalid); throw new Exception("Old-format EC edit accepted"); }
                    catch (ArgumentException) { }
                }
            }
            foreach (var invalidValue in new[] { "-1", "4294967296", "1.5" })
            {
                try { SaveService.EditPokemonRaw(data, "{\"box\":0,\"slot\":0,\"action\":\"values\",\"pid\":" + invalidValue + "}"); throw new Exception("Invalid uint accepted"); }
                catch (JsonException) { }
            }
            Console.WriteLine($"PASS {version}: raw PID/EC, rerolls, bounds and unrelated data preservation");
        }
    }
}

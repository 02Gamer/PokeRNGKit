// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerGameOptionTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile save) => new(save.OT, save.TID16, save.SID16, save.Money);
    private static byte[] Apply(byte[] data, TrainerEdit edit) => SaveService.Export(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.TrainerEdit));
    private static SAV3 Create(bool frlg)
    {
        // Synthetic serialized sectors; these are not owner-provided game saves.
        var data = new byte[SaveUtil.SIZE_G3RAW];
        for (int slot = 0; slot < 2; slot++)
        for (ushort sector = 0; sector < 14; sector++)
        {
            int offset = (slot * 14 + sector) * 0x1000;
            BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(offset + 0xFF4), sector);
            BinaryPrimitives.WriteUInt32LittleEndian(data.AsSpan(offset + 0xFF8), 0x08012025);
        }
        if (frlg) data[0xAC] = 1;
        data[6] = data[7] = 0xFF;
        return frlg ? new SAV3FRLG(data) : new SAV3RS(data);
    }
    public static void Run()
    {
        foreach (var save in new SAV3[] { Create(false), (SAV3)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!, Create(true) })
        {
            save.OT = "A";
            BinaryPrimitives.WriteUInt32LittleEndian(save.SmallBlock.Data[0x14..], 0xCAFEF8F8);
            var data = save.Write().ToArray(); var original = data.ToArray(); var basis = Original(save);
            Require(SaveUtil.GetSaveFile(data.ToArray())?.GetType() == save.GetType(), "Synthetic and fixture formats detected exactly");
            using (var report = JsonDocument.Parse(SaveService.Inspect(data)))
                Require(report.RootElement.GetProperty("trainer").GetProperty("gameOptions").GetProperty("textSpeed").GetInt32() == 0, "Options included in JSON report");
            for (int speed = 0; speed < 4; speed++)
            for (int mask = 0; mask < 8; mask++)
            {
                int style = mask & 1, sound = (mask >> 1) & 1, effects = (mask >> 2) & 1;
                var expected = (SAV3)SaveUtil.GetSaveFile(data.ToArray())!;
                expected.SmallBlock.TextSpeed = speed;
                expected.SmallBlock.OptionBattleStyle = style == 1;
                expected.SmallBlock.OptionSound = sound == 1;
                expected.SmallBlock.OptionBattleScene = effects == 0;
                var output = Apply(data, basis with { GameOptions = new(speed, style, sound, effects) });
                Require(output.SequenceEqual(expected.Write().ToArray()), "Full output equals upstream setters; unrelated option bits preserved");
                var after = (SAV3)SaveUtil.GetSaveFile(output.ToArray())!;
                Require(after.ChecksumsValid && TrainerGameOptions.Read(after) == new TrainerGameOptionState(speed, style, sound, effects), "All options and checksum survive export");
                Require(data.SequenceEqual(original), "Original file stays unchanged");
            }
            foreach (int speed in new[] { 4, 5, 6, 7 })
            {
                var anomalous = (SAV3)SaveUtil.GetSaveFile(data.ToArray())!;
                anomalous.SmallBlock.Data[0x14] |= (byte)speed;
                var raw = anomalous.Write().ToArray(); var untouched = raw.ToArray();
                foreach (var edit in new[] { new TrainerGameOptionEdit(TextSpeed: speed), new TrainerGameOptionEdit(Sound: 1) })
                {
                    var output = Apply(raw, Original(anomalous) with { GameOptions = edit });
                    var after = (SAV3)SaveUtil.GetSaveFile(output.ToArray())!;
                    Require(after.SmallBlock.TextSpeed == speed && after.ChecksumsValid, "Unchanged three-bit speed survives unrelated edits");
                    uint wanted = BinaryPrimitives.ReadUInt32LittleEndian(anomalous.SmallBlock.Data[0x14..]);
                    if (edit.Sound == 1) wanted |= 1u << 8;
                    Require(BinaryPrimitives.ReadUInt32LittleEndian(after.SmallBlock.Data[0x14..]) == wanted, "Only the requested sound bit changes");
                    Require(raw.SequenceEqual(untouched), "Unusual original unchanged");
                }
                var normalized = (SAV3)SaveUtil.GetSaveFile(Apply(raw, Original(anomalous) with { GameOptions = new(TextSpeed: 2) }))!;
                Require(normalized.SmallBlock.TextSpeed == 2, "Unusual speed can be explicitly replaced");
            }
            foreach (var invalid in new[] { new TrainerGameOptionEdit(TextSpeed: -1), new(TextSpeed: 8), new(TextSpeed: 4), new(TextSpeed: 5), new(TextSpeed: 6), new(TextSpeed: 7), new(BattleStyle: -1), new(BattleStyle: 2), new(Sound: -1), new(Sound: 2), new(BattleEffects: -1), new(BattleEffects: 2) })
            {
                try { Apply(data, basis with { GameOptions = invalid }); throw new Exception("Invalid options accepted"); }
                catch (ArgumentException) { Require(data.SequenceEqual(original), "Rejected options preserve source"); }
            }
            Console.WriteLine($"PASS {save.GetType().Name}: 32 combinations, full output, unrelated bits, speeds 4–7 preservation/rejection, checksum and original");
        }
        foreach (var version in new[] { "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var data = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var before = data.ToArray();
            var save = SaveUtil.GetSaveFile(data.ToArray())!;
            Require(TrainerEditing.Options(save).GameOptions is null, "Unsupported option group hidden");
            try { Apply(data, Original(save) with { GameOptions = new(TextSpeed: 0) }); throw new Exception("Unsupported game options accepted"); }
            catch (ArgumentException) { Require(data.SequenceEqual(before), "Unsupported request preserves original"); }
        }
        foreach (var save in new SaveFile[] { new SAV3Colosseum(new byte[SaveUtil.SIZE_G3COLO], decrypt: false), new SAV3XD(), new SAV8SWSH() })
        {
            Require(TrainerGameOptions.Read(save) is null, "Non-GBA formats excluded");
            try { TrainerGameOptions.Apply(save, new(TextSpeed: 0)); throw new Exception("Unsupported object accepted"); }
            catch (ArgumentException) { }
        }
        Console.WriteLine("PASS unsupported trainer game option formats");
    }
}

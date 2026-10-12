// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Buffers.Binary;

internal static class ChatterEditingTests
{
    private static IChatter Access(SaveFile save) => save is SAV4 s4 ? s4.Chatter : ((SAV5)save).Chatter;
    private static Span<byte> Raw(SaveFile save) => save switch { SAV4DP s => s.General.Slice(0x61CC, 1004), SAV4Pt s => s.General.Slice(0x64EC, 1004), SAV4HGSS s => s.General.Slice(0x4E74, 1004), _ => ((SAV5)save).Chatter.Data };
    public static void Run()
    {
        foreach (string version in new[] { "D", "Pt", "HG", "B", "B2" })
        {
            var input = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var original = input.ToArray();
            var before = SaveUtil.GetSaveFile(input.ToArray())!;
            var catalog = ChatterEditing.Read(before, Br4Editing.Hash(input));
            Check(catalog.PcmSize == 1000 && Convert.FromBase64String(catalog.Pcm).Length == 1000 && Convert.FromBase64String(catalog.Wav).Length == 2044, "Actual recording and WAV lengths");
            var pcm = Enumerable.Range(0, 1000).Select(i => (byte)i).ToArray();
            foreach (var actions in new ChatterAction[][] { [], [new("initialized", true)], [new("initialized", true), new("initialized", false)], [new("import", Pcm: Convert.ToBase64String(pcm))], [new("import", Pcm: Convert.ToBase64String(pcm)), new("initialized", false)] })
            {
                var expected = SaveUtil.GetSaveFile(input.ToArray())!; var recording = Access(expected);
                foreach (var action in actions)
                    if (action.Kind == "import") { pcm.CopyTo(recording.Recording); recording.Initialized = true; }
                    else if (action.Initialized!.Value != recording.Initialized) recording.Initialized = action.Initialized.Value;
                var expectedBytes = expected.Write().ToArray();
                var output = ChatterEditing.Prepare(input, actions);
                Check(output.SequenceEqual(expectedBytes), "Independent complete output oracle");
                var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Check(SaveChecksums.Valid(after) && ChatterEditing.Snapshot(after) == ChatterEditing.Snapshot(expected), "Reopened PCM/flag and checksums");
            }
            var rawSave = SaveUtil.GetSaveFile(input.ToArray())!;
            foreach (uint flag in new uint[] { 0, 1, 2, uint.MaxValue })
            {
                BinaryPrimitives.WriteUInt32LittleEndian(Raw(rawSave), flag);
                for (int value = 0; value < 256; value++)
                {
                    Access(rawSave).Recording.Clear(); Access(rawSave).Recording[15] = (byte)value; Access(rawSave).Recording[99] = (byte)value;
                    var state = ChatterEditing.Read(rawSave, "probe");
                    int chance = flag != 1 ? rawSave is SAV4 ? 1 : 0 : rawSave is SAV4 ? unchecked((sbyte)value) < -30 ? 11 : unchecked((sbyte)value) >= 30 ? 31 : 1 : value < 100 || value >= 150 ? 10 : 0;
                    Check(state.RawInitialized == flag && state.Initialized == (flag == 1) && state.ConfusionChance == chance && state.CanPlay == (flag == 1 || value != 0), "All byte confusion/play and raw flag semantics");
                }
            }
            BinaryPrimitives.WriteUInt32LittleEndian(Raw(rawSave), 2);
            var rawInput = rawSave.Write().ToArray();
            var sameValue = ChatterEditing.Prepare(rawInput, [new("initialized", false)]);
            Check(sameValue.SequenceEqual(rawInput), "Unchanged false UI value preserves noncanonical raw flag");
            foreach (var bad in new ChatterAction[][] { [new("import", Pcm: "?")], [new("import", Pcm: Convert.ToBase64String(new byte[999]))], [new("import", Pcm: Convert.ToBase64String(new byte[1001]))], [new("initialized")], [new("initialized", true, "")], [new("unknown")], [new("initialized", true), new("import", Pcm: "?")] })
            {
                var save = SaveUtil.GetSaveFile(input.ToArray())!; var snapshot = ChatterEditing.Snapshot(save);
                Reject(() => ChatterEditing.Apply(save, bad)); Check(ChatterEditing.Snapshot(save) == snapshot, "Invalid batch is atomic before field writes");
            }
            Check(input.SequenceEqual(original), "Chatter changed original source bytes");
            Console.WriteLine($"PASS Chatter {version}: source PCM/flag event ordering, all 256 byte-derived values/four flags, play gate, independent complete output, unknown raw preservation, atomic bounds and original");
        }
        var samples = Enumerable.Range(0, 1000).Select(i => (byte)i).ToArray(); var wav = ChatterEditing.Wave(samples);
        Check(BinaryPrimitives.ReadUInt32LittleEndian(wav.AsSpan(4)) == 2036 && BinaryPrimitives.ReadUInt32LittleEndian(wav.AsSpan(24)) == 2000 && BinaryPrimitives.ReadUInt32LittleEndian(wav.AsSpan(40)) == 2000, "Exact source WAV header sizes/rate");
        for (int i = 0; i < samples.Length; i++) Check(wav[44 + i * 2] == (samples[i] % 16) * 16 && wav[45 + i * 2] == samples[i] / 16 * 16, "Every low-then-high nibble sample");
        Reject(() => ChatterEditing.Wave(new byte[999])); Check(!ChatterEditing.Supports(new SAV3E()), "Unsupported save capability");
    }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid Chatter request accepted"); }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
}

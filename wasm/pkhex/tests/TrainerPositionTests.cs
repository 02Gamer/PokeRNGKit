// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerPositionTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile s) => new(s.OT, s.TID16, s.SID16, s.Money);
    private static byte[] Apply(byte[] data, TrainerEdit edit) => SaveService.Export(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.TrainerEdit));
    private static void Direct(SaveFile save, TrainerPositionEdit edit)
    {
        if (save is SAV4 s)
        {
            if (edit.Map is int m && m != s.M) s.M = m;
            if (edit.X is int x && x != s.X) s.X = x;
            if (edit.Z is int z && unchecked((ushort)z) != s.Z) s.Z = z;
            if (edit.Y is int y && y != s.Y) s.Y = y;
        }
        else if (save is SAV5 s5)
        {
            var p = s5.PlayerPosition;
            if (edit.Map is int m && m != p.M) p.M = m;
            if (edit.X is int x && x != p.X) p.X = x;
            if (edit.Z is int z && unchecked((ushort)z) != p.Z) p.Z = z;
            if (edit.Y is int y && y != p.Y) p.Y = y;
        }
    }
    public static void Run()
    {
        foreach (var version in new[] { "D", "Pt", "HG", "B", "B2" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            save.OT = "A";
            if (save is SAV5 s5) BinaryPrimitives.WriteInt32LittleEndian(s5.PlayerPosition.Data[0x80..], 123);
            Direct(save, new(123, 11, 33, 22));
            if (save is SAV4 s4) { s4.X2 = 31415; s4.Y2 = 27182; }
            var data = save.Write().ToArray(); var original = data.ToArray(); var basis = Original(save);
            using (var report = JsonDocument.Parse(SaveService.Inspect(data)))
                Require(report.RootElement.GetProperty("trainer").GetProperty("position").GetProperty("map").GetInt32() == 123, "Position available in report");
            var cases = new TrainerPositionEdit[] { new(), new(123, 11, 33, 22), new(Map: 0), new(Map: 1000), new(X: 0), new(X: 65535), new(Y: 0), new(Y: 65535), new(Z: 0), new(Z: 65535), new(Z: -1), new(Z: -65535), new(Z: -32768), new(1000, 65535, -2, 65535) };
            foreach (var edit in cases)
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!; Direct(expected, edit);
                var output = Apply(data, basis with { Position = edit });
                Require(output.SequenceEqual(expected.Write().ToArray()), "Full output matches changed Core setters including mirrored coordinates");
                var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Require(after.ChecksumsValid && TrainerPosition.Read(after) == TrainerPosition.Read(expected), "Position survives export with valid checksum");
                if (after is SAV4 a && expected is SAV4 e)
                    Require(a.X2 == e.X2 && a.Y2 == e.Y2, "Unchanged divergent mirrors stay intact; changed X/Y synchronize");
                Require(data.SequenceEqual(original), "Source file unchanged");
            }
            foreach (var edit in new TrainerPositionEdit[] { new(Map: -1), new(Map: 1001), new(X: -1), new(X: 65536), new(Y: -1), new(Y: 65536), new(Z: -65536), new(Z: 65536), new(Map: int.MaxValue) })
            {
                try { Apply(data, basis with { Position = edit }); throw new Exception("Invalid position accepted"); }
                catch (ArgumentException) { Require(data.SequenceEqual(original), "Rejected edit preserves source"); }
            }
            Direct(save, new(Map: 50000));
            var unusual = save.Write().ToArray();
            var kept = SaveUtil.GetSaveFile(Apply(unusual, basis with { Position = new(X: 1234) }))!;
            Require(TrainerPosition.Read(kept) is { Map: 50000, X: 1234 }, "Out-of-range original map preserved when editing another coordinate");
            Require(Apply(unusual, basis with { Position = new(Map: 50000) }).SequenceEqual(unusual), "Same unusual map is a no-op");
            var corrected = SaveUtil.GetSaveFile(Apply(unusual, basis with { Position = new(Map: 1000) }))!;
            Require(TrainerPosition.Read(corrected)!.Map == 1000, "Ordinary out-of-range map can be explicitly corrected");
            if (save is SAV5 raw)
            {
                foreach (int anomalous in new[] { 0x12340001, unchecked((int)0xCAFE0001) })
                {
                    BinaryPrimitives.WriteInt32LittleEndian(raw.PlayerPosition.Data[0x80..], anomalous);
                    var bytes = raw.Write().ToArray(); var untouched = bytes.ToArray();
                    var expected = (SAV5)SaveUtil.GetSaveFile(bytes.ToArray())!; expected.PlayerPosition.X = 999;
                    Require(Apply(bytes, basis with { Position = new(X: 999) }).SequenceEqual(expected.Write().ToArray()), "High map bytes and fractional coordinates preserved");
                    Require(Apply(bytes, basis with { Position = new(Map: anomalous) }).SequenceEqual(bytes), "Unchanged signed map preserved");
                    try { Apply(bytes, basis with { Position = new(Map: 100) }); throw new Exception("Unrepresentable map accepted"); }
                    catch (ArgumentException ex) { Require(ex.Message.Contains("cannot be represented") && bytes.SequenceEqual(untouched), "Unrepresentable map rejected without altering source"); }
                }
            }
            Console.WriteLine($"PASS {version}: map/coordinate bounds, signed Z encoding, mirrors, full output, unusual map preservation and original");
        }
        foreach (var version in new[] { "E", "X", "OR", "SN", "US", "BD" })
        {
            var data = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var before = data.ToArray();
            var save = SaveUtil.GetSaveFile(data.ToArray())!;
            Require(TrainerEditing.Options(save).Position is null, "Other position layouts not exposed as DS");
            try { Apply(data, Original(save) with { Position = new(Map: 0) }); throw new Exception("Unsupported DS position accepted"); }
            catch (ArgumentException) { Require(data.SequenceEqual(before), "Unsupported request preserves input"); }
        }
        Console.WriteLine("PASS unsupported DS position layouts");
    }
}

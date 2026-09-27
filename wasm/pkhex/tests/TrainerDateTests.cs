// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerDateTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static uint Seconds(string value) => checked((uint)(DateTime.ParseExact(value, "yyyy-MM-dd'T'HH:mm:ss", CultureInfo.InvariantCulture) - new DateTime(2000, 1, 1)).TotalSeconds);
    private static TrainerEdit Original(SaveFile s) => new(s.OT, s.TID16, s.SID16, s.Money);
    private static byte[] Apply(byte[] data, TrainerEdit edit) => SaveService.Export(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.TrainerEdit));
    public static void Run()
    {
        foreach (var version in new[] { "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            save.OT = "A"; save.SecondsToStart = 123; save.SecondsToFame = 456;
            if (save is SAV5 s5) { s5.AdventureInfo.SecondsToStart |= 0xCAFE123400000000; s5.AdventureInfo.SecondsToFame |= 0xABCD567800000000; }
            var data = save.Write().ToArray(); var source = data.ToArray(); var basis = Original(save);
            var fields = TrainerDates.Read(save)!;
            Require(fields.Started == "2000-01-01T00:02:03" && fields.Fame == "2000-01-01T00:07:36", "Epoch and second precision");
            using (var report = JsonDocument.Parse(SaveService.Inspect(data)))
                Require(report.RootElement.GetProperty("trainer").GetProperty("dates").GetProperty("max").GetString() == fields.Max, "Date limits in report");
            var values = new[] { fields.Min, fields.Max, "2000-02-29T23:59:59", "2024-02-29T12:34:56", "2038-01-19T03:14:08" };
            if (save.Generation <= 5) values = [.. values, "2068-01-19T03:14:08", "2096-02-29T00:00:01"];
            foreach (var value in values)
            foreach (bool start in new[] { true, false })
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!;
                if (start) expected.SecondsToStart = Seconds(value); else expected.SecondsToFame = Seconds(value);
                var edit = start ? new TrainerDateEdit(Started: value) : new TrainerDateEdit(Fame: value);
                var output = Apply(data, basis with { Dates = edit });
                Require(output.SequenceEqual(expected.Write().ToArray()), "Whole file matches one Core setter; unrelated date and adjacent data preserved");
                var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Require(after.ChecksumsValid && TrainerDates.Snapshot(after) == TrainerDates.Snapshot(expected), "Dates and high bits survive round trip");
                Require(data.SequenceEqual(source), "Source bytes preserved");
            }
            Require(Apply(data, basis with { Dates = new(fields.Started, fields.Fame) }).SequenceEqual(data), "Explicit same dates are a no-op including Gen 5 high bits");
            var other = SaveUtil.GetSaveFile(data.ToArray())!; other.Money = 1;
            Require(Apply(data, basis with { Money = 1 }).SequenceEqual(other.Write().ToArray()), "Other trainer edits preserve raw dates");
            foreach (var invalid in new[] { "", "1999-12-31T23:59:59", "2100-01-01T00:00:00", "2023-02-29T12:00:00", "2024-04-31T12:00:00", "2024-01-01T24:00:00", "2024-01-01T12:60:00", "2024-01-01T12:00:60", "2024-01-01T12:00", "2024-01-01T12:00:00Z", "2024-01-01T12:00:00+08:00", "2024-01-01T12:00:00.1", " 2024-01-01T12:00:00" })
            {
                try { Apply(data, basis with { Dates = new(Started: invalid) }); throw new Exception("Invalid date accepted"); }
                catch (ArgumentException) { Require(data.SequenceEqual(source), "Rejected edits preserve source"); }
            }
            if (save.Generation >= 6)
            {
                try { Apply(data, basis with { Dates = new(Fame: "2051-01-01T00:00:00") }); throw new Exception("2050 limit ignored"); }
                catch (ArgumentException) { }
            }
            save.SecondsToStart = uint.MaxValue;
            var unusual = save.Write().ToArray(); var state = TrainerDates.Read(save)!;
            Require(Apply(unusual, basis with { Dates = new(Started: state.Started) }).SequenceEqual(unusual), "Unchanged date outside picker range preserved");
            var repaired = SaveUtil.GetSaveFile(Apply(unusual, basis with { Dates = new(Started: fields.Min) }).ToArray())!;
            Require(repaired.SecondsToStart == 0, "Explicitly correcting unusual date works");
            Console.WriteLine($"PASS {version}: adventure dates, leap days, unsigned epoch bounds, full output, original and unchanged raw bytes");
        }
        foreach (SaveFile save in new SaveFile[] { new SAV3E(), new SAV8SWSH(), new SAV8BS() })
        {
            Require(TrainerDates.Read(save) is null, "Unsupported date format hidden");
            try { TrainerDates.Apply(save, new(Started: "2024-01-01T00:00:00")); throw new Exception("Unsupported date edit accepted"); }
            catch (ArgumentException) { }
        }
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerTimestampTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile s) => new(s.OT, s.TID16, s.SID16, s.Money);
    private static byte[] Apply(byte[] data, TrainerEdit edit) => SaveService.Export(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.TrainerEdit));
    private static DateTime Date(string value) => DateTime.ParseExact(value, "yyyy-MM-dd'T'HH:mm:ss", CultureInfo.InvariantCulture);
    private static TrainerDateField Saved(SaveFile save) => TrainerDates.Read(save).Single(f => f.Key == "saved");
    private static Span<byte> Played(SaveFile save) => save switch { SAV6 s => s.Played.Data, SAV7 s => s.Played.Data, SAV8SWSH s => s.Played.Data, _ => throw new Exception() };
    private static void SetSaved(SaveFile save, DateTime date) { switch(save) { case SAV6 s: s.Played.LastSavedDate = date; break; case SAV7 s: s.Played.LastSavedDate = date; break; case SAV8SWSH s: s.Played.LastSavedDate = date; break; } }
    private static void Reject(SaveFile save, TrainerDateEdit edit)
    {
        var original = TrainerDates.Snapshot(save);
        try { TrainerDates.Apply(save, edit); throw new Exception("Invalid timestamp accepted"); }
        catch (ArgumentException) { Require(TrainerDates.Snapshot(save) == original, "Reject before changing any timestamp"); }
    }
    public static void Run()
    {
        foreach (var version in new[] { "X", "OR", "SN", "US" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            save.OT = "A"; SetSaved(save, Date("2024-06-07T08:09:00"));
            var data = save.Write().ToArray(); var source = data.ToArray(); var basis = Original(save); var field = Saved(save);
            Require(field.Kind == "minute" && field.Value == "2024-06-07T08:09:00", "Minute precision exposed");
            foreach (var value in new[] { field.Min, field.Max, "2000-02-29T00:00:00", "2024-02-29T23:59:00" })
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!; SetSaved(expected, Date(value));
                var output = Apply(data, basis with { Dates = new(Saved: value) });
                Require(output.SequenceEqual(expected.Write().ToArray()), "Only last-saved packed timestamp changes");
                var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Require(after.ChecksumsValid && Saved(after).Value == value, "Timestamp round trip and checksum");
                Require(data.SequenceEqual(source), "Source preserved");
            }
            Require(Apply(data, basis with { Dates = new(Saved: field.Value) }).SequenceEqual(data), "Same timestamp no-op");
            foreach (var bad in new[] { "", "2023-02-29T00:00:00", "2024-01-01T12:34:01", "2024-01-01T12:34", "2051-01-01T00:00:00", "2024-01-01T12:00:00Z", "2024-01-01T12:00:00.1" })
                Reject(save, new(Started: "2024-01-01T00:00:00", Saved: bad));
            if (save.Generation == 6) Reject(save, new(Saved: "1999-12-31T23:59:00"));
            else Reject(save, new(Saved: "1752-12-31T23:59:00"));
            foreach (uint raw in new[] { 0U, uint.MaxValue, 2024U | (1U << 12) | (1U << 16) | (31U << 21) })
            {
                BinaryPrimitives.WriteUInt32LittleEndian(Played(save)[4..], raw);
                Require(Saved(save).Value == "", "Invalid date or hour safely exposed as empty");
                var invalid = save.Write().ToArray();
                using var report = JsonDocument.Parse(SaveService.Inspect(invalid));
                Require(report.RootElement.GetProperty("trainer").GetProperty("dates").EnumerateArray().Single(f => f.GetProperty("key").GetString() == "saved").GetProperty("value").GetString() == "", "Invalid timestamp does not break report");
                var expected = SaveUtil.GetSaveFile(invalid.ToArray())!; expected.Money = 1;
                Require(Apply(invalid, basis with { Money = 1 }).SequenceEqual(expected.Write().ToArray()), "Invalid raw timestamp preserved by unrelated edit");
                SetSaved(expected, Date("2024-02-29T23:59:00")); expected.Money = basis.Money;
                Require(Apply(invalid, basis with { Dates = new(Saved: "2024-02-29T23:59:00") }).SequenceEqual(expected.Write().ToArray()), "Explicit invalid timestamp repair uses Core setter only");
            }
            SetSaved(save, Date("4095-12-31T23:59:00"));
            var unusual = save.Write().ToArray();
            Require(Apply(unusual, basis with { Dates = new(Saved: Saved(save).Value) }).SequenceEqual(unusual), "Unchanged valid timestamp outside UI range preserved");
            Console.WriteLine($"PASS {version}: last-saved minute precision, calendar limits, invalid raw date/time preservation and repair, full export");
        }
        SwordShield(); BrilliantDiamond();
        foreach (var version in new[] { "D", "B" })
            Reject(SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!, new(Saved: "2024-01-01T00:00:00"));
    }
    private static void SwordShield()
    {
        var save = new SAV8SWSH();
        save.TrainerCard.StartedYear = 2024; save.TrainerCard.StartedMonth = 1; save.TrainerCard.StartedDay = 2;
        SetSaved(save, Date("2024-06-07T08:09:00"));
        var card = save.TrainerCard.Data.ToArray(); var played = save.Played.Data.ToArray();
        foreach (var value in new[] { "2000-01-01", "2060-12-31", "2024-02-29" })
        {
            card.CopyTo(save.TrainerCard.Data); played.CopyTo(save.Played.Data);
            var date = DateTime.ParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            var expected = card.ToArray(); BinaryPrimitives.WriteUInt16LittleEndian(expected.AsSpan(0x170), (ushort)date.Year); expected[0x172] = (byte)date.Month; expected[0x173] = (byte)date.Day;
            TrainerDates.Apply(save, new(Started: value));
            Require(save.TrainerCard.Data.SequenceEqual(expected) && save.Played.Data.SequenceEqual(played), "SWSH date-only edit changes exact four card bytes");
        }
        foreach (var value in new[] { "1900-01-01T00:00:00", "2000-02-29T23:59:00", "4095-12-31T23:59:00" })
        {
            played.CopyTo(save.Played.Data); var beforeCard = save.TrainerCard.Data.ToArray();
            var expected = new SAV8SWSH(); played.CopyTo(expected.Played.Data); SetSaved(expected, Date(value));
            TrainerDates.Apply(save, new(Saved: value));
            Require(save.Played.Data.SequenceEqual(expected.Played.Data) && save.TrainerCard.Data.SequenceEqual(beforeCard) && Saved(save).Value == value, "SWSH 1900 epoch minute packing, unrelated bytes and readback");
        }
        foreach (var edit in new TrainerDateEdit[] { new(Started: "2061-01-01"), new(Started: "2023-02-29"), new(Started: "2024-01-01T00:00:00"), new(Saved: "1899-12-31T23:59:00"), new(Saved: "4096-01-01T00:00:00"), new(Saved: "2024-01-01T00:00:01"), new(Fame: "2024-01-01T00:00:00") }) Reject(save, edit);
        SetSaved(save, Date("5995-12-31T23:59:00")); var unusual = save.Played.Data.ToArray();
        TrainerDates.Apply(save, new(Saved: Saved(save).Value));
        Require(save.Played.Data.SequenceEqual(unusual), "Unchanged packed date outside SWSH picker range preserved");
        Reject(save, new(Saved: "5000-01-01T00:00:00"));
        save.TrainerCard.StartedYear = 0; save.Played.Data.Slice(4,4).Fill(255);
        Require(TrainerDates.Read(save).All(f => f.Value == ""), "SWSH invalid dates safely read");
        TrainerDates.Apply(save, new("2024-02-29", Saved: "2024-02-29T12:34:00"));
        Require(TrainerDates.Read(save).All(f => f.Value.StartsWith("2024-02-29")), "SWSH explicit invalid date repair");
        Console.WriteLine("PASS SWSH Core objects: date-only card, packed minute timestamp, bounds and invalid repair; no serialized real-save fixture");
    }
    private static void BrilliantDiamond()
    {
        var save = (SAV8BS)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav"))!; save.OT = "A";
        save.System.TimestampStart = new DateTime(2024,1,2,3,4,5,DateTimeKind.Utc).AddTicks(1234567);
        save.System.TimestampLatest = new DateTime(2024,6,7,8,9,10,DateTimeKind.Utc).AddTicks(7654321);
        var data = save.Write().ToArray(); var source = data.ToArray(); var basis = Original(save);
        foreach (var value in new[] { "2000-01-01T00:00:00+14:00", "2099-12-31T23:59:59-12:00", "2024-02-29T12:34:56+08:00", "2024-11-03T01:30:00-05:00", "2024-11-03T01:30:00-04:00" })
        foreach (bool start in new[] { true, false })
        {
            var expected = (SAV8BS)SaveUtil.GetSaveFile(data.ToArray())!;
            var date = DateTimeOffset.ParseExact(value, "yyyy-MM-dd'T'HH:mm:sszzz", CultureInfo.InvariantCulture).UtcDateTime;
            if (start) expected.System.TimestampStart = date.AddTicks(1234567); else expected.System.TimestampLatest = date.AddTicks(7654321);
            var output = Apply(data, basis with { Dates = start ? new(Started: value) : new(Saved: value) });
            Require(output.SequenceEqual(expected.Write().ToArray()), "BDSP UTC conversion, fractional ticks, counters and all other bytes");
            var after = (SAV8BS)SaveUtil.GetSaveFile(output.ToArray())!;
            Require(after.ChecksumsValid && TrainerDates.Snapshot(after) == TrainerDates.Snapshot(expected) && data.SequenceEqual(source), "BDSP timestamp round trip and source preservation");
        }
        Require(Apply(data, basis with { Dates = new("2024-01-02T11:04:05+08:00", Saved: "2024-06-07T03:09:10-05:00") }).SequenceEqual(data), "Same instants in different offsets do not rewrite fractional ticks");
        foreach (var bad in new[] { "", "2024-01-01T00:00:00", "2024-01-01T00:00:00Z", "1999-12-31T23:59:59+00:00", "2100-01-01T00:00:00+00:00", "2023-02-29T00:00:00+08:00", "2024-01-01T00:00:00+14:01", "2024-01-01T00:00:00.1+08:00" }) Reject(save, new(Saved: bad));
        Reject(save, new(Fame: "2024-01-01T00:00:00"));
        foreach (long raw in new[] { long.MinValue, long.MaxValue, -1L })
        {
            save.System.TicksStart = raw; save.System.TicksLatest = raw;
            Require(TrainerDates.Read(save).All(f => f.Value == ""), "Invalid FILETIME safely exposed");
            var invalid = save.Write().ToArray(); using var report = JsonDocument.Parse(SaveService.Inspect(invalid));
            var expected = (SAV8BS)SaveUtil.GetSaveFile(invalid.ToArray())!; expected.Money = 1;
            Require(Apply(invalid, basis with { Money = 1 }).SequenceEqual(expected.Write().ToArray()), "Invalid FILETIMEs preserved by unrelated edit");
            expected.Money = basis.Money; expected.System.TimestampLatest = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc);
            Require(Apply(invalid, basis with { Dates = new(Saved: "2024-01-01T08:00:00+08:00") }).SequenceEqual(expected.Write().ToArray()), "Explicit invalid FILETIME repair uses zero fractional ticks and preserves other timestamp");
        }
        Console.WriteLine("PASS BDSP: offsets, local calendar limits, fractional ticks, invalid FILETIMEs, full output and source");
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record TrainerDateState(string Started, string Fame, string Min, string Max);
public sealed record TrainerDateEdit(string? Started = null, string? Fame = null);
internal sealed record TrainerDateSnapshot(ulong Started, ulong Fame);

internal static class TrainerDates
{
    private const string Format = "yyyy-MM-dd'T'HH:mm:ss";
    private static readonly DateTime Epoch = new(2000, 1, 1);
    private static bool Supports(SaveFile save) => save is SAV4 or SAV5 or SAV6XY or SAV6AO or SAV7SM or SAV7USUM;
    public static TrainerDateState? Read(SaveFile save) => Supports(save)
        ? new(Epoch.AddSeconds(save.SecondsToStart).ToString(Format, CultureInfo.InvariantCulture),
            Epoch.AddSeconds(save.SecondsToFame).ToString(Format, CultureInfo.InvariantCulture),
            "2000-01-01T00:00:00", save.Generation <= 5 ? "2099-12-31T23:59:59" : "2050-12-31T23:59:59")
        : null;
    // Gen 5 exposes uint through SaveFile but stores ulong. Preserve high bits unless explicitly changed.
    public static TrainerDateSnapshot? Snapshot(SaveFile save) => !Supports(save) ? null : save is SAV5 s
        ? new(s.AdventureInfo.SecondsToStart, s.AdventureInfo.SecondsToFame)
        : new(save.SecondsToStart, save.SecondsToFame);
    public static void Apply(SaveFile save, TrainerDateEdit edit)
    {
        var before = Read(save) ?? throw new ArgumentException("Trainer dates are unsupported or out of range.");
        uint? started = Parse(edit.Started, before.Started, before), fame = Parse(edit.Fame, before.Fame, before);
        if (started is uint start) save.SecondsToStart = start;
        if (fame is uint hall) save.SecondsToFame = hall;
        if ((started.HasValue && save.SecondsToStart != started.Value) || (fame.HasValue && save.SecondsToFame != fame.Value))
            throw new ArgumentException("Trainer dates cannot be represented by this format.");
    }
    private static uint? Parse(string? value, string original, TrainerDateState limits)
    {
        if (value is null || value == original) return null;
        if (!DateTime.TryParseExact(value, Format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ||
            string.CompareOrdinal(value, limits.Min) < 0 || string.CompareOrdinal(value, limits.Max) > 0)
            throw new ArgumentException("Trainer dates are unsupported or out of range.");
        // Avoid DateUtil's signed int intermediate, which overflows inside the DS calendar range.
        return checked((uint)((date.Ticks - Epoch.Ticks) / TimeSpan.TicksPerSecond));
    }
}

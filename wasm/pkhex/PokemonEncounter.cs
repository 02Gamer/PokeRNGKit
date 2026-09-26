// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

// null means preserve; an empty date explicitly clears its three stored bytes.
public sealed record EncounterEdit(int? MetLevel = null, bool? Fateful = null, string? MetDate = null, string? EggDate = null);
public sealed record EncounterInfo(int MetLevel, int MaxMetLevel, bool Fateful, bool CanDates, string MetDate, string EggDate);

internal static class PokemonEncounter
{
    private static int MaxLevel(PKM p) => p is CK3 or XK3 ? 255 : 127;
    private static bool CanDates(PKM p) => p is PK4 or PK5 or PK6 or PK7 or PK8 or PB8;
    private static string Date(DateOnly? date) => date?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "";
    public static EncounterInfo Read(PKM p) => new(p.MetLevel, MaxLevel(p), p.FatefulEncounter,
        CanDates(p), Date(p.MetDate), Date(p.EggMetDate));

    public static void Apply(PKM p, EncounterEdit edit)
    {
        if (edit.MetLevel is null && edit.Fateful is null && edit.MetDate is null && edit.EggDate is null)
            throw new ArgumentException("Encounter edit requires a changed value.");
        if (edit.MetLevel is int level && (level < 0 || level > MaxLevel(p)))
            throw new ArgumentException("Met level exceeds this format's storage width.");
        if ((edit.MetDate is not null || edit.EggDate is not null) && !CanDates(p))
            throw new ArgumentException("Encounter dates are unavailable in this format.");
        // Validate all values before mutating the entity.
        var met = Parse(edit.MetDate);
        var egg = Parse(edit.EggDate);
        var gender = p.OriginalTrainerGender;
        if (edit.MetLevel is int value) p.MetLevel = (byte)value;
        if (edit.Fateful is bool flag) p.FatefulEncounter = flag;
        if (edit.MetDate is not null) p.MetDate = met;
        if (edit.EggDate is not null) p.EggMetDate = egg;
        if (p.OriginalTrainerGender != gender ||
            (edit.MetLevel is int requested && p.MetLevel != requested) ||
            (edit.Fateful is bool requestedFlag && p.FatefulEncounter != requestedFlag) ||
            (edit.MetDate is not null && p.MetDate != met) ||
            (edit.EggDate is not null && p.EggMetDate != egg))
            throw new ArgumentException("Encounter value cannot be represented by this format.");
    }

    private static DateOnly? Parse(string? value)
    {
        if (value is null or "") return null;
        if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            || date.Year < 2000 || date.Year > 2099)
            throw new ArgumentException("Encounter date must be within 2000-01-01 and 2099-12-31.");
        return date;
    }
}

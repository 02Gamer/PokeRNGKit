// SPDX-License-Identifier: GPL-3.0-or-later
using System.Collections.Concurrent;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonVirusInfo(int Strain, int Days, bool Infected, bool Cured, int[] Durations);
public sealed record PokemonSpecialStatusInfo(PokemonVirusInfo? Virus, bool? NSparkle, int? PokeStarFame);
public sealed record PokemonSpecialStatusEdit(string Action = "values", int? Strain = null, int? Days = null, bool? NSparkle = null, int? PokeStarFame = null, bool? Value = null);

internal static class PokemonSpecialStatus
{
    private static readonly int[] Durations = Enumerable.Range(0, 16).Select(Pokerus.GetMaxDuration).ToArray();
    private static readonly ConcurrentDictionary<Type, bool> Storage = new();
    private static bool StoresVirus(PKM p) => Storage.GetOrAdd(p.GetType(), _ =>
    {
        var copy = p.Clone();
        foreach (int value in new[] { 0, 1, 15 })
        {
            copy.PokerusStrain = value; copy.PokerusDays = value;
            if (copy.PokerusStrain != value || copy.PokerusDays != value) return false;
        }
        return true;
    });
    public static PokemonSpecialStatusInfo? Read(PKM p)
    {
        if (p.Format < 3) return null; // GB uses its existing caught-data adapter.
        var virus = StoresVirus(p) ? new PokemonVirusInfo(p.PokerusStrain, p.PokerusDays, p.IsPokerusInfected, p.IsPokerusCured, Durations) : null;
        return virus is null && p is not PK5 ? null : new(virus, p is PK5 fifth ? fifth.NSparkle : null, p is PK5 fame ? fame.PokeStarFame : null);
    }
    public static void Apply(PKM p, PokemonSpecialStatusEdit edit)
    {
        var source = Read(p) ?? throw new ArgumentException("Special status editing is unavailable for this format.");
        bool values = edit.Strain is not null || edit.Days is not null || edit.NSparkle is not null || edit.PokeStarFame is not null;
        var copy = p.Clone();
        if (edit.Action == "values")
        {
            if (!values || edit.Value is not null) throw new ArgumentException("Special status values are empty or have unexpected parameters.");
            if (edit.Strain is not null || edit.Days is not null)
            {
                var virus = source.Virus ?? throw new ArgumentException("Pokerus storage is unavailable.");
                int strain = edit.Strain ?? virus.Strain;
                bool strainChanged = strain != virus.Strain;
                if (strain is < 0 or > 15) throw new ArgumentException("Pokerus strain must be between 0 and 15.");
                int days = edit.Days ?? (strainChanged ? Math.Min(Pokerus.GetMaxDuration(strain), virus.Days) : virus.Days);
                if ((strainChanged || days != virus.Days) && (days < 0 || days > Pokerus.GetMaxDuration(strain))) throw new ArgumentException("Pokerus days exceed the selected strain duration.");
                // Some GC entities encode zero days as FF. Preserve an untouched original encoding.
                if (days != virus.Days) copy.PokerusDays = days;
                if (strainChanged) copy.PokerusStrain = strain;
                if (copy.PokerusStrain != strain || copy.PokerusDays != days) throw new ArgumentException("Pokerus state cannot be represented.");
            }
            if (edit.NSparkle is bool sparkle)
            {
                if (copy is not PK5 fifth) throw new ArgumentException("N sparkle is only stored in Generation V entities.");
                if (sparkle != fifth.NSparkle) fifth.NSparkle = sparkle;
            }
            if (edit.PokeStarFame is int fame)
            {
                if (copy is not PK5 fifth || fame is < 0 or > 255) throw new ArgumentException("PokeStar fame requires a Generation V byte value.");
                if (fame != fifth.PokeStarFame) fifth.PokeStarFame = (byte)fame;
            }
        }
        else
        {
            if (values || edit.Value is not bool value || source.Virus is not { } virus) throw new ArgumentException("Pokerus toggle parameters are invalid.");
            switch (edit.Action)
            {
                case "infected":
                    if (value == virus.Infected) break;
                    if (!value) { copy.PokerusStrain = 0; copy.PokerusDays = 0; }
                    else if (copy.PokerusStrain == 0) { copy.PokerusStrain = 1; copy.PokerusDays = 1; }
                    break;
                case "cured":
                    if (value == virus.Cured) break;
                    if (value) { if (copy.PokerusStrain == 0) copy.PokerusStrain = 1; copy.PokerusDays = 0; }
                    else if (virus.Infected) copy.PokerusDays = 1;
                    else copy.PokerusStrain = 0;
                    break;
                default: throw new ArgumentException("Special status action is unavailable.");
            }
        }
        copy.Data.CopyTo(p.Data);
    }
}

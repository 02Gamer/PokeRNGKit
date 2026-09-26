// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record CareField(string Key, long Value, int Max, bool CanEdit);
public sealed record CareValue(string Key, long Value);
public sealed record CareEdit(CareValue[] Values);
internal static class PokemonCare
{
    public static CareField[] Read(PKM p)
    {
        if (p.Format < 6) throw new ArgumentException("Pokemon care is unavailable for this format.");
        var handling = p.IsEgg || p.Generation < 6 || p.HandlingTrainerName.Length != 0;
        var fields = new List<CareField> {
            new("originalFriendship", p.OriginalTrainerFriendship, 255, true),
            new("handlingFriendship", p.HandlingTrainerFriendship, 255, handling)
        };
        if (p is IAffection a && p.Format <= 7)
        {
            fields.Add(new("originalAffection", a.OriginalTrainerAffection, 255, true));
            fields.Add(new("handlingAffection", a.HandlingTrainerAffection, 255, handling));
        }
        if (p is IFullnessEnjoyment f)
        {
            fields.Add(new("fullness", f.Fullness, 255, true));
            fields.Add(new("enjoyment", f.Enjoyment, 255, true));
        }
        // Desktop saves sociability only for G8PKM and accepts 0..255 despite uint storage.
        if (p is ISociability s) fields.Add(new("sociability", s.Sociability, 255, p is G8PKM));
        return fields.ToArray();
    }
    public static void Apply(PKM p, CareEdit edit)
    {
        var fields = Read(p).ToDictionary(f => f.Key);
        if (edit.Values is null || edit.Values.Length == 0 || edit.Values.Select(v => v.Key).Distinct().Count() != edit.Values.Length)
            throw new ArgumentException("Pokemon care edit must contain distinct fields.");
        foreach (var v in edit.Values)
            if (!fields.TryGetValue(v.Key, out var field) || !field.CanEdit || v.Value < 0 || v.Value > field.Max)
                throw new ArgumentException("Pokemon care field is unavailable or outside its range.");
        foreach (var v in edit.Values)
        {
            var value = (byte)v.Value;
            switch (v.Key)
            {
                case "originalFriendship": p.OriginalTrainerFriendship = value; break;
                case "handlingFriendship": p.HandlingTrainerFriendship = value; break;
                case "originalAffection": ((IAffection)p).OriginalTrainerAffection = value; break;
                case "handlingAffection": ((IAffection)p).HandlingTrainerAffection = value; break;
                case "fullness": ((IFullnessEnjoyment)p).Fullness = value; break;
                case "enjoyment": ((IFullnessEnjoyment)p).Enjoyment = value; break;
                case "sociability": ((G8PKM)p).Sociability = value; break;
            }
        }
        var actual = Read(p).ToDictionary(f => f.Key, f => f.Value);
        if (edit.Values.Any(v => actual[v.Key] != v.Value)) throw new ArgumentException("Pokemon care value cannot be represented.");
    }
}

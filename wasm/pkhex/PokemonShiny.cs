// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record ShinyEdit(string Method, string Type);

internal static class PokemonShiny
{
    public static void Apply(PKM p, ShinyEdit edit)
    {
        if (edit.Method is not ("pid" or "sid") || edit.Type is not ("any" or "star" or "square" or "off"))
            throw new ArgumentException("Pokemon shiny operation is unavailable.");
        var type = edit.Type switch { "square" => Shiny.AlwaysSquare, "star" => Shiny.AlwaysStar, _ => Shiny.Random };
        if (edit.Method == "sid")
        {
            if (edit.Type == "off")
            {
                if (p.IsShiny) p.SID16 ^= (ushort)(p.ShinyXor ^ 16);
            }
            else p.SetShinySID(type);
        }
        else if (edit.Type == "off")
        {
            Validate(p);
            if (p is PK3 && p.Species == (ushort)Species.Unown)
            {
                var origin = p.Version;
                try { p.Version = GameVersion.FR; p.SetUnshiny(); }
                finally { p.Version = origin; }
            }
            else p.SetUnshiny();
        }
        else if (!p.IsShiny || !type.IsValid(p))
        {
            Validate(p);
            p.PID = Find(p, edit.Type);
        }
        if (edit.Method == "pid" && edit.Type != "off" && p.Format >= 6 && (p.Gen3 || p.Gen4 || p.Gen5))
            p.EncryptionConstant = p.PID;
        if (p.IsShiny != (edit.Type != "off") || (edit.Type == "square" && p.ShinyXor != 0) ||
            (edit.Type == "star" && p.ShinyXor != 1))
            throw new ArgumentException("Pokemon shiny result cannot be represented.");
    }

    private static void Validate(PKM p)
    {
        var validGender = p.PersonalInfo.Gender switch
        {
            PersonalInfo.RatioMagicGenderless => p.Gender == 2,
            PersonalInfo.RatioMagicFemale => p.Gender == 1,
            PersonalInfo.RatioMagicMale => p.Gender == 0,
            _ => p.Gender <= 1,
        };
        if ((int)p.Nature >= 25 || !validGender)
            throw new ArgumentException("Pokemon nature and gender must be valid before changing PID.");
    }

    private static uint Find(PKM p, string type)
    {
        // Enumerate the complete shiny PID space rather than an unbounded random loop.
        // Filters follow EntityPID.GetRandomPID; PK3 Unown additionally retains its stored form.
        var g34 = p.Version.IsGen3() || p.Version.IsGen4();
        var legacy = p.Version != 0 && p.Version < GameVersion.X;
        var unown = p is PK3 && p.Species == (ushort)Species.Unown;
        var ratio = PersonalTable.B2W2[p.Species].Gender;
        var mask = g34 ? 1u : 0x10000u;
        var start = Random.Shared.Next(65536);
        int[] xors = type == "square" ? [0] : type == "star" ? [1] : Enumerable.Range(0, p.Format >= 6 ? 16 : 8).ToArray();
        var xorStart = Random.Shared.Next(xors.Length);
        for (var x = 0; x < xors.Length; x++)
        for (var i = 0; i < 65536; i++)
        {
            uint lo = (uint)((start + i) & 0xFFFF);
            uint hi = lo ^ p.TID16 ^ p.SID16 ^ (uint)xors[(xorStart + x) % xors.Length];
            uint pid = (hi << 16) | lo;
            if (unown && EntityPID.GetUnownForm3(pid) != p.Form) continue;
            if (legacy)
            {
                if (g34 && pid % 25 != (byte)p.Nature) continue;
                if (!unown && (pid & mask) != (p.PID & mask)) continue;
                if (!PersonalInfo.IsSingleGender(ratio) && EntityGender.GetFromPIDAndRatio(pid, ratio) != p.Gender) continue;
            }
            return pid;
        }
        throw new ArgumentException("Pokemon shiny PID has no solution with the current form, nature, gender and ability constraints. Use SID editing or change those fields.");
    }
}

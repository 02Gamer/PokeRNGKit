// SPDX-License-Identifier: GPL-3.0-or-later
using System.ComponentModel;
using System.Globalization;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;

namespace PokeRNGKit.SaveEditor;

public sealed record Tr8TeamField(string Key, string Kind, string Value, string Min, string Max);
public sealed record Tr8TeamMember(int Index, int Species, LocalizedText Name, string Sprite, string Raw, Tr8TeamField[] Fields);
public sealed record Tr8TeamValue(int Index, string Property, string Value);

// Explicit setters keep the source PropertyGrid semantics available after trimming.
internal static class Trainer8Teams
{
    private const uint CardKey = 0x874DA6FA, TitleKey = 0xE9BE28BF;
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;
    private static SCBlock Block(SAV8SWSH s, string team)
    {
        uint key = team switch { "card" => CardKey, "title" => TitleKey, _ => throw new ArgumentException("Invalid Trainer8 team.") };
        int minimum = team == "card" ? 0xC8 + 6 * 0x1C : 6 * 0x28;
        if (!s.Blocks.TryGetBlock(key, out var b) || b.Data.Length < minimum)
            throw new ArgumentException("Trainer8 display team block is missing or truncated.");
        return b;
    }
    private static Tr8TeamField Field(string key, string kind, object value) => new(key, kind, Convert.ToString(value, Invariant)!, kind == "i32" ? "-2147483648" : "0", kind switch { "u16" => "65535", "u8" => "255", "u32" => "4294967295", "i32" => "2147483647", _ => "1" });
    internal static Tr8TeamMember[] Read(SAV8SWSH s, string team)
    {
        var block = Block(s, team);
        var names = new[] { "zh-Hans", "en", "ja" }.Select(GameInfo.GetStrings).ToArray();
        return Enumerable.Range(0, 6).Select(i =>
        {
            Tr8TeamField[] fields;
            ushort species; byte form, gender; bool shiny;
            if (team == "card")
            {
                var p = s.TrainerCard.ViewPoke(i); species = p.Species; form = p.Form; gender = p.Gender; shiny = p.IsShiny;
                fields = [Field("species", "u16", species), Field("form", "u8", form), Field("gender", "u8", gender), Field("shiny", "bool", shiny), Field("ec", "u32", p.EncryptionConstant), Field("unknown", "u32", p.Unknown), Field("formArgument", "i32", p.FormArgument)];
            }
            else
            {
                var p = s.TitleScreen.ViewPoke(i); species = p.Species; form = p.Form; gender = p.Gender; shiny = p.IsShiny;
                fields = [Field("species", "u16", species), Field("form", "u8", form), Field("gender", "u8", gender), Field("shiny", "bool", shiny), Field("ec", "u32", p.EncryptionConstant), Field("formArgument", "i32", p.FormArgument), Field("unknown18", "u32", p.Unknown18), Field("unknown1c", "u32", p.Unknown1C), Field("unknown20", "u32", p.Unknown20), Field("unknown24", "u32", p.Unknown24)];
            }
            bool known = names.All(n => species < n.specieslist.Length);
            LocalizedText name = known ? new(names[0].specieslist[species], names[1].specieslist[species], names[2].specieslist[species]) : new($"未知种类 ({species})", $"Unknown species ({species})", $"不明な種類 ({species})");
            string sprite = known && species != 0 ? "b" + SpriteName.GetResourceStringSprite(species, form, gender, 0, EntityContext.Gen8, shiny) : "";
            int offset = team == "card" ? 0xC8 + i * 0x1C : i * 0x28;
            return new Tr8TeamMember(i, species, name, sprite, Convert.ToHexString(block.Data.Slice(offset, team == "card" ? 0x1C : 0x28)), fields);
        }).ToArray();
    }
    internal static void Patch(SAV8SWSH s, string team, Tr8TeamValue[] rows, CultureInfo culture)
    {
        Block(s, team);
        if (rows.Length < 1 || rows.Length > 60) throw new ArgumentException("Invalid Trainer8 team field list.");
        // Validate the complete ordered request before mutating any bytes.
        var members = Read(s, team);
        var parsed = rows.Select(v =>
        {
            if ((uint)v.Index >= 6 || v.Value is null || v.Value.Length > 32767) throw new ArgumentException("Invalid Trainer8 team field.");
            var field = members[v.Index].Fields.SingleOrDefault(f => f.Key == v.Property) ?? throw new ArgumentException("Invalid Trainer8 team property.");
            TypeConverter converter = field.Kind switch { "u16" => new UInt16Converter(), "u8" => new ByteConverter(), "u32" => new UInt32Converter(), "i32" => new Int32Converter(), _ => new BooleanConverter() };
            try { return (Row: v, Value: converter.ConvertFrom(null, culture, v.Value) ?? throw new ArgumentException("Invalid Trainer8 team value.")); }
            catch (Exception e) when (e is FormatException or NotSupportedException or ArgumentException) { throw new ArgumentException("Invalid Trainer8 team value.", e); }
        }).ToArray();
        foreach (var (v, value) in parsed)
        {
            if (team == "card")
            {
                var p = s.TrainerCard.ViewPoke(v.Index);
                switch (v.Property) { case "species": p.Species = (ushort)value; break; case "form": p.Form = (byte)value; break; case "gender": p.Gender = (byte)value; break; case "shiny": p.IsShiny = (bool)value; break; case "ec": p.EncryptionConstant = (uint)value; break; case "unknown": p.Unknown = (uint)value; break; case "formArgument": p.FormArgument = (int)value; break; }
            }
            else
            {
                var p = s.TitleScreen.ViewPoke(v.Index);
                switch (v.Property) { case "species": p.Species = (ushort)value; break; case "form": p.Form = (byte)value; break; case "gender": p.Gender = (byte)value; break; case "shiny": p.IsShiny = (bool)value; break; case "ec": p.EncryptionConstant = (uint)value; break; case "formArgument": p.FormArgument = (int)value; break; case "unknown18": p.Unknown18 = (uint)value; break; case "unknown1c": p.Unknown1C = (uint)value; break; case "unknown20": p.Unknown20 = (uint)value; break; case "unknown24": p.Unknown24 = (uint)value; break; }
            }
        }
    }
    internal static void CopyParty(SAV8SWSH s, string team)
    {
        Block(s, team);
        if (s.PartyData.Count > 6) throw new ArgumentException("Invalid Trainer8 party size.");
        if (team == "card") s.TrainerCard.SetPartyData(); else s.TitleScreen.SetPartyData();
    }
}

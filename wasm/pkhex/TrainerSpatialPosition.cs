// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record TrainerSpatialField(string Key, string Value, string Min, string Max, int Places, bool Truncate);
public sealed record TrainerSpatialEdit(string? Map = null, string? X = null, string? Z = null, string? Y = null,
    string? Rotation = null, string? ScaleX = null, string? ScaleZ = null, string? ScaleY = null);

internal static class TrainerSpatialPosition
{
    private static readonly CultureInfo Culture = CultureInfo.InvariantCulture;
    private sealed record Binding(TrainerSpatialField Field, Action<decimal> Set);
    private static string Text(decimal value) => value.ToString(Culture);
    private static string Display(double value, int places)
    {
        if (!double.IsFinite(value)) return value.ToString(Culture);
        string result = value.ToString($"F{places}", Culture);
        return places == 0 ? result : result.TrimEnd('0').TrimEnd('.');
    }
    private static Binding Integer(string key, Func<decimal> get, Action<decimal> set, decimal min, decimal max, int places = 0, bool truncate = false)
        => new(new(key, Text(get()), Text(min), Text(max), places, truncate), value =>
        {
            decimal expected = truncate ? decimal.Truncate(value) : value;
            set(expected);
            if (get() != expected) throw Unrepresentable();
        });
    private static Binding Float(string key, Func<float> get, Action<float> set, decimal min, decimal max, int places, int scale = 1)
        => new(new(key, Display(get() / (double)scale, places), Text(min), Text(max), places, false), value =>
        {
            float expected = (float)(value * scale);
            set(expected);
            if (BitConverter.SingleToInt32Bits(get()) != BitConverter.SingleToInt32Bits(expected)) throw Unrepresentable();
        });
    private static Binding Rotation(Func<float> getZ, Func<float> getW, Action<float, float> set)
        => new(new("rotation", Display(Math.Atan2(getZ(), getW()) * 360 / Math.PI, 6), "-99999999", "99999999", 6, false), value =>
        {
            double angle = (double)value * Math.PI / 360;
            float z = (float)Math.Sin(angle), w = (float)Math.Cos(angle);
            set(z, w);
            if (BitConverter.SingleToInt32Bits(getZ()) != BitConverter.SingleToInt32Bits(z) || BitConverter.SingleToInt32Bits(getW()) != BitConverter.SingleToInt32Bits(w)) throw Unrepresentable();
        });
    private static Binding[] Bindings(SaveFile save)
    {
        const int bound = 99999999;
        if (save is SAV6 s6)
        {
            var p = s6.Situation;
            return [Integer("map", () => p.M, v => p.M = (int)v, 0, 1000),
                Float("x", () => p.X, v => p.X = v, 0, 65535, 6, 18),
                Float("z", () => p.Z, v => p.Z = v, -65535, 65535, 6, 18),
                Float("y", () => p.Y, v => p.Y = v, 0, 65535, 6, 18),
                Integer("rotation", () => p.R, v => p.R = (int)v, 0, 7)];
        }
        if (save is SAV7 s7)
        {
            var p = s7.Situation;
            return [Integer("map", () => p.M, v => p.M = (int)v, 0, 1000),
                Float("x", () => p.X, v => p.X = v, -bound, bound, 6, 60),
                Float("z", () => p.Z, v => p.Z = v, -bound, bound, 6, 60),
                Float("y", () => p.Y, v => p.Y = v, -bound, bound, 6, 60),
                Rotation(() => p.RZ, () => p.RW, (z, w) => { p.RX = 0; p.RZ = z; p.RY = 0; p.RW = w; })];
        }
        if (save is SAV8SWSH sw)
        {
            var p = sw.Coordinates;
            return [Integer("map", () => p.M, v => p.M = (ulong)v, 0, ulong.MaxValue),
                Float("x", () => p.X, v => p.X = v, -bound, bound, 6),
                Float("z", () => p.Z, v => p.Z = v, -bound, bound, 6),
                Float("y", () => p.Y, v => p.Y = v, -bound, bound, 6),
                Rotation(() => p.RZ, () => p.RW, (z, w) => { p.RX = 0; p.RZ = z; p.RY = 0; p.RW = w; }),
                Float("scaleX", () => p.SX, v => p.SX = v, -bound, bound, 6),
                Float("scaleZ", () => p.SZ, v => p.SZ = v, -bound, bound, 6),
                Float("scaleY", () => p.SY, v => p.SY = v, -bound, bound, 6)];
        }
        if (save is SAV8BS bs)
        {
            var p = bs.MyStatus;
            return [Integer("map", () => bs.ZoneID, v => bs.ZoneID = (short)v, 0, 1000),
                Integer("x", () => p.X, v => p.X = (int)v, -bound, bound),
                Float("z", () => p.Height, v => p.Height = v, -bound, bound, 0),
                Integer("y", () => p.Y, v => p.Y = (int)v, -bound, bound, 5, true),
                Float("rotation", () => p.Rotation, v => p.Rotation = v, -bound, bound, 5)];
        }
        return [];
    }
    public static TrainerSpatialField[] Read(SaveFile save) => Bindings(save).Select(b => b.Field).ToArray();
    public static string? Snapshot(SaveFile save) => save switch
    {
        SAV6 s => Convert.ToHexString(s.Situation.Data[..0x110]),
        SAV7 s => Convert.ToHexString(s.Situation.Data[..0x24]) + ":" + Convert.ToHexString(s.Overworld.Data.Slice(8, 28)),
        SAV8SWSH s => Convert.ToHexString(s.Coordinates.Data[..0x40]) + ":" + Convert.ToHexString(s.Coordinates.Data.Slice(0x6000, 8)),
        SAV8BS s => s.ZoneID.ToString(Culture) + ":" + Convert.ToHexString(s.MyStatus.Data.Slice(0x40, 16)),
        _ => null,
    };
    private static bool Number(string text, int places, out decimal value)
    {
        value = 0;
        if (text.Length is 0 or > 64) return false;
        var unsigned = text.AsSpan(text[0] == '-' ? 1 : 0);
        int dot = unsigned.IndexOf('.');
        if (unsigned.Length == 0 || (dot >= 0 && (dot == 0 || dot == unsigned.Length - 1 || unsigned.Length - dot - 1 > places))) return false;
        for (int i = 0; i < unsigned.Length; i++) if (i != dot && (unsigned[i] < '0' || unsigned[i] > '9')) return false;
        return decimal.TryParse(text, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, Culture, out value);
    }
    public static void Apply(SaveFile save, TrainerSpatialEdit edit)
    {
        var bindings = Bindings(save);
        if (bindings.Length == 0) throw Invalid();
        var updates = new List<(Binding Binding, decimal Value)>();
        foreach (var (key, text) in new[] { ("map", edit.Map), ("x", edit.X), ("z", edit.Z), ("y", edit.Y), ("rotation", edit.Rotation), ("scaleX", edit.ScaleX), ("scaleZ", edit.ScaleZ), ("scaleY", edit.ScaleY) })
        {
            if (text is null) continue;
            var binding = bindings.FirstOrDefault(b => b.Field.Key == key) ?? throw Invalid();
            var field = binding.Field;
            if (text == field.Value) continue;
            if (!Number(text, field.Places, out var value)) throw Invalid();
            if (Number(field.Value, field.Places, out var original) && original == value) continue;
            if (value < decimal.Parse(field.Min, Culture) || value > decimal.Parse(field.Max, Culture)) throw Invalid();
            updates.Add((binding, value));
        }
        foreach (var (binding, value) in updates) binding.Set(value);
        // Like SAV_Trainer7, update the overworld's full position whenever a map field really changes.
        // Preserve the original quaternion unless rotation itself was edited.
        if (updates.Count > 0 && save is SAV7 s7) s7.Situation.UpdateOverworldCoordinates();
    }
    private static ArgumentException Invalid() => new("Trainer spatial position is unsupported or out of range.");
    private static ArgumentException Unrepresentable() => new("Trainer spatial position cannot be represented without changing other data.");
}

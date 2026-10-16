// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonDimensionsInfo(int HeightScalar, int WeightScalar, int? Scale, string? HeightAbsolute, string? WeightAbsolute, int? Cp,
    string HeightRating, string WeightRating, string? ScaleRating, bool ScaleIsDetailed, bool LinkedScale, bool CanAuto);
public sealed record PokemonDimensionsEdit(string Action = "values", int? HeightScalar = null, int? WeightScalar = null, int? Scale = null,
    string? HeightAbsolute = null, string? WeightAbsolute = null, int? Cp = null, bool Auto = false);

internal static class PokemonDimensions
{
    private static string Text(float value) => value.ToString("R", CultureInfo.InvariantCulture);
    public static PokemonDimensionsInfo? Read(PKM p)
    {
        if (p is not IScaledSize size) return null;
        return new(size.HeightScalar, size.WeightScalar, p is IScaledSize3 scale ? scale.Scale : null,
            p is IScaledSizeValue value ? Text(value.HeightAbsolute) : null, p is IScaledSizeValue weight ? Text(weight.WeightAbsolute) : null,
            p is ICombatPower cp ? cp.Stat_CP : null,
            PokeSizeUtil.GetSizeRating(size.HeightScalar).ToString(), PokeSizeUtil.GetSizeRating(size.WeightScalar).ToString(),
            p is IScaledSize3 s ? p is PK9 ? PokeSizeDetailedUtil.GetSizeRating(s.Scale).ToString() : PokeSizeUtil.GetSizeRating(s.Scale).ToString() : null,
            p is PK9, p is PA8, p is IScaledSizeValue or ICombatPower);
    }
    public static void Apply(PKM p, PokemonDimensionsEdit edit)
    {
        var source = Read(p) ?? throw new ArgumentException("Size editing is unavailable for this format.");
        bool values = edit.HeightScalar is not null || edit.WeightScalar is not null || edit.Scale is not null || edit.HeightAbsolute is not null || edit.WeightAbsolute is not null || edit.Cp is not null;
        var copy = p.Clone();
        if (edit.Action == "reset")
        {
            if (values || !source.CanAuto) throw new ArgumentException("Calculated size reset is unavailable or has unexpected parameters.");
            if (copy is IScaledSizeValue size) { size.ResetHeight(); size.ResetWeight(); }
            if (copy is ICombatPower cp) cp.ResetCP();
        }
        else
        {
            if (edit.Action != "values")
            {
                if (values) throw new ArgumentException("Random size actions have unexpected values.");
                byte scalar = PokeSizeUtil.GetRandomScalar();
                edit = edit.Action switch
                {
                    "randomHeight" => edit with { Action = "values", HeightScalar = scalar },
                    "randomWeight" => edit with { Action = "values", WeightScalar = scalar },
                    "randomScale" when p is IScaledSize3 => edit with { Action = "values", Scale = scalar },
                    _ => throw new ArgumentException("Size action is unavailable."),
                };
            }
            else if (!values) throw new ArgumentException("Size edit is empty.");
            ApplyValues(copy, edit, source);
        }
        copy.Data.CopyTo(p.Data);
    }
    private static void ApplyValues(PKM p, PokemonDimensionsEdit edit, PokemonDimensionsInfo source)
    {
        foreach (int? value in new[] { edit.HeightScalar, edit.WeightScalar, edit.Scale })
            if (value is < 0 or > 255) throw new ArgumentException("Size scalars require an unsigned byte.");
        if (edit.Scale is not null && source.Scale is null) throw new ArgumentException("Scale is unavailable.");
        if ((edit.HeightAbsolute is not null && source.HeightAbsolute is null) || (edit.WeightAbsolute is not null && source.WeightAbsolute is null)) throw new ArgumentException("Absolute size is unavailable.");
        if (edit.Cp is int cp && (source.Cp is null || cp is < 0 or > 99999)) throw new ArgumentException("CP requires five decimal mask positions.");
        if (edit.Auto && !source.CanAuto) throw new ArgumentException("Automatic size calculation is unavailable.");
        if (source.LinkedScale && edit.HeightScalar is int linkedHeight && edit.Scale is int linkedScale && linkedHeight != linkedScale) throw new ArgumentException("PLA height and scale inputs must agree.");
        if (edit.HeightAbsolute?.Length > 32767 || edit.WeightAbsolute?.Length > 32767) throw new ArgumentException("Size text exceeds the source textbox length.");
        var size = (IScaledSize)p;
        bool heightChanged = false, weightChanged = false;
        if (edit.HeightScalar is int height && height != source.HeightScalar)
        {
            size.HeightScalar = (byte)height; heightChanged = true;
            if (p is PA8 linked) linked.Scale = (byte)height;
        }
        if (edit.WeightScalar is int weight && weight != source.WeightScalar) { size.WeightScalar = (byte)weight; weightChanged = true; }
        if (edit.Scale is int scale && scale != source.Scale)
        {
            ((IScaledSize3)p).Scale = (byte)scale;
            if (p is PA8 linked) { linked.HeightScalar = (byte)scale; heightChanged = true; }
        }
        if (p is IScaledSizeValue absolute)
        {
            if (edit.Auto)
            {
                if (heightChanged || edit.HeightAbsolute is not null) absolute.ResetHeight();
                if (heightChanged || weightChanged || edit.WeightAbsolute is not null) absolute.ResetWeight();
            }
            else
            {
                // WinForms ignores an unparsable/empty float edit; it does not write zero.
                if (TryFloat(edit.HeightAbsolute, out float h)) absolute.HeightAbsolute = h;
                if (TryFloat(edit.WeightAbsolute, out float w)) absolute.WeightAbsolute = w;
            }
        }
        if (edit.Cp is int power) ((ICombatPower)p).Stat_CP = Math.Min(65535, power);
    }
    internal static bool TryFloat(string? text, out float value) => float.TryParse(text, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out value);
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record FormArgumentEdit(uint? Value = null, byte? Remain = null, byte? Elapsed = null, byte? Maximum = null);
public sealed record FormArgumentInfo(string Mode, uint Value, uint Max, byte Remain, byte Elapsed, byte Maximum,
    bool CanRemain, bool CanElapsed, bool CanMaximum, LocalizedText[] Choices);

internal static class PokemonFormArgument
{
    public static void NormalizeIdentityChange(PKM p, ushort oldSpecies, byte oldForm, int box)
    {
        if (p is not IFormArgument || (p.Species == oldSpecies && p.Form == oldForm)) return;
        // Commit the old control mode, then load/save the new mode as the desktop editor does.
        NormalizeMode(p, oldSpecies, oldForm, box);
        NormalizeMode(p, p.Species, p.Form, box);
    }

    private static void NormalizeMode(PKM p, ushort species, byte form, int box)
    {
        var f = (IFormArgument)p;
        switch (FormArgumentUtil.GetType(species, form, p.Context))
        {
            case FormArgumentType.None:
                f.FormArgument = 0;
                break;
            case FormArgumentType.Raw:
                f.FormArgument = Math.Min(f.FormArgument, FormArgumentUtil.GetFormArgumentMaxEdge(species, form, p.Context));
                break;
            case FormArgumentType.Named:
                var count = FormConverter.GetFormArgumentStrings(species).Length;
                f.FormArgument = (uint)Math.Clamp(unchecked((int)f.FormArgument), 0, count - 1);
                break;
            case FormArgumentType.TripleParty:
                if (box == -1)
                {
                    var elapsed = species == (ushort)Species.Furfrou ? f.FormArgumentElapsed : (byte)0;
                    f.FormArgumentMaximum = f.FormArgumentElapsed = elapsed;
                }
                else if (species != (ushort)Species.Furfrou)
                    f.FormArgument = 0;
                // Boxed PK6 has no elapsed byte. Preserve its stored Furfrou streak.
                break;
            case FormArgumentType.Triple:
                break; // All three bytes already retain their independently stored values.
        }
    }

    public static FormArgumentInfo? Read(PKM p, int box)
    {
        if (p is not IFormArgument f) return null;
        var mode = FormArgumentUtil.GetType(p.Species, p.Form, p.Context);
        if (mode == FormArgumentType.None) return null;
        var choices = Array.Empty<LocalizedText>();
        if (mode == FormArgumentType.Named)
        {
            // AlcremieDecoration order differs from the upstream Sweet item order.
            int[] itemIds = [1109, 1111, 1110, 1114, 1112, 1113, 1115];
            choices = itemIds.Select(i => new LocalizedText(GameInfo.GetStrings("zh-Hans").itemlist[i],
                GameInfo.GetStrings("en").itemlist[i], GameInfo.GetStrings("ja").itemlist[i])).ToArray();
        }
        var triple = mode == FormArgumentType.Triple;
        var party = mode == FormArgumentType.TripleParty && box == -1;
        var furfrou = p.Species == (ushort)Species.Furfrou;
        return new(mode.ToString(), f.FormArgument, FormArgumentUtil.GetFormArgumentMaxEdge(p.Species, p.Form, p.Context),
            f.FormArgumentRemain, f.FormArgumentElapsed, f.FormArgumentMaximum,
            triple || party, triple || (party && furfrou), triple || (mode == FormArgumentType.TripleParty && box >= 0 && furfrou), choices);
    }

    public static void Apply(PKM p, int box, FormArgumentEdit edit)
    {
        var info = Read(p, box) ?? throw new ArgumentException("Pokemon form argument is unavailable.");
        var f = (IFormArgument)p;
        if (edit.Value is null && edit.Remain is null && edit.Elapsed is null && edit.Maximum is null)
            throw new ArgumentException("Pokemon form argument requires a value.");
        if (info.Mode is "Raw" or "Named")
        {
            if (edit.Value is not uint value || value > info.Max || edit.Remain is not null || edit.Elapsed is not null || edit.Maximum is not null)
                throw new ArgumentException("Pokemon form argument is outside the format limits.");
            f.FormArgument = value;
            if (f.FormArgument != value) throw new ArgumentException("Pokemon form argument cannot be stored.");
            return;
        }
        if (edit.Value is not null || (edit.Remain is not null && !info.CanRemain) ||
            (edit.Elapsed is not null && !info.CanElapsed) || (edit.Maximum is not null && !info.CanMaximum))
            throw new ArgumentException("Pokemon form argument counter is unavailable at this position.");
        if (info.Mode == "TripleParty" && box == -1)
        {
            var elapsed = p.Species == (ushort)Species.Furfrou ? edit.Elapsed ?? f.FormArgumentElapsed : (byte)0;
            f.FormArgumentMaximum = f.FormArgumentElapsed = elapsed;
        }
        else
        {
            if (edit.Maximum is byte maximum) f.FormArgumentMaximum = maximum;
            if (edit.Elapsed is byte elapsed) f.FormArgumentElapsed = elapsed;
        }
        if (edit.Remain is byte remain) f.FormArgumentRemain = remain;
    }
}

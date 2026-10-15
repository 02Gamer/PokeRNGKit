// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;

namespace PokeRNGKit.SaveEditor;

public sealed record PersonalChartType(int Id, LocalizedText Name);
public sealed record PersonalChartRow(ushort Species, byte Form, string Number, string Sprite,
    LocalizedText Name, bool Native, int Bst, byte CatchRate, PersonalChartType Type1,
    PersonalChartType? Type2, int[] Stats, string[] StatColors, string BstColor,
    int[] AbilityIds, LocalizedText[] Abilities, int? AlphaMove, LocalizedText? AlphaMoveName);
public sealed record PersonalChartCatalog(string Game, byte Generation, bool HasAlphaMove, PersonalChartRow[] Rows);

// Source: PKHeX.WinForms/Subforms/KChart.cs and PKHeX.Drawing/ColorUtil.cs.
// Only reads the current save's personal table. No entity or save editing occurs here.
internal static class PersonalChart
{
    internal static PersonalChartCatalog Read(SaveFile save)
    {
        var strings = new[] { "zh-Hans", "en", "ja" }.Select(GameInfo.GetStrings).ToArray();
        var table = save.Personal;
        var rows = new List<PersonalChartRow>();
        var format = save.MaxSpeciesID >= 1000 ? "0000" : "000";
        for (ushort species = 1; species <= table.MaxSpeciesID; species++)
        {
            int count = table[species, 0].FormCount;
            var forms = strings.Select(s => count <= 1 ? Array.Empty<string>() :
                FormConverter.GetFormList(species, s.types, s.forms, PokemonDisplay.GenderSymbols, save.Context)).ToArray();
            for (byte form = 0; form < count; form++)
            {
                if (!table.IsPresentInGame(species, form)) continue;
                var p = table.GetFormEntry(species, form);
                int[] stats = [p.HP, p.ATK, p.DEF, p.SPA, p.SPD, p.SPE];
                int[] abilities = Enumerable.Range(0, 3).Select(i => i < p.AbilityCount ? p.GetAbilityAtIndex(i) : 0).ToArray();
                int? alpha = p is PersonalInfo9ZA za ? za.AlphaMove : null;
                rows.Add(new(species, form, species.ToString(format, CultureInfo.InvariantCulture) +
                    (form == 0 ? "" : "-" + form.ToString("00", CultureInfo.InvariantCulture)),
                    "b" + SpriteName.GetResourceStringSprite(species, form, 0, 0, save.Context),
                    Text(i => strings[i].specieslist[species] + (form == 0 ? "" : "-" +
                        (form < forms[i].Length ? forms[i][form] : form.ToString(CultureInfo.InvariantCulture)))),
                    IsNative(p, species), p.BST, p.CatchRate, Type(p.Type1),
                    p.Type1 == p.Type2 ? null : Type(p.Type2), stats, stats.Select(StatColor).ToArray(),
                    StatColor((int)(Math.Max(0, p.BST - 175) / 3f)), abilities,
                    abilities.Select(id => Text(i => strings[i].abilitylist[id])).ToArray(), alpha,
                    alpha is int move ? Text(i => strings[i].movelist[move]) : null));
            }
        }
        return new(save.Version.ToString(), save.Generation, save is SAV9ZA,
            rows.OrderBy(r => r.Number, StringComparer.Ordinal).ToArray());

        PersonalChartType Type(byte raw)
        {
            int id = (int)((MoveType)raw).GetMoveTypeGeneration(save.Generation);
            return new(id, Text(i => strings[i].types[id]));
        }
    }

    private static LocalizedText Text(Func<int, string> read) => new(read(0), read(1), read(2));
    private static bool IsNative(IPersonalInfo p, ushort species) => p switch
    {
        PersonalInfo7 => PersonalInfo7.IsPastGenNative(species),
        PersonalInfo8SWSH sw => sw.IsInDex,
        PersonalInfo8BDSP bd => bd.IsInDex,
        PersonalInfo8LA la => la.IsPresentInGame,
        PersonalInfo9SV sv => sv.IsInDex,
        PersonalInfo9ZA za => za.IsLumioseNative,
        _ => true,
    };

    internal static string StatColor(int stat)
    {
        float x = (uint)stat >= 180 ? 1f : stat / 180f;
        float r = x > .5f ? 510 * (1 - x) : 255;
        float g = x > .5f ? 255 : 510 * x;
        const float white = .4f;
        const byte b = (byte)(255 * (1 - white));
        return $"#{(byte)(r * white + b):X2}{(byte)(g * white + b):X2}{b:X2}";
    }
}

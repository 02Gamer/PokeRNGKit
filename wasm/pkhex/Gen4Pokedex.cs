// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;

public sealed record Dex4Choice(int Id, LocalizedText Name);
public sealed record Dex4State(int Species, [property: JsonRequired] bool Seen, [property: JsonRequired] bool Caught, int[] Genders, int[] Forms, bool[] Languages);
public sealed record Dex4Entry(Dex4State State, LocalizedText Name, int[] GenderChoices, LocalizedText[] FormChoices, bool HasLanguage);
public sealed record Dex4Catalog(bool CanEdit, int Upgrade, Dex4Choice[] Upgrades, Dex4Entry[] Entries);
public sealed record Dex4Edit(string Action, int Species = 0, Dex4State? Entry = null, int? Upgrade = null);

internal static class Gen4Pokedex
{
    private static SAV4 Require(SaveFile save) => save is SAV4 s ? s : throw new ArgumentException("Pokedex format is unsupported.");
    private static LocalizedText Text(Func<GameStrings, string> read) => new(read(GameInfo.GetStrings("zh-Hans")), read(GameInfo.GetStrings("en")), read(GameInfo.GetStrings("ja")));
    public static int[] Genders(SAV4 save, ushort species)
    {
        var pi = save.Personal[species];
        return pi.IsDualGender ? [0, 1] : [pi.FixedGender()];
    }
    private static string[] Forms(ushort species, GameStrings strings)
    {
        var forms = FormConverter.GetFormList(species, strings.types, strings.forms, EntityContext.Gen4);
        return species == 172 ? ["♂", "♀", forms[1]] : forms;
    }
    public static Dex4State State(SAV4 save, ushort species)
    {
        var dex = save.Dex;
        var seen = dex.GetSeen(species);
        var genders = Genders(save, species);
        if (!seen) genders = [];
        else if (genders.Length == 2)
        {
            int first = dex.GetSeenGenderFirst(species);
            genders = dex.GetSeenSingleGender(species) ? [first] : [first, first ^ 1];
        }
        var rawForms = dex.GetForms(species);
        var forms = seen ? rawForms.Where(f => f < rawForms.Length).Distinct().Select(f => (int)f).ToArray() : [];
        return new(species, seen, dex.GetCaught(species), genders, forms,
            Enumerable.Range(0, 6).Select(i => dex.HasLanguage(species) && dex.GetLanguageBitIndex(species, i)).ToArray());
    }
    public static Dex4Catalog Read(SaveFile input)
    {
        var save = Require(input);
        LocalizedText[] names = [new("未获得", "Not given", "未入手"), new("基础模式", "Simple mode", "基本モード"),
            new("识别形态", "Detect forms", "フォルム認識"), new("全国图鉴", "National Pokédex", "全国図鑑"), new("外语图鉴", "Other languages", "外国語図鑑")];
        if (save is SAV4HGSS) names = [names[0], names[1], names[3], names[4]];
        return new(save.State.Exportable && SaveChecksums.Valid(save), save.DexUpgraded,
            names.Select((n, i) => new Dex4Choice(i, n)).ToArray(),
            Enumerable.Range(1, 493).Select(i => {
                ushort species = (ushort)i;
                int count = save.Dex.GetForms(species).Length;
                var forms = Enumerable.Range(0, count).Select(f => Text(s => Forms(species, s)[f])).ToArray();
                return new Dex4Entry(State(save, species), Text(s => s.specieslist[i]), Genders(save, species), forms, save.Dex.HasLanguage(species));
            }).ToArray());
    }
    public static string Snapshot(SAV4 save)
    {
        int size = save is SAV4DP ? 0x13A : save is SAV4HGSS ? 0x338 : 0x31C;
        return Convert.ToHexString(save.Dex.Data[..size]) + (save is SAV4HGSS ? save.General[0x10D1].ToString("X2") : "");
    }
    public static string Apply(SaveFile input, Dex4Edit edit)
    {
        var save = Require(input);
        if (edit.Action == "upgrade")
        {
            if (edit.Entry is not null || edit.Species != 0 || edit.Upgrade is not int value || value < 0 || value > (save is SAV4HGSS ? 3 : 4))
                throw new ArgumentException("Pokedex upgrade is invalid.");
            if (value != save.DexUpgraded) save.DexUpgraded = value;
        }
        else if (edit.Action == "entry")
        {
            if (edit.Entry is null || edit.Species != 0 || edit.Upgrade is not null) throw new ArgumentException("Pokedex entry is missing.");
            ApplyEntry(save, edit.Entry);
        }
        else
        {
            if (edit.Entry is not null || edit.Upgrade is not null || edit.Species < 0 || edit.Species > 493) throw new ArgumentException("Pokedex batch scope is invalid.");
            var args = edit.Action switch {
                "clear" => Zukan4.SetDexArgs.None, "seen" => Zukan4.SetDexArgs.SeenAll,
                "caught" => Zukan4.SetDexArgs.CaughtAll, "uncaught" => Zukan4.SetDexArgs.CaughtNone,
                "complete" => Zukan4.SetDexArgs.Complete, _ => throw new ArgumentException("Pokedex batch action is invalid.") };
            int lang = Zukan4.GetGen4LanguageBitIndex(save.Language);
            for (ushort i = (ushort)(edit.Species == 0 ? 1 : edit.Species); i <= (edit.Species == 0 ? 493 : edit.Species); i++) save.Dex.ModifyAll(i, args, lang);
        }
        return Snapshot(save);
    }
    private static void ApplyEntry(SAV4 save, Dex4State e)
    {
        if (e.Species is < 1 or > 493 || e.Genders is null || e.Forms is null || e.Languages is null || e.Languages.Length != 6)
            throw new ArgumentException("Pokedex entry values are invalid.");
        ushort species = (ushort)e.Species;
        var allowed = Genders(save, species); var dex = save.Dex; int count = dex.GetForms(species).Length;
        if (e.Genders.Distinct().Count() != e.Genders.Length || e.Genders.Any(g => !allowed.Contains(g)) ||
            e.Forms.Distinct().Count() != e.Forms.Length || e.Forms.Any(f => f < 0 || f >= count) ||
            (!dex.HasLanguage(species) && e.Languages.Any(b => b))) throw new ArgumentException("Pokedex choices are invalid.");
        var old = State(save, species);
        if (e.Seen == old.Seen && e.Caught == old.Caught && e.Genders.SequenceEqual(old.Genders) && e.Forms.SequenceEqual(old.Forms) && e.Languages.SequenceEqual(old.Languages)) return;
        if (old.Seen && !e.Seen) dex.ClearSeen(species);
        dex.SetCaught(species, e.Caught); dex.SetSeen(species, e.Seen); dex.SetSeenGenderNeither(species);
        if (e.Genders.Length > 0)
        {
            byte first = (byte)(e.Genders[0] == 1 ? 1 : 0);
            dex.SetSeenGenderNewFlag(species, first);
            if (e.Genders.Length > 1) dex.SetSeenGenderSecond(species, first ^ 1);
        }
        if (dex.HasLanguage(species)) for (int i = 0; i < 6; i++) dex.SetLanguageBitIndex(species, i, e.Languages[i]);
        if (count > 0) dex.SetForms(species, e.Forms.Select(f => (byte)f).ToArray());
    }
}

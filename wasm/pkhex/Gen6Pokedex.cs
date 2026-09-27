// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;
public sealed record Dex6State(int Species, [property: JsonRequired] bool Caught, bool[] Seen, bool[] Displayed, bool[] Languages, bool[][] Forms, bool? Foreign, string? CountSeen, string? CountObtained);
public sealed record Dex6Entry(Dex6State State, LocalizedText Name, bool[] AllowedRegions, LocalizedText[] FormChoices);
public sealed record Dex6Catalog(bool CanEdit, Dex5Globals Globals, Dex6Entry[] Entries);
public sealed record Dex6Edit(string Action, Dex6State? Entry=null, Dex5Globals? Globals=null, int Species=0, bool Shiny=false, bool AllLanguages=false);
internal static class Gen6Pokedex
{
    private static SAV6 Require(SaveFile save) => save is SAV6XY or SAV6AO ? (SAV6)save : throw new ArgumentException("Pokedex format is unsupported.");
    private static Zukan6 Dex(SAV6 save) => save switch { SAV6XY xy => xy.Zukan, SAV6AO ao => ao.Zukan, _ => throw new ArgumentException("Pokedex format is unsupported.") };
    private static LocalizedText Text(Func<GameStrings,string> f) => new(f(GameInfo.GetStrings("zh-Hans")),f(GameInfo.GetStrings("en")),f(GameInfo.GetStrings("ja")));
    public static Dex6State State(SAV6 save, ushort species)
    {
        var d=Dex(save); var (index,_)=d.GetFormIndex(species); int count=FormCount(save,species);
        return new(species,d.GetCaught(species),Enumerable.Range(0,4).Select(i=>d.GetSeen(species,i)).ToArray(),
            Enumerable.Range(0,4).Select(i=>d.GetDisplayed(species,i)).ToArray(),Enumerable.Range(0,7).Select(i=>d.GetLanguageFlag(species,i)).ToArray(),
            Enumerable.Range(0,4).Select(r=>Enumerable.Range(0,count).Select(i=>d.GetFormFlag(index+i,r)).ToArray()).ToArray(),
            d is Zukan6XY xy && species<=649 ? xy.GetForeignFlag(species) : null,
            d is Zukan6AO ao ? ao.GetCountSeen(species).ToString() : null, d is Zukan6AO ao2 ? ao2.GetCountObtained(species).ToString() : null);
    }
    public static bool[] Allowed(SAV6 save,ushort species)
    {
        var pi=save.Personal[species]; return [!pi.OnlyFemale,!(pi.OnlyMale||pi.Genderless),!pi.OnlyFemale,!(pi.OnlyMale||pi.Genderless)];
    }
    public static int FormCount(SAV6 save,ushort species) => Dex(save).GetFormIndex(species).Count==0 ? 0 : FormConverter.GetFormList(species,GameInfo.GetStrings("en").types,GameInfo.GetStrings("en").forms,save.Context).Length;
    public static Dex6Catalog Read(SaveFile input)
    {
        var save=Require(input);var d=Dex(save);
        return new(save.State.Exportable&&SaveChecksums.Valid(save),new(d.IsNationalDexUnlocked,d.IsNationalDexMode,d.InitialSpecies,d.Spinda.ToString("X8")),
            Enumerable.Range(1,721).Select(i=>{
                ushort species=(ushort)i;int count=FormCount(save,species);
                return new Dex6Entry(State(save,species),Text(s=>s.specieslist[i]),Allowed(save,species),Enumerable.Range(0,count).Select(f=>Text(s=>FormConverter.GetFormList(species,s.types,s.forms,save.Context)[f])).ToArray());
            }).ToArray());
    }
    public static string Snapshot(SAV6 save) => Convert.ToHexString(Dex(save).Data[..(save is SAV6XY?0x6A0:0x11CC)]);
    public static string Apply(SaveFile input,Dex6Edit edit)
    {
        var save=Require(input);var d=Dex(save);
        if(edit.Action is "entry" or "globals")
        {
            if(edit.Species!=0||edit.Shiny||edit.AllLanguages)throw new ArgumentException("Pokedex payload is invalid.");
            if(edit.Action=="entry")
            {
                if(edit.Entry is null||edit.Globals is not null)throw new ArgumentException("Pokedex entry is missing.");
                ApplyEntry(save,edit.Entry);
                d.InitialSpecies=(ushort)edit.Entry.Species;
            }
            else
            {
                if(edit.Globals is not { } g||edit.Entry is not null||g.Spinda is null||g.Spinda.Length>32767||
                    (g.InitialSpecies!=d.InitialSpecies&&(g.InitialSpecies<1||g.InitialSpecies>721)))throw new ArgumentException("Pokedex global values are invalid.");
                d.IsNationalDexUnlocked=g.Unlocked;d.IsNationalDexMode=g.NationalMode;d.InitialSpecies=(ushort)g.InitialSpecies;d.Spinda=Util.GetHexValue(g.Spinda);
            }
        }
        else
        {
            if(edit.Entry is not null||edit.Globals is not null||
                (edit.Action is "give" or "giveNone" ? edit.Species<1||edit.Species>721 : edit.Species!=0)||
                (edit.Shiny&&edit.Action is not ("give" or "seen" or "complete" or "formsFirst" or "formsAll"))||
                (edit.AllLanguages&&edit.Action is not ("give" or "caught" or "complete")))throw new ArgumentException("Pokedex batch values are invalid.");
            var language=(LanguageID)save.Language;
            switch(edit.Action)
            {
                case "give":d.GiveAll((ushort)edit.Species,true,edit.Shiny,language,edit.AllLanguages);break;
                case "giveNone":d.GiveAll((ushort)edit.Species,false,false,language,false);if(d is Zukan6AO ao && d.GetCaught((ushort)edit.Species) && ao.GetCountSeen((ushort)edit.Species)==0)ao.SetCountSeen((ushort)edit.Species,1);break;
                case "clear":d.SeenNone();break;
                case "seen":SeenAll(save,edit.Shiny);break;
                case "caught":d.CaughtAll(language,edit.AllLanguages);break;
                case "uncaught":d.CaughtNone();break;
                case "complete":SeenAll(save,edit.Shiny);d.CaughtAll(language,edit.AllLanguages);break;
                case "formsClear":d.ClearFormSeen();break;
                case "formsFirst":d.SetFormsSeen1(edit.Shiny);break;
                case "formsAll":d.SetFormsSeen(edit.Shiny);break;
                case "dexNavAll":case "dexNavClear":
                    if(d is not Zukan6AO nav)throw new ArgumentException("Pokedex DexNav requires ORAS.");
                    for(ushort i=1;i<=721;i++)nav.SetCountSeen(i,edit.Action=="dexNavAll"?(ushort)999:(ushort)0);
                    break;
                default:throw new ArgumentException("Pokedex batch action is invalid.");
            }
        }
        return Snapshot(save);
    }
    private static void SeenAll(SAV6 save,bool shiny)
    {
        // Zukan6.SeenAll uses the Gen5 BW table. Use the actual Gen6 personal table for all 721 species.
        for(ushort i=1;i<=721;i++)Dex(save).CompleteSeen(i,shiny,save.Personal[i]);
    }
    private static ushort Count(string? text)
    {
        if(text is null||text.Length>5||text.Any(c=>!char.IsAsciiDigit(c)&&c!=' '&&c!='_'))throw new ArgumentException("Pokedex count is invalid.");
        return (ushort)Math.Min(Util.ToUInt32(text),ushort.MaxValue);
    }
    private static void ApplyEntry(SAV6 save,Dex6State e)
    {
        if(e.Species is <1 or >721||e.Seen is not {Length:4}||e.Displayed is not {Length:4}||e.Languages is not {Length:7}||e.Forms is not {Length:4})throw new ArgumentException("Pokedex entry is incomplete.");
        ushort species=(ushort)e.Species;var d=Dex(save);var (index,_)=d.GetFormIndex(species);int count=FormCount(save,species);var old=State(save,species);var allowed=Allowed(save,species);
        if(e.Forms.Any(r=>r is null||r.Length!=count)||Enumerable.Range(0,4).Any(i=>!allowed[i]&&((e.Seen[i]&&!old.Seen[i])||(e.Displayed[i]&&!old.Displayed[i])))||
            (!e.Displayed.SequenceEqual(old.Displayed)&&(e.Displayed.Count(b=>b)>1||Enumerable.Range(0,4).Any(i=>e.Displayed[i]&&!old.Displayed[i]&&!e.Seen[i])))||
            ((!e.Forms[2].SequenceEqual(old.Forms[2])||!e.Forms[3].SequenceEqual(old.Forms[3]))&&(e.Forms[2].Count(b=>b)+e.Forms[3].Count(b=>b)>1||Enumerable.Range(0,2).Any(r=>Enumerable.Range(0,count).Any(i=>e.Forms[r+2][i]&&!old.Forms[r+2][i]&&!e.Forms[r][i])))))throw new ArgumentException("Pokedex choices are invalid.");
        if(d is Zukan6XY){if((species<=649&&!e.Foreign.HasValue)||(species>649&&e.Foreign.HasValue)||e.CountSeen is not null||e.CountObtained is not null)throw new ArgumentException("Pokedex XY fields are invalid.");}
        else {if(e.Foreign.HasValue)throw new ArgumentException("Pokedex ORAS fields are invalid.");Count(e.CountSeen);Count(e.CountObtained);}
        d.SetCaught(species,e.Caught);
        for(int r=0;r<4;r++){d.SetSeen(species,r,e.Seen[r]);d.SetDisplayed(species,r,e.Displayed[r]);for(int i=0;i<count;i++)d.SetFormFlag(index+i,r,e.Forms[r][i]);}
        for(int i=0;i<7;i++)d.SetLanguageFlag(species,i,e.Languages[i]);
        if(d is Zukan6XY xy && species<=649)xy.SetForeignFlag(species,e.Foreign!.Value);
        if(d is Zukan6AO ao){ao.SetCountSeen(species,Count(e.CountSeen));ao.SetCountObtained(species,Count(e.CountObtained));}
    }
}

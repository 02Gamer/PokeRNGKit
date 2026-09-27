// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;
public sealed record Dex5State(int Species, [property: JsonRequired] bool Caught, bool[] Seen, bool[] Displayed, bool[] Languages, bool[][] Forms);
public sealed record Dex5Entry(Dex5State State, LocalizedText Name, bool[] AllowedRegions, LocalizedText[] FormChoices);
public sealed record Dex5Globals([property: JsonRequired] bool Unlocked, [property: JsonRequired] bool NationalMode, int InitialSpecies, string Spinda);
public sealed record Dex5Catalog(bool CanEdit, Dex5Globals Globals, Dex5Entry[] Entries);
public sealed record Dex5Edit(string Action, Dex5State? Entry=null, Dex5Globals? Globals=null, int Species=0, bool Shiny=false, bool AllLanguages=false);
internal static class Gen5Pokedex
{
    private static SAV5 Require(SaveFile save) => save is SAV5 s ? s : throw new ArgumentException("Pokedex format is unsupported.");
    private static LocalizedText Text(Func<GameStrings,string> f) => new(f(GameInfo.GetStrings("zh-Hans")),f(GameInfo.GetStrings("en")),f(GameInfo.GetStrings("ja")));
    public static Dex5State State(SAV5 save, ushort species)
    {
        var d=save.Zukan; var (index,count)=d.GetFormIndex(species);
        return new(species,d.GetCaught(species),Enumerable.Range(0,4).Select(i=>d.GetSeen(species,i)).ToArray(),
            Enumerable.Range(0,4).Select(i=>d.GetDisplayed(species,i)).ToArray(),Enumerable.Range(0,7).Select(i=>d.GetLanguageFlag(species,i)).ToArray(),
            Enumerable.Range(0,4).Select(r=>Enumerable.Range(0,count).Select(i=>d.GetFormFlag(index+i,r)).ToArray()).ToArray());
    }
    public static bool[] Allowed(SAV5 save,ushort species)
    {
        var pi=save.Personal[species]; return [!pi.OnlyFemale,!(pi.OnlyMale||pi.Genderless),!pi.OnlyFemale,!(pi.OnlyMale||pi.Genderless)];
    }
    public static Dex5Catalog Read(SaveFile input)
    {
        var save=Require(input);var d=save.Zukan;
        return new(save.State.Exportable&&SaveChecksums.Valid(save),new(d.IsNationalDexUnlocked,d.IsNationalDexMode,d.InitialSpecies,d.Spinda.ToString("X8")),
            Enumerable.Range(1,649).Select(i=>{
                ushort species=(ushort)i;var (_,count)=d.GetFormIndex(species);
                return new Dex5Entry(State(save,species),Text(s=>s.specieslist[i]),Allowed(save,species),Enumerable.Range(0,count).Select(f=>Text(s=>FormConverter.GetFormList(species,s.types,s.forms,save.Context)[f])).ToArray());
            }).ToArray());
    }
    public static string Snapshot(SAV5 save) => Convert.ToHexString(save.Zukan.Data[..(save is SAV5BW?0x4D4:0x4DC)]);
    public static string Apply(SaveFile input,Dex5Edit edit)
    {
        var save=Require(input);var d=save.Zukan;
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
                if(edit.Globals is not { } g||edit.Entry is not null||g.Spinda is null||g.Spinda.Length>8||
                    (g.InitialSpecies!=d.InitialSpecies&&(g.InitialSpecies<1||g.InitialSpecies>649)))throw new ArgumentException("Pokedex global values are invalid.");
                d.IsNationalDexUnlocked=g.Unlocked;d.IsNationalDexMode=g.NationalMode;d.InitialSpecies=(ushort)g.InitialSpecies;d.Spinda=Util.GetHexValue(g.Spinda);
            }
        }
        else
        {
            if(edit.Entry is not null||edit.Globals is not null||
                (edit.Action is "give" or "giveNone" ? edit.Species<1||edit.Species>649 : edit.Species!=0)||
                (edit.Shiny&&edit.Action is not ("give" or "seen" or "complete" or "formsFirst" or "formsAll"))||
                (edit.AllLanguages&&edit.Action is not ("give" or "caught" or "complete")))throw new ArgumentException("Pokedex batch values are invalid.");
            var language=(LanguageID)save.Language;
            switch(edit.Action)
            {
                case "give":d.GiveAll((ushort)edit.Species,true,edit.Shiny,language,edit.AllLanguages);break;
                case "giveNone":d.GiveAll((ushort)edit.Species,false,false,language,false);break;
                case "clear":d.SeenNone();break;
                case "seen":d.SeenAll(edit.Shiny);break;
                case "caught":d.CaughtAll(language,edit.AllLanguages);break;
                case "uncaught":d.CaughtNone();break;
                case "complete":d.SeenAll(edit.Shiny);d.CaughtAll(language,edit.AllLanguages);break;
                case "formsClear":d.ClearFormSeen();break;
                case "formsFirst":d.SetFormsSeen1(edit.Shiny);break;
                case "formsAll":d.SetFormsSeen(edit.Shiny);break;
                default:throw new ArgumentException("Pokedex batch action is invalid.");
            }
        }
        return Snapshot(save);
    }
    private static void ApplyEntry(SAV5 save,Dex5State e)
    {
        if(e.Species is <1 or >649||e.Seen is not {Length:4}||e.Displayed is not {Length:4}||e.Languages is not {Length:7}||e.Forms is not {Length:4})throw new ArgumentException("Pokedex entry is incomplete.");
        ushort species=(ushort)e.Species;var d=save.Zukan;var (index,count)=d.GetFormIndex(species);var old=State(save,species);var allowed=Allowed(save,species);
        if(e.Forms.Any(r=>r is null||r.Length!=count)||(species>493&&e.Languages.Any(b=>b))||Enumerable.Range(0,4).Any(i=>!allowed[i]&&((e.Seen[i]&&!old.Seen[i])||(e.Displayed[i]&&!old.Displayed[i])))||
            (!e.Displayed.SequenceEqual(old.Displayed)&&(e.Displayed.Count(b=>b)>1||Enumerable.Range(0,4).Any(i=>e.Displayed[i]&&!old.Displayed[i]&&!e.Seen[i])))||
            ((!e.Forms[2].SequenceEqual(old.Forms[2])||!e.Forms[3].SequenceEqual(old.Forms[3]))&&(e.Forms[2].Count(b=>b)+e.Forms[3].Count(b=>b)>1||Enumerable.Range(0,2).Any(r=>Enumerable.Range(0,count).Any(i=>e.Forms[r+2][i]&&!old.Forms[r+2][i]&&!e.Forms[r][i])))))throw new ArgumentException("Pokedex choices are invalid.");
        d.SetCaught(species,e.Caught);
        for(int r=0;r<4;r++){d.SetSeen(species,r,e.Seen[r]);d.SetDisplayed(species,r,e.Displayed[r]);for(int i=0;i<count;i++)d.SetFormFlag(index+i,r,e.Forms[r][i]);}
        if(species<=493)for(int i=0;i<7;i++)d.SetLanguageFlag(species,i,e.Languages[i]);
    }
}

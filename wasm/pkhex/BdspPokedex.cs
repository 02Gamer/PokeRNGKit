// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;
public sealed record Dex8bState([property: JsonRequired] int Species,[property: JsonRequired] int State,bool[] Genders,bool[] Languages,bool[][] Forms);
public sealed record Dex8bEntry(Dex8bState State,LocalizedText Name,LocalizedText[] FormChoices);
public sealed record Dex8bCatalog(bool CanEdit,bool National,Dex8bEntry[] Entries);
public sealed record Dex8bEdit(string Action,Dex8bState? Entry=null,bool? National=null,int Species=0,bool Shiny=false);
internal static class BdspPokedex
{
    private static SAV8BS Require(SaveFile save)=>save as SAV8BS??throw new ArgumentException("Pokedex format is unsupported.");
    private static readonly int[] Languages=[1,2,3,4,5,7,8,9,10];
    private static LocalizedText Text(Func<GameStrings,string> f)=>new(f(GameInfo.GetStrings("zh-Hans")),f(GameInfo.GetStrings("en")),f(GameInfo.GetStrings("ja")));
    public static int FormCount(ushort species)=>Math.Min(Zukan8b.GetFormCount(species),FormConverter.GetFormList(species,GameInfo.GetStrings("en").types,GameInfo.GetStrings("en").forms,EntityContext.Gen8b).Length);
    public static Dex8bState State(SAV8BS save,ushort species)
    {
        var d=save.Zukan;d.GetGenderFlags(species,out bool m,out bool f,out bool ms,out bool fs);int count=FormCount(species);
        return new(species,(int)d.GetState(species),[m,f,ms,fs],Languages.Select(l=>d.GetLanguageFlag(species,l)).ToArray(),Enumerable.Range(0,2).Select(r=>Enumerable.Range(0,count).Select(i=>d.GetHasFormFlag(species,(byte)i,r==1)).ToArray()).ToArray());
    }
    public static Dex8bCatalog Read(SaveFile input)
    {
        var save=Require(input);return new(save.State.Exportable&&SaveChecksums.Valid(save),save.Zukan.HasNationalDex,Enumerable.Range(1,493).Select(i=>{
            ushort species=(ushort)i;return new Dex8bEntry(State(save,species),Text(s=>s.specieslist[i]),Enumerable.Range(0,FormCount(species)).Select(f=>Text(s=>FormConverter.GetFormList(species,s.types,s.forms,save.Context)[f])).ToArray());
        }).ToArray());
    }
    public static string Snapshot(SAV8BS save)=>Convert.ToHexString(save.Zukan.Data);
    public static string Apply(SaveFile input,Dex8bEdit edit)
    {
        var save=Require(input);var d=save.Zukan;
        if(edit.Action=="entry"){
            if(edit.Entry is null||edit.National.HasValue||edit.Species!=0||edit.Shiny)throw new ArgumentException("Pokedex entry is missing.");ApplyEntry(save,edit.Entry);
        }
        else if(edit.Action=="national"){
            if(!edit.National.HasValue||edit.Entry is not null||edit.Species!=0||edit.Shiny)throw new ArgumentException("Pokedex global values are invalid.");
            if(edit.National.Value!=d.HasNationalDex)d.HasNationalDex=edit.National.Value;
        }
        else{
            bool single=edit.Action is "give" or "giveNone" or "formsClear" or "formsRegular" or "formsShiny";
            if(edit.Entry is not null||edit.National.HasValue||(single?edit.Species is <1 or >493:edit.Species!=0)||(edit.Shiny&&edit.Action is not ("seen" or "complete")))throw new ArgumentException("Pokedex batch values are invalid.");
            ushort species=(ushort)edit.Species;
            switch(edit.Action){
                case "give":case "giveNone":bool all=edit.Action=="give";d.SetState(species,all?ZukanState8b.Caught:ZukanState8b.None);d.SetGenderFlags(species,all,all,all,all);foreach(int l in Languages)d.SetLanguageFlag(species,l,all);break;
                case "formsClear":case "formsRegular":case "formsShiny":
                    for(byte i=0;i<FormCount(species);i++){if(edit.Action!="formsShiny")d.SetHasFormFlag(species,i,false,edit.Action=="formsRegular");d.SetHasFormFlag(species,i,true,edit.Action=="formsShiny");}break;
                case "clear":d.SetAllSeen(false);break;
                case "seen":d.SetAllSeen(shinyToo:edit.Shiny);break;
                case "caught":d.CaughtAll();break;
                case "uncaught":d.CaughtNone();break;
                case "complete":d.CompleteDex(edit.Shiny);break;
                default:throw new ArgumentException("Pokedex batch action is invalid.");
            }
        }
        return Snapshot(save);
    }
    private static void ApplyEntry(SAV8BS save,Dex8bState e)
    {
        if(e.Species is <1 or >493||e.Genders is not {Length:4}||e.Languages is not {Length:9}||e.Forms is not {Length:2})throw new ArgumentException("Pokedex entry is incomplete.");
        ushort species=(ushort)e.Species;var old=State(save,species);int count=FormCount(species);var d=save.Zukan;
        if((e.State!=old.State&&e.State is <0 or >3)||e.Forms.Any(r=>r is null||r.Length!=count))throw new ArgumentException("Pokedex choices are invalid.");
        if(e.State!=old.State)d.SetState(species,(ZukanState8b)e.State);
        if(!e.Genders.SequenceEqual(old.Genders)){
            // Core writes the four u32 booleans as a group. Restore unchanged raw fields so editing one does not normalize the others.
            int stride=493*4;int[] blocks=[3,4,1,2];var raw=d.Data.ToArray();d.SetGenderFlags(species,e.Genders[0],e.Genders[1],e.Genders[2],e.Genders[3]);
            for(int r=0;r<4;r++)if(e.Genders[r]==old.Genders[r]){int offset=blocks[r]*stride+(species-1)*4;raw.AsSpan(offset,4).CopyTo(d.Data[offset..]);}
        }
        for(int i=0;i<9;i++)if(e.Languages[i]!=old.Languages[i])d.SetLanguageFlag(species,Languages[i],e.Languages[i]);
        for(int r=0;r<2;r++)for(byte i=0;i<count;i++)if(e.Forms[r][i]!=old.Forms[r][i])d.SetHasFormFlag(species,i,r==1,e.Forms[r][i]);
    }
}

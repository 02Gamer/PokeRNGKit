// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;
public sealed record Dex7State([property: JsonRequired] int Index, bool? Caught, bool[] Seen, bool[] Displayed, bool[] Languages, Dex7Size[]? Sizes=null);
public sealed record Dex7Entry(Dex7State State, int Species, int Form, LocalizedText Name, LocalizedText FormName, bool[] AllowedRegions);
public sealed record Dex7Catalog(bool CanEdit, Dex7Entry[] Entries, Capture7Catalog? Captures=null);
public sealed record Dex7Edit(string Action, Dex7State? Entry=null, int Index=-1, Capture7Edit? Capture=null);
internal static class Gen7Pokedex
{
    private static SaveFile Require(SaveFile input)=>input is SAV7SM or SAV7USUM or SAV7b?input:throw new ArgumentException("Pokedex format is unsupported.");
    internal static Zukan7 Dex(SaveFile save)=>save switch{SAV7 s=>s.Zukan,SAV7b s=>s.Zukan,_=>throw new ArgumentException("Pokedex format is unsupported.")};
    internal static (ushort Species, byte Form) Identity(SaveFile save,int index){var d=Dex(save);ushort s=d.GetBaseSpecies(index);return(s,(byte)(index<save.MaxSpeciesID?0:index-save.MaxSpeciesID-d.GetCountFormsPriorTo(s,save.Personal[s].FormCount)+1));}
    private static LocalizedText Text(Func<GameStrings,string> f)=>new(f(GameInfo.GetStrings("zh-Hans")),f(GameInfo.GetStrings("en")),f(GameInfo.GetStrings("ja")));
    public static int EntryCount(SaveFile save)=>Dex(save).GetEntryNames(GameInfo.GetStrings("en").specieslist).Count;
    public static bool[] Allowed(SaveFile save,int index)
    {
        byte gender=Dex(save).GetBaseSpeciesGenderValue(index);
        bool male=gender!=PersonalInfo.RatioMagicFemale,female=gender is not (PersonalInfo.RatioMagicMale or PersonalInfo.RatioMagicGenderless);
        return [male,female,male,female];
    }
    public static Dex7State State(SaveFile save,int index)
    {
        var d=Dex(save);bool basis=index<save.MaxSpeciesID;
        return new(index,basis?d.GetCaught((ushort)(index+1)):null,
            Enumerable.Range(0,4).Select(r=>d.GetSeen((ushort)(index+1),r)).ToArray(),
            Enumerable.Range(0,4).Select(r=>d.GetDisplayed(index,r)).ToArray(),
            basis?Enumerable.Range(0,9).Select(i=>d.GetLanguageFlag(index,i)).ToArray():[], LetsGoPokedex.ReadSizes(save,index));
    }
    public static Dex7Catalog Read(SaveFile input)
    {
        var save=Require(input);var d=Dex(save);
        return new(save.State.Exportable&&SaveChecksums.Valid(save),Enumerable.Range(0,EntryCount(save)).Select(index=>{
            ushort species=d.GetBaseSpecies(index);int form=index<save.MaxSpeciesID?0:index-save.MaxSpeciesID-d.GetCountFormsPriorTo(species,save.Personal[species].FormCount)+1;
            return new Dex7Entry(State(save,index),species,form,Text(s=>s.specieslist[species]),Text(s=>{
                var names=FormConverter.GetFormList(species,s.types,s.forms,save.Context);return form<names.Length?names[form]:form.ToString();
            }),Allowed(save,index));
        }).ToArray(), save is SAV7b gg?LetsGoCapture.Read(gg):null);
    }
    public static string Snapshot(SaveFile save)=>Convert.ToHexString(Dex(save).Data)+(save is SAV7b gg?Convert.ToHexString(gg.Captured.Data):"");
    public static string Apply(SaveFile input,Dex7Edit edit)
    {
        var save=Require(input);int count=EntryCount(save);
        if(edit.Action=="capture"){if(save is not SAV7b gg||edit.Capture is null||edit.Entry is not null||edit.Index!=-1)throw new ArgumentException("Pokedex capture payload is invalid.");LetsGoCapture.Apply(gg,edit.Capture);return Snapshot(save);}
        if(edit.Capture is not null)throw new ArgumentException("Pokedex capture payload is invalid.");
        if(edit.Action=="entry")
        {
            if(edit.Entry is not {} e||edit.Index!=-1)throw new ArgumentException("Pokedex entry is missing.");
            Validate(save,e,count);Write(save,e);
        }
        else
        {
            bool single=edit.Action is "give" or "giveNone";
            if(edit.Entry is not null||(single?edit.Index<0||edit.Index>=count:edit.Index!=-1))throw new ArgumentException("Pokedex batch values are invalid.");
            if(single)Give(save,edit.Index,edit.Action=="give");
            else if(edit.Action is "clear" or "uncaught")
            {
                for(int i=0;i<count;i++){
                    var e=State(save,i);Write(save,e with{Caught=e.Caught.HasValue?false:null,Languages=new bool[e.Languages.Length],Seen=edit.Action=="clear"?new bool[4]:e.Seen,Displayed=edit.Action=="clear"?new bool[4]:e.Displayed});
                }
                if(edit.Action=="clear"&&save is SAV7b gg)LetsGoPokedex.ClearSizes(gg);
            }
            else if(edit.Action is "seen" or "caught" or "complete")
            {
                for(ushort species=1;species<=save.MaxSpeciesID;species++){
                    if(save is SAV7b&&!LetsGoCapture.Legal(species))continue;
                    SetAll(save,species-1,edit.Action);
                    if(save is SAV7b gg){if(edit.Action!="seen")LetsGoPokedex.CompleteSizes(gg,species);if(species is 25 or 133)continue;}
                    foreach(int index in Dex(save).GetAllFormEntries(species).Where(i=>i>=save.MaxSpeciesID).Distinct())SetAll(save,index,edit.Action);
                }
            }
            else throw new ArgumentException("Pokedex batch action is invalid.");
        }
        return Snapshot(save);
    }
    private static void Give(SaveFile save,int index,bool value)
    {
        var e=State(save,index);var displayed=(bool[])e.Displayed.Clone();var allowed=Allowed(save,index);
        if(!value)Array.Clear(displayed);else if(!displayed.Any(b=>b))displayed[allowed[0]?0:1]=true;
        Write(save,e with{Caught=e.Caught.HasValue?value:null,Seen=allowed.Select(b=>b&&value).ToArray(),Displayed=displayed,Languages=e.Languages.Select(_=>value).ToArray()});
    }
    private static void SetAll(SaveFile save,int index,string action)
    {
        var e=State(save,index);var seen=Allowed(save,index);var displayed=(bool[])e.Displayed.Clone();
        if(index<save.MaxSpeciesID){
            if(!displayed.Any(b=>b))displayed[seen[0]?0:1]=true;
            int language=save.Language>5?save.Language-2:save.Language-1;
            var languages=action=="seen"?(e.Caught==true?e.Languages:new bool[9]):Enumerable.Range(0,9).Select(i=>action=="complete"||i==language).ToArray();
            e=e with{Caught=action=="seen"?e.Caught:true,Languages=languages};
        }
        Write(save,e with{Seen=seen,Displayed=displayed});
    }
    private static void Validate(SaveFile save,Dex7State e,int count)
    {
        if(e.Index<0||e.Index>=count||e.Seen is not {Length:4}||e.Displayed is not {Length:4}||e.Languages is null||e.Languages.Length!=(e.Index<save.MaxSpeciesID?9:0)||e.Caught.HasValue!=(e.Index<save.MaxSpeciesID))throw new ArgumentException("Pokedex entry is incomplete.");
        LetsGoPokedex.ValidateSizes(save,e);
        var old=State(save,e.Index);var allowed=Allowed(save,e.Index);
        if(Enumerable.Range(0,4).Any(i=>!allowed[i]&&((e.Seen[i]&&!old.Seen[i])||(e.Displayed[i]&&!old.Displayed[i])))||
            (!e.Displayed.SequenceEqual(old.Displayed)&&(e.Displayed.Count(b=>b)>1||Enumerable.Range(0,4).Any(i=>e.Displayed[i]&&!old.Displayed[i]&&!e.Seen[i]))))throw new ArgumentException("Pokedex choices are invalid.");
    }
    private static void Write(SaveFile save,Dex7State e)
    {
        LetsGoPokedex.WriteSizes(save,e);
        var d=Dex(save);for(int i=0;i<4;i++){d.SetSeen((ushort)(e.Index+1),i,e.Seen[i]);d.SetDisplayed(e.Index,i,e.Displayed[i]);}
        if(e.Caught.HasValue){d.SetCaught((ushort)(e.Index+1),e.Caught.Value);for(int i=0;i<9;i++)d.SetLanguageFlag(e.Index,i,e.Languages[i]);}
    }
}

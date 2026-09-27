// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Gen6PokedexTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static SAV6 Open(byte[] data)=>(SAV6)SaveUtil.GetSaveFile(data.ToArray())!;
    private static Zukan6 Dex(SAV6 s)=>s is SAV6XY xy?xy.Zukan:((SAV6AO)s).Zukan;
    private static byte[] Edit(byte[] data,Dex6Edit edit)=>SaveService.EditPokedex6(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Dex6Edit));
    public static void Run()
    {
        foreach(string version in new[]{"X","OR"})
        {
            var seed=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));var d=Dex(seed);d.Packed=0xABCD002C;d.Spinda=0x87654321;
            d.SetSeen(25,3);d.SetDisplayed(25,3);d.SetDisplayed(25,0);d.SetCaught(25);d.SetFormFlag(28,3,true);
            if(d is Zukan6AO nav){nav.SetCountSeen(0,123);nav.SetCountSeen(721,321);nav.SetCountObtained(25,65535);}
            var data=seed.Write().ToArray();var original=data.ToArray();var catalog=Gen6Pokedex.Read(Open(data));
            Check(catalog.Entries.Length==721&&catalog.CanEdit&&catalog.Entries.All(e=>e.Name.Zh.Length>0&&e.Name.En.Length>0&&e.Name.Ja.Length>0),"Complete Gen6 localized catalog");
            Check(catalog.Entries[24].FormChoices.Length==(version=="X"?0:7),"Pikachu version forms");
            Check(catalog.Entries[675].FormChoices.Length==(version=="X"?0:10),"ORAS desktop Furfrou manual form list");
            foreach(var action in new[]{"clear","seen","caught","uncaught","complete","formsClear","formsFirst","formsAll","give","giveNone","dexNavAll","dexNavClear"})
            foreach(bool shiny in new[]{false,true})foreach(bool languages in new[]{false,true})
            {
                if(version=="X"&&action.StartsWith("dexNav"))continue;
                if(shiny&&action is not ("seen" or "complete" or "formsFirst" or "formsAll" or "give"))continue;
                if(languages&&action is not ("caught" or "complete" or "give"))continue;
                var expected=Open(data);var z=Dex(expected);var language=(LanguageID)expected.Language;
                switch(action){case "clear":z.SeenNone();break;case "seen":Complete(expected,shiny);break;case "caught":z.CaughtAll(language,languages);break;case "uncaught":z.CaughtNone();break;case "complete":Complete(expected,shiny);z.CaughtAll(language,languages);break;case "formsClear":z.ClearFormSeen();break;case "formsFirst":z.SetFormsSeen1(shiny);break;case "formsAll":z.SetFormsSeen(shiny);break;case "give":z.GiveAll(25,true,shiny,language,languages);break;case "giveNone":z.GiveAll(25,false,false,language,false);if(z is Zukan6AO a&&a.GetCaught(25)&&a.GetCountSeen(25)==0)a.SetCountSeen(25,1);break;case "dexNavAll":case "dexNavClear":for(ushort i=1;i<=721;i++)((Zukan6AO)z).SetCountSeen(i,action=="dexNavAll"?(ushort)999:(ushort)0);break;}
                Compare(data,new(action,Species:action is "give" or "giveNone"?25:0,Shiny:shiny,AllLanguages:languages),expected);
            }
            var seen=Open(Edit(data,new("seen",Shiny:true)));Check(!Dex(seen).GetSeen(669,0)&&Dex(seen).GetSeen(669,1)&&Dex(seen).GetSeen(669,3),"Gen6 female-only species use Gen6 gender table");
            foreach(var e in catalog.Entries.Where(e=>e.FormChoices.Length>0||new[]{1,25,29,32,81,649,650,721}.Contains(e.State.Species)))
            {
                var expected=Open(data);Dex(expected).InitialSpecies=(ushort)e.State.Species;Compare(data,new("entry",Entry:e.State),expected);
                int chosen=Array.FindLastIndex(e.AllowedRegions,b=>b),count=e.FormChoices.Length;var displayed=new bool[4];displayed[chosen]=true;
                var state=e.State with{Caught=true,Seen=(bool[])e.AllowedRegions.Clone(),Displayed=displayed,Languages=Enumerable.Range(0,7).Select(i=>i%2==0).ToArray(),Forms=Enumerable.Range(0,4).Select(r=>Enumerable.Range(0,count).Select(i=>r<2||r==3&&i==count-1).ToArray()).ToArray(),Foreign=e.State.Foreign.HasValue?true:null,CountSeen=e.State.CountSeen is null?null:"99999",CountObtained=e.State.CountObtained is null?null:""};
                expected=Open(data);var z=Dex(expected);ushort species=(ushort)state.Species;var(index,_)=z.GetFormIndex(species);
                z.SetCaught(species,true);for(int r=0;r<4;r++){z.SetSeen(species,r,state.Seen[r]);z.SetDisplayed(species,r,state.Displayed[r]);for(int i=0;i<count;i++)z.SetFormFlag(index+i,r,state.Forms[r][i]);}for(int i=0;i<7;i++)z.SetLanguageFlag(species,i,state.Languages[i]);if(z is Zukan6XY x&&species<=649)x.SetForeignFlag(species,true);if(z is Zukan6AO a){a.SetCountSeen(species,65535);a.SetCountObtained(species,0);}z.InitialSpecies=species;
                Compare(data,new("entry",Entry:state),expected);
            }
            foreach(bool unlocked in new[]{false,true})foreach(bool active in new[]{false,true})foreach(string pid in new[]{"","FFFFFFFF","100000000","x-ab12","00123456"})
            {
                var expected=Open(data);var z=Dex(expected);z.IsNationalDexUnlocked=unlocked;z.IsNationalDexMode=active;z.InitialSpecies=721;z.Spinda=Util.GetHexValue(pid);Compare(data,new("globals",Globals:new(unlocked,active,721,pid)),expected);
            }
            var entry=catalog.Entries[24].State;
            foreach(var bad in new[]{new Dex6Edit("bad"),new("give",Species:722),new("globals",Globals:new(true,true,722,"1")),new("globals",Globals:new(true,true,1,new string('F',32768))),new("entry",Entry:entry with{Seen=[]}),new("entry",Entry:entry with{Languages=[]}),new("entry",Entry:entry with{Forms=[]}),new("entry",Entry:entry with{CountSeen="100000"}),new("entry",Entry:entry with{CountObtained="-1"}),new("entry",Entry:entry with{Foreign=version=="X"?null:true})}){try{Edit(data,bad);throw new Exception("Invalid Gen6 dex accepted");}catch(ArgumentException){}}
            if(version=="OR")foreach(var value in new[]{"0","65535","65536","99999","12_ 3"}){var expected=Open(data);var z=(Zukan6AO)Dex(expected);z.SetCountSeen(25,(ushort)Math.Min(Util.ToUInt32(value),65535));z.InitialSpecies=25;Compare(data,new("entry",Entry:entry with{CountSeen=value}),expected);}
            if(version=="X"){try{Edit(data,new("dexNavAll"));throw new Exception("XY DexNav accepted");}catch(ArgumentException){}}
            Check(data.SequenceEqual(original),"Original Gen6 save preserved");
            Console.WriteLine($"PASS {version}: 721 entries, all UI forms, foreign flags/count bounds, batch modifiers, corrected gender/DexNav ranges, globals/hex, preserved raw data and full output");
        }
    }
    private static void Complete(SAV6 save,bool shiny){for(ushort i=1;i<=721;i++)Dex(save).CompleteSeen(i,shiny,save.Personal[i]);}
    private static void Compare(byte[] data,Dex6Edit request,SAV6 expected){var output=Edit(data,request);Check(output.SequenceEqual(expected.Write().ToArray()),"Full Gen6 output equals independent Core operation");var after=Open(output);Check(after.ChecksumsValid&&after.GetType()==expected.GetType(),"Valid Gen6 reload");}
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Gen5PokedexTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static SAV5 Open(byte[] data)=>(SAV5)SaveUtil.GetSaveFile(data.ToArray())!;
    private static byte[] Edit(byte[] data,Dex5Edit edit)=>SaveService.EditPokedex5(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Dex5Edit));
    public static void Run()
    {
        foreach(string version in new[]{"B","B2"})
        {
            var seed=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));seed.Zukan.Packed=0xD5400554;seed.Zukan.Spinda=0x87654321;
            seed.Zukan.SetSeen(25,3);seed.Zukan.SetDisplayed(25,3);seed.Zukan.SetCaught(25);seed.Zukan.SetLanguageFlag(25,6,true);
            // Preserve inconsistent existing display flags, while explicit new selections must be unique.
            seed.Zukan.SetDisplayed(25,0);
            seed.Zukan.SetFormFlag(0,3,true);
            var data=seed.Write().ToArray();var original=data.ToArray();var catalog=Gen5Pokedex.Read(Open(data));
            Check(catalog.Entries.Length==649&&catalog.CanEdit&&catalog.Entries.All(e=>e.Name.Zh.Length>0&&e.Name.En.Length>0&&e.Name.Ja.Length>0),"Complete localized Gen5 catalog");
            Check(catalog.Entries[645].FormChoices.Length==(version=="B"?0:3),"Kyurem version-specific forms");
            foreach(var action in new[]{"clear","seen","caught","uncaught","complete","formsClear","formsFirst","formsAll","give","giveNone"})
            foreach(bool shiny in new[]{false,true})foreach(bool languages in new[]{false,true})
            {
                if(shiny&&action is not ("seen" or "complete" or "formsFirst" or "formsAll" or "give"))continue;
                if(languages&&action is not ("caught" or "complete" or "give"))continue;
                var expected=Open(data);var d=expected.Zukan;var language=(LanguageID)expected.Language;
                switch(action){case "clear":d.SeenNone();break;case "seen":d.SeenAll(shiny);break;case "caught":d.CaughtAll(language,languages);break;case "uncaught":d.CaughtNone();break;case "complete":d.SeenAll(shiny);d.CaughtAll(language,languages);break;case "formsClear":d.ClearFormSeen();break;case "formsFirst":d.SetFormsSeen1(shiny);break;case "formsAll":d.SetFormsSeen(shiny);break;case "give":d.GiveAll(25,true,shiny,language,languages);break;case "giveNone":d.GiveAll(25,false,false,language,false);break;}
                Compare(data,new(action,Species:action is "give" or "giveNone"?25:0,Shiny:shiny,AllLanguages:languages),expected);
            }
            foreach(var e in catalog.Entries.Where(e=>e.FormChoices.Length>0||new[]{1,25,29,32,81,493,494,649}.Contains(e.State.Species)))
            {
                var expected=Open(data);expected.Zukan.InitialSpecies=(ushort)e.State.Species;Compare(data,new("entry",Entry:e.State),expected);
                int chosen=Array.FindLastIndex(e.AllowedRegions,b=>b);var seen=(bool[])e.AllowedRegions.Clone();var displayed=new bool[4];displayed[chosen]=true;
                int count=e.FormChoices.Length;var forms=Enumerable.Range(0,4).Select(r=>Enumerable.Range(0,count).Select(i=>r<2||r==3&&i==count-1).ToArray()).ToArray();
                var state=e.State with{Caught=true,Seen=seen,Displayed=displayed,Languages=Enumerable.Range(0,7).Select(i=>e.State.Species<=493&&i%2==0).ToArray(),Forms=forms};
                expected=Open(data);var d=expected.Zukan;ushort species=(ushort)state.Species;var(index,_)=d.GetFormIndex(species);
                d.SetCaught(species,true);for(int r=0;r<4;r++){d.SetSeen(species,r,state.Seen[r]);d.SetDisplayed(species,r,state.Displayed[r]);for(int i=0;i<count;i++)d.SetFormFlag(index+i,r,state.Forms[r][i]);}for(int i=0;i<7;i++)d.SetLanguageFlag(species,i,state.Languages[i]);d.InitialSpecies=species;
                Compare(data,new("entry",Entry:state),expected);
            }
            foreach(bool unlocked in new[]{false,true})foreach(bool active in new[]{false,true})foreach(string pid in new[]{"","FFFFFFFF","00ab12ef","a-1 z!"})
            {
                var expected=Open(data);var d=expected.Zukan;d.IsNationalDexUnlocked=unlocked;d.IsNationalDexMode=active;d.InitialSpecies=649;d.Spinda=Util.GetHexValue(pid);
                Compare(data,new("globals",Globals:new(unlocked,active,649,pid)),expected);
            }
            var entry=catalog.Entries[24].State;
            foreach(var bad in new[]{new Dex5Edit("bad"),new("give",Species:0),new("seen",Species:1),new("globals",Globals:new(true,true,650,"1")),new("globals",Globals:new(true,true,1,"123456789")),new("entry",Entry:entry with{Seen=[]}),new("entry",Entry:entry with{Languages=[]}),new("entry",Entry:entry with{Displayed=[true,true,false,false]}),new("entry",Entry:entry with{Forms=[]}),new("clear",Shiny:true),new("entry",Entry:catalog.Entries[28].State with{Seen=[true,false,false,false]})})
            {try{Edit(data,bad);throw new Exception("Invalid Gen5 dex accepted");}catch(ArgumentException){}}
            var missing=System.Text.Json.Nodes.JsonNode.Parse(JsonSerializer.Serialize(new Dex5Edit("entry",Entry:entry),SaveJsonContext.Default.Dex5Edit))!;missing["entry"]!.AsObject().Remove("caught");try{SaveService.EditPokedex5(data,missing.ToJsonString());throw new Exception("Missing caught accepted");}catch(JsonException){}
            Check(data.SequenceEqual(original),"Original Gen5 save unchanged");
            var korean=Open(data);korean.Language=8;var koreanData=korean.Write().ToArray();var single=Open(Edit(koreanData,new("caught")));var all=Open(Edit(koreanData,new("caught",AllLanguages:true)));
            Check(!single.Zukan.GetLanguageFlag(1,6)&&all.Zukan.GetLanguageFlag(1,6),"Upstream Korean single-language omission is explicit; all languages includes Korean");
            Console.WriteLine($"PASS {version}: 649 entries, version forms, every batch/modifier, all form species, globals/hex/packed bits, Korean behavior, missing/invalid requests, full output and original");
        }
    }
    private static void Compare(byte[] data,Dex5Edit request,SAV5 expected)
    {
        var output=Edit(data,request);Check(output.SequenceEqual(expected.Write().ToArray()),"Full Gen5 output equals independent desktop Core operation");var after=Open(output);Check(after.ChecksumsValid&&after.GetType()==expected.GetType(),"Valid Gen5 reload");
    }
}

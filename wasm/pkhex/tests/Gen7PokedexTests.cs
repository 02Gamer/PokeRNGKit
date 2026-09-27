// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Gen7PokedexTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static SAV7 Open(byte[] data)=>(SAV7)SaveUtil.GetSaveFile(data.ToArray())!;
    private static byte[] Edit(byte[] data,Dex7Edit edit)=>SaveService.EditPokedex7(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Dex7Edit));
    public static void Run()
    {
        foreach(string version in new[]{"SN","US"})
        {
            var seed=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));var d=seed.Zukan;
            // Sentinels in reserved data, language tails, and Spinda EC fields must survive every operation.
            d.Data[0x85]=0xAD;d.Data[0x8E8]=0x76;d.Data[0xF77]=0xAC;
            d.SetSeen(25,3,true);d.SetDisplayed(24,3,true);d.SetDisplayed(24,0,true);d.SetCaught(25,true);d.SetLanguageFlag(24,8,true);
            int form=d.GetEntryIndex(678,1);d.SetDisplayed(form,1,true);
            var data=seed.Write().ToArray();var original=data.ToArray();var catalog=Gen7Pokedex.Read(Open(data));
            Check(catalog.CanEdit&&catalog.Entries.Count(e=>e.Form==0)==(version=="SN"?802:807),"Gen7 species ranges");
            Check(catalog.Entries.Length==d.GetEntryNames(GameInfo.GetStrings("en").specieslist).Count,"Gen7 complete entry list");
            foreach(var e in catalog.Entries){
                Check(d.GetEntryIndex((ushort)e.Species,(byte)e.Form)==e.State.Index,"Gen7 reversible form mapping");
                Check(e.Name.Zh.Length>0&&e.Name.En.Length>0&&e.Name.Ja.Length>0,"Gen7 localized entries");
                Check(e.State.Languages.Length==(e.Form==0?9:0)&&e.State.Caught.HasValue==(e.Form==0),"Gen7 base-only fields");
            }
            Check(!catalog.Entries[677].AllowedRegions[1]&&catalog.Entries[form].AllowedRegions[1]&&!catalog.Entries[form].AllowedRegions[0],"Meowstic forms have distinct genders");
            foreach(int index in new[]{0,24,677,form,catalog.Entries.Length-1}){
                var e=catalog.Entries[index];Compare(data,new("entry",e.State),Open(data));
                var expected=Open(data);var z=expected.Zukan;var shown=new bool[4];int r=Array.FindLastIndex(e.AllowedRegions,b=>b);shown[r]=true;
                var changed=e.State with{Caught=e.Form==0?true:null,Seen=e.AllowedRegions,Displayed=shown,Languages=Enumerable.Repeat(true,e.State.Languages.Length).ToArray()};
                for(int i=0;i<4;i++){z.SetSeen((ushort)(index+1),i,changed.Seen[i]);z.SetDisplayed(index,i,shown[i]);}
                if(e.Form==0){z.SetCaught((ushort)(index+1),true);for(int i=0;i<9;i++)z.SetLanguageFlag(index,i,true);}
                Compare(data,new("entry",changed),expected);
                foreach(bool value in new[]{false,true}){
                    expected=Open(data);z=expected.Zukan;
                    for(int i=0;i<4;i++)z.SetSeen((ushort)(index+1),i,value&&e.AllowedRegions[i]);
                    if(!value)for(int i=0;i<4;i++)z.SetDisplayed(index,i,false);
                    else if(!Enumerable.Range(0,4).Any(i=>z.GetDisplayed(index,i)))z.SetDisplayed(index,e.AllowedRegions[0]?0:1,true);
                    if(e.Form==0){z.SetCaught((ushort)(index+1),value);for(int i=0;i<9;i++)z.SetLanguageFlag(index,i,value);}
                    Compare(data,new(value?"give":"giveNone",Index:index),expected);
                }
            }
            foreach(string action in new[]{"clear","uncaught","seen","caught","complete"}){
                var expected=Open(data);DesktopBatch(expected,action,catalog.Entries.Length);Compare(data,new(action),expected);
            }
            var all=Open(Edit(data,new("complete")));var az=all.Zukan;
            Check(az.GetCaught(all.MaxSpeciesID)&&az.GetLanguageFlag(all.MaxSpeciesID-1,8),"Last species and traditional Chinese retained");
            int alola=az.GetEntryIndex(19,1);Check(az.GetSeen((ushort)(alola+1),0)&&!Enumerable.Range(0,4).Any(i=>az.GetDisplayed(alola,i)),"Batch form has no automatic display");
            foreach(int language in new[]{1,8,9,10}){
                var local=Open(data);local.Language=language;var bytes=local.Write().ToArray();var after=Open(Edit(bytes,new("caught")));
                int selected=language>5?language-2:language-1;Check(Enumerable.Range(0,9).All(i=>after.Zukan.GetLanguageFlag(24,i)==(i==selected)),"All caught replaces nine-language vector");
            }
            foreach(var bad in new[]{new Dex7Edit("invalid"),new("give",Index:-1),new("give",Index:catalog.Entries.Length),new("clear",Index:0),new("entry",catalog.Entries[0].State with{Index=-1}),new("entry",catalog.Entries[0].State with{Caught=null}),new("entry",catalog.Entries[0].State with{Languages=[]}),new("entry",catalog.Entries[form].State with{Caught=true}),new("entry",catalog.Entries[form].State with{Seen=[true,false,false,false]})})Reject(data,bad);
            Check(data.SequenceEqual(original),"Gen7 input unchanged");
            var corrupt=data.ToArray();corrupt[0x100]^=1;Reject(corrupt,new("clear"));
            Console.WriteLine($"PASS {version}: {catalog.Entries.Length} dex entries, reversible forms, gender, nine languages, all desktop batches, full-file equivalence, preserved sentinels and invalid payloads");
        }
    }
    // Independent port of the desktop checkbox assignments; Click handlers do not run for programmatic assignments.
    private static void DesktopBatch(SAV7 save,string action,int count)
    {
        var d=save.Zukan;
        if(action is "clear" or "uncaught"){
            for(int i=0;i<count;i++){
                if(i<save.MaxSpeciesID){d.SetCaught((ushort)(i+1),false);for(int j=0;j<9;j++)d.SetLanguageFlag(i,j,false);}
                if(action=="clear")for(int j=0;j<4;j++){d.SetSeen((ushort)(i+1),j,false);d.SetDisplayed(i,j,false);}
            }return;
        }
        for(ushort s=1;s<=save.MaxSpeciesID;s++){
            foreach(int index in new[]{(int)s-1}.Concat(d.GetAllFormEntries(s).Where(i=>i>=save.MaxSpeciesID).Distinct())){
                byte gender=d.GetBaseSpeciesGenderValue(index);bool male=gender!=254,female=gender!=0&&gender!=255;
                d.SetSeen((ushort)(index+1),0,male);d.SetSeen((ushort)(index+1),2,male);d.SetSeen((ushort)(index+1),1,female);d.SetSeen((ushort)(index+1),3,female);
                if(index>=save.MaxSpeciesID)continue;
                if(!Enumerable.Range(0,4).Any(i=>d.GetDisplayed(index,i)))d.SetDisplayed(index,male?0:1,true);
                if(action=="seen"){if(!d.GetCaught(s))for(int i=0;i<9;i++)d.SetLanguageFlag(index,i,false);}
                else{d.SetCaught(s,true);int lang=save.Language;if(lang>5)lang--;lang--;for(int i=0;i<9;i++)d.SetLanguageFlag(index,i,action=="complete"||i==lang);}
            }
        }
    }
    private static void Reject(byte[] data,Dex7Edit edit){try{Edit(data,edit);throw new Exception("Invalid Gen7 dex accepted");}catch(ArgumentException){}}
    private static void Compare(byte[] data,Dex7Edit edit,SAV7 expected){var output=Edit(data,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Gen7 full-file matches independent desktop port");Check(Open(output).ChecksumsValid,"Gen7 reload checksum");}
}

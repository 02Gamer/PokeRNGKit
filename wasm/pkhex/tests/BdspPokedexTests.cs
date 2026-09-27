// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class BdspPokedexTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static SAV8BS Open(byte[] data)=>(SAV8BS)SaveUtil.GetSaveFile(data.ToArray())!;
    private static byte[] Edit(byte[] data,Dex8bEdit edit)=>SaveService.EditPokedex8b(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Dex8bEdit));
    private static readonly int[] Languages=[1,2,3,4,5,7,8,9,10];
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.BD,GameVersion.SP})
        foreach(var (revision,length) in new[]{(Gem8Version.V1_0,SaveUtil.SIZE_G8BDSP_0),(Gem8Version.V1_1,SaveUtil.SIZE_G8BDSP_1),(Gem8Version.V1_2,SaveUtil.SIZE_G8BDSP_2),(Gem8Version.V1_3,SaveUtil.SIZE_G8BDSP_3)}){
            var bytes=File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav")[..length];WriteInt32LittleEndian(bytes,(int)revision);
            var seed=new SAV8BS(bytes){Version=version,Language=10};var d=seed.Zukan;
            d.SetState(25,ZukanState8b.Caught);d.SetGenderFlags(25,true,true,true,true);d.SetLanguageFlag(25,1,true);d.SetHasFormFlag(201,2,true,true);
            WriteInt32LittleEndian(d.Data,int.MinValue);WriteInt32LittleEndian(d.Data[(492*4)..],17);
            WriteUInt32LittleEndian(d.Data[(3*493*4+24*4)..],0xAABBCCDD); // abnormal male bool
            WriteUInt32LittleEndian(d.Data[(2*493*4+24*4)..],2); // abnormal shiny female bool
            WriteUInt32LittleEndian(d.Data[(5*493*4)..],0xC0FFEE); // first Unown form bool
            WriteUInt32LittleEndian(d.Data[(0x28FC+24*4)..],0xC0000080); // language high bits
            WriteUInt32LittleEndian(d.Data[0x30B0..],0x76543210);WriteUInt32LittleEndian(d.Data[0x30B4..],2);
            seed.ZukanExtra.Data.Fill(0xA7);
            var data=seed.Write().ToArray();var original=data.ToArray();var catalog=BdspPokedex.Read(Open(data));
            Check(catalog.CanEdit&&catalog.Entries.Length==493&&!catalog.National,"BDSP full catalog and raw national");
            Check(catalog.Entries.Count(e=>e.FormChoices.Length>0)==13,"BDSP thirteen form species");
            foreach(var e in catalog.Entries)Check(e.FormChoices.Length==Zukan8b.GetFormCount((ushort)e.State.Species)&&e.Name.Zh.Length>0&&e.Name.En.Length>0&&e.Name.Ja.Length>0,"BDSP localized form counts");
            foreach(var e in catalog.Entries.Where(e=>e.FormChoices.Length>0||new[]{1,25,29,32,81,493}.Contains(e.State.Species))){
                Compare(data,new("entry",e.State),Open(data));
                var expected=Open(data);var z=expected.Zukan;ushort s=(ushort)e.State.Species;
                var change=e.State with{State=1,Genders=e.State.Species==25?[e.State.Genders[0],false,e.State.Genders[2],e.State.Genders[3]]:[true,true,true,true],Languages=Enumerable.Range(0,9).Select(i=>i%2==0).ToArray(),Forms=e.State.Forms.Select((r,region)=>r.Select((_,i)=>(i+region)%2==1).ToArray()).ToArray()};
                ApplyManualExpected(expected,e.State,change);Compare(data,new("entry",change),expected);
            }
            foreach(var action in new[]{"give","giveNone","formsClear","formsRegular","formsShiny","clear","seen","caught","uncaught","complete"})
            foreach(bool shiny in new[]{false,true}){
                if(shiny&&action is not ("seen" or "complete"))continue;
                var expected=Open(data);var z=expected.Zukan;int species=action is "give" or "giveNone" or "formsClear" or "formsRegular" or "formsShiny"?201:0;
                switch(action){
                    case "give":case "giveNone":bool v=action=="give";z.SetState(201,v?ZukanState8b.Caught:ZukanState8b.None);z.SetGenderFlags(201,v,v,v,v);foreach(int l in Languages)z.SetLanguageFlag(201,l,v);break;
                    case "formsClear":case "formsRegular":case "formsShiny":for(byte f=0;f<28;f++){if(action!="formsShiny")z.SetHasFormFlag(201,f,false,action=="formsRegular");z.SetHasFormFlag(201,f,true,action=="formsShiny");}break;
                    case "clear":z.SetAllSeen(false);break;case "seen":z.SetAllSeen(shinyToo:shiny);break;case "caught":z.CaughtAll();break;case "uncaught":z.CaughtNone();break;case "complete":z.CompleteDex(shiny);break;
                }
                Compare(data,new(action,Species:species,Shiny:shiny),expected);
            }
            foreach(bool national in new[]{false,true}){var expected=Open(data);if(national)expected.Zukan.HasNationalDex=true;Compare(data,new("national",National:national),expected);}
            var single=Open(Edit(data,new("give",Species:81)));single.Zukan.GetGenderFlags(81,out bool m,out bool female,out bool ms,out bool fs);Check(m&&female&&ms&&fs,"Manual check all sets all genders even for genderless");
            var caught=Open(Edit(data,new("caught")));caught.Zukan.GetGenderFlags(25,out _,out _,out ms,out fs);Check(!ms&&!fs&&caught.Zukan.GetLanguageFlag(25,10)&&caught.Zukan.GetLanguageFlag(25,9),"Caught all clears shiny flags and preserves existing languages");
            var seen=Open(Edit(data,new("seen")));Check(seen.Zukan.GetState(25)==ZukanState8b.Caught&&seen.Zukan.GetHasFormFlag(201,2,true),"Seen all preserves captured state and forms");
            var first=catalog.Entries[0].State;
            foreach(var bad in new[]{new Dex8bEdit("entry",first with{State=4}),new("entry",first with{Species=0}),new("entry",first with{Species=494}),new("entry",first with{Genders=[]}),new("entry",first with{Languages=[]}),new("entry",first with{Forms=[]}),new("entry",first with{Forms=[new bool[1],new bool[1]]}),new("national"),new("give",Species:0),new("caught",Shiny:true),new("formsShiny",Species:201,Shiny:true),new("seen",Species:25),new("invalid")})Reject(data,bad);
            try{SaveService.EditPokedex8b(data,"{\"action\":\"entry\",\"entry\":{\"species\":1,\"genders\":[false,false,false,false],\"languages\":[false,false,false,false,false,false,false,false,false],\"forms\":[[],[]]}}");throw new Exception("Missing state accepted");}catch(JsonException){}
            var corrupt=data.ToArray();corrupt[0x100]^=1;Reject(corrupt,new("clear"));Check(data.SequenceEqual(original),"Original BDSP unchanged");
            Console.WriteLine($"PASS {version} {revision}: all 493 entries, 13 form species, raw states/booleans/language bits, all menu actions/modifiers, national/regional/Spinda preservation and full file");
        }
    }
    private static void ApplyManualExpected(SAV8BS save,Dex8bState old,Dex8bState e)
    {
        var d=save.Zukan;ushort species=(ushort)e.Species;if(e.State!=old.State)d.SetState(species,(ZukanState8b)e.State);
        int[] offsets=[3*493*4,4*493*4,493*4,2*493*4];for(int r=0;r<4;r++)if(e.Genders[r]!=old.Genders[r])WriteUInt32LittleEndian(d.Data[(offsets[r]+(species-1)*4)..],e.Genders[r]?1u:0u);
        for(int i=0;i<9;i++)if(e.Languages[i]!=old.Languages[i])d.SetLanguageFlag(species,Languages[i],e.Languages[i]);
        for(int r=0;r<2;r++)for(byte i=0;i<e.Forms[r].Length;i++)if(e.Forms[r][i]!=old.Forms[r][i])d.SetHasFormFlag(species,i,r==1,e.Forms[r][i]);
    }
    private static void Reject(byte[] data,Dex8bEdit edit){try{Edit(data,edit);throw new Exception("Invalid BDSP dex payload accepted");}catch(ArgumentException){}}
    private static void Compare(byte[] data,Dex8bEdit edit,SAV8BS expected){var output=Edit(data,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"BDSP full output matches independent Core operations");var actual=Open(output);Check(actual.ChecksumsValid&&actual.SaveRevision==expected.SaveRevision&&actual.Version==expected.Version,"BDSP version/length/checksum preserved");}
}

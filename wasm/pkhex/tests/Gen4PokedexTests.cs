// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Gen4PokedexTests
{
    private static void Check(bool ok, string message) { if (!ok) throw new Exception(message); }
    private static SAV4 Open(byte[] data) => (SAV4)SaveUtil.GetSaveFile(data.ToArray())!;
    private static byte[] Edit(byte[] data, Dex4Edit edit) => SaveService.EditPokedex4(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.Dex4Edit));
    public static void Run()
    {
        foreach (string version in new[] { "D", "Pt", "HG" })
        {
            var source = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            source.Dex.SpindaPID = 0x12345678;
            source.Dex.SetLanguageBitIndex(25, 7, true);
            source.Dex.SetSeen(201); source.Dex.SetForms(201, new byte[] { 27, 3, 0 });
            var data = source.Write().ToArray(); var original = data.ToArray();
            var catalog = Gen4Pokedex.Read(Open(data));
            Check(catalog.Entries.Length == 493 && catalog.CanEdit && catalog.Entries.All(e=>e.Name.Zh.Length>0 && e.Name.En.Length>0 && e.Name.Ja.Length>0), "Full localized Gen4 dex");
            Check(catalog.Entries.Count(e=>e.HasLanguage)==(version=="D"?14:493), "DP language whitelist");
            Check(catalog.Entries.Single(e=>e.State.Species==172).FormChoices.Length==(version=="HG"?3:0), "HGSS Pichu forms");
            Check(catalog.Entries.Single(e=>e.State.Species==479).FormChoices.Length==(version=="D"?0:6), "Rotom game-specific forms");
            foreach(var action in new[] { "clear", "seen", "caught", "uncaught", "complete" })
            foreach(int scope in new[]{0,25,201,386,493})
            {
                var expected=Open(data); var args=action switch { "clear"=>Zukan4.SetDexArgs.None, "seen"=>Zukan4.SetDexArgs.SeenAll, "caught"=>Zukan4.SetDexArgs.CaughtAll, "uncaught"=>Zukan4.SetDexArgs.CaughtNone, _=>Zukan4.SetDexArgs.Complete };
                for(ushort i=(ushort)(scope==0?1:scope);i<=(scope==0?493:scope);i++) expected.Dex.ModifyAll(i,args,Zukan4.GetGen4LanguageBitIndex(expected.Language));
                Compare(data,new(action,scope),expected);
            }
            foreach(var choice in catalog.Upgrades)
            {
                var expected=Open(data); if(choice.Id!=expected.DexUpgraded) expected.DexUpgraded=choice.Id;
                Compare(data,new("upgrade",Upgrade:choice.Id),expected);
            }
            foreach(var entry in catalog.Entries.Where(e=>e.FormChoices.Length>0 || new[]{1,25,29,32,81,493}.Contains(e.State.Species)))
            {
                Check(Edit(data,new("entry",Entry:entry.State)).SequenceEqual(data), "Unchanged entry preserves raw bytes");
                var state=entry.State with {Seen=true,Caught=true,Genders=entry.GenderChoices.Reverse().ToArray(),Forms=Enumerable.Range(0,entry.FormChoices.Length).Reverse().ToArray(),Languages=Enumerable.Range(0,6).Select(i=>entry.HasLanguage&&i%2==0).ToArray()};
                var expected=Open(data); ushort species=(ushort)state.Species; var dex=expected.Dex;
                dex.SetSeen(species,state.Seen); dex.SetCaught(species,state.Caught); dex.SetSeenGenderNeither(species);
                byte first=(byte)(state.Genders[0]==1?1:0); dex.SetSeenGenderNewFlag(species,first); if(state.Genders.Length>1) dex.SetSeenGenderSecond(species,first^1);
                if(entry.HasLanguage) for(int i=0;i<6;i++) dex.SetLanguageBitIndex(species,i,state.Languages[i]);
                if(entry.FormChoices.Length>0) dex.SetForms(species,state.Forms.Select(f=>(byte)f).ToArray());
                Compare(data,new("entry",Entry:state),expected);
                var cleared=state with {Seen=false,Caught=false,Genders=[],Forms=[],Languages=new bool[6]};
                var modified=Edit(data,new("entry",Entry:state)); var clearExpected=Open(modified); clearExpected.Dex.ClearSeen(species);
                Compare(modified,new("entry",Entry:cleared),clearExpected);
            }
            var example=catalog.Entries[24].State;
            foreach(var invalid in new[] {new Dex4Edit("bad"),new("seen",494),new("upgrade",Upgrade:99),new("entry"),
                new("entry",Entry:example with{Species=0}),new("entry",Entry:example with{Genders=[0,0]}),new("entry",Entry:example with{Forms=[100]}),new("entry",Entry:example with{Languages=[]}),new("caught",Entry:example)})
            {try{Edit(data,invalid);throw new Exception("Invalid Gen4 dex edit accepted");}catch(ArgumentException){}}
            Check(data.SequenceEqual(original), "Original Gen4 save unchanged");
            foreach (var field in new[] { "seen", "caught" })
            {
                var payload = System.Text.Json.Nodes.JsonNode.Parse(JsonSerializer.Serialize(new Dex4Edit("entry", Entry: example), SaveJsonContext.Default.Dex4Edit))!;
                payload["entry"]!.AsObject().Remove(field);
                try { SaveService.EditPokedex4(data, payload.ToJsonString()); throw new Exception("Missing dex boolean accepted"); }
                catch (JsonException) { }
            }
            Console.WriteLine($"PASS {version}: full dex catalog, regional form/language limits, five actions at all/single scope, upgrade, ordered genders/forms, full output, no-op and invalid requests");
        }
        var other=File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        try{Edit(other,new("seen"));throw new Exception("Non-Gen4 accepted");}catch(ArgumentException){}
    }
    private static void Compare(byte[] data,Dex4Edit request,SAV4 expected)
    {
        var output=Edit(data,request); Check(output.SequenceEqual(expected.Write().ToArray()), "Gen4 dex output equals independent desktop Core operation");
        var after=Open(output); Check(after.ChecksumsValid && after.GetType()==expected.GetType() && after.Dex.SpindaPID==expected.Dex.SpindaPID, "Valid Gen4 output and preserved Spinda");
    }
}

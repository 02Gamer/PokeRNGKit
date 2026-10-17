// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonHintsPreviewTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid hint query accepted.");}
    private static void Mode(bool haX){SaveProgramSettingsRuntime.Reset();var s=SaveProgramSettingsCodec.Defaults();s.Startup.ForceHaXOnLaunch=haX;SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(s,SaveProgramSettingsJson.Default.SaveProgramSettings));}
    private static PKM Seed(PKM p){p.Species=25;p.Language=2;p.Version=p.Context.GetSingleGameVersion();p.Nickname="TEST";p.OriginalTrainerName="OWNER";p.CurrentLevel=25;p.Ball=4;p.Move1=85;p.RefreshChecksum();return p;}
    private static int[] Oracle(PKM p,SaveFile? save=null)
    {
        var analysis=save is null?new LegalityAnalysis(p.Clone(),StorageSlotType.None):new LegalityAnalysis(p.Clone(),save.Personal,StorageSlotType.None);
        if(!analysis.Parsed)return [];
        var source=new LegalMoveInfo();source.ReloadMoves(analysis);
        return Enumerable.Range(1,(int)Move.MAX_COUNT).Where(i=>source.CanLearn((ushort)i)).ToArray();
    }
    private static byte[] Bytes(PKM p,bool party,bool encrypted)=>p is GBPKML gb?StandaloneGb.Write(gb):StandalonePokemon.Serialize(p.Clone(),party,encrypted);
    private static string Query(byte[] input,PKM p,bool encrypted,PokemonDraftCapture? capture=null)=>JsonSerializer.Serialize(new PokemonHintsEnvelope("input."+p.Extension,encrypted,true,new(Br4Editing.Hash(input),capture??new("live",[]))),PokemonHintsJson.Default.PokemonHintsEnvelope);
    internal static void Run()
    {
        try
        {
            PokemonEditorContext.Clear();
            foreach(PKM layout in new PKM[]{new PK1(),new PK2(),new SK2(),new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new RK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()})
            {
                var p=Seed(layout);
                foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true})
                {
                    if(p.Format<3&&encrypted)continue;
                    var input=Bytes(p,party,encrypted);var original=input.ToArray();var file=StandalonePokemon.Open(input,"input."+p.Extension,encrypted,true);
                    Mode(false);string json=Query(input,p,encrypted);string response=Program.ReadPokemonDraftHints(input,json);
                    using var report=JsonDocument.Parse(response);var hints=PokemonHintsPreview.Read(input,json);
                    Check(hints.ApiVersion==SaveService.ApiVersion&&hints.SourceHash==Br4Editing.Hash(input)&&hints.RequestHash==Br4Editing.Hash(Encoding.UTF8.GetBytes(json)),"Public hints bind both entity bytes and exact request");
                    Check(hints.Hints is not null&&hints.Hints.LearnableMoves!.SequenceEqual(Oracle(file.Entity)),"Candidate flags match Core LegalMoveInfo for actual parsed format");
                    Check(!hints.Hints!.LearnableMoves!.Contains(0)&&!report.RootElement.TryGetProperty("output",out _),"None is never highlighted and read preview returns no writable output");
                    Check(input.SequenceEqual(original),"Hint query preserves full caller file including encrypted input");
                    Mode(true);Check(PokemonHintsPreview.Read(input,json).Hints is null,"HaX suppresses automatic candidate highlights");
                }
                Console.WriteLine($"PASS live hints {p.GetType().Name}: source candidate oracle, stored/party/encrypted input, public hashes, HaX and original");
            }
            Mode(false);Captured();Bindings();Invalid();Frozen();RealSave();
        }
        finally{PokemonEditorContext.Clear();SaveProgramSettingsRuntime.Reset();}
    }
    private static void Captured()
    {
        var p=Seed(new PK3());var input=Bytes(p,true,false);string initial=Query(input,p,false);
        using var edit=JsonDocument.Parse("{\"identity\":{\"species\":129,\"form\":0,\"gender\":1,\"useSpeciesName\":true}}");
        var capture=new PokemonDraftCapture("live",[new("basic",[new("basic",edit.RootElement.Clone(),["identity"])])]);
        var changed=PokemonHintsPreview.Read(input,Query(input,p,false,capture));var previous=PokemonHintsPreview.Read(input,initial);
        Check(changed.Hints!.LearnableMoves!.Contains(150)&&!changed.Hints.LearnableMoves!.Contains(85),"Pending Magikarp identity replaces Pikachu move recommendations without applying");
        Check(!changed.Hints.LearnableMoves!.SequenceEqual(previous.Hints!.LearnableMoves!),"Recommendations are recalculated for captured inputs");
        Check(StandalonePokemon.Open(input,"input.pk3",useFileFormat:true).Entity.Species==25,"Draft hint read never applies pending species to source");
        Console.WriteLine("PASS live hints captured identity: updated candidate set without editing or exporting original");
    }
    private static void Bindings()
    {
        foreach(string name in new[]{"E","SN","GP"})
        {
            var save=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/"+name+".sav"));var p=Seed(save.BlankPKM);var input=Bytes(p,true,false);
            PokemonEditorContext.Bind(save,new(0,0));var result=PokemonHintsPreview.Read(input,Query(input,p,false));
            Check(result.Hints!.LearnableMoves!.SequenceEqual(Oracle(StandalonePokemon.Open(input,"input."+p.Extension,useFileFormat:true).Entity,save)),"Bound hint analysis uses actual save personal data");
            PokemonEditorContext.Clear();
        }
        Console.WriteLine("PASS live hints bound E/SM/LGPE: source save personal tables and independent context separation");
    }
    private static void Invalid()
    {
        var p=Seed(new PK3());var bytes=Bytes(p,true,false);var original=bytes.ToArray();string json=Query(bytes,p,false);
        Reject(()=>PokemonHintsPreview.Read(bytes,json.Replace(Br4Editing.Hash(bytes),"stale")));
        Reject(()=>PokemonHintsPreview.Read(bytes,json[..^1]+",\"unexpected\":true}"));
        Reject(()=>PokemonHintsPreview.Read(bytes,"{\"fileName\":\"a.pk3\",\"fileName\":\"b.pk3\"}"));
        Reject(()=>PokemonHintsPreview.Read(bytes,Query(bytes,p,false,new("",[]))));
        using var edit=JsonDocument.Parse("{\"box\":0,\"nickname\":\"NO\"}");
        Reject(()=>PokemonHintsPreview.Read(bytes,Query(bytes,p,false,new("live",[new("basic",[new("basic",edit.RootElement.Clone(),["nickname"])])]))));
        Check(bytes.SequenceEqual(original),"Rejected draft reads preserve complete input");Console.WriteLine("PASS live hint rejection: stale source, duplicate/unknown/positioned fields, invalid scope and original");
    }
    private static void Frozen()
    {
        var p=Seed(new PK3());p.Version=GameVersion.E;p.CurrentLevel=5;p.MetLevel=0;p.MetLocation=0;p.RefreshChecksum();var bytes=Bytes(p,true,false);
        var request=new MetSuggestionEnvelope("input.pk3",false,true,new(Br4Editing.Hash(bytes),new("live",[])));
        var ticket=PokemonMetSuggestionSession.Preview(bytes,JsonSerializer.Serialize(request,MetSuggestionJson.Default.MetSuggestionEnvelope));
        Check(ticket.Available,"Read isolation fixture has a frozen suggestion");
        PokemonHintsPreview.Read(bytes,Query(bytes,p,false));
        var confirmation=request with{MetSuggestion=null,MetSuggestionConfirmation=new(ticket.Token!,ticket.SourceHash,ticket.TargetHash!)};
        var output=PokemonMetSuggestionSession.Commit(bytes,JsonSerializer.Serialize(confirmation,MetSuggestionJson.Default.MetSuggestionEnvelope));
        Check(Br4Editing.Hash(output)==ticket.TargetHash,"Read-only hints do not replace or consume frozen write sessions");
        Console.WriteLine("PASS live hint isolation: existing frozen met confirmation and exact output remain usable");
    }
    private static void RealSave()
    {
        string? path=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");if(string.IsNullOrWhiteSpace(path))return;
        var original=File.ReadAllBytes(path);var save=SaveService.OpenDatabaseSave(original.ToArray());
        var source=Enumerable.Range(0,save.BoxCount).SelectMany(box=>Enumerable.Range(0,save.BoxSlotCount).Select(slot=>new PokemonPosition(box,slot))).First(pos=>{var entity=save.GetBoxSlotAtIndex(pos.Box,pos.Slot);return entity.Species!=0&&entity.Valid&&entity.ChecksumValid;});
        var p=save.GetBoxSlotAtIndex(source.Box,source.Slot);var bytes=Bytes(p,true,false);var before=bytes.ToArray();PokemonEditorContext.Bind(save,source);
        var result=PokemonHintsPreview.Read(bytes,Query(bytes,p,false));
        Check(result.Hints!.LearnableMoves!.SequenceEqual(Oracle(StandalonePokemon.Open(bytes,"input."+p.Extension,useFileFormat:true).Entity,save)),"Real save hint candidates follow actual bound Core context");
        Check(bytes.SequenceEqual(before)&&File.ReadAllBytes(path).SequenceEqual(original),"Real save work-copy file and entity buffer remain byte-identical");
        PokemonEditorContext.Clear();Console.WriteLine("PASS live hints real work copy: actual Pokemon, source candidate oracle, immutable entity and disk file");
    }
}

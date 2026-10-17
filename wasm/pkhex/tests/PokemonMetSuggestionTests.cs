// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class PokemonMetSuggestionTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid met suggestion accepted.");}
    private static void Mode(bool hax){SaveProgramSettingsRuntime.Reset();var s=SaveProgramSettingsCodec.Defaults();s.Startup.ForceHaXOnLaunch=hax;SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(s,SaveProgramSettingsJson.Default.SaveProgramSettings));}
    private static PKM Seed(PKM p)
    {
        p.Species=25;p.Language=2;p.Version=p.Context.GetSingleGameVersion();p.OriginalTrainerName="OWNER";p.Nickname="TEST";p.IsNicknamed=true;p.Ball=4;p.CurrentLevel=5;p.MetLocation=0;p.MetLevel=0;p.RefreshChecksum();return p;
    }
    // Independent transcription of PKMEditor.SetSuggestedMetLocation, including
    // its no-op gate. Random encounter time is checked separately below.
    private static PKM? Oracle(PKM input)
    {
        var p=input.Clone();if(new LegalityAnalysis(p.Clone(),StorageSlotType.None).Valid)return null;
        var e=EncounterSuggestion.GetSuggestedMetInfo(p);if(e is null||p.Format>=3&&e.Location==0)return null;
        byte level=e.LevelMin;int min=EncounterSuggestion.GetLowestLevel(p,level);if(min==0)min=level;ushort location=e.Location;
        if(p.Format<3&&e.Encounter is{} found&&!found.Version.Contains(GameVersion.C))location=0;
        if(p.CurrentLevel>=min&&p.MetLevel==level&&p.MetLocation==location&&(!e.HasGroundTile(p.Format)||p is IGroundTile t&&t.GroundTile==e.GetSuggestedGroundTile()))return null;
        min=Math.Max(min,level);if(EntitySuggestionUtil.GetMetLocationSuggestionMessage(p,level,location,min,e.Encounter).Count<=1)return null;
        p.MetLocation=location;p.MetLevel=e.GetSuggestedMetLevel(p);
        if(p.Format>=3&&e.HasGroundTile(p.Format))((IGroundTile)p).GroundTile=e.GetSuggestedGroundTile();
        if(p is PK2 pk2)pk2.MetTimeOfDay=location==0?0:e.GetSuggestedMetTimeOfDay();
        if(p is{Gen6:true,WasEgg:true})p.SetHatchMemory6();
        if(p.CurrentLevel<min){p.CurrentLevel=(byte)min;p.ResetPartyStats();}p.RefreshChecksum();return p;
    }
    internal static void Run()
    {
        try
        {
            PokemonEditorContext.Clear();Mode(false);int available=0;
            foreach(PKM layout in new PKM[]{new PK2(),new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new RK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()})
            {
                var p=Seed(layout);var before=p.Data.ToArray();var expected=Oracle(p);var result=PokemonMetSuggestion.Prepare(p);
                Check((result is null)==(expected is null),"Suggestion availability follows the upstream algorithm");
                Check(p.Data.SequenceEqual(before),"Suggestion preview preserves original entity bytes");
                if(result is null){Console.WriteLine($"PASS met {p.GetType().Name}: Core has no applicable change");continue;}
                available++;
                if(p is PK2)
                {
                    var e=EncounterSuggestion.GetSuggestedMetInfo(p)!;int time=((PK2)result.Pokemon).MetTimeOfDay;
                    Check(time is >=0 and <=3,"Crystal time fits the physical two-bit field");
                    // Freeze the selected random time; all other bytes still use
                    // the independent source oracle, not a rebuilt production entity.
                    ((PK2)expected!).MetTimeOfDay=time;expected!.RefreshChecksum();
                }
                Check(result.Pokemon.Data.SequenceEqual(expected!.Data),"Complete entity matches source suggestion oracle");
                foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true})
                {
                    if(p is GBPKML&&encrypted)continue;
                    var input=p is GBPKML gb?StandaloneGb.Write(gb):StandalonePokemon.Serialize(p.Clone(),party,encrypted);var original=input.ToArray();
                    var request=new MetSuggestionEnvelope("editor."+p.Extension,encrypted,true,new(Br4Editing.Hash(input),new("met",[])));
                    var preview=PokemonMetSuggestionSession.Preview(input,JsonSerializer.Serialize(request,MetSuggestionJson.Default.MetSuggestionEnvelope));
                    Check(preview.Available&&preview.Before is not null&&preview.After is not null,"Frozen preview contains concrete before/after fields");
                    var confirmation=new MetSuggestionConfirmation(preview.Token!,preview.SourceHash,preview.TargetHash!);
                    string json=JsonSerializer.Serialize(request with{MetSuggestion=null,MetSuggestionConfirmation=confirmation},MetSuggestionJson.Default.MetSuggestionEnvelope);
                    var output=PokemonMetSuggestionSession.Commit(input,json);var reopened=StandalonePokemon.Open(output,"editor."+p.Extension,useFileFormat:true).Entity;
                    Check(Br4Editing.Hash(output)==preview.TargetHash&&reopened.ChecksumValid&&PokemonMetSuggestion.State(reopened)==preview.After,"Frozen output, hash and preview survive complete-file export");
                    Check(input.SequenceEqual(original),"Complete suggestion session preserves original input");Reject(()=>PokemonMetSuggestionSession.Commit(input,json));
                }
                Console.WriteLine($"PASS met {p.GetType().Name}: source whole-entity oracle, file layouts, frozen confirmation, original and one-use");
            }
            Check(available>=3,"Suggestions are exercised on multiple real storage formats");
            Lifecycle();CapturedDrafts();Mode(true);Reject(()=>PokemonMetSuggestion.Prepare(Seed(new PK6())));
            Mode(false);Reject(()=>PokemonMetSuggestion.Prepare(new PK1()));Reject(()=>PokemonMetSuggestion.Prepare(new SK2()));
        }
        finally{PokemonMetSuggestionSession.Reset();PokemonEditorContext.Clear();SaveProgramSettingsRuntime.Reset();}
    }
    private static void Lifecycle()
    {
        var p=Seed(new PK3());var bytes=StandalonePokemon.Serialize(p,true,false);
        var request=new MetSuggestionEnvelope("editor.pk3",false,true,new(Br4Editing.Hash(bytes),new("met",[])));
        MetSuggestionPreview Preview()=>PokemonMetSuggestionSession.Preview(bytes,JsonSerializer.Serialize(request,MetSuggestionJson.Default.MetSuggestionEnvelope));
        string Confirm(MetSuggestionPreview value)=>JsonSerializer.Serialize(request with{MetSuggestion=null,MetSuggestionConfirmation=new(value.Token!,value.SourceHash,value.TargetHash!)},MetSuggestionJson.Default.MetSuggestionEnvelope);
        var first=Preview();Check(first.Available,"Lifecycle fixture has a real proposal");var replacement=Preview();Reject(()=>PokemonMetSuggestionSession.Commit(bytes,Confirm(first)));Reject(()=>PokemonMetSuggestionSession.Commit(bytes,Confirm(replacement)));
        var discarded=Preview();PokemonMetSuggestionSession.Discard(discarded.Token!);Reject(()=>PokemonMetSuggestionSession.Commit(bytes,Confirm(discarded)));
        var settings=Preview();Mode(true);Reject(()=>PokemonMetSuggestionSession.Commit(bytes,Confirm(settings)));Mode(false);
        var failed=Preview();Reject(()=>PokemonMetSuggestionSession.Preview(bytes,"{}"));Reject(()=>PokemonMetSuggestionSession.Commit(bytes,Confirm(failed)));
        var stale=Preview();var changed=bytes.ToArray();changed[0]^=1;Reject(()=>PokemonMetSuggestionSession.Commit(changed,Confirm(stale)));
        var filename=Preview();Reject(()=>PokemonMetSuggestionSession.Commit(bytes,Confirm(filename).Replace("editor.pk3","renamed.pk3")));
        Reject(()=>PokemonMetSuggestionSession.Preview(bytes,"{\"fileName\":\"a.pk3\",\"fileName\":\"b.pk3\"}"));
        Reject(()=>PokemonMetSuggestionSession.Preview(bytes,"{\"fileName\":\"a.pk3\",\"unknown\":0}"));
        Console.WriteLine("PASS met lifecycle: stale/replaced/cancel/one-use/policy/failed preview and original file hash");
    }
    private static void CapturedDrafts()
    {
        var p=Seed(new PK3());var bytes=StandalonePokemon.Serialize(p,true,false);
        using var edit=JsonDocument.Parse("{\"nickname\":\"DRAFT\"}");
        var capture=new PokemonDraftCapture("draft",[new("basic",[new("basic",edit.RootElement.Clone(),["nickname"])])]);
        var request=new MetSuggestionEnvelope("draft.pk3",false,true,new(Br4Editing.Hash(bytes),capture));
        MetSuggestionPreview Preview()=>PokemonMetSuggestionSession.Preview(bytes,JsonSerializer.Serialize(request,MetSuggestionJson.Default.MetSuggestionEnvelope));
        string Confirm(MetSuggestionPreview value)=>JsonSerializer.Serialize(request with{MetSuggestion=null,MetSuggestionConfirmation=new(value.Token!,value.SourceHash,value.TargetHash!)},MetSuggestionJson.Default.MetSuggestionEnvelope);
        var ticket=Preview();Check(ticket.Available,"Draft fixture has a proposal");
        var output=PokemonMetSuggestionSession.Commit(bytes,Confirm(ticket));var reopened=StandalonePokemon.Open(output,"draft.pk3",useFileFormat:true).Entity;
        Check(reopened.Nickname=="DRAFT"&&p.Nickname=="TEST","Frozen suggestion includes captured drafts without modifying source");
        var save=SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!;
        PokemonEditorContext.Bind(save,new(0,0));var bound=Preview();PokemonEditorContext.Bind(save,new(0,1));Reject(()=>PokemonMetSuggestionSession.Commit(bytes,Confirm(bound)));
        PokemonEditorContext.Clear();Console.WriteLine("PASS met captured draft and bound source invalidation");
    }
}

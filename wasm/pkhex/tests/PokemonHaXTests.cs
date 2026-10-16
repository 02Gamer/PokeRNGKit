// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonHaXTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Normal mode accepted a HaX-only operation.");}
    private static void Mode(bool value){SaveProgramSettingsRuntime.Reset();var settings=SaveProgramSettingsCodec.Defaults();settings.Startup.ForceHaXOnLaunch=value;SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));}
    private static PKM[] Entities()=>[new PK1(),new PK2(),new SK2(),new PK3{Version=GameVersion.E},new CK3{Version=GameVersion.CXD},new XK3{Version=GameVersion.CXD},new PK4{Version=GameVersion.D},new BK4{Version=GameVersion.D},new RK4{Version=GameVersion.D},new PK5{Version=GameVersion.B},new PK6{Version=GameVersion.X},new PK7{Version=GameVersion.SN},new PB7{Version=GameVersion.GP},new PK8{Version=GameVersion.SW},new PB8{Version=GameVersion.BD},new PA8{Version=GameVersion.PLA},new PK9{Version=GameVersion.SL},new PA9{Version=GameVersion.ZA}];
    private static PokemonEdit Basic(PKM p)=>new(0,0,p.Nickname,20,p.CurrentFriendship,p.OriginalTrainerName,p.TID16,p.SID16,[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0],[0,0,0,0]);
    internal static void Run()
    {
        PokemonEditorContext.Clear();
        try
        {
            foreach(var p in Entities())
            {
                Mode(true);p.Language=2;p.Nickname="TEST";p.OriginalTrainerName="OWNER";p.CurrentLevel=20;p.Species=0;p.RefreshChecksum();
                byte[] before=p.Data.ToArray(),bytes=PokemonEditorMode.Snapshot(p);
                var reopened=StandalonePokemon.Open(bytes,"buffer."+p.Extension,useFileFormat:true).Entity;
                Check(reopened.Species==0,"Declared empty record survives snapshot");
                Check(before.SequenceEqual(p.Data.ToArray()),"Viewing does not mutate source entity");
                var report=StandalonePokemon.Inspect(bytes,"buffer."+p.Extension,useFileFormat:true);
                Check(report.Pokemon.HaX&&report.Pokemon.Species==0&&report.AttributeChoices.Species[0].Id==0,"HaX blank metadata and zero species choice");
                if(p is not GBPKM)
                {
                    var edit=Basic(reopened) with{Identity=new(25,0,PokemonIdentity.Genders(reopened,25,0)[0],false)};
                    var request=new StandalonePokemonRequest("buffer."+p.Extension,UseFileFormat:true,Edit:edit);
                    var output=StandalonePokemon.Edit(bytes,request.FileName,edit,useFileFormat:true);
                    Check(StandalonePokemon.Open(output,"buffer."+p.Extension,useFileFormat:true).Entity.Species==25,"Create from blank through public basic edit");
                }
                else
                {
                    var request=new StandalonePokemonRequest("buffer."+p.Extension,UseFileFormat:true,Gb:new(25,reopened.Nickname,reopened.OriginalTrainerName,reopened.TID16,20,[0,0,0,0],[0,0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]));
                    var output=Program.EditStandalonePokemonGb(bytes,JsonSerializer.Serialize(request,StandalonePokemonJson.Default.StandalonePokemonRequest));
                    Check(StandalonePokemon.Open(output,"buffer."+p.Extension,useFileFormat:true).Entity.Species==25,"GB public create from blank");
                }
                if(p is ISanityChecksum sum)
                {
                    sum.Checksum^=0x55;ushort damaged=sum.Checksum;var raw=PokemonEditorMode.Snapshot(p);
                    Check(sum.Checksum==damaged,"Snapshot must not repair source checksum");
                    var bad=StandalonePokemon.Open(raw,"buffer."+p.Extension,useFileFormat:true).Entity;
                    Check(bad is ISanityChecksum result&&result.Checksum==damaged,"HaX declared read preserves bad checksum");
                }
                Mode(false);Reject(()=>PokemonDraftPreparing.Prepare(new SAV3E(),new PK3(),new(0,0),new("none",[])));
                Check(!PokemonEditorMode.Readable(p),"Normal mode does not accept empty source");
                Console.WriteLine("PASS HaX empty "+p.GetType().Name+": snapshot, metadata, create and source protection");
            }
            Mode(true);
            var advanced=new PK4{Species=25,Version=GameVersion.D,Language=2,Nickname="TEST",OriginalTrainerName="OWNER",Ability=5};advanced.CurrentLevel=20;advanced.RefreshChecksum();
            uint pid=advanced.PID;PokemonIdentity.Apply(advanced,new(25,31,advanced.Gender,false),-1);
            Check(advanced.Form==31&&advanced.PID==pid&&advanced.Ability==5,"HaX raw form preserves PID and manual ability");
            Reject(()=>PokemonIdentity.Apply(advanced,new(25,255,advanced.Gender,false),-1));
            var exp=new PK3{Species=25,Version=GameVersion.E};exp.CurrentLevel=20;exp.RefreshChecksum();PokemonVitals.Apply(exp,new("experience",Experience:9999999),true);
            Check(exp.EXP==9999999,"HaX keeps seven-digit over-level experience");
            Mode(false);PokemonVitals.Apply(exp,new("experience",Experience:9999999),true);Check(exp.EXP==Experience.GetEXP(100,exp.PersonalInfo.EXPGrowth),"Normal EXP remains capped");Mode(true);
            var evs=new PK6{Species=25,Version=GameVersion.X,Language=2,Nickname="TEST",OriginalTrainerName="OWNER"};evs.CurrentLevel=20;evs.RefreshChecksum();
            var high=Basic(evs) with{Evs=[200,200,200,0,0,0]};PokemonEditing.Apply(evs,high,true,id=>PokemonIdentity.Apply(evs,id,-1));Check(evs.EV_HP==200&&evs.EV_ATK==200&&evs.EV_DEF==200,"HaX per-field EV bounds retain over-total values");
            Mode(false);Reject(()=>PokemonEditing.Apply(evs,high,true,id=>PokemonIdentity.Apply(evs,id,-1)));Mode(true);
            var cases=new List<string>{"E","D","B","X","SN","GP","BD"};
            if(Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH") is {} real)cases.Add(real);
            foreach(string name in cases)
            {
                byte[] input=File.ReadAllBytes(name.EndsWith(".sav",StringComparison.OrdinalIgnoreCase)?name:".tmp/pkhex-fixtures/"+name+".sav"),before=input.ToArray();var save=SaveService.OpenDatabaseSave(input);
                int slot=Enumerable.Range(0,save.BoxSlotCount).First(s=>save.GetBoxSlotAtIndex(0,s).Species==0&&!save.IsBoxSlotLocked(0,s));var source=new PokemonPosition(0,slot);
                string position=JsonSerializer.Serialize(source,SaveJsonContext.Default.PokemonPosition);
                var file=JsonSerializer.Deserialize(Program.ReadPokemonEditorFile(input,position),SaveJsonContext.Default.PokemonFile)!;
                var capture=new PokemonDraftCapture("blank",[]);var request=new PokemonSetRequest(Br4Editing.Hash(input),"blank",source,source,capture,file);
                var ticket=PokemonSetSession.Prepare(input,request);Check(ticket.Clear&&ticket.Pokemon.Species==0,"Empty placement explicitly previews clearing");
                var output=PokemonSetSession.Commit(input,new(ticket.Token,ticket.SourceHash,ticket.TargetHash,true));
                Check(SaveChecksums.Valid(SaveService.OpenPreparedOutput(output))&&input.SequenceEqual(before),"Clearing export and caller immutability");
                if(save.HasParty&&save.PartyCount>0)
                {
                    var party=PokemonSetSession.Prepare(input,request with{Target=new(-1,0)});
                    var cleared=PokemonSetSession.Commit(input,new(party.Token,party.SourceHash,party.TargetHash,true));
                    Check(SaveService.OpenPreparedOutput(cleared).PartyCount==save.PartyCount-1&&party.Clear,"Blank Set deletes party member and supports the final slot");
                    var tail=new PokemonPosition(-1,5);
                    if(save.PartyCount<6)
                    {
                        var tailFile=Program.ReadPokemonEditorFile(input,JsonSerializer.Serialize(tail,SaveJsonContext.Default.PokemonPosition));
                        Check(tailFile.Length>0,"HaX can view an empty logical party tail");
                        var copy=save.Clone();StorageEditing.Apply(copy,new("delete",tail,null));
                        Check(copy.PartyCount==save.PartyCount,"Deleting an empty party tail is a no-op");
                    }
                }
                Mode(false);Reject(()=>Program.ReadPokemonEditorFile(input,position));Mode(true);
                Console.WriteLine("PASS HaX public blank "+name+": read, prepare, frozen clear, normal guard and original");
            }
        }
        finally{PokemonEditorContext.Clear();SaveProgramSettingsRuntime.Reset();}
    }
}

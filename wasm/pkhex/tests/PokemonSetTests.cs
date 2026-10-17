// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Text.Json.Nodes;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonSetTests
{
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid prepared set accepted");}
    private static PKM Seed(PKM p)
    {
        p.Species=25;p.Language=p.Japanese?1:2;p.Nickname=p.Japanese?"ピカチュウ":"TEST";p.OriginalTrainerName=p.Japanese?"サトシ":"OWNER";p.Version=p.Context.GetSingleGameVersion();p.CurrentLevel=25;p.Move1=85;p.Move1_PP=3;p.TID16=12345;p.SID16=54321;
        // Avoid Core's randomized first-trade memory in the byte-for-byte oracle.
        // Separate coverage below checks that a randomized preview is frozen.
        if(p is PK6 memory)memory.HandlingTrainerMemory=1;
        p.ResetPartyStats();p.Stat_HPCurrent=Math.Max(1,p.Stat_HPMax/2);p.Status_Condition=8;p.RefreshChecksum();return p;
    }
    private static JsonElement Edit<T>(T value,System.Text.Json.Serialization.Metadata.JsonTypeInfo<T> info)
    {var node=JsonNode.Parse(JsonSerializer.Serialize(value,info))!.AsObject();node.Remove("box");node.Remove("slot");return JsonSerializer.SerializeToElement(node);}
    private static PokemonEdit Basic(PKM p)=>new(0,0,p.Nickname,p.CurrentLevel,p.CurrentFriendship,p.OriginalTrainerName,p.TID16,p.SID16,[p.IV_HP,p.IV_ATK,p.IV_DEF,p.IV_SPA,p.IV_SPD,p.IV_SPE],[p.EV_HP,p.EV_ATK,p.EV_DEF,p.EV_SPA,p.EV_SPD,p.EV_SPE],[p.Move1,p.Move2,p.Move3,p.Move4],[p.Move1_PP,p.Move2_PP,p.Move3_PP,p.Move4_PP]);
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","B","X","SN","GP","BD"})
        {
            var seed=SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/"+fixture+".sav"))!;var entity=Seed(seed.BlankPKM);
            // Separate the clock-dependent first LGPE trade from independent oracles.
            if(entity is PB7 priorHandler)priorHandler.HandlingTrainerName=seed.OT;
            entity.RefreshChecksum();seed.SetBoxSlotAtIndex(entity,0,0,EntityImportSettings.None);
            if(seed.HasParty&&seed is not SAV7b)seed.SetPartySlotAtIndex(entity,0,EntityImportSettings.None);
            byte[] input=seed.Write().ToArray(),before=input.ToArray();var save=SaveUtil.GetSaveFile(input.ToArray())!;var p=save.GetBoxSlotAtIndex(0,0);var mask=new PokemonDraftStep("basic",Edit(Basic(p) with{Nickname="DRAFT",Ot="OLD",Level=1},PokemonSetJson.Default.PokemonEdit),["nickname"]);
            var capture=new PokemonDraftCapture("scope",[new("basic",[mask])]);var request=new PokemonSetRequest(Br4Editing.Hash(input),"scope",new(0,0),new(0,1),capture);
            var ticket=PokemonSetSession.Prepare(input,request);Check(input.AsSpan().SequenceEqual(before),"Preparing never changes caller input");Check(ticket.Pokemon.Nickname=="DRAFT"&&ticket.Pokemon.Level==p.CurrentLevel&&ticket.Pokemon.Ot==p.OriginalTrainerName,"Mask rebases untouched fields");
            var output=PokemonSetSession.Commit(input,new(ticket.Token,ticket.SourceHash,ticket.TargetHash,true));var actual=SaveUtil.GetSaveFile(output.ToArray())!;
            var expected=save.Clone();var wanted=p.Clone();PokemonEditing.Apply(wanted,Basic(p) with{Nickname="DRAFT"},false,i=>PokemonIdentity.Apply(expected,wanted,i,0));expected.SetBoxSlotAtIndex(wanted,0,1);
            byte[] expectedBytes=expected.Write().ToArray();
            if(!output.SequenceEqual(expectedBytes))
            {
                File.WriteAllBytes(".tmp/pkhex-set-actual-"+fixture+".sav",output);File.WriteAllBytes(".tmp/pkhex-set-expected-"+fixture+".sav",expectedBytes);
                Console.WriteLine("Prepared output differences "+fixture+": "+string.Join(",",Enumerable.Range(0,output.Length).Where(i=>output[i]!=expectedBytes[i]).Take(24).Select(i=>i.ToString("X"))));
            }
            Check(output.SequenceEqual(expectedBytes),"Default slot-import full-file oracle "+fixture);
            Check(StorageEditing.StoredData(actual,new(0,0)).SequenceEqual(StorageEditing.StoredData(save,new(0,0))),"Source slot is untouched");
            Reject(()=>PokemonSetSession.Commit(input,new(ticket.Token,ticket.SourceHash,ticket.TargetHash,true)));
            var next=PokemonSetSession.Prepare(input,request);var changed=input.ToArray();changed[0]^=1;Reject(()=>PokemonSetSession.Commit(changed,new(next.Token,next.SourceHash,next.TargetHash,true)));
            PokemonSetSession.Discard(next.Token);Reject(()=>PokemonSetSession.Commit(input,new(next.Token,next.SourceHash,next.TargetHash,true)));
            var noChange=new PokemonDraftCapture("scope",[]);var unchanged=PokemonSetSession.Prepare(input,request with{Capture=noChange,Target=new(0,0)});PokemonSetSession.Discard(unchanged.Token);
            Reject(()=>PokemonSetSession.Prepare(input,request with{SourceHash="wrong"}));Reject(()=>PokemonSetSession.Prepare(input,request with{Scope="wrong"}));
            var malformed=new PokemonDraftCapture("scope",[new("raw",[new("raw",Edit(new PokemonRawEdit(0,0,"rerollPid"),PokemonSetJson.Default.PokemonRawEdit))])]);Reject(()=>PokemonSetSession.Prepare(input,request with{Capture=malformed}));
            Check(input.AsSpan().SequenceEqual(before),"Source remains immutable after failures");Console.WriteLine("PASS prepared set "+fixture+": draft masks, default import/full file, source/input protection, same target, frozen/stale/cancel and rejected commands");
        }
        Drafts();FrozenTrade();Layouts();PartyAndWarnings();Real();
    }
    private static void Drafts()
    {
        var save=SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav"))!;var original=Seed(save.BlankPKM);var before=original.Data.ToArray();
        PokemonDraftStep Raw(PokemonRawEdit e)=>new("raw",Edit(e,PokemonSetJson.Default.PokemonRawEdit));
        PokemonDraftCapture Capture(params PokemonDraftStep[] steps)=>new("scope",[new("draft",steps)]);
        PKM Prepare(params PokemonDraftStep[] steps)=>PokemonDraftPreparing.Prepare(save,original,new(0,0),Capture(steps));
        var basic=new PokemonDraftStep("basic",Edit(Basic(original) with{Nickname="UPDATED",Friendship=100},PokemonSetJson.Default.PokemonEdit),["nickname","friendship"]);
        var history=Raw(new(0,0,"history",History:new(Handler:0)));
        var care=Raw(new(0,0,"care",Care:new([new("originalFriendship",100)])));
        var a=Prepare(basic,care,history);var b=Prepare(history,care,basic);
        Check(a.Data.SequenceEqual(b.Data)&&a.Nickname=="UPDATED"&&a.OriginalTrainerFriendship==100,"Preparation order follows dependencies, not UI mounting order");
        Reject(()=>Prepare(history,Raw(new(0,0,"trainerDetails",TrainerDetails:new(Handler:1)))));
        var language=Raw(new(0,0,"trainerDetails",TrainerDetails:new(Language:1)));
        var named=new PokemonDraftStep("basic",Edit(Basic(original) with{Ot="NEW"},PokemonSetJson.Default.PokemonEdit),["ot"]);
        var translated=Prepare(named,language);var oracle=original.Clone();PokemonTrainerDetails.Apply(oracle,new(Language:1),save);
        Check(translated.Language==1&&translated.Nickname==oracle.Nickname&&translated.OriginalTrainerName=="NEW","Language precedes masked names without stale nickname overwrite");
        Reject(()=>Prepare(basic,Raw(new(0,0,"care",Care:new([new("originalFriendship",101)])))));
        var level=new PokemonDraftStep("basic",Edit(Basic(original) with{Level=30},PokemonSetJson.Default.PokemonEdit),["level"]);
        uint exp=Experience.GetEXP(30,original.PersonalInfo.EXPGrowth)+1;
        var vitals=new PokemonDraftStep("vitals",Edits:[new("experience",Experience:exp)]);
        Check(Prepare(vitals,level).EXP==exp,"Matching level and experience retain precise experience");
        Reject(()=>Prepare(level,new("vitals",Edits:[new("experience",Experience:0)])));
        Reject(()=>Prepare(new PokemonDraftStep("basic",basic.Edit,["nickname","nickname"])));
        Reject(()=>Prepare(Raw(new(0,0,"care",Care:new([new("originalFriendship",100)]),Pid:1))));
        Reject(()=>Prepare(new PokemonDraftStep("vitals",Edits:[new("wheel",Width:100,Direction:1)])));
        Reject(()=>PokemonDraftPreparing.Prepare(save,original,new(0,0),new("scope",[null!])));
        Reject(()=>PokemonDraftPreparing.Prepare(save,original,new(0,0),new("scope",[new("same",[basic]),new("same",[basic])])));
        Check(original.Data.SequenceEqual(before),"Preparation and rejected conflicts never mutate editor buffer");
        var request=new PokemonSetRequest("hash","scope",new(0,0),new(0,1),Capture(basic));
        string json=JsonSerializer.Serialize(request,PokemonSetJson.Default.PokemonSetRequest);
        Check(PokemonSetSession.Decode(json).Capture.Sections.Length==1,"Strict source-generated request roundtrip");
        Reject(()=>PokemonSetSession.Decode(json.Replace("\"scope\":\"scope\"","\"scope\":\"scope\",\"scope\":\"scope\"")));
        Reject(()=>PokemonSetSession.Decode(json.Insert(1,"\"unexpected\":1,")));
        Console.WriteLine("PASS prepared drafts: dependency ordering, shared friendship, precise experience, duplicate/null/unknown/conflicting fields, command isolation and clone preservation");
    }
    private static void FrozenTrade()
    {
        var seed=SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav"))!;var p=(PK6)Seed(seed.BlankPKM);p.HandlingTrainerMemory=0;p.RefreshChecksum();seed.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);
        byte[] input=seed.Write().ToArray();var request=new PokemonSetRequest(Br4Editing.Hash(input),"scope",new(0,0),new(0,1),new("scope",[]));
        var ticket=PokemonSetSession.Prepare(input,request);var output=PokemonSetSession.Commit(input,new(ticket.Token,ticket.SourceHash,ticket.TargetHash,true));
        Check(Br4Editing.Hash(output)==ticket.TargetHash,"Confirmation returns exact frozen randomized-import bytes");
        var result=(PK6)SaveUtil.GetSaveFile(output)!.GetBoxSlotAtIndex(0,1);Check(result.HandlingTrainerMemory!=0,"Core default import creates trade memory");
        var next=PokemonSetSession.Prepare(input,request);Reject(()=>PokemonSetSession.Prepare(input,"{}"));Reject(()=>PokemonSetSession.Commit(input,new(next.Token,next.SourceHash,next.TargetHash,true)));
        var settings=SaveFile.SetUpdateSettings;try{var pending=PokemonSetSession.Prepare(input,request);SaveFile.SetUpdatePKM=EntityImportOption.Disable;Reject(()=>PokemonSetSession.Commit(input,new(pending.Token,pending.SourceHash,pending.TargetHash,true)));}finally{SaveFile.SetUpdatePKM=settings.UpdateToSaveFile;}
        var letsGo=SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/GP.sav"))!;var timed=Seed(letsGo.BlankPKM);timed.HandlingTrainerName="DIFFERENT";timed.RefreshChecksum();letsGo.SetBoxSlotAtIndex(timed,0,0,EntityImportSettings.None);
        byte[] timedInput=letsGo.Write().ToArray();var timedRequest=new PokemonSetRequest(Br4Editing.Hash(timedInput),"time",new(0,0),new(0,1),new("time",[]));var timedTicket=PokemonSetSession.Prepare(timedInput,timedRequest);
        var timedOutput=PokemonSetSession.Commit(timedInput,new(timedTicket.Token,timedTicket.SourceHash,timedTicket.TargetHash,true));Check(Br4Editing.Hash(timedOutput)==timedTicket.TargetHash,"LGPE receiving date/time is prepared only once");
        Console.WriteLine("PASS prepared confirmation: random trade memory frozen once, malformed preview invalidates old ticket and import-policy changes reject confirmation");
    }
    private static void Layouts()
    {
        var cases=new List<(SaveFile Save,Func<byte[],SaveFile> Reopen)>();
        foreach(var language in new[]{LanguageID.English,LanguageID.Japanese})
        {
            cases.Add((new SAV1(language,GameVersion.RB),data=>new SAV1(data,language,GameVersion.RB)));
            cases.Add((new SAV2(language,GameVersion.C),data=>new SAV2(data,language,GameVersion.C)));
        }
        cases.Add((new SAV1StadiumJ(new byte[SaveUtil.SIZE_G1STAD]),data=>new SAV1StadiumJ(data)));
        cases.Add((new SAV3Colosseum(new byte[SaveUtil.SIZE_G3COLO],false),data=>new SAV3Colosseum(data)));
        byte[] xdRaw=new byte[XDCrypto.SAVE_SIZE];var xdSlot=XDCrypto.GetSlot(xdRaw,0).Span;int[] offsets=[0,0xCC30,0x10D60,0,0x1C9C0,0xF5D0,0,0x1CAA0];
        for(int i=0;i<offsets.Length;i++){System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(xdSlot[(0x40+i*4)..],(ushort)offsets[i]);System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(xdSlot[(0x42+i*4)..],(ushort)(offsets[i]>>16));}
        System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(xdSlot[0x2A..],4);XDCrypto.EncryptSlot(xdSlot);cases.Add((new SAV3XD(xdRaw),data=>new SAV3XD(data)));
        byte[] boxRaw=new byte[SaveUtil.SIZE_G3BOX];for(int i=0;i<46;i++)System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(boxRaw.AsSpan((i+1)*0x2000+4),(uint)(i%23));cases.Add((new SAV3RSBox(boxRaw),data=>new SAV3RSBox(data)));
        foreach(int profile in Enumerable.Range(0,4))
        {
            SaveFile OpenBr(byte[] data){var s=new SAV4BR(data);s.CurrentSlot=profile;return s;}
            cases.Add((OpenBr(Br4EditingTests.Fixture(false,0)),OpenBr));
        }
        foreach(bool jp in new[]{false,true})
        {
            cases.Add((new SAV1Stadium(new byte[SaveUtil.SIZE_G1STAD],jp),data=>new SAV1Stadium(data,jp)));
            cases.Add((new SAV2Stadium(new byte[SaveUtil.SIZE_G2STAD],jp),data=>new SAV2Stadium(data,jp)));
        }
        foreach(bool platinum in new[]{false,true})
        {
            byte[] data=new byte[platinum?SaveUtil.SIZE_G4RANCH_PLAT:SaveUtil.SIZE_G4RANCH];
            foreach(var (offset,value) in new[]{(0x24,0x100),(0x2C,0x200),(0x34,0x300),(0x3C,0x308)})System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(data.AsSpan(offset),value);
            cases.Add((new SAV4Ranch(data),bytes=>new SAV4Ranch(bytes)));
        }
        cases.Add((new SAV8SWSH(SwshBlockFixtureTests.Create(GameVersion.SW,2)),data=>new SAV8SWSH(data)));
        cases.Add((new SAV8LA(LegendsPokedexTests.Fixture(0)),data=>new SAV8LA(data)));
        cases.Add((new SAV8LA(LegendsPokedexTests.Fixture(1)),data=>new SAV8LA(data)));
        cases.Add((new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL,2)),data=>new SAV9SV(data)));
        cases.Add((new SAV9ZA(ZaBlockFixtureTests.Create(2)),data=>new SAV9ZA(data)));
        foreach(var (seed,reopen) in cases)
        {
            var entity=Seed(seed.BlankPKM);if(entity is RK4 ranch){ranch.Version=GameVersion.D;ranch.Data[0x88..].Fill(0xA7);ranch.OwnershipType=RanchOwnershipType.Trainer;ranch.RefreshChecksum();}
            // SV's Kitakami registration chooses display gender on every import.
            // A genderless species makes independent full-file oracles deterministic.
            if(seed is SAV9SV or SAV9ZA){entity.Species=81;entity.Gender=2;entity.RefreshChecksum();}
            PokemonSlotWriter.Box(seed,entity,0,0);byte[] input=seed.Write().ToArray(),before=input.ToArray();var save=reopen(input.ToArray());
            var original=save.GetBoxSlotAtIndex(0,0);PokemonDraftCapture capture=new("layout",[]);GbPokemonEdit? gbEdit=null;
            if(original is GBPKM gb)
            {
                gbEdit=new(gb.Species,gb.Japanese?"テスト":"EDIT",gb.OriginalTrainerName,gb.TID16,gb.CurrentLevel,[gb.IV_ATK,gb.IV_DEF,gb.IV_SPE,gb.IV_SPC],[gb.EV_HP,gb.EV_ATK,gb.EV_DEF,gb.EV_SPE,gb.EV_SPC],[gb.Move1,gb.Move2,gb.Move3,gb.Move4],[gb.Move1_PP,gb.Move2_PP,gb.Move3_PP,gb.Move4_PP],[gb.Move1_PPUps,gb.Move2_PPUps,gb.Move3_PPUps,gb.Move4_PPUps]);
                capture=new("layout",[new("gb",[new("gb",Edit(gbEdit,PokemonSetJson.Default.GbPokemonEdit),["nickname"])])]);
            }
            var request=new PokemonSetRequest(Br4Editing.Hash(input),"layout",new(0,0),new(0,1),capture);
            PokemonEditorContextTests.Typed(save,original,input);
            var ticket=PokemonSetSession.Prepare(save,input,request,reopen);var output=PokemonSetSession.Commit(input,new(ticket.Token,ticket.SourceHash,ticket.TargetHash,true));
            var expected=reopen(input.ToArray());var wanted=original.Clone();if(gbEdit is not null)StandaloneGb.Apply((GBPKM)wanted,gbEdit);wanted.FixMoves();wanted.RefreshChecksum();PokemonSlotWriter.Box(expected,wanted,0,1,default(EntityImportSettings));
            Check(output.SequenceEqual(expected.Write().ToArray()),"Complete typed layout default-import oracle "+save.GetType().Name);
            var serialized=StandalonePokemon.Open(Convert.FromBase64String(ticket.EditorFile.Data),ticket.EditorFile.FileName,useFileFormat:true).Entity;
            Check(serialized.GetType()==original.GetType()&&serialized.Species==original.Species,"Prepared editor buffer roundtrip "+save.GetType().Name);
            Check(ticket.Pokemon.Box==0&&ticket.Pokemon.Slot==1&&ticket.Pokemon.Nickname==wanted.Nickname,"Preview describes actual target after default import");
            var repeated=PokemonSetSession.Prepare(reopen(input.ToArray()),input,request with{EditorFile=ticket.EditorFile},reopen);PokemonSetSession.Discard(repeated.Token);
            Check(StorageEditing.StoredData(save,new(0,0)).SequenceEqual(StorageEditing.StoredData(reopen(output),new(0,0)))&&input.SequenceEqual(before),"Typed layout source/input protected");
            Console.WriteLine("PASS prepared layout "+save.GetType().Name+"/"+input.Length+": full file, default import, editor-buffer reuse, exact slot names/metadata, immutable source; synthetic typed fixture");
        }
        foreach(var (seed,reopen) in cases.Where(v=>v.Save is SAV9SV or SAV9ZA))
        {
            var p=Seed(seed.BlankPKM);PokemonSlotWriter.Box(seed,p,0,0);byte[] input=seed.Write().ToArray();var request=new PokemonSetRequest(Br4Editing.Hash(input),"random-dex",new(0,0),new(0,1),new("random-dex",[]));
            var ticket=PokemonSetSession.Prepare(reopen(input.ToArray()),input,request,reopen);var output=PokemonSetSession.Commit(input,new(ticket.Token,ticket.SourceHash,ticket.TargetHash,true));Check(Br4Editing.Hash(output)==ticket.TargetHash,"Random dex display is frozen exactly once");
        }
    }
    private static void PartyAndWarnings()
    {
        var seed=SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!;var entity=Seed(seed.BlankPKM);seed.PartyData=[entity];seed.SetBoxSlotAtIndex(entity,0,0,EntityImportSettings.None);
        byte[] input=seed.Write().ToArray();var request=new PokemonSetRequest(Br4Editing.Hash(input),"party",new(0,0),new(-1,5),new("party",[]));
        var ticket=PokemonSetSession.Prepare(input,request);Check(ticket.Target==new PokemonPosition(-1,1)&&!ticket.Overwrite,"Empty party position normalizes to append");
        var output=PokemonSetSession.Commit(input,new(ticket.Token,ticket.SourceHash,ticket.TargetHash,true));Check(SaveUtil.GetSaveFile(output)!.PartyCount==2,"Prepared party append readback");
        var egg=entity.Clone();egg.IsEgg=true;egg.RefreshChecksum();var eggFile=new PokemonFile("egg."+egg.Extension,Convert.ToBase64String(StandalonePokemon.Serialize(egg,true,false)));
        Reject(()=>PokemonSetSession.Prepare(input,request with{Target=new(-1,0),EditorFile=eggFile}));
        var warned=entity.Clone();warned.Move1=999;warned.RefreshChecksum();var file=new PokemonFile("warned."+warned.Extension,Convert.ToBase64String(StandalonePokemon.Serialize(warned,true,false)));
        var warning=PokemonSetSession.Prepare(input,request with{Target=new(0,1),EditorFile=file});Check(warning.Compatibility.Length>0&&warning.Compatibility.All(v=>v.Zh.Length>0&&v.En.Length>0&&v.Ja.Length>0),"Compatibility report includes all three languages");
        Reject(()=>PokemonSetSession.Commit(input,new(warning.Token,warning.SourceHash,warning.TargetHash,false)));
        var approved=PokemonSetSession.Commit(input,new(warning.Token,warning.SourceHash,warning.TargetHash,true));Check(Br4Editing.Hash(approved)==warning.TargetHash,"Explicit compatibility confirmation retains frozen output");
        Console.WriteLine("PASS prepared target: normalized party append, last non-egg protection, three-language compatibility and explicit warning confirmation");
    }
    private static void Real()
    {
        string? path=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");if(string.IsNullOrEmpty(path))return;
        byte[] input=File.ReadAllBytes(path),before=input.ToArray();var save=SaveService.OpenDatabaseSave(input);Check(save is SAV3E,"Confirmed real save is Emerald");
        var source=PokemonReader.Read(save).First(p=>p.Box>=0);var p=PokemonEditing.Read(save,source.Box,source.Slot);
        var edit=new PokemonDraftStep("basic",Edit(Basic(p) with{Nickname="CHECK"},PokemonSetJson.Default.PokemonEdit),["nickname"]);
        int empty=Enumerable.Range(0,save.BoxSlotCount).First(i=>save.GetBoxSlotAtIndex(0,i).Species==0);
        var request=new PokemonSetRequest(Br4Editing.Hash(input),"real",new(source.Box,source.Slot),new(0,empty),new("real",[new("basic",[edit])]));
        var ticket=PokemonSetSession.Prepare(input,request);var output=PokemonSetSession.Commit(input,new(ticket.Token,ticket.SourceHash,ticket.TargetHash,true));var result=SaveService.OpenPreparedOutput(output);
        Check(result.GetBoxSlotAtIndex(0,empty).Nickname=="CHECK"&&SaveChecksums.Valid(result),"Real Emerald prepared target reads back with valid checksums");
        Check(StorageEditing.StoredData(save,request.Source).SequenceEqual(StorageEditing.StoredData(result,request.Source)),"Real source slot remains untouched");
        Check(input.SequenceEqual(before)&&File.ReadAllBytes(path).SequenceEqual(before),"Real work-copy file remains unchanged");
        Console.WriteLine("PASS real Emerald prepared set: read, cloned nickname draft, empty target, exact frozen export/reopen, source slot and work-copy file preservation");
    }
}

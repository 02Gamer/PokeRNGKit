// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonIdentityToolsTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid identity edit accepted");}
    private static PKM Seed(PKM p)
    {
        p.Species=25;p.Language=2;p.Nickname="TEST";p.OriginalTrainerName="OWNER";p.Version=p.Context.GetSingleGameVersion();
        p.ID32=123456789;p.PID=12345;p.EncryptionConstant=54321;p.CurrentLevel=25;p.Move1=85;p.Move1_PP=3;
        p.ResetPartyStats();p.Stat_HPCurrent=Math.Max(1,p.Stat_HPMax/2);p.Status_Condition=8;p.RefreshChecksum();return p;
    }
    // Source TrainerIDManager saves SID before TID, with the desktop decimal-mask rules.
    private static void IdOracle(PKM p,string tid,string sid)
    {
        uint t=uint.TryParse(tid,NumberStyles.Integer,CultureInfo.InvariantCulture,out var tv)?tv:0;
        uint s=uint.TryParse(sid,NumberStyles.Integer,CultureInfo.InvariantCulture,out var sv)?sv:0;
        if(p.TrainerIDDisplayFormat==TrainerIDFormat.SixDigit)
        {
            s=Math.Min(s,4294);if(!p.IsValidTrainerID7(s,p.GetTrainerTID7()))s=4293;p.SetTrainerSID7(s);
            t=Math.Min(t,999999);if(t==999999&&p.IsValidTrainerID7(t,p.GetTrainerTID7()))t--;p.SetTrainerTID7(t);
        }
        else{p.SID16=(ushort)Math.Min(s,65535);p.TID16=(ushort)Math.Min(t,65535);}
    }
    private static void ExpertOracle(PKM p,PokemonExpertEdit edit)
    {
        if(edit.Ability is int a&&a!=p.Ability){p.Ability=a;if(p is PK5 fifth)fifth.HiddenAbility=fifth.PersonalInfo.HasHiddenAbility&&fifth.Ability==fifth.PersonalInfo.AbilityH;}
        if(edit.AbilityNumber is int n&&n!=p.AbilityNumber)p.AbilityNumber=n;
        if(edit.Offset is int o)p.Data[o]=(byte)Math.Min(255,edit.ByteValue!.Value);
    }
    internal static void Run()
    {
        SaveProgramSettingsRuntime.Reset();
        var settings=SaveProgramSettingsCodec.Defaults();settings.Startup.ForceHaXOnLaunch=true;
        SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
        try{RunAdvanced();}finally{SaveProgramSettingsRuntime.Reset();PokemonEditorContext.Clear();}
    }
    private static void RunAdvanced()
    {
        foreach(PKM p in new PKM[]{new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new RK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()})
        {
            Seed(p);var ids=PokemonTrainerIds.Read(p)!;bool modern=p.TrainerIDDisplayFormat==TrainerIDFormat.SixDigit;
            Check(ids.TidWidth==(modern?6:5)&&ids.SidWidth==(modern?4:5)&&ids.Tsv==p.GetTSV(p.Format),"Source display format/TSV");
            foreach(var pair in new[]{("",""),("  "," "),("1 2","1 2"),("99999","9999"),(modern?"999999":"65535",modern?"4294":"65535")})
            {
                var a=p.Clone();var e=p.Clone();IdOracle(e,pair.Item1,pair.Item2);PokemonTrainerIds.Apply(a,new(pair.Item1,pair.Item2));Check(a.Data.SequenceEqual(e.Data),"Whole entity trainer ID oracle");
            }
            foreach(var pair in new[]{("-1","0"),("0","0x1"),(new string('1',ids.TidWidth+1),"0")})Reject(()=>PokemonTrainerIds.Apply(p,new(pair.Item1,pair.Item2)));
            var catalog=PokemonIdentityTools.Read(p);
            Check(catalog.ExtraBytes.Select(b=>b.Offset).SequenceEqual(p.ExtraBytes.ToArray().Select(o=>(int)o)),"Exact source extra-byte allowlist");
            Check((catalog.AbilityNumber is not null)==(p.Format>=6),"Stored slot number capability");
            if(p.Format>=4)
            {
                var expected= new GameDataSource(GameInfo.GetStrings("en")).AbilityDataSource.Where(c=>c.Value<=p.MaxAbilityID).Select(c=>c.Value).ToArray();
                Check(catalog.Abilities.Select(c=>c.Id).Order().SequenceEqual(expected.Order()),"Source manual ability directory");
            }
            else Check(catalog.Abilities.Length==0,"Gen3 stores only its normal ability bit");
            var edits=new List<PokemonExpertEdit>();
            if(catalog.Abilities.Length>0)edits.Add(new(Ability:catalog.Abilities.Last().Id));
            if(catalog.AbilityNumber is not null)for(int n=0;n<=9;n++)edits.Add(new(AbilityNumber:n));
            foreach(var b in catalog.ExtraBytes)foreach(int value in new[]{0,255,999})
            {
                var a=p.Clone();var e=p.Clone();var edit=new PokemonExpertEdit(Offset:b.Offset,ByteValue:value);ExpertOracle(e,edit);PokemonIdentityTools.Apply(a,edit);Check(a.Data.SequenceEqual(e.Data),"All source offsets and byte cap preserve neighboring bytes");
            }
            if(catalog.ExtraBytes.Length>0)edits.Add(new(Offset:catalog.ExtraBytes[0].Offset,ByteValue:999));
            foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true})
            {
                var input=StandalonePokemon.Serialize(p,party,encrypted);var before=input.ToArray();var name="identity."+p.Extension;var opened=StandalonePokemon.Open(input,name,encrypted,true).Entity;
                var request=new StandalonePokemonRequest(name,InputEncrypted:encrypted,UseFileFormat:true);
                foreach(var edit in edits)
                {
                    var output=PokeRNGKit.SaveEditor.Program.EditStandalonePokemonRaw(input,JsonSerializer.Serialize(request with{Raw=new(0,0,"expert",Expert:edit)},StandalonePokemonJson.Default.StandalonePokemonRequest));
                    var e=opened.Clone();ExpertOracle(e,edit);if(e is PB7)PokemonEditing.RefreshDerived(e,opened,true);e.RefreshChecksum();
                    Check(output.AsSpan().SequenceEqual(StandalonePokemon.Serialize(e,input.Length==opened.SIZE_PARTY,false)),"Public complete file oracle "+p.GetType().Name);
                }
                var basic=new PokemonEdit(0,0,opened.Nickname,(byte)opened.CurrentLevel,opened.CurrentFriendship,opened.OriginalTrainerName,opened.TID16,opened.SID16,
                    [opened.IV_HP,opened.IV_ATK,opened.IV_DEF,opened.IV_SPA,opened.IV_SPD,opened.IV_SPE],
                    [opened.EV_HP,opened.EV_ATK,opened.EV_DEF,opened.EV_SPA,opened.EV_SPD,opened.EV_SPE],
                    [opened.Move1,opened.Move2,opened.Move3,opened.Move4],[opened.Move1_PP,opened.Move2_PP,opened.Move3_PP,opened.Move4_PP]);
                var unchanged=StandalonePokemon.Edit(input,name,basic,encrypted,true);Check(StandalonePokemon.Open(unchanged,name,useFileFormat:true).Entity.ID32==opened.ID32,"Unrelated basic edit preserves IDs");
                var changedId=StandalonePokemon.Edit(input,name,basic with{TrainerIds=new(modern?"999999":"99999",modern?"4294":"99999")},encrypted,true);
                var idExpected=opened.Clone();IdOracle(idExpected,modern?"999999":"99999",modern?"4294":"99999");
                Check(StandalonePokemon.Open(changedId,name,useFileFormat:true).Entity.ID32==idExpected.ID32,"Public basic edit verifies normalized source ID values");
                var read=PokeRNGKit.SaveEditor.Program.ReadStandalonePokemonAdvanced(input,JsonSerializer.Serialize(request with{ReadKind="expert"},StandalonePokemonJson.Default.StandalonePokemonRequest));
                using var doc=JsonDocument.Parse(read);Check(doc.RootElement.GetProperty("expert").GetProperty("ability").GetInt32()==opened.Ability,"Public advanced metadata");
                Check(input.AsSpan().SequenceEqual(before),"Original entity input remains unchanged");
            }
            var bytes=p.Data.ToArray();
            foreach(var edit in new[]{new PokemonExpertEdit(),new("invalid",Ability:1),new(Ability:-1),new(AbilityNumber:10),new(Offset:-1,ByteValue:1),new(ByteValue:1),new(Offset:0,ByteValue:1000),new("abilityFromNumber",Ability:1)})Reject(()=>PokemonIdentityTools.Apply(p,edit));
            Check(p.Data.SequenceEqual(bytes),"Rejected requests are atomic");
            if(p.Format>=6)
            {
                foreach(int n in new[]{1,2,4})
                {
                    var a=p.Clone();a.AbilityNumber=n;var personal=a.PersonalInfo;
                    int wanted=p is PA9?PersonalTable.ZA[new LegalityAnalysis(a).EncounterMatch.Species,new LegalityAnalysis(a).EncounterMatch.Form].GetAbilityAtIndex(n>>1):personal.GetAbilityAtIndex(n>>1);
                    PokemonIdentityTools.Apply(a,new("abilityFromNumber"));Check(a.Ability==wanted,"Source ability lookup including ZA encounter personal");
                }
            }
            Console.WriteLine("PASS identity/expert "+p.GetType().Name+": masks, source catalogs, all byte offsets, four layouts, complete public output and immutable input");
        }
        var restricted=Seed(new PK7());var limited=PokemonIdentityTools.Read(restricted,new SAV7SM().MaxAbilityID);
        Check(limited.Abilities.All(a=>a.Id<=new SAV7SM().MaxAbilityID),"Save-game ability limit is narrower than the entity format");
        Reject(()=>PokemonIdentityTools.Apply(restricted,new(Ability:new PK7().MaxAbilityID),new SAV7SM().MaxAbilityID));
        foreach(GameVersion version in new[]{GameVersion.E,GameVersion.D,GameVersion.SL,(GameVersion)0})
        {
            var p=Seed(new PK9());p.Version=version;var info=PokemonTrainerIds.Read(p)!;
            Check((info.TidWidth==6)==(version is GameVersion.SL or (GameVersion)0),"Transferred entity follows origin display format");
        }
        var wrap=Seed(new PK9());wrap.ID32=0;PokemonTrainerIds.Apply(wrap,new("999999","4294"));Check(wrap.ID32==32703,"Source SID-first uint wrap is preserved");
        Check(PokemonTrainerIds.Read(new PK2())is null,"GB uses existing adapter");
        foreach(int box in new[]{-1,0})
        {
            var original=SaveUtil.GetSaveFile(File.ReadAllBytes(Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH") ?? ".tmp/pkhex-fixtures/E.sav"))!;
            if(Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH") is null){var seeded=Seed(original.BlankPKM);original.SetBoxSlotAtIndex(seeded,0,0,EntityImportSettings.None);original.PartyData=[seeded];}
            var input=original.Write().ToArray();var before=input.ToArray();
            var p=PokemonEditing.Read(original,box,0);var field=PokemonIdentityTools.Read(p).ExtraBytes.FirstOrDefault();if(field is null)continue;
            var edit=new PokemonExpertEdit(Offset:field.Offset,ByteValue:999);var output=SaveService.EditPokemonRaw(input,JsonSerializer.Serialize(new PokemonRawEdit(box,0,"expert",Expert:edit),SaveJsonContext.Default.PokemonRawEdit));
            var e=SaveUtil.GetSaveFile(input.ToArray())!;var entity=PokemonEditing.Read(e,box,0);ExpertOracle(entity,edit);entity.RefreshChecksum();if(box==-1)e.SetPartySlotAtIndex(entity,0,EntityImportSettings.None);else e.SetBoxSlotAtIndex(entity,box,0,EntityImportSettings.None);
            Check(output.AsSpan().SequenceEqual(e.Write().Span),"Real save working-copy complete-file oracle");Check(input.AsSpan().SequenceEqual(before),"Real save source bytes untouched");
        }
    }
}

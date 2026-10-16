// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonVitalsTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid vital edit accepted");}
    private static void SetSettings(SaveProgramSettings settings){SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));}
    private static PKM[] Entities()=>[new PK1(),new PK2(),new SK2(),new PK3{Version=GameVersion.E},new CK3{Version=GameVersion.CXD},new XK3{Version=GameVersion.CXD},new PK4{Version=GameVersion.D},new BK4{Version=GameVersion.D},new RK4{Version=GameVersion.D},new PK5{Version=GameVersion.B},new PK6{Version=GameVersion.X},new PK7{Version=GameVersion.SN},new PB7{Version=GameVersion.GP},new PK8{Version=GameVersion.SW},new PB8{Version=GameVersion.BD},new PA8{Version=GameVersion.PLA},new PK9{Version=GameVersion.SL},new PA9{Version=GameVersion.ZA}];
    private static PKM Seed(PKM p)
    {
        p.Species=25;p.Language=2;p.Nickname="TEST";p.OriginalTrainerName="OWNER";p.CurrentLevel=20;p.SetIVs(new[]{7,12,9,3,8,8});p.Move1=1;p.Move1_PP=30;p.ResetPartyStats();p.Stat_HPCurrent=Math.Max(1,p.Stat_HPMax-3);p.Status_Condition=p.Format<=4?8:5;
        if(p is RK4 ranch){ranch.Data[0x88..].Fill(0xA7);ranch.OwnershipType=RanchOwnershipType.Trainer;}
        p.Status_Condition|=0x12340000;p.RefreshChecksum();return p;
    }
    private static byte[] Bytes(PKM p,bool party)=>StandalonePokemon.Serialize(p,party,false);
    private static byte[] Edit(byte[] input,PKM p,PokemonVitalsEdit edit)
    {
        var request=p is GBPKM?new StandalonePokemonRequest("entity."+p.Extension,UseFileFormat:true,GbSpecial:new("vitals",Vitals:edit)):
            new StandalonePokemonRequest("entity."+p.Extension,UseFileFormat:true,Raw:new(0,0,"vitals",Vitals:edit));
        string json=JsonSerializer.Serialize(request,StandalonePokemonJson.Default.StandalonePokemonRequest);
        return p is GBPKM?Program.EditStandalonePokemonGb(input,json):Program.EditStandalonePokemonRaw(input,json);
    }
    private static void Stats(PKM p,PKM before,bool party)
    {
        if(party||p.SIZE_PARTY==p.SIZE_STORED){p.ResetPartyStats();p.Stat_HPCurrent=Math.Min(before.Stat_HPCurrent,p.Stat_HPMax);p.Status_Condition=before.Status_Condition;}
        if(p is PB7)PokemonEditing.RefreshDerived(p,before,true);
    }
    internal static void Run()
    {
        var settings=SaveProgramSettingsCodec.Defaults();
        foreach(var candidate in Entities())foreach(bool party in new[]{false,true})
        {
            PKM p=Seed(candidate.Clone());byte[] input=Bytes(p,party),original=input.ToArray();string name="entity."+p.Extension;
            p=StandalonePokemon.Open(input,name,useFileFormat:true).Entity;
            bool actualParty=input.Length==p.SIZE_PARTY;var info=StandalonePokemon.Inspect(input,name,useFileFormat:true).Pokemon.Vitals!;
            bool canStatus=p switch{SK2 or RK4 or CK3 or XK3=>false,PK1 or PK2 or PB7 or PK8 or PB8 or PA8 or PK9 or PA9=>true,_=>actualParty};
            Check(info.Status.CanEdit==canStatus&&info.Experience.Maximum==Experience.GetEXP(100,p.PersonalInfo.EXPGrowth),"Format storage capability and source growth");
            foreach(uint exp in new uint[]{0,Experience.GetEXP(21,p.PersonalInfo.EXPGrowth)+3,9999999})
            {
                var expected=p.Clone();expected.EXP=Math.Min(exp,Experience.GetEXP(100,p.PersonalInfo.EXPGrowth));expected.Stat_Level=expected.CurrentLevel;Stats(expected,p,actualParty);
                Check(Edit(input,p,new("experience",Experience:exp)).SequenceEqual(Bytes(expected,actualParty)),"Experience public complete output / max clamp / HP and status");
            }
            var leveled=p.Clone();leveled.CurrentLevel=21;Stats(leveled,p,actualParty);Check(Edit(input,p,new("level",Level:21)).SequenceEqual(Bytes(leveled,actualParty)),"Level public complete output and source EXP");
            if(info.HiddenPower is not null)foreach(bool maximize in new[]{false,true})foreach(int type in Enumerable.Range(0,16))
            {
                settings.EntityEditor.HiddenPowerOnChangeMaxPower=maximize;SetSettings(settings);
                var expected=p.Clone();Span<int> ivs=stackalloc int[6];p.GetIVs(ivs);if(maximize)ivs.Fill(p.MaxIV);HiddenPower.SetIVs(type,ivs,p.Context);expected.SetIVs(ivs);Stats(expected,p,actualParty);
                Check(Edit(input,p,new("hiddenPower",Type:type)).SequenceEqual(Bytes(expected,actualParty)),"Hidden Power source IV order / setting / full file");
            }
            else Reject(()=>Edit(input,p,new("hiddenPower",Type:0)));
            foreach(var choice in info.Status.Choices)
            {
                var change=new PokemonVitalsEdit("status",Status:choice.Id,SleepTurns:p.Format<=4&&choice.Id==1?7:null);
                if(!canStatus){Reject(()=>Edit(input,p,change));continue;}
                var expected=p.Clone();var condition=(StatusCondition)(p.Format<=4&&choice.Id==1?7:choice.Id);expected.Status_Condition=(expected.Status_Condition&~255)|(p.Format<=4?(int)condition:(int)condition.GetStatusType());
                Check(Edit(input,p,change).SequenceEqual(Bytes(expected,actualParty)),"Status public complete output, sleep, no healing and high bits");
            }
            foreach(var bad in new PokemonVitalsEdit[]{new("unknown"),new("experience"),new("experience",Experience:10000000),new("level",Level:0),new("level",Level:101),new("hiddenPower",Type:16),new("status",Status:2),new("status",Status:1,SleepTurns:8),new("bar",Position:0,Width:0),new("wheel",Width:100,Direction:0),new("level",Level:20,Experience:100),new("edgeLow",Alt:true)})Reject(()=>Edit(input,p,bad));
            Check(input.SequenceEqual(original),"Immutable independent input");Console.WriteLine($"PASS vitals {p.GetType().Name}/party={party}: public experience, IV policy/all HP types, actual stored status, full output and rejection");
        }
        SaveProgramSettingsRuntime.Reset();PartyStats();PersonalStats();Bar();GbSave();Real();
        foreach(bool show in new[]{false,true}){settings.EntityEditor.ShowGenderGen1=show;settings.EntityEditor.ShowExperienceBar=show;settings.EntityEditor.ShowStatusCondition=show;SetSettings(settings);var info=PokemonVitals.Read(Seed(new PK1()),true);Check(info.ShowGender==show&&info.Experience.ShowBar==show&&info.Status.Show==show,"All editor visibility settings consumed");}
        SaveProgramSettingsRuntime.Reset();
    }
    private static void PartyStats()
    {
        foreach(var candidate in Entities())foreach(bool party in new[]{false,true})
        {
            var p=Seed(candidate.Clone());var input=Bytes(p,party);
            var opened=StandalonePokemon.Open(input,"entity."+p.Extension,useFileFormat:true);
            p=opened.Entity;bool actualParty=opened.Party;
            var info=PokemonVitals.Read(p,actualParty).PartyStats;
            if(info is null){Reject(()=>Edit(input,p,new("partyStats",Stats:[1,2,3,4,5,6])));continue;}
            foreach(int boundary in new[]{0,65535})
            {
                int[] values=info.Values.ToArray();var expected=p.Clone();
                for(int i=0;i<6;i++)if(info.Writable[i])
                {
                    int v=boundary;values[i]=v;
                    switch(i){case 0:expected.Stat_HPCurrent=v;expected.Stat_HPMax=v;break;case 1:expected.Stat_ATK=v;break;
                        case 2:expected.Stat_DEF=v;break;case 3:expected.Stat_SPE=v;break;case 4:expected.Stat_SPA=v;break;case 5:expected.Stat_SPD=v;break;}
                }
                if(p is PK1)values[5]=values[4];
                Check(Edit(input,p,new("partyStats",Stats:values)).SequenceEqual(Bytes(expected,actualParty)),"Manual stats full public output, HP pair, level/status unchanged");
            }
            foreach(var bad in new PokemonVitalsEdit[]{new("partyStats"),new("partyStats",Stats:[1,2]),new("partyStats",Stats:[-1,0,0,0,0,0]),new("partyStats",Stats:[65536,0,0,0,0,0]),new("partyStats",Stats:info.Values,Level:20),new("level",Level:20,Stats:info.Values)})Reject(()=>Edit(input,p,bad));
            if(p is PK1){int[] bad=info.Values.ToArray();bad[5]=bad[4]+1;Reject(()=>Edit(input,p,new("partyStats",Stats:bad)));}
            var calculated=p.Clone();
            for(int i=0;i<6;i++)if(info.Writable[i])
            {
                int value=info.Computed[i];switch(i){case 0:calculated.Stat_HPCurrent=value;calculated.Stat_HPMax=value;break;case 1:calculated.Stat_ATK=value;break;
                    case 2:calculated.Stat_DEF=value;break;case 3:calculated.Stat_SPE=value;break;case 4:calculated.Stat_SPA=value;break;case 5:calculated.Stat_SPD=value;break;}
            }
            calculated.Stat_Level=calculated.CurrentLevel;
            Check(Edit(input,p,new("resetPartyStats")).SequenceEqual(Bytes(calculated,actualParty)),"Calculated stats full output without healing status or discarding metadata");
            Check(input.SequenceEqual(Bytes(p,actualParty)),"Manual stats input immutable");
        }
        // The editor's full party buffer can originate from an ordinary box.
        var save=new SAV3E();var entity=Seed(new PK3{Version=GameVersion.E});int[] final=[123,234,345,456,567,678];
        var step=new PokemonDraftStep("vitals",Edits:[new("partyStats",Stats:final),new("level",Level:21)]);
        var capture=new PokemonDraftCapture("party-stats",[new("vitals",[step])]);
        var prepared=PokemonDraftPreparing.Prepare(save,entity,new(0,0),capture,true);
        Check(PokemonVitals.PartyValues(prepared).SequenceEqual(final)&&prepared.CurrentLevel==21&&prepared.Stat_HPMax==123,"Manual stats run after calculated stats in a boxed source's party buffer");
        Reject(()=>PokemonDraftPreparing.Prepare(save,entity,new(0,0),capture,false));
        var reset=step with{Edits=[new("resetPartyStats"),new("level",Level:40)]};
        var recalculated=PokemonDraftPreparing.Prepare(save,entity,new(0,0),new("party-stats",[new("vitals",[reset])]),true);
        Check(recalculated.CurrentLevel==40&&PokemonVitals.PartyValues(recalculated).SequenceEqual(PokemonVitals.ReadPartyStats(recalculated,true)!.Computed),"Calculated draft uses final level rather than old displayed stats");
        Reject(()=>PokemonDraftPreparing.Prepare(save,entity,new(0,0),new("party-stats",[new("vitals",[step with{Edits=[new("partyStats",Stats:final),new("resetPartyStats")] }])]),true));
        Console.WriteLine("PASS manual party stats: all entity formats, both lengths, UInt16 boundaries, aliases, immutable full output and draft order");
    }
    private static void PersonalStats()
    {
        foreach(GameVersion version in new[]{GameVersion.R,GameVersion.E,GameVersion.FR,GameVersion.LG})
        {
            // Typed engineering layouts, with checksums rebuilt for each type;
            // this is not an automatic-recognition fixture for R/FR/LG.
            SaveFile Open(byte[] bytes)=>version switch{GameVersion.R=>new SAV3RS(bytes),GameVersion.E=>new SAV3E(bytes),_=>new SAV3FRLG(bytes)};
            var save=Open(Open(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav")).Write().ToArray());
            if(save is SAV3FRLG frlg)frlg.ResetPersonal(version);
            var p=Seed(new PK3{Version=GameVersion.R});p.Species=386;p.CurrentLevel=50;p.RefreshChecksum();
            int[] expected=p.GetStats(save.Personal.GetFormEntry(p.Species,p.Form)).Select(v=>(int)v).ToArray();
            if(version!=GameVersion.R)Check(!expected.SequenceEqual(p.GetStats(p.PersonalInfo).Select(v=>(int)v)),"Deoxys oracle must distinguish save and entity personal tables");
            Check(PokemonVitals.Read(p,true,save).PartyStats!.Computed.SequenceEqual(expected),"Read uses save personal table");
            Check(PokemonReader.Read(p,-1,0,true,save).Vitals!.PartyStats!.Computed.SequenceEqual(expected),"Storage metadata uses save personal table");
            PokemonEditorContext.Bind(save,new(0,0));
            try
            {
                byte[] input=Bytes(p,true);
                Check(StandalonePokemon.Inspect(input,"entity.pk3",useFileFormat:true).Pokemon.Vitals!.PartyStats!.Computed.SequenceEqual(expected),"Read-only editor clone preserves selected game personal table");
                var output=Edit(input,p,new("resetPartyStats"));
                Check(PokemonVitals.PartyValues(StandalonePokemon.Open(output,"entity.pk3",useFileFormat:true).Entity).SequenceEqual(expected),"Standalone reset uses current save table");
            }
            finally{PokemonEditorContext.Clear();}
            var capture=new PokemonDraftCapture("personal",[new("vitals",[new("vitals",Edits:[new("resetPartyStats")])])]);
            Check(PokemonVitals.PartyValues(PokemonDraftPreparing.Prepare(save,p,new(0,0),capture,true)).SequenceEqual(expected),"Set preparation uses current save table");
            p.Stat_HPCurrent=1;p.RefreshChecksum();save.SetPartySlotAtIndex(p,0,EntityImportSettings.None);
            PokemonRawEditing.Apply(save,new(-1,0,"vitals",Vitals:new("resetPartyStats")));
            Check(PokemonVitals.PartyValues(save.GetPartySlotAtIndex(0)).SequenceEqual(expected),"Save raw operation uses its own table");
        }
        Console.WriteLine("PASS Deoxys personal tables R/E/FR/LG: storage metadata, readonly clone, public entity reset, prepared reset and save raw path");
    }
    private static void Bar()
    {
        var p=Seed(new PK3{Version=GameVersion.E});byte growth=p.PersonalInfo.EXPGrowth;uint low=Experience.GetEXP(20,growth),next=Experience.GetEXP(21,growth),previous=Experience.GetEXP(19,growth);
        foreach(var (edit,expected) in new (PokemonVitalsEdit,uint)[]{(new("edgeLow"),low),(new("edgeHigh"),next-1),(new("overflow"),next),(new("underflow"),low-1),(new("downlevel"),previous),(new("bar",Position:0,Width:100),low),(new("bar",Position:100,Width:100),next-1),(new("bar",Position:50,Width:100),low+(next-low)/2),(new("bar",Position:50,Width:100,Alt:true),low-1),(new("bar",Position:50,Width:100,Alt:true,Control:true),previous),(new("bar",Position:50,Width:100,Shift:true),next-1),(new("bar",Position:50,Width:100,Shift:true,Control:true),next),(new("wheel",Width:100,Direction:-1),low-1)})
        {var copy=p.Clone();PokemonVitals.Apply(copy,edit,true);Check(copy.EXP==expected,"Source experience bar action");}
        p.CurrentLevel=100;PokemonVitals.Apply(p,new("wheel",Width:100,Direction:-1),true);Check(p.EXP==Experience.GetEXP(100,growth)-1,"Down from max level");
        p.CurrentLevel=1;PokemonVitals.Apply(p,new("underflow"),true);Check(p.EXP==0,"Minimum-level underflow");
        Console.WriteLine("PASS experience bar: edges, pixel boundary, Alt/Shift/Ctrl precedence, scroll, levels 1/100");
    }
    private static void GbSave()
    {
        var save=new SAV2(LanguageID.English,GameVersion.GD);var p=Seed(new PK2());save.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);save.SetPartySlotAtIndex(p,0,EntityImportSettings.None);var input=save.Write().ToArray();
        var choice=new SaveDetectionChoice(SaveFileType.GSC,GameVersion.GD,LanguageID.English,"Default","gb.sav");SaveDetectionContext.Configure(input,choice);
        try{foreach(int box in new[]{-1,0})
        {var edit=new GbSavePokemonEdit(box,0,Special:new("vitals",Vitals:new("experience",Experience:9000)));var output=SaveService.EditGbPokemon(input,JsonSerializer.Serialize(edit,SaveJsonContext.Default.GbSavePokemonEdit));Check(PokemonEditing.Read(SaveDetection.Open(output,choice).Save,box,0).EXP==9000,"GB save public vital update");
            var status=new GbSavePokemonEdit(box,0,Special:new("vitals",Vitals:new("status",Status:1,SleepTurns:7)));
            if(box==0)Reject(()=>SaveService.EditGbPokemon(input,JsonSerializer.Serialize(status,SaveJsonContext.Default.GbSavePokemonEdit)));
            else Check(SaveService.EditGbPokemon(input,JsonSerializer.Serialize(status,SaveJsonContext.Default.GbSavePokemonEdit)).Length==input.Length,"GB party saved status");
        }}finally{SaveDetectionContext.Clear();}
        Console.WriteLine("PASS GB save: public experience edit, boxed PK2 status rejection and party status persistence");
    }
    private static void Real()
    {
        string? file=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");if(file is null)return;
        byte[] input=File.ReadAllBytes(file);foreach(int box in new[]{-1,0})
        {var save=SaveUtil.GetSaveFile(input.ToArray())!;var p=PokemonEditing.Read(save,box,0);var edit=new PokemonRawEdit(box,0,"vitals",Vitals:new("experience",Experience:12345));var output=SaveService.EditPokemonRaw(input,JsonSerializer.Serialize(edit,SaveJsonContext.Default.PokemonRawEdit));var reopened=SaveUtil.GetSaveFile(output)!;Check(PokemonEditing.Read(reopened,box,0).EXP==12345&&SaveChecksums.Valid(reopened),"Real save public experience output");}
        var source=new PokemonPosition(0,0);var target=new PokemonPosition(-1,0);
        var editor=JsonSerializer.Deserialize(Program.ReadPokemonEditorFile(input,JsonSerializer.Serialize(source,SaveJsonContext.Default.PokemonPosition)),SaveJsonContext.Default.PokemonFile)!;
        int[] values=[123,234,345,456,567,678];
        var capture=new PokemonDraftCapture("real-stats",[new("vitals",[new("vitals",Edits:[new("partyStats",Stats:values),new("level",Level:30)])])]);
        var request=new PokemonSetRequest(Br4Editing.Hash(input),"real-stats",source,target,capture,editor);
        var ticket=JsonSerializer.Deserialize(Program.PreviewPokemonSet(input,JsonSerializer.Serialize(request,PokemonSetJson.Default.PokemonSetRequest)),PokemonSetJson.Default.PokemonSetTicket)!;
        var confirmation=new PokemonSetConfirmation(ticket.Token,ticket.SourceHash,ticket.TargetHash,true);
        byte[] placed=Program.CommitPokemonSet(input,JsonSerializer.Serialize(confirmation,PokemonSetJson.Default.PokemonSetConfirmation));
        var result=SaveUtil.GetSaveFile(placed)!;var changed=PokemonEditing.Read(result,-1,0);
        Check(SaveChecksums.Valid(result)&&PokemonVitals.PartyValues(changed).SequenceEqual(values)&&changed.Stat_HPMax==123&&changed.CurrentLevel==30,"Real save boxed editor buffer / public frozen Set / stored party stats");
        var before=SaveUtil.GetSaveFile(input.ToArray())!;
        Check(PokemonEditing.Read(before,0,0).Data.SequenceEqual(PokemonEditing.Read(result,0,0).Data),"Real save Set keeps source box Pokemon untouched");
        Check(File.ReadAllBytes(file).SequenceEqual(input),"Real file unchanged");Console.WriteLine("PASS real save working copy: box/party public experience, valid export and immutable file");
    }
}

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
        SaveProgramSettingsRuntime.Reset();Bar();GbSave();Real();
        foreach(bool show in new[]{false,true}){settings.EntityEditor.ShowGenderGen1=show;settings.EntityEditor.ShowExperienceBar=show;settings.EntityEditor.ShowStatusCondition=show;SetSettings(settings);var info=PokemonVitals.Read(Seed(new PK1()),true);Check(info.ShowGender==show&&info.Experience.ShowBar==show&&info.Status.Show==show,"All editor visibility settings consumed");}
        SaveProgramSettingsRuntime.Reset();
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
        Check(File.ReadAllBytes(file).SequenceEqual(input),"Real file unchanged");Console.WriteLine("PASS real save working copy: box/party public experience, valid export and immutable file");
    }
}

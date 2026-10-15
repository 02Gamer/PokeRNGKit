// SPDX-License-Identifier: GPL-3.0-or-later
// Behavior adapted from PKHeX.WinForms PKMEditor, ExperienceBar, StatEditor,
// StatusConditionView and StatusBrowser. Core supplies all growth/IV algorithms.
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record PokemonExperienceInfo(uint Value,int Level,uint Maximum,uint Start,uint End,double Progress,bool ShowBar);
public sealed record PokemonHiddenPowerInfo(int Type,int? Power,OriginChoice[] Types,bool Maximize);
public sealed record PokemonStatusInfo(int Value,bool CanEdit,bool Present,bool Fainted,bool Show,OriginChoice[] Choices,int SleepTurns);
public sealed record PokemonVitalsInfo(PokemonExperienceInfo Experience,PokemonHiddenPowerInfo? HiddenPower,PokemonStatusInfo Status,bool ShowGender);
public sealed record PokemonVitalsEdit(string Action,uint? Experience=null,int? Level=null,int? Type=null,int? Status=null,int? SleepTurns=null,
    int? Position=null,int? Width=null,int? Direction=null,bool Alt=false,bool Shift=false,bool Control=false);

internal static class PokemonVitals
{
    internal static bool ShowGender(PKM p)=>p.Format!=1||SaveProgramSettingsRuntime.Current?.EntityEditor.ShowGenderGen1==true;
    private static OriginChoice Choice(int id,string zh,string en,string ja)=>new(id,new(zh,en,ja));
    private static OriginChoice[] StatusChoices(PKM p)=>[
        Choice(0,"无异常状态","None","なし"),Choice(1,"睡眠","Sleep","ねむり"),Choice(8,"中毒","Poison","どく"),
        Choice(16,"灼伤","Burn","やけど"),Choice(64,"麻痹","Paralysis","まひ"),Choice(32,"冰冻","Freeze","こおり"),
        ..(p.Format is 3 or 4?new[]{Choice(128,"剧毒","Toxic","もうどく")}:[])];
    internal static bool StoresStatus(PKM p,bool party)
    {
        // PK1/PK2 standalone lengths are complete party lists, whereas a save's
        // PK2 box slot stores only its 32-byte core (status starts at 0x20).
        if(p is PK2&&!party)return false;
        var copy=p.Clone();byte[] Bytes(){var b=new byte[party?copy.SIZE_PARTY:copy.SIZE_STORED];if(party)copy.WriteDecryptedDataParty(b);else copy.WriteDecryptedDataStored(b);return b;}
        var before=Bytes();copy.Status_Condition=(copy.Status_Condition&~255)|((copy.Status_Condition&255)==0?1:0);
        return !before.SequenceEqual(Bytes());
    }
    public static PokemonVitalsInfo Read(PKM p,bool party)
    {
        var settings=SaveProgramSettingsRuntime.Current?.EntityEditor??new();byte level=p.CurrentLevel,growth=p.PersonalInfo.EXPGrowth;
        uint start=Experience.GetEXP(level,growth),range=Experience.GetEXPToLevelUp(level,growth);
        bool status=StoresStatus(p,party),present=status&&p.PartyStatsPresent;
        return new(new(p.EXP,level,Experience.GetEXP(100,growth),start,range==0?start:start+range-1,
            Experience.GetEXPToLevelUpPercentage(level,p.EXP,growth),settings.ShowExperienceBar),
            p.Format<=7||p is PB8?new(p.HPType,p.Format<=5?p.HPPower:null,
                Enumerable.Range(0,16).Select(i=>new OriginChoice(i,PokemonReader.Text(s=>s.types[i+1]))).ToArray(),settings.HiddenPowerOnChangeMaxPower):null,
            new(p.Status_Condition,status,present,present&&p.Stat_HPCurrent==0,settings.ShowStatusCondition,StatusChoices(p),p.Format<=4?Math.Max(1,p.Status_Condition&7):1),ShowGender(p));
    }
    public static void Apply(PKM p,PokemonVitalsEdit edit,bool party)
    {
        bool exp=edit.Action=="experience",level=edit.Action=="level",hp=edit.Action=="hiddenPower",status=edit.Action=="status",
            bar=edit.Action=="bar",wheel=edit.Action=="wheel",edge=edit.Action is "edgeLow" or "edgeHigh" or "overflow" or "underflow" or "downlevel";
        if(!(exp||level||hp||status||bar||wheel||edge)||
            (edit.Experience is not null)!=exp||(edit.Level is not null)!=level||(edit.Type is not null)!=hp||
            (edit.Status is not null)!=status||(!status&&edit.SleepTurns is not null)||
            (edit.Position is not null)!=bar||(edit.Width is not null)!=(bar||wheel)||(edit.Direction is not null)!=wheel||
            (!bar&&(edit.Alt||edit.Shift||edit.Control)))throw new ArgumentException("Invalid Pokemon vital operation.");
        var original=p.Clone();
        if(status)
        {
            if(!StoresStatus(p,party)||!StatusChoices(p).Any(c=>c.Id==edit.Status)||
                (edit.Status==1&&p.Format<=4?edit.SleepTurns is null or <1 or >7:edit.SleepTurns is not null))
                throw new ArgumentException("Status is unavailable or outside its source range.");
            var condition=(StatusCondition)(edit.Status==1&&p.Format<=4?edit.SleepTurns!.Value:edit.Status!.Value);
            int value=p.Format<=4?(int)condition:(int)condition.GetStatusType();
            p.Status_Condition=(p.Status_Condition&~255)|value;
            if((p.Status_Condition&255)!=value)throw new ArgumentException("Status cannot be stored in this format.");
        }
        else
        {
            if(hp)
            {
                if(!(p.Format<=7||p is PB8)||edit.Type is <0 or >=16)throw new ArgumentException("Hidden Power is unavailable or outside 0-15.");
                Span<int> ivs=stackalloc int[6];p.GetIVs(ivs);
                if(SaveProgramSettingsRuntime.Current?.EntityEditor.HiddenPowerOnChangeMaxPower??true)ivs.Fill(p.MaxIV);
                HiddenPower.SetIVs(edit.Type!.Value,ivs,p.Context);p.SetIVs(ivs);
                if(p.HPType!=edit.Type)throw new ArgumentException("Hidden Power type cannot be represented.");
            }
            else
            {
                byte growth=p.PersonalInfo.EXPGrowth;
                if(exp){if(edit.Experience>9999999)throw new ArgumentException("Experience exceeds the seven-digit source control.");p.EXP=Math.Min(edit.Experience!.Value,Experience.GetEXP(100,growth));}
                else if(level){if(edit.Level is <1 or >100)throw new ArgumentException("Level is outside 1-100.");p.CurrentLevel=(byte)edit.Level!.Value;}
                else {uint result=Bar(p,edit);if(result==p.EXP)return;p.EXP=result;}
                p.Stat_Level=p.CurrentLevel;if(p is PK1 first)first.Stat_LevelBox=p.CurrentLevel;
            }
            if(party||p.SIZE_PARTY==p.SIZE_STORED)
            {
                p.ResetPartyStats();p.Stat_HPCurrent=Math.Min(original.Stat_HPCurrent,p.Stat_HPMax);p.Status_Condition=original.Status_Condition;
            }
        }
        p.RefreshChecksum();
    }
    private static uint Bar(PKM p,PokemonVitalsEdit edit)
    {
        byte level=p.CurrentLevel,growth=p.PersonalInfo.EXPGrowth;uint start=Experience.GetEXP(level,growth),range=Experience.GetEXPToLevelUp(level,growth);
        uint Edge(string action)=>action switch
        {
            "edgeLow"=>start,"edgeHigh"=>level==100?p.EXP:start+range-1,
            "overflow"=>level==100?p.EXP:Experience.GetEXP((byte)(level+1),growth),
            "underflow"=>level==1?p.EXP:start-1,"downlevel"=>level==1?p.EXP:Experience.GetEXP((byte)(level-1),growth),_=>throw new ArgumentException("Invalid experience action.")
        };
        if(edit.Action is not ("bar" or "wheel"))return Edge(edit.Action);
        if(edit.Width is null or <1 or >16384)throw new ArgumentException("Experience bar width is invalid.");int width=edit.Width.Value;
        if(edit.Action=="bar")
        {
            if(edit.Alt)return Edge(edit.Control?"downlevel":p.EXP!=start?"edgeLow":"underflow");
            if(level==100)return p.EXP;
            if(edit.Shift)return Edge(!edit.Control&&p.EXP!=start+range-1?"edgeHigh":"overflow");
            int x=Math.Clamp(edit.Position!.Value,0,width);return start+Math.Min(range-1,(uint)((long)x*range/width));
        }
        if(edit.Direction is not (-1 or 1))throw new ArgumentException("Experience wheel direction is invalid.");
        double progress=Experience.GetEXPToLevelUpPercentage(level,p.EXP,growth);int current=(int)(progress*width);if(current==0&&progress!=0)current=1;
        int direction=edit.Direction.Value;
        if((level==100&&direction>0)||(level==1&&direction<0&&current==0))return p.EXP;
        int target=current+direction;if(target<0)return Edge("underflow");if(target>=width)return Edge("overflow");if(target==0)return start;
        double pixelsPerExp=(double)width/range,delta=direction;if(pixelsPerExp>1)delta*=pixelsPerExp;
        return unchecked(p.EXP+(uint)(int)(delta/pixelsPerExp));
    }
}

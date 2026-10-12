// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Buffers.Binary;
using System.Globalization;
using System.Text.Json.Serialization;

namespace PokeRNGKit.SaveEditor;
public sealed record FestaFacilityState([property:JsonRequired]int Index,[property:JsonRequired]int Type,[property:JsonRequired]int Category,[property:JsonRequired]int Color,[property:JsonRequired]int ColorMaximum,[property:JsonRequired]bool Introduced,[property:JsonRequired]byte RawIntroduced,[property:JsonRequired]byte Gender,[property:JsonRequired]string TrainerName,[property:JsonRequired]ushort[] Messages,[property:JsonRequired]int LuckyRank,[property:JsonRequired]int LuckyPlace,[property:JsonRequired]uint UsedFlags,[property:JsonRequired]uint UsedStats,[property:JsonRequired]int Npc,[property:JsonRequired]string TrainerId,[property:JsonRequired]int ExchangeLeft);
public sealed record FestaAgencyState(bool Chosen,bool Invited,ushort Packed,int Grade,int Defeated,int DefeatedMaximum,ushort DefeatedPokemon,ushort[] Trainers,bool HasGlasses,PokemonEntry[] Pokemon);
public sealed record FestaCatalog(bool CanEdit,string SourceHash,bool Usum,string Name,int Coins,int UsedCoins,int TotalCoins,ushort Rank,string? Date,ushort[] Messages,bool[] Phrases,byte[] Rewards,FestaFacilityState[] Facilities,FestaAgencyState? Agency);
internal static class FestivalPlazaEditing
{
    private static readonly byte[][] Colors=[[0,1,2,3],[4,0,5,3],[1,0,5,3],[6,7,0,3],[4,5,8,3],[0,1,2,3],[0,7,8,4,5,1,9,10],[11,1,5,3]];
    internal static bool Supports(SaveFile save)=>save is SAV7SM or SAV7USUM;
    internal static int Category(int type,bool usum)=>type<0||type>(usum?128:125)?-1:type switch{<15=>0,<30=>1,<47=>2,<65=>3,<80=>4,<101=>5,<125=>6,_=>7};
    internal static int ColorMaximum(int category,bool usum)=>category>=0&&category<Colors.Length-(usum?0:1)?Colors[category].Length-1:3;
    internal static int DefeatedMaximum(int grade)=>(Math.Min(49,grade)/10*3)+2;
    internal static FestaFacilityState NormalizeType(FestaFacilityState state,int type,bool usum)
    {
        if(type<0||type>(usum?127:124))throw new ArgumentException("Festival Plaza facility type is out of range.");int category=Category(type,usum),maximum=ColorMaximum(category,usum);return state with{Type=type,Category=category,Color=Math.Min(state.Color,maximum),ColorMaximum=maximum};
    }
    internal static FestaCatalog Read(SaveFile source,string hash)
    {
        if(!Supports(source))throw new ArgumentException("Festival Plaza is unsupported for this save.");var save=(SAV7)source;bool usum=save is SAV7USUM;
        var facilities=Enumerable.Range(0,7).Select(i=>{var f=save.Festa.GetFestaFacility(i);int category=Category(f.Type,usum);return new FestaFacilityState(i,f.Type,category,f.Color,ColorMaximum(category,usum),f.IsIntroduced,save.Festa.Data[0x310+i*0x48+2],f.Gender,f.OriginalTrainerName,Enumerable.Range(0,4).Select(j=>(ushort)f.GetMessage(j)).ToArray(),f.UsedLuckyRank,f.UsedLuckyPlace,f.UsedFlags,f.UsedRandStat,f.NPC,Convert.ToHexString(f.TrainerFesID),f.ExchangeLeftCount);}).ToArray();
        DateTime? date;try{date=save.Festa.FestaDate;}catch(ArgumentOutOfRangeException){date=null;}
        return new(save.State.Exportable&&SaveChecksums.Valid(save),hash,usum,save.Festa.FestivalPlazaName,save.Festa.FestaCoins,save.GetRecord(38),save.Festa.TotalFestaCoins,save.Festa.FestaRank,date?.ToString("yyyy-MM-ddTHH:mm:ss",CultureInfo.InvariantCulture),Enumerable.Range(0,4).Select(save.Festa.GetFestaMessage).ToArray(),Enumerable.Range(0,107).Select(save.Festa.GetFestaPhraseUnlocked).ToArray(),Enumerable.Range(0,11).Select(save.Festa.GetFestPrizeReceived).ToArray(),facilities,usum?ReadAgency(save):null);
    }
    private static FestaAgencyState ReadAgency(SAV7 save)
    {
        ushort Read(int offset)=>BinaryPrimitives.ReadUInt16LittleEndian(save.Data[offset..]);ushort packed=Read(0x6C55C);int grade=(packed>>6)&63;
        var pokemon=new[]{save.GetStoredSlot(save.Data[0x6C200..]),save.GetPartySlot(save.Data[0x6C2E8..]),save.GetPartySlot(save.Data[0x6C420..])};
        return new(save.GetFlag(0x6C55E,1),(Read(0x6C3EE)&0x7DFF)==0x7DFF&&(Read(0x6C526)&0x7DFF)==0x7DFF,packed,grade,packed>>12,DefeatedMaximum(grade),Read(0x6C558),Enumerable.Range(0,3).Select(i=>Read(0x6C56C+0x14*i)).ToArray(),(save.Fashion.Data[0xD0]&1)!=0,pokemon.Select((p,i)=>PokemonReader.Read(p.Clone(),-3,i)).ToArray());
    }
    internal static void DeleteVisitor(SAV7 save,int index)
    {
        if((uint)index>=7)throw new ArgumentException("Festival Plaza facility is out of range.");var f=save.Festa.GetFestaFacility(index);if(f.IsIntroduced)f.ClearTrainerFesID();f.IsIntroduced=false;f.OriginalTrainerName="";f.Gender=0;for(int i=0;i<4;i++)f.SetMessage(i,0);
    }
    internal static void SetHex(SAV7 save,int index,string key,string text)
    {
        if((uint)index>=7||text is null)throw new ArgumentException("Invalid Festival Plaza hexadecimal edit.");int max=key=="trainerId"?24:8;if(text.Length>max)throw new ArgumentException("Festival Plaza hexadecimal text is too long.");var f=save.Festa.GetFestaFacility(index);string clean=Util.GetOnlyHex(text);if(string.IsNullOrWhiteSpace(clean))clean="0";
        switch(key){case "usedFlags":f.UsedFlags=Util.GetHexValue(clean);break;case "usedStats":f.UsedRandStat=Util.GetHexValue(clean);break;case "trainerId":f.TrainerFesID.Clear();Util.GetBytesFromHexString(clean,f.TrainerFesID);break;default:throw new ArgumentException("Unknown Festival Plaza hexadecimal field.");}
    }
    internal static void SaveFacility(SAV7 save,int index,FestaFacilityState state)
    {
        if((uint)index>=7||state.Index!=index||state.TrainerName is null||state.TrainerName.Length>12||state.Type<0||state.Type>(save is SAV7USUM?127:124)||state.Npc<0||state.Npc>7)throw new ArgumentException("Invalid Festival Plaza facility.");int category=Category(state.Type,save is SAV7USUM);if(state.Color<0||state.Color>ColorMaximum(category,save is SAV7USUM)||state.ExchangeLeft<0||state.ExchangeLeft>255||state.LuckyRank<0||state.LuckyRank>3||state.LuckyPlace<0||state.LuckyPlace>7)throw new ArgumentException("Invalid Festival Plaza facility values.");var f=save.Festa.GetFestaFacility(index);f.Type=state.Type;f.Color=state.Color;f.OriginalTrainerName=state.TrainerName;f.NPC=state.Npc;f.IsIntroduced=state.Introduced;f.ExchangeLeftCount=category==7?state.ExchangeLeft:0;bool lucky=category==5&&state.LuckyRank>0&&state.LuckyPlace>0;f.UsedLuckyRank=lucky?state.LuckyRank:0;f.UsedLuckyPlace=lucky?state.LuckyPlace:0;
    }
}

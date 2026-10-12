// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Buffers.Binary;
using System.Globalization;
using System.Text.Json.Serialization;

namespace PokeRNGKit.SaveEditor;
public sealed record FestaAction([property:JsonRequired]string Kind,[property:JsonRequired]int Index,int? Value=null,bool? Flag=null,string? Text=null,FestaFacilityState? Facility=null);
internal sealed class FestivalPlazaActions
{
    internal static byte[] Prepare(byte[] original,FestaAction[] actions,int selected,FestaFacilityState current)
    {
        var save=SaveUtil.GetSaveFile(original.ToArray())??throw new ArgumentException("Festival Plaza save is unrecognized.");var model=new FestivalPlazaActions(save);model.Apply(actions);if(actions.LastOrDefault() is{Kind:"type"} type&&type.Index==selected&&type.Value==current.Type)current=FestivalPlazaEditing.NormalizeType(current,current.Type,save is SAV7USUM);model.Save(selected,current);var output=save.Write().ToArray();var reread=SaveUtil.GetSaveFile(output.ToArray());if(reread is null||reread.GetType()!=save.GetType()||!SaveChecksums.Valid(reread))throw new InvalidOperationException("Festival Plaza export verification failed.");return output;
    }
    private readonly SAV7 save;
    private readonly PKM[] agency;
    private readonly bool[] phrases;
    private readonly byte[] rewards;
    private int currentCoins,usedCoins,grade,defeated,defeatedPokemon;
    private readonly int[] trainers;
    private bool chosen,invited;
    private DateTime date;
    private string name;
    internal FestivalPlazaActions(SaveFile source)
    {
        if(!FestivalPlazaEditing.Supports(source)||!source.State.Exportable||!SaveChecksums.Valid(source))throw new ArgumentException("Festival Plaza editing requires a supported save with valid checksums.");
        save=(SAV7)source;var c=FestivalPlazaEditing.Read(source,"");currentCoins=Math.Clamp(c.Coins,0,9999999);usedCoins=Math.Clamp(c.UsedCoins,0,9999999);date=DateTime.TryParseExact(c.Date,"yyyy-MM-ddTHH:mm:ss",CultureInfo.InvariantCulture,DateTimeStyles.None,out var d)?d:new DateTime(2000,1,1);name=c.Name;phrases=c.Phrases.ToArray();rewards=c.Rewards.ToArray();
        agency=save is SAV7USUM?[save.GetStoredSlot(save.Data[0x6C200..]),save.GetPartySlot(save.Data[0x6C2E8..]),save.GetPartySlot(save.Data[0x6C420..])]:[];
        var a=c.Agency;grade=a?.Grade??0;defeated=Math.Min(a?.Defeated??0,FestivalPlazaEditing.DefeatedMaximum(grade));defeatedPokemon=a?.DefeatedPokemon??0;trainers=a?.Trainers.Select(v=>Math.Min(210,(int)v)).ToArray()??[];chosen=a?.Chosen??false;invited=a?.Invited??false;
    }
    internal void Apply(FestaAction[] actions)
    {
        if(actions is null||actions.Length>1024)throw new ArgumentException("Invalid Festival Plaza action list.");
        foreach(var a in actions)
        {
            if(a is null)throw new ArgumentException("Invalid Festival Plaza action.");
            int Number(int max){if(a.Value is not{} value||value<0||value>max)throw new ArgumentException("Festival Plaza number is out of range.");return value;}
            bool Flag()=>a.Flag??throw new ArgumentException("Missing Festival Plaza flag.");
            FestaFacility F(){if((uint)a.Index>=7)throw new ArgumentException("Festival Plaza facility is out of range.");return save.Festa.GetFestaFacility(a.Index);}
            switch(a.Kind)
            {
                case "coins":currentCoins=Number(9999999);break;
                case "usedCoins":usedCoins=Number(9999999);break;
                case "rank":save.Festa.FestaRank=(ushort)Number(999);break;
                case "ownMessage":if((uint)a.Index>=4)throw new ArgumentException("Festival Plaza message is out of range.");save.Festa.SetFestaMessage(a.Index,(ushort)Number(9999));break;
                case "phrase":if((uint)a.Index>=107)throw new ArgumentException("Festival Plaza phrase is out of range.");phrases[a.Index]=Flag();break;
                case "allPhrases":Array.Fill(phrases,true);break;
                case "reward":if((uint)a.Index>=11)throw new ArgumentException("Festival Plaza reward is out of range.");rewards[a.Index]=(byte)Number(2);break;
                case "allRewards":Array.Fill(rewards,(byte)Number(2));break;
                case "date":if(!DateTime.TryParseExact(a.Text,"yyyy-MM-ddTHH:mm:ss",CultureInfo.InvariantCulture,DateTimeStyles.None,out date)||date.Date<new DateTime(2000,1,1)||date.Date>new DateTime(2050,12,31))throw new ArgumentException("Invalid Festival Plaza date.");break;
                case "name":if(a.Text is null||a.Text.Length>20)throw new ArgumentException("Invalid Festival Plaza name.");name=a.Text;break;
                case "facilitySave":FestivalPlazaEditing.SaveFacility(save,a.Index,a.Facility??throw new ArgumentException("Missing Festival Plaza facility."));break;
                case "deleteVisitor":FestivalPlazaEditing.DeleteVisitor(save,a.Index);break;
                case "facilityName":if(a.Text is null||a.Text.Length>12)throw new ArgumentException("Invalid Festival Plaza trainer name.");F().OriginalTrainerName=a.Text;break;
                case "introduced":F().IsIntroduced=Flag();break;
                case "gender":F().Gender=(byte)Number(1);break;
                case "color":var color=F();int category=FestivalPlazaEditing.Category(color.Type,save is SAV7USUM);color.Color=Number(FestivalPlazaEditing.ColorMaximum(category,save is SAV7USUM));break;
                case "type":var type=F();type.Type=Number(save is SAV7USUM?127:124);int max=FestivalPlazaEditing.ColorMaximum(FestivalPlazaEditing.Category(type.Type,save is SAV7USUM),save is SAV7USUM);if(type.Color>max)type.Color=max;break;
                case "facilityMessage":var message=F();if(a.Text is null||!int.TryParse(a.Text,out int index)||(uint)index>=4)throw new ArgumentException("Festival Plaza message index is invalid.");message.SetMessage(index,(ushort)Number(9999));break;
                case "exchange":F().ExchangeLeftCount=Number(255);break;
                case "lucky":var lucky=F();int selected=Number(21)-1;lucky.UsedLuckyRank=selected<0?0:selected%3+1;lucky.UsedLuckyPlace=selected<0?0:selected/3+1;break;
                case "usedFlags":case "usedStats":case "trainerId":FestivalPlazaEditing.SetHex(save,a.Index,a.Kind,a.Text??throw new ArgumentException("Missing Festival Plaza hex text."));break;
                case "agencyGrade":Agency();grade=Number(50);defeated=Math.Min(defeated,FestivalPlazaEditing.DefeatedMaximum(grade));break;
                case "agencyDefeated":Agency();defeated=Number(FestivalPlazaEditing.DefeatedMaximum(grade));break;
                case "agencyPokemon":Agency();defeatedPokemon=Number(65535);break;
                case "agencyTrainer":Agency();if((uint)a.Index>=3)throw new ArgumentException("Festival Plaza trainer is out of range.");trainers[a.Index]=Number(210);break;
                case "agencyChosen":Agency();chosen=Flag();break;
                case "agencyInvited":Agency();invited=Flag();break;
                case "importParty":Agency();var party=save.PartyData;if(party.Count==0)throw new ArgumentException("Festival Plaza has no party to import.");for(int i=0;i<Math.Min(3,party.Count);i++)agency[i]=party[i].Clone();break;
                case "glasses":Agency();if(grade<30&&!Flag())throw new ArgumentException("Festival Plaza sunglasses below grade 30 require explicit acceptance.");save.Fashion.GiveAgentSunglasses();break;
                default:throw new ArgumentException("Unknown Festival Plaza action.");
            }
        }
    }
    private void Agency(){if(save is not SAV7USUM)throw new ArgumentException("Festival Plaza Battle Agency is unsupported for this save.");}
    internal byte[] ExportAgency(int index,bool encrypted=false){Agency();if((uint)index>=3)throw new ArgumentException("Festival Plaza agency Pokemon is out of range.");var pokemon=agency[index].Clone();var output=new byte[pokemon.SIZE_PARTY];if(encrypted)pokemon.WriteEncryptedDataParty(output);else pokemon.WriteDecryptedDataParty(output);return output;}
    internal void Save(int selected,FestaFacilityState current)
    {
        save.Festa.SetFestaPhraseUnlocked(106,phrases[106]);for(int i=0;i<106;i++)save.Festa.SetFestaPhraseUnlocked(i,phrases[i]);save.SetRecord(38,usedCoins);save.Festa.FestaCoins=currentCoins;save.Festa.FestaDate=date;
        save.Festa.SetFestaPrizeReceived(10,rewards[10]);for(int i=0;i<10;i++)save.Festa.SetFestaPrizeReceived(i,rewards[i]);FestivalPlazaEditing.SaveFacility(save,selected,current);
        if(save is not SAV7USUM)return;
        ushort Read(int offset)=>BinaryPrimitives.ReadUInt16LittleEndian(save.Data[offset..]);void Write(int offset,int value)=>BinaryPrimitives.WriteUInt16LittleEndian(save.Data[offset..],(ushort)value);
        save.SetFlag(0x6C55E,1,chosen);bool before=(Read(0x6C3EE)&0x7DFF)==0x7DFF&&(Read(0x6C526)&0x7DFF)==0x7DFF;if(before!=invited){Write(0x6C3EE,invited?Read(0x6C3EE)|0x7DFF:0);Write(0x6C526,invited?Read(0x6C526)|0x7DFF:0);}
        agency[0].WriteEncryptedDataStored(save.Data[0x6C200..]);agency[1].WriteEncryptedDataParty(save.Data[0x6C2E8..]);agency[2].WriteEncryptedDataParty(save.Data[0x6C420..]);Write(0x6C558,defeatedPokemon);Write(0x6C55C,((defeated&15)<<12)|((grade&63)<<6)|(save.Data[0x6C55C]&63));for(int i=0;i<3;i++)Write(0x6C56C+0x14*i,trainers[i]);save.Festa.FestivalPlazaName=name;
    }
}

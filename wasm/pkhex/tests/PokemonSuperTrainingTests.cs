// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonSuperTrainingTests
{
    private static readonly int[] Bits=[3,4,7,2,5,6,9,10,13,8,11,12,15,16,19,14,17,18,20,21,22,23,24,25,26,27,28,29,30,31];
    internal static void Run() {
        foreach(PKM entity in new PKM[]{new PK6{Species=25},new PK7{Species=25}})
        foreach(bool unlocked in new[]{false,true})foreach(bool complete in new[]{false,true}) {
            var r=(ISuperTrainRegimen)entity;r.SuperTrainBitFlags=0xA5A5A5A7;r.DistTrainBitFlags=0xA5C9;r.SecretSuperTrainingUnlocked=unlocked;r.SuperTrainSupremelyTrained=complete;
            if(entity is PK6 p){p.TrainingBag=255;p.TrainingBagHits=255;}
            entity.RefreshChecksum();byte[] original=entity.Data.ToArray();var catalog=PokemonSuperTraining.Read(entity,"HASH");
            Check(catalog.Rows.Length==36&&catalog.Draft.Regular.Length==30&&catalog.Draft.Distribution.Length==6,"Complete source catalog");
            Check(catalog.HasBag==(entity is PK6)&&catalog.Draft.Bag==(entity is PK6?0:null)&&catalog.Draft.Hits==(entity is PK6?255:null),"Source bag loading and hidden controls");
            Check(catalog.Rows.All(row=>new[]{row.Name.Zh,row.Name.En,row.Name.Ja}.All(s=>!string.IsNullOrEmpty(s))),"Exact three-language named labels");
            for(int i=0;i<30;i++)Check(catalog.Draft.Regular[i]==(Raw(entity,Bits[i])&&(entity is not PK6||unlocked||i<18)),"Source opening normalization");
            var sequences=new SuperTrainingEvent[][]{
                [],[new("all")],[new("all"),new("all")],[new("none")],[new("none"),new("all")],[new("none"),new("all"),new("all")],
                [new("distribution",2,1),new("regular",0,1)],
            };
            foreach(var events in sequences){var expected=Oracle(entity,events);var result=PokemonSuperTraining.Prepare(entity,new(events));Check(result.Data.SequenceEqual(expected.Data)&&result.ChecksumValid,"Ordered source window/full independent entity oracle");Check(entity.Data.SequenceEqual(original),"Original unchanged");}
            for(int i=0;i<30;i++)foreach(int value in new[]{0,1}){var events=entity is PK6?new SuperTrainingEvent[]{new("unlocked",0,1),new("regular",i,value)}:new SuperTrainingEvent[]{new("regular",i,value)};Check(PokemonSuperTraining.Prepare(entity,new(events)).Data.SequenceEqual(Oracle(entity,events).Data),"Every regular event/full entity");}
            for(int i=0;i<6;i++)foreach(int value in new[]{0,1}){var events=new SuperTrainingEvent[]{new("distribution",i,value)};Check(PokemonSuperTraining.Prepare(entity,new(events)).Data.SequenceEqual(Oracle(entity,events).Data),"Every distribution event/full entity");}
            if(entity is PK6){
                var events=new SuperTrainingEvent[]{new("unlocked",0,1),new("regular",29,1),new("unlocked",0,0),new("bag",0,1),new("hits",0,0)};
                Check(PokemonSuperTraining.Prepare(entity,new(events)).Data.SequenceEqual(Oracle(entity,events).Data),"Secret event clears advanced regular only, bag/hit limits");
                Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("none"),new("regular",18,1)])));
                Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("none"),new("complete",0,1)])));
                foreach(int hits in Enumerable.Range(0,256)){var eventList=new SuperTrainingEvent[]{new("hits",0,hits)};Check(PokemonSuperTraining.Prepare(entity,new(eventList)).Data.SequenceEqual(Oracle(entity,eventList).Data),"Every hits byte/full entity");}
                foreach(int bag in Enumerable.Range(0,GameInfo.GetStrings("en").trainingbags.Length)){var eventList=new SuperTrainingEvent[]{new("bag",0,bag)};Check(PokemonSuperTraining.Prepare(entity,new(eventList)).Data.SequenceEqual(Oracle(entity,eventList).Data),"Every bag choice/full entity");}
                Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("hits",0,-1)])));Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("hits",0,256)])));Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("bag",0,GameInfo.GetStrings("en").trainingbags.Length)])));
            }else{Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("bag",0,0)])));Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("unlocked",0,1)])));}
            Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("regular",30,1)])));Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("distribution",6,1)])));Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("distribution",0,2)])));Reject(()=>PokemonSuperTraining.Prepare(entity,new([new("unknown")])));
            Check(entity.Data.SequenceEqual(original),"Read/rejection preserves complete original");
            Reject(()=>PokemonSuperTraining.Prepare(entity,new(Enumerable.Repeat(new SuperTrainingEvent("all"),513).ToArray())));
            Console.WriteLine($"PASS SuperTraining {entity.GetType().Name}/unlocked={unlocked}/complete={complete}: ordered All/None/open/save, bag/hidden state, three-language labels, full entity raw oracle, distribution high-byte normalization and original");
        }
    }
    internal static PKM Oracle(PKM entity,SuperTrainingEvent[] events){
        bool pk6=entity is PK6;var sr=(ISuperTrainRegimen)entity;bool unlocked=sr.SecretSuperTrainingUnlocked,complete=sr.SuperTrainSupremelyTrained;var regular=Bits.Select(bit=>Raw(entity,bit)).ToArray();var dist=Enumerable.Range(0,6).Select(i=>(entity.Data[0x3A]&(1<<i))!=0).ToArray();int bag=pk6?((PK6)entity).TrainingBag:0,hits=pk6?((PK6)entity).TrainingBagHits:0;
        if(pk6){if(bag>=GameInfo.GetStrings("en").trainingbags.Length)bag=0;if(!unlocked){complete=false;Array.Fill(regular,false,18,12);}}
        foreach(var e in events)switch(e.Kind){case"all":if(unlocked)Array.Fill(dist,true);if(pk6){unlocked=true;complete=true;}Array.Fill(regular,true);break;case"none":unlocked=false;complete=false;Array.Fill(regular,false);Array.Fill(dist,false);break;case"regular":regular[e.Index]=e.Value!=0;break;case"distribution":dist[e.Index]=e.Value!=0;break;case"unlocked":unlocked=e.Value!=0;if(!unlocked){complete=false;Array.Fill(regular,false,18,12);}break;case"bag":bag=e.Value;break;case"hits":hits=e.Value;break;}
        var copy=entity.Clone();for(int i=0;i<30;i++)SetRaw(copy,Bits[i],regular[i]);for(int i=0;i<6;i++){int mask=1<<i;copy.Data[0x3A]=(byte)(dist[i]?copy.Data[0x3A]|mask:copy.Data[0x3A]&~mask);copy.Data[0x3B]=0;}
        bool finalUnlocked=pk6?unlocked:sr.SecretSuperTrainingUnlocked&&unlocked,finalComplete=pk6?complete:sr.SuperTrainSupremelyTrained&&complete;copy.Data[0x72]=(byte)((copy.Data[0x72]&~3)|(finalUnlocked?1:0)|(finalComplete?2:0));if(pk6){copy.Data[0x17]=(byte)bag;copy.Data[0x16]=(byte)hits;}copy.RefreshChecksum();return copy;
    }
    private static bool Raw(PKM p,int bit)=>(p.Data[0x2C+(bit>>3)]&(1<<(bit&7)))!=0;
    private static void SetRaw(PKM p,int bit,bool value){int address=0x2C+(bit>>3),mask=1<<(bit&7);p.Data[address]=(byte)(value?p.Data[address]|mask:p.Data[address]&~mask);}
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid SuperTraining edit accepted");}
}

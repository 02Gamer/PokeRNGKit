// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class FestivalPlazaEditingTests
{
    internal static void Run()
    {
        foreach(string version in new[]{"SN","US"})
        {
            var original=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");var save=(SAV7)SaveUtil.GetSaveFile(original.ToArray())!;var before=save.Data.ToArray();var catalog=FestivalPlazaEditing.Read(save,Br4Editing.Hash(original));
            Check(catalog.Facilities.Length==7&&catalog.Phrases.Length==107&&catalog.Rewards.Length==11&&catalog.Messages.Length==4,"Full source catalog counts");Check(save.Data.SequenceEqual(before),"Read does not write source bytes");Check(catalog.Usum==(save is SAV7USUM)&&(catalog.Agency is not null)==catalog.Usum,"USUM-only agency gate");
            for(int i=0;i<7;i++){var f=save.Festa.GetFestaFacility(i);Check(catalog.Facilities[i].Type==f.Type&&catalog.Facilities[i].TrainerId==Convert.ToHexString(f.TrainerFesID),"Real facilities and raw trainer ID");}
            foreach(bool introduced in new[]{false,true})
            {
                var source=(SAV7)SaveUtil.GetSaveFile(original.ToArray())!;var f=source.Festa.GetFestaFacility(6);f.IsIntroduced=introduced;f.TrainerFesID.Fill(0xA5);f.OriginalTrainerName="VISITOR";for(int i=0;i<4;i++)f.SetMessage(i,9999);var seeded=source.Write().ToArray();var actual=(SAV7)SaveUtil.GetSaveFile(seeded.ToArray())!;var expected=(SAV7)SaveUtil.GetSaveFile(seeded.ToArray())!;
                FestivalPlazaEditing.DeleteVisitor(actual,6);var oracle=expected.Festa.GetFestaFacility(6);if(oracle.IsIntroduced)oracle.ClearTrainerFesID();oracle.IsIntroduced=false;oracle.OriginalTrainerName="";oracle.Gender=0;for(int i=0;i<4;i++)oracle.SetMessage(i,0);Check(actual.Write().Span.SequenceEqual(expected.Write().Span),"Delete visitor source conditional ID/full-file oracle");
            }
            foreach(string key in new[]{"usedFlags","usedStats","trainerId"})foreach(string text in new[]{"","1","ABC","FFFFFFFF","bad!"})
            {
                var actual=(SAV7)SaveUtil.GetSaveFile(original.ToArray())!;var expected=(SAV7)SaveUtil.GetSaveFile(original.ToArray())!;FestivalPlazaEditing.SetHex(actual,0,key,text);var f=expected.Festa.GetFestaFacility(0);string value=Util.GetOnlyHex(text);if(string.IsNullOrWhiteSpace(value))value="0";if(key=="usedFlags")f.UsedFlags=Util.GetHexValue(value);else if(key=="usedStats")f.UsedRandStat=Util.GetHexValue(value);else{f.TrainerFesID.Clear();Util.GetBytesFromHexString(value,f.TrainerFesID);}Check(actual.Write().Span.SequenceEqual(expected.Write().Span),"Exact source hexadecimal parsing/full-file oracle");
            }
            Check(original.AsSpan().SequenceEqual(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav")),"Original retained");Console.WriteLine($"PASS initial Festival Plaza {version}: full Core catalog, agency gate, conditional visitor deletion/hex full-file oracles and original; complete editing/API/UI pending");
            var working=(SAV7)SaveUtil.GetSaveFile(original.ToArray())!;var expectedSave=(SAV7)SaveUtil.GetSaveFile(original.ToArray())!;var model=new FestivalPlazaActions(working);var state=FestivalPlazaEditing.Read(working,"").Facilities[0] with{Type=0,Color=0,TrainerName="VISITOR",Npc=7,LuckyRank=0,LuckyPlace=0,ExchangeLeft=0};
            model.Apply([new("coins",0,123),new("usedCoins",0,456),new("rank",0,999),new("ownMessage",3,9999),new("allPhrases",0),new("allRewards",0,2),new("date",0,Text:"2050-12-31T23:59:59"),new("name",0,Text:"PLAZA")]);model.Save(0,state);
            for(int i=0;i<107;i++)expectedSave.Festa.SetFestaPhraseUnlocked(i,true);expectedSave.SetRecord(38,456);expectedSave.Festa.FestaCoins=123;expectedSave.Festa.FestaRank=999;expectedSave.Festa.SetFestaMessage(3,9999);expectedSave.Festa.FestaDate=new DateTime(2050,12,31,23,59,59);for(int i=0;i<11;i++)expectedSave.Festa.SetFestaPrizeReceived(i,2);var ef=expectedSave.Festa.GetFestaFacility(0);ef.Type=0;ef.Color=0;ef.OriginalTrainerName="VISITOR";ef.NPC=7;ef.IsIntroduced=state.Introduced;ef.ExchangeLeftCount=0;ef.UsedLuckyRank=ef.UsedLuckyPlace=0;
            if(expectedSave is SAV7USUM)
            {
                // Source full agency save rewrites the current entities and
                // normalizes displayed grade/defeated/trainer controls.
                var a=catalog.Agency!;expectedSave.SetFlag(0x6C55E,1,a.Chosen);var entities=new[]{expectedSave.GetStoredSlot(expectedSave.Data[0x6C200..]),expectedSave.GetPartySlot(expectedSave.Data[0x6C2E8..]),expectedSave.GetPartySlot(expectedSave.Data[0x6C420..])};entities[0].WriteEncryptedDataStored(expectedSave.Data[0x6C200..]);entities[1].WriteEncryptedDataParty(expectedSave.Data[0x6C2E8..]);entities[2].WriteEncryptedDataParty(expectedSave.Data[0x6C420..]);System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(expectedSave.Data[0x6C558..],a.DefeatedPokemon);System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(expectedSave.Data[0x6C55C..],(ushort)((Math.Min(a.Defeated,a.DefeatedMaximum)<<12)|((a.Grade&63)<<6)|(expectedSave.Data[0x6C55C]&63)));for(int i=0;i<3;i++)System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(expectedSave.Data[(0x6C56C+0x14*i)..],(ushort)Math.Min(210,(int)a.Trainers[i]));expectedSave.Festa.FestivalPlazaName="PLAZA";
            }
            Check(working.Write().Span.SequenceEqual(expectedSave.Write().Span),"Independent complete source save order and SM/USUM plaza name behavior");
            Check(FestivalPlazaActions.Prepare(original,[new("coins",0,123),new("usedCoins",0,456),new("rank",0,999),new("ownMessage",3,9999),new("allPhrases",0),new("allRewards",0,2),new("date",0,Text:"2050-12-31T23:59:59"),new("name",0,Text:"PLAZA")],0,state).AsSpan().SequenceEqual(working.Write().Span),"Clone-first complete prepare parity");
            for(int type=0;type<=(save is SAV7USUM?127:124);type++)
            {
                var changed=FestivalPlazaEditing.NormalizeType(state with{Color=7},type,save is SAV7USUM);var actual=FestivalPlazaActions.Prepare(original,[new("type",0,type)],0,state with{Type=type,Color=7});var oracle=(SAV7)SaveUtil.GetSaveFile(original.ToArray())!;var actions=new FestivalPlazaActions(oracle);actions.Apply([new("type",0,type)]);actions.Save(0,changed);Check(actual.AsSpan().SequenceEqual(oracle.Write().Span),"Every source type transition/current color clamp");
            }
            foreach(int rank in new[]{0,9,10,19,20,29,30,39,40,49,50})Check(FestivalPlazaEditing.DefeatedMaximum(rank)==Math.Min(49,rank)/10*3+2,"Exact grade-dependent defeated bound");
            Reject(()=>FestivalPlazaActions.Prepare(original,[new("coins",0,10000000)],0,state));Reject(()=>FestivalPlazaActions.Prepare(original,[new("date",0,Text:"2051-01-01T00:00:00")],0,state));Reject(()=>FestivalPlazaActions.Prepare(original,[new("facilityMessage",7,1,Text:"0")],0,state));
            if(save is SAV7USUM)
            {
                var source=(SAV7)SaveUtil.GetSaveFile(original.ToArray())!;var agency=new FestivalPlazaActions(source);
                for(int i=0;i<3;i++)foreach(bool encrypted in new[]{false,true}){var pk=i==0?source.GetStoredSlot(source.Data[0x6C200..]):source.GetPartySlot(source.Data[(i==1?0x6C2E8:0x6C420)..]);var expected=new byte[pk.SIZE_PARTY];if(encrypted)pk.WriteEncryptedDataParty(expected);else pk.WriteDecryptedDataParty(expected);Check(agency.ExportAgency(i,encrypted).AsSpan().SequenceEqual(expected),"Source SavePKMDialog complete party-size encrypted/decrypted export");}
                agency.Apply([new("agencyGrade",0,10),new("agencyDefeated",0,5)]);Reject(()=>agency.Apply([new("agencyDefeated",0,6)]));Reject(()=>agency.Apply([new("glasses",0,Flag:false)]));
            }
            else Reject(()=>new FestivalPlazaActions(save).Apply([new("agencyChosen",0,Flag:true)]));
            Console.WriteLine($"PASS Festival source save {version}: clone/full-file ordering, dynamic bounds, SM name no-write, USUM party-size agency exports and atomic original");
        }
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Festival Plaza operation accepted");}catch(ArgumentException){}}
}

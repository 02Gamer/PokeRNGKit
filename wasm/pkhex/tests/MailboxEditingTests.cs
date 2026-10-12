// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class MailboxEditingTests
{
    internal static void Run()
    {
        foreach(var language in new[]{LanguageID.English,LanguageID.Japanese,LanguageID.Korean})foreach(var game in new[]{GameVersion.GD,GameVersion.SI,GameVersion.C})
        {
            if(language==LanguageID.Korean&&game==GameVersion.C)continue;
            var seed=new SAV2(language,game);var pokemon=seed.BlankPKM;pokemon.Species=25;pokemon.CurrentLevel=5;seed.PartyData=[pokemon];seed.SetBoxSlotAtIndex(pokemon,0,0);
            var bytes=seed.Write().ToArray();var typed=new SAV2(bytes.ToArray(),language,game);var before=typed.Data.ToArray();var model=new MailboxEditing(typed);var catalog=model.Read(Br4Editing.Hash(bytes));
            Check(catalog.HeldCount==6&&catalog.BoxMaximum==10&&typed.Data.SequenceEqual(before),"Gen2 physical catalog/read immutability");
            var entry=catalog.Entries[6] with{AuthorName="MAIL",Tid=65535,Language=(byte)language,Type=158,Species=25,Lines=["HELLO","WORLD"],UserEntered=true};
            model.Apply([new("boxCount",0,Value:10),new("edit",6,entry)]);model.Save();
            var oracle=new SAV2(bytes.ToArray(),language,game);var mail=new Mail2(oracle,6);mail.AuthorName=entry.AuthorName;mail.AuthorTID=entry.Tid;mail.AuthorLanguage=entry.Language;mail.MailType=entry.Type;mail.AppearPKM=entry.Species;mail.SetMessage(entry.Lines[0],entry.Lines[1],true);mail.CopyTo(oracle);
            int size=Mail2.GetMailSize(oracle.Language),offset=0x600,length=size*6;oracle.Data.Slice(offset,length).CopyTo(oracle.Data.Slice(offset+length,length));offset+=length*2;oracle.Data[offset]=10;length=size*10+1;oracle.Data.Slice(offset,length).CopyTo(oracle.Data.Slice(offset+length,length));oracle.PartyData=oracle.PartyData;
            Check(typed.Write().Span.SequenceEqual(oracle.Write().Span),"Gen2 independent full output and duplicate mailbox blocks");
            Check(bytes.AsSpan().SequenceEqual(before),"Gen2 original unchanged");
            Console.WriteLine($"PASS typed mailbox {game}/{language}: real 16-slot layout, message/author source order, full independent backup/file oracle and original; SaveUtil/public acceptance pending");
        }
        foreach(string version in new[]{"E","D","Pt","HG","B","B2"})
        {
            string path=$".tmp/pkhex-fixtures/{version}.sav";
            var original=File.ReadAllBytes(path);var save=SaveUtil.GetSaveFile(original.ToArray())!;
            var model=new MailboxEditing(save);var catalog=model.Read(Br4Editing.Hash(original));
            Check(catalog.Entries.Length==catalog.HeldCount+catalog.BoxMaximum,"Mailbox physical catalog count");
            Check(save.Write().Span.SequenceEqual(original),"Read preserves complete save");
            int index=catalog.HeldCount;var entry=catalog.Entries[index];
            if(save.Generation==2&&catalog.BoxCount==0){model.Apply([new("boxCount",0,Value:1)]);}
            var edit=entry with { AuthorName="MAIL",Tid=123,Sid=456,Type=save.Generation==2?158:save.Generation==3?121:0,Species=25,Appear=[25,25,25],Message=Enumerable.Repeat((ushort)1,save.Generation==3?9:12).ToArray(),Lines=["HELLO","WORLD"],Language=(byte)catalog.Languages.First(v=>v.Id==2).Id,Version=(byte)(catalog.Versions.FirstOrDefault()?.Id??0),Gender=1,Misc=[1,2,3],Ending=4 };
            if(save.Generation==2)edit=edit with{Version=0,Language=(byte)save.Language};
            model.Apply([new("edit",index,edit)]);model.Save();var output=save.Write().ToArray();
            var oracle=SaveUtil.GetSaveFile(original.ToArray())!;var expectedMail=Mail(oracle,oracle.Generation==3?index:0);
            expectedMail.AuthorName=edit.AuthorName;expectedMail.AuthorTID=edit.Tid;expectedMail.AuthorLanguage=edit.Language;expectedMail.MailType=edit.Type;expectedMail.AuthorSID=edit.Sid;
            int columns=oracle.Generation==3?3:4;for(int i=0;i<edit.Message.Length;i++)expectedMail.SetMessage(i/columns,i%columns,edit.Message[i]);
            if(oracle.Generation==3)expectedMail.AppearPKM=SpeciesConverter.GetInternal3(edit.Species);
            else {expectedMail.AuthorVersion=edit.Version;expectedMail.AuthorGender=(byte)((expectedMail.AuthorGender&0xFE)|edit.Gender);if(expectedMail is Mail4 m4)for(int i=0;i<3;i++)m4.SetAppearSpecies(i,(ushort)(edit.Appear[i]+7));else if(expectedMail is Mail5 m5){for(int i=0;i<3;i++)m5.SetMisc(i,edit.Misc[i]);m5.MessageEnding=edit.Ending;}}
            expectedMail.CopyTo(oracle);oracle.PartyData=oracle.PartyData;
            Check(output.AsSpan().SequenceEqual(oracle.Write().Span),"Independent complete-file all-field source oracle");
            var reread=SaveUtil.GetSaveFile(output.ToArray())!;Check(SaveChecksums.Valid(reread),"Mailbox export checksums");
            var actual=new MailboxEditing(reread).Read(Br4Editing.Hash(output));
            string expectedName="MAIL";
            if(save.Generation==3){var nameOracle=new Mail3();nameOracle.AuthorName="MAIL";expectedName=nameOracle.AuthorName;}
            Check(actual.Entries[index].AuthorName==expectedName&&actual.Entries[index].Tid==123,$"Mailbox author round trip {version}: name=[{actual.Entries[index].AuthorName}], TID={actual.Entries[index].Tid}");
            Check(original.AsSpan().SequenceEqual(File.ReadAllBytes(path)),"Mailbox original unchanged");
            var deletion=MailboxEditing.Prepare(output,[new("delete",index,ModifyHeldItem:false)]);
            var deleteOracle=SaveUtil.GetSaveFile(output.ToArray())!;var reset=Mail(deleteOracle,deleteOracle.Generation==3?15:19);var deleted=Mail(deleteOracle,deleteOracle.Generation==3?index:0);if(deleted is Mail4 d4)d4.SetBlank(reset.AuthorLanguage,reset.AuthorVersion);else if(deleted is Mail5 d5)d5.SetBlank(reset.AuthorLanguage,reset.AuthorVersion);else deleted.SetBlank();deleted.CopyTo(deleteOracle);deleteOracle.PartyData=deleteOracle.PartyData;
            Check(deletion.Output.AsSpan().SequenceEqual(deleteOracle.Write().Span),"Independent complete-file source deletion oracle");
            Reject(()=>MailboxEditing.Prepare(original,[new("edit",index,edit with{AuthorName="12345678"})]));
            Reject(()=>MailboxEditing.Prepare(original,[new("edit",index,edit),new("heldId",999,Value:0)]));
            if(save.Generation==3)
            {
                // The WinForms form swaps MailDetail objects while their offsets
                // remain attached. A subsequent edit writes to the moved object's
                // original physical address; test that behavior, not an assumed
                // swap of the physical bytes.
                var moved=MailboxEditing.Prepare(original,[new("down",6),new("edit",7,edit with{Index=7})]);
                Check(moved.Output.AsSpan().SequenceEqual(output),"Gen3 source object-offset move and subsequent edit");
                Reject(()=>MailboxEditing.Prepare(original,[new("up",6)]));
                Reject(()=>MailboxEditing.Prepare(original,[new("down",15)]));
                var partySeed=SaveUtil.GetSaveFile(original.ToArray())!;var pk=(PK3)partySeed.PartyData[0];pk.HeldItem=121;pk.HeldMailID=0;partySeed.PartyData=[pk];var partyMail=Mail(partySeed,0);partyMail.MailType=121;partyMail.CopyTo(partySeed);var partyBytes=partySeed.Write().ToArray();
                foreach(bool modify in new[]{false,true})
                {
                    var result=MailboxEditing.Prepare(partyBytes,[new("delete",0,ModifyHeldItem:modify)]);var pOracle=SaveUtil.GetSaveFile(partyBytes.ToArray())!;var pMail=Mail(pOracle,0);pMail.SetBlank();pMail.CopyTo(pOracle);var members=pOracle.PartyData;if(modify){members[0].HeldItem=0;((PK3)members[0]).HeldMailID=-1;}pOracle.PartyData=members;
                    Check(result.Output.AsSpan().SequenceEqual(pOracle.Write().Span),"Gen3 explicit linked-item delete source oracle");
                    Check(result.Issues.Contains("party:0:mailId")==!modify,"Source validation exposes retained item after delete");
                }
            }
            Check(original.AsSpan().SequenceEqual(File.ReadAllBytes(path)),"Failed ordered edit preserves original");
            foreach(ushort bound in new ushort[]{0,1,65535})
            {
                var edge=edit with{Tid=bound,Sid=bound,Message=Enumerable.Repeat(bound,edit.Message.Length).ToArray(),Misc=[bound,bound,bound],Ending=bound};
                var prepared=MailboxEditing.Prepare(original,[new("edit",index,edge)]);var loaded=SaveUtil.GetSaveFile(prepared.Output.ToArray())!;var got=new MailboxEditing(loaded).Read(Br4Editing.Hash(prepared.Output)).Entries[index];
                Check(got.Tid==bound&&got.Sid==bound&&got.Message.All(v=>v==bound),"All numeric message/ID UInt16 boundaries");
                if(save.Generation==5)Check(got.Misc.All(v=>v==bound)&&got.Ending==bound,"Gen5 misc/ending UInt16 boundaries");
            }
            Console.WriteLine($"PASS mailbox {version}: actual catalog, all-field and deletion full-file source oracles, read/checksums, bounds/failed batch and original; Gen2/Stadium/party/move coverage pending");
        }
        foreach(bool japanese in new[]{false,true})
        {
            var seed=new SAV2Stadium(new byte[SaveUtil.SIZE_G2STAD],japanese);var original=seed.Write().ToArray();var source=new SAV2Stadium(original.ToArray(),japanese);var model=new MailboxEditing(source);var catalog=model.Read(Br4Editing.Hash(original));
            Check(catalog.HeldCount==30&&catalog.BoxMaximum==50&&catalog.Entries.Length==80&&catalog.Party.Length==0,"Stadium2 real held/mailbox counts");
            var entry=catalog.Entries[30] with{AuthorName="MAIL",Tid=65535,Type=158,Species=25,Lines=["HELLO","WORLD"],UserEntered=true};
            model.Apply([new("boxCount",0,Value:50),new("edit",30,entry)]);model.Save();
            var oracle=new SAV2Stadium(original.ToArray(),japanese);var mail=new Mail2(oracle,30);mail.AuthorName=entry.AuthorName;mail.AuthorTID=entry.Tid;mail.AuthorLanguage=entry.Language;mail.MailType=entry.Type;mail.AppearPKM=entry.Species;mail.SetMessage(entry.Lines[0],entry.Lines[1],true);mail.CopyTo(oracle);oracle.Data[Mail2.GetMailboxOffsetStadium2(oracle.Language)]=50;
            Check(source.Write().Span.SequenceEqual(oracle.Write().Span),"Stadium2 independent full mailbox output");
            Reject(()=>model.Apply([new("up",1)]));
            Console.WriteLine($"PASS typed Stadium2 mailbox JP={japanese}: 80 real slots, all mailbox bytes/count and independent output; recognition/real-save pending");
        }
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static MailDetail Mail(SaveFile s,int index)=>s switch{SAV3 s3=>s3.LargeBlock.GetMail(index),SAV4 s4=>s4.GetMail(index),SAV5 s5=>s5.GetMail(index),_=>throw new Exception("Unsupported oracle")};
    private static void Reject(Action action){try{action();throw new Exception("Invalid mailbox operation accepted");}catch(ArgumentException){}}
}

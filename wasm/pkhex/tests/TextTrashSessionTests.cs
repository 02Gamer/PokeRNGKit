// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
using System.Buffers.Binary;

internal static class TextTrashSessionTests
{
    internal static void Run() {
        foreach(PKM entity in new PKM[]{new PK1(),new PK1(true),new PK2(),new PK2(true),new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()}) {
            entity.Species=25;entity.Language=entity is GBPKM g&&g.Japanese?1:2;string sample=entity is GBPKM gb&&gb.Japanese?"ア":"A";entity.Nickname=sample+sample;entity.OriginalTrainerName=sample+sample;entity.RefreshChecksum();
            foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true}) {
                byte[] input=StandalonePokemon.Serialize(entity,party,encrypted),original=input.ToArray();var opened=StandalonePokemon.Open(input,"."+entity.Extension,encrypted,true);
                foreach(string field in new[]{"nickname","originalTrainer","handlingTrainer"}) {
                    if(PokemonTextTrash.Buffer(opened.Entity,field).Length==0)continue;
                    var target=new TextTrashTarget("file",field,FileName:"entity."+entity.Extension,InputEncrypted:encrypted,UseFileFormat:true);
                    var catalog=TextTrashSession.Read(input,target);var request=new TextTrashRequest(catalog.SourceHash,target,sample+sample,[new("text",sample),new("clear")]);
                    var draft=TextTrashSession.Draft(input,request);var ticket=TextTrashSession.Prepare(input,request);
                    var expected=opened.Entity.Clone();SetName(expected,field,sample+sample);var raw=PokemonTextTrash.Buffer(expected,field);byte[] temporary=new byte[raw.Length];int count=expected.SetString(temporary,sample,1,StringConverterOption.None);temporary.AsSpan(0,count).CopyTo(raw);raw[count..].Clear();expected.RefreshChecksum();
                    Check(TextTrashSession.Commit(input,Confirm(ticket)).AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected,opened.Party,false)),"Independent complete file oracle");
                    Check(ticket.Result.StoredHex==draft.Hex&&ticket.ChangedNameBytes.All(i=>ticket.Before.StoredHex.AsSpan(i*2,2).SequenceEqual(ticket.Result.StoredHex.AsSpan(i*2,2))==false),"Actual stored name diff");
                    Reject(()=>TextTrashSession.Commit(input,Confirm(ticket)));
                    var stale=TextTrashSession.Prepare(input,request);var wrong=Confirm(stale) with{Target=target with{Field=field=="nickname"?"originalTrainer":"nickname"}};Reject(()=>TextTrashSession.Commit(input,wrong));
                    byte[] changed=input.ToArray();changed[^1]^=1;Reject(()=>TextTrashSession.Commit(changed,Confirm(stale)));
                    var replacement=TextTrashSession.Prepare(input,request);TextTrashSession.Discard(stale.Token);Reject(()=>TextTrashSession.Commit(input,Confirm(stale)));TextTrashSession.Commit(input,Confirm(replacement));
                    var canceled=TextTrashSession.Prepare(input,request);TextTrashSession.Discard(canceled.Token);Reject(()=>TextTrashSession.Commit(input,Confirm(canceled)));
                    var failed=TextTrashSession.Prepare(input,request);Reject(()=>TextTrashSession.Prepare(input,request with{Events=[new("unknown")]}));Reject(()=>TextTrashSession.Commit(input,Confirm(failed)));
                    Check(input.AsSpan().SequenceEqual(original),"Input file preserved");
                    string targetJson=JsonSerializer.Serialize(target,SaveJsonContext.Default.TextTrashTarget),requestJson=JsonSerializer.Serialize(request,SaveJsonContext.Default.TextTrashRequest);
                    var publicRead=JsonSerializer.Deserialize(SaveService.ReadTextTrash(input,targetJson),SaveJsonContext.Default.TextTrashCatalog)!;Check(publicRead.StoredHex==catalog.StoredHex&&publicRead.SourceHash==catalog.SourceHash,"Public required JSON catalog");
                    var publicDraft=JsonSerializer.Deserialize(SaveService.DraftTextTrash(input,requestJson),SaveJsonContext.Default.TextTrashDraft)!;Check(publicDraft.Hex==draft.Hex,"Public draft order");
                    var publicTicket=JsonSerializer.Deserialize(SaveService.PreviewTextTrash(input,requestJson),SaveJsonContext.Default.TextTrashTicket)!;Check(SaveService.CommitTextTrash(input,JsonSerializer.Serialize(Confirm(publicTicket),SaveJsonContext.Default.TextTrashConfirmation)).AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected,opened.Party,false)),"Public frozen full file");
                    var failedJson=TextTrashSession.Prepare(input,request);Reject(()=>SaveService.PreviewTextTrash(input,"{}"));Reject(()=>TextTrashSession.Commit(input,Confirm(failedJson)));
                    Reject(()=>JsonSerializer.Deserialize("{}",SaveJsonContext.Default.TextTrashTarget));Reject(()=>JsonSerializer.Deserialize("{}",SaveJsonContext.Default.TextTrashEvent));Reject(()=>JsonSerializer.Deserialize("{}",SaveJsonContext.Default.TextTrashConfirmation));
                }
                Console.WriteLine($"PASS Text file {entity.GetType().Name}/party={party}/encrypted={encrypted}: independent full output, name byte differences, target/source-bound one-time/stale/replaced/cancel/failed preview and original");
            }
        }
        Saves();
        LockedSave();
    }
    private static void Saves() {
        foreach(string version in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"}) {
            var seed=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var first=seed.GetBoxSlotAtIndex(0,0);if(first.Species==0||!first.Valid||!first.ChecksumValid){first=seed.BlankPKM;first.Species=25;first.Language=2;first.Nickname="TEST";first.OriginalTrainerName="TEST";first.CurrentLevel=25;first.ResetPartyStats();first.RefreshChecksum();seed.SetBoxSlotAtIndex(first,0,0,EntityImportSettings.None);}
            if(seed is SAV7b&&seed.PartyCount==0){var headerCopy=new SAV7b(seed.Write().ToArray());BinaryPrimitives.WriteUInt16LittleEndian(headerCopy.Blocks.Storage.Data,0);seed=new SAV7b(headerCopy.Data.ToArray());Check(seed.PartyCount==1,"LGPE fixture party pointer aliases occupied box slot");}
            foreach(int box in new[]{0,-1}) {
                if(box==-1&&seed.PartyCount==0)continue;
                byte[] input=seed.Write().ToArray(),original=input.ToArray();var source=SaveUtil.GetSaveFile(input.ToArray())!;
                int sourceBox=box,sourceSlot=0;
                if(box==-1&&source is SAV7b){int index=(source.GetPartyOffset(0)-source.GetBoxSlotOffset(0,0))/source.SIZE_BOXSLOT;Check(index>=0&&index<source.BoxCount*source.BoxSlotCount,"LGPE team pointer maps to a real physical slot");sourceBox=index/source.BoxSlotCount;sourceSlot=index%source.BoxSlotCount;}
                var entity=PokemonEditing.Read(source,sourceBox,sourceSlot);
                foreach(string field in new[]{"nickname","originalTrainer","handlingTrainer"}) {
                    if(PokemonTextTrash.Buffer(entity,field).Length==0)continue;
                    var target=new TextTrashTarget("save",field,Box:sourceBox,Slot:sourceSlot);var catalog=TextTrashSession.Read(input,target);var request=new TextTrashRequest(catalog.SourceHash,target,"AA",[new("text","A"),new("clear")]);
                    var expectedEntity=entity.Clone();SetName(expectedEntity,field,"AA");var raw=PokemonTextTrash.Buffer(expectedEntity,field);byte[] temporary=new byte[raw.Length];int count=expectedEntity.SetString(temporary,"A",1,StringConverterOption.None);temporary.AsSpan(0,count).CopyTo(raw);raw[count..].Clear();expectedEntity.RefreshChecksum();
                    var expected=source.Clone();if(sourceBox==-1)expected.SetPartySlotAtIndex(expectedEntity,sourceSlot,EntityImportSettings.None);else expected.SetBoxSlotAtIndex(expectedEntity,sourceBox,sourceSlot,EntityImportSettings.None);
                    var ticket=TextTrashSession.Prepare(input,request);byte[] output=TextTrashSession.Commit(input,Confirm(ticket));
                    Check(output.AsSpan().SequenceEqual(expected.Write().ToArray()),"Save complete independent output oracle");var reopened=SaveUtil.GetSaveFile(output.ToArray())!;
                    Check(reopened.GetType()==source.GetType()&&SaveChecksums.Valid(reopened)&&reopened.PartyCount==source.PartyCount,"Save format/checksums/party count");
                    var positions=Enumerable.Range(0,source.BoxCount).SelectMany(b=>Enumerable.Range(0,source.BoxSlotCount).Select(s=>new PokemonPosition(b,s))).Concat(Enumerable.Range(0,source.PartyCount).Select(s=>new PokemonPosition(-1,s)));
                    int editedOffset=sourceBox==-1?source.GetPartyOffset(sourceSlot):source.GetBoxSlotOffset(sourceBox,sourceSlot);
                    foreach(var position in positions){int positionOffset=position.Box==-1?source.GetPartyOffset(position.Slot):source.GetBoxSlotOffset(position.Box,position.Slot);if(positionOffset!=editedOffset)Check(StorageEditing.StoredData(source,position).SequenceEqual(StorageEditing.StoredData(reopened,position)),"Other physical box/party payload preserved");}
                    Check(input.AsSpan().SequenceEqual(original),"Save input preserved");
                    if(source is SAV7b&&box==-1)Check(PokemonTextTrash.Buffer(reopened.GetPartySlotAtIndex(0),field).SequenceEqual(PokemonTextTrash.Buffer(expectedEntity,field)),"LGPE team sees edited shared name buffer");
                }
                Console.WriteLine($"PASS Text save {version}/box={box}: public recognition, all existing text buffers, independent whole file, all other slots/party, checksums and original; synthetic fixture only");
            }
        }
    }
    private static void LockedSave(){var save=(SAV7)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/US.sav"))!;save.BoxLayout.ClearBattleTeams();save.BoxLayout.TeamSlots[0]=0;save.BoxLayout.SetIsTeamLocked(0,true);byte[] input=save.Write().ToArray(),original=input.ToArray();var target=new TextTrashTarget("save","nickname",Box:0,Slot:0);var catalog=TextTrashSession.Read(input,target);Check(!catalog.CanEdit&&catalog.Generation==7,"Locked name catalog is read-only with source generation");string json=SaveService.ReadTextTrash(input,JsonSerializer.Serialize(target,SaveJsonContext.Default.TextTrashTarget));Check(!JsonDocument.Parse(json).RootElement.GetProperty("canEdit").GetBoolean(),"Public read-only capability");Reject(()=>TextTrashSession.Prepare(input,new(catalog.SourceHash,target,catalog.StoredText,[new("clear")])));Check(input.AsSpan().SequenceEqual(original),"Locked original preserved");}
    private static TextTrashConfirmation Confirm(TextTrashTicket t)=>new(t.Token,t.SourceHash,t.TargetHash,t.Target);
    private static void SetName(PKM entity,string field,string text){switch(field){case "nickname":entity.Nickname=text;break;case "originalTrainer":entity.OriginalTrainerName=text;break;default:entity.HandlingTrainerName=text;break;}}
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid Text session accepted");}
}

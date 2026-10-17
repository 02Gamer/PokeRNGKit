// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class ExtraSlotTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid extra operation accepted.");}
    private static void Mode(bool hax){SaveProgramSettingsRuntime.Reset();var s=SaveProgramSettingsCodec.Defaults();s.Startup.ForceHaXOnLaunch=hax;SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(s,SaveProgramSettingsJson.Default.SaveProgramSettings));}
    internal static void Run()
    {
        PokemonEditorContext.Clear();
        try
        {
            foreach(var language in new[]{LanguageID.English,LanguageID.Japanese,LanguageID.Korean})Catalog(new SAV2(language,GameVersion.C));
            Catalog(new SAV3FRLG());Catalog(new SAV3FRLG(true));Catalog(new SAV8LA());
            foreach(var version in new[]{GameVersion.SW,GameVersion.SH})for(int revision=0;revision<3;revision++)Catalog(new SAV8SWSH(SwshBlockFixtureTests.Create(version,revision)));
            foreach(string name in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","GP","BD"})foreach(bool hax in new[]{false,true})
            {
                Mode(hax);byte[] input=File.ReadAllBytes(".tmp/pkhex-fixtures/"+name+".sav"),before=input.ToArray();
                var save=SaveService.OpenDatabaseSave(input);var slots=save.GetExtraSlots(hax);var report=ExtraSlots.Read(save,input);
                Check(report.Slots.Length==slots.Count&&report.SourceHash==Br4Editing.Hash(input),"Extra catalog source/count");
                for(int i=0;i<slots.Count;i++)
                {
                    var expected=slots[i];var actual=report.Slots[i];
                    Check(actual.Key==ExtraSlots.Key(expected)&&actual.CanWrite==expected.CanWriteTo(save)&&actual.HideLegality==expected.HideLegality,"Actual extra identity and permissions");
                    Check(actual.Pokemon.Species==expected.Read(save).Species,"Core entity is read from its actual extra slot");
                    Check(actual.Name.Zh.Length>0&&actual.Name.En.Length>0&&actual.Name.Ja.Length>0,"Three-language extra label");
                    PokemonEditorContext.BindExtra(save,actual.Key);
                    Check(PokemonEditorContext.Extra==actual.Key&&PokemonEditorContext.Source is null,"Extra editor context never impersonates a regular slot");
                    PokemonEditorContext.Clear();
                }
                Check(input.SequenceEqual(before),"Extra reads preserve input");
                Console.WriteLine($"PASS extra catalog {name}/HaX={hax}: actual Core slots, widths, permissions, context and original");
            }
            Mode(false);var source=File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav");var original=source.ToArray();var sav=SaveService.OpenDatabaseSave(source);
            var target=sav.GetExtraSlots().Single(s=>s.Mutable);var key=ExtraSlots.Key(target);var p=sav.GetBoxSlotAtIndex(0,0);
            if(p is PK6 memory)memory.HandlingTrainerMemory=1;
            var file=new PokemonFile("editor."+p.Extension,Convert.ToBase64String(StandalonePokemon.Serialize(p,true,false)));
            var request=new ExtraSlotWriteRequest(Br4Editing.Hash(source),key,file,new("extra",[]));
            string json=JsonSerializer.Serialize(request,ExtraSlotJson.Default.ExtraSlotWriteRequest);
            var ticket=JsonSerializer.Deserialize(Program.PreviewExtraSlot(source,json),ExtraSlotJson.Default.ExtraSlotPreview)!;
            var confirmation=new ExtraSlotConfirmation(ticket.Token,ticket.SourceHash,ticket.TargetHash,true);
            string confirm=JsonSerializer.Serialize(confirmation,ExtraSlotJson.Default.ExtraSlotConfirmation);
            var output=Program.CommitExtraSlot(source,confirm);var reopened=SaveService.OpenPreparedOutput(output);
            Check(ExtraSlots.Resolve(reopened,key).Read(reopened).Species==p.Species&&SaveChecksums.Valid(reopened),"Frozen extra write survives complete export");
            Check(Br4Editing.Hash(output)==ticket.TargetHash&&source.SequenceEqual(original),"Frozen output and original");
            Reject(()=>Program.CommitExtraSlot(source,confirm));
            var locked=sav.GetExtraSlots().First(s=>!s.Mutable);
            Reject(()=>ExtraSlotSession.Prepare(sav,source,request with{Target=ExtraSlots.Key(locked)},SaveService.OpenPreparedOutput));
            Reject(()=>ExtraSlots.Decode("{\"type\":5,\"slot\":0,\"partyFormat\":false,\"box\":0}"));
            Reject(()=>ExtraSlots.Decode("{\"type\":5,\"type\":5,\"slot\":0,\"partyFormat\":false}"));
            ExtraSlotPreview Preview()=>ExtraSlotSession.Prepare(sav,source,request,SaveService.OpenPreparedOutput);
            string Confirm(ExtraSlotPreview value)=>JsonSerializer.Serialize(new ExtraSlotConfirmation(value.Token,value.SourceHash,value.TargetHash,true),ExtraSlotJson.Default.ExtraSlotConfirmation);
            var stale=Preview();var replacement=Preview();
            Reject(()=>ExtraSlotSession.Commit(source,Confirm(stale)));
            Reject(()=>ExtraSlotSession.Commit(source,Confirm(replacement)));
            var discarded=Preview();ExtraSlotSession.Discard(discarded.Token);
            Reject(()=>ExtraSlotSession.Commit(source,Confirm(discarded)));
            var retained=Preview();ExtraSlotSession.Discard("extra:unrelated");
            Check(Br4Editing.Hash(ExtraSlotSession.Commit(source,Confirm(retained)))==retained.TargetHash,"Unrelated discard preserves current frozen output");
            var policy=Preview();Mode(true);
            Reject(()=>ExtraSlotSession.Commit(source,Confirm(policy)));Mode(false);
            var failed=Preview();
            Reject(()=>ExtraSlotSession.Prepare(sav,source,request with{Target=ExtraSlots.Key(locked)},SaveService.OpenPreparedOutput));
            Reject(()=>ExtraSlotSession.Commit(source,Confirm(failed)));
            var changed=Preview();var changedSource=source.ToArray();changedSource[0]^=1;
            Reject(()=>ExtraSlotSession.Commit(changedSource,Confirm(changed)));
            Check(source.SequenceEqual(original),"Rejected confirmations preserve the original source");
            Console.WriteLine("PASS extra write X: frozen complete file, original, readonly targets and strict identities");
            Console.WriteLine("PASS extra lifecycle: replacement, one-time failure, discard, policy changes, failed preview and stale source");
            for(int revision=0;revision<3;revision++)
            {
                Typed(new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL,revision)),bytes=>new SAV9SV(bytes.ToArray()),revision);
                Typed(new SAV9ZA(Trainer9aEditingTests.Create(revision)),bytes=>new SAV9ZA(bytes.ToArray()),revision);
            }
        }
        finally{ExtraSlotSession.Clear();PokemonEditorContext.Clear();SaveProgramSettingsRuntime.Reset();}
    }
    private static void Catalog(SaveFile save)
    {
        // A blank Gen III object has no selected sector group and cannot be
        // exported as a full game save. This case checks read-only slot layout.
        var input=save is SAV3?save.Data.ToArray():save.Write().ToArray();
        foreach(bool hax in new[]{false,true})
        {
            Mode(hax);var slots=save.GetExtraSlots(hax);var before=slots.Select(slot=>slot.Data.ToArray()).ToArray();var result=ExtraSlots.Read(save,input);
            Check(result.Slots.Length==slots.Count,"Typed extra catalog matches Core enumeration");
            for(int i=0;i<slots.Count;i++)
            {
                Check(result.Slots[i].Key==ExtraSlots.Key(slots[i])&&result.Slots[i].CanWrite==slots[i].CanWriteTo(save),"Typed extra identity and permissions match Core");
                Check(slots[i].Data.Span.SequenceEqual(before[i]),"Typed extra reads do not decrypt or alter original slot bytes");
            }
            Console.WriteLine($"PASS extra typed catalog {save.GetType().Name}/{save.Version}/HaX={hax}: Core enumeration, permissions and source slot preservation; synthetic only");
        }
    }
    private static void Typed(SaveFile save,Func<byte[],SaveFile> reopen,int revision)
    {
        // Kitakami dex registration chooses a random displayed gender through
        // PersonalInfo.RandomGender. Use an available genderless SV species so
        // independent Core writes still provide an exact complete-file oracle.
        Mode(false);var p=save.BlankPKM;p.Species=(ushort)(save is SAV9SV?81:25);p.Language=2;p.Version=save.Version;p.Nickname="TEST";p.OriginalTrainerName="OWNER";p.CurrentLevel=20;p.EncryptionConstant=0x12345678;p.RefreshChecksum();
        Check(save.Personal.IsPresentInGame(p.Species,0),"Typed extra species is present in the actual game");
        if(save is SAV9SV)Check(p.PersonalInfo.Gender==255,"SV whole-file oracle uses deterministic dex display gender");
        SlotInfoMisc slot;
        if(save is SAV9ZA za)
        {
            slot=new(za.Blocks.GetBlock(SaveBlockAccessor9ZA.KStoredEventEntity).Raw.Slice(8,save.SIZE_PARTY),0,true,true){Type=StorageSlotType.Scripted};
            slot.WriteTo(save,p.Clone(),EntityImportSettings.None);
        }
        else {slot=save.GetExtraSlots().Single(s=>s.Mutable);slot.WriteTo(save,p.Clone(),EntityImportSettings.None);}
        var input=save.Write().ToArray();var original=input.ToArray();var source=reopen(input);
        var key=ExtraSlots.Key(slot);var data=StandalonePokemon.Serialize(p.Clone(),true,false);
        var request=new ExtraSlotWriteRequest(Br4Editing.Hash(input),key,new("editor."+p.Extension,Convert.ToBase64String(data)),new("typed",[]));
        var expected=PokemonEditorContext.CloneSave(source);var finalized=p.Clone();EditorFinalizingReference.Apply(finalized,SaveFile.SetUpdateSettings.UpdateToSaveFile==EntityImportOption.Enable);ExtraSlots.Resolve(expected,key).WriteTo(expected,finalized);
        var oracle=expected.Write().ToArray();
        var preview=ExtraSlotSession.Prepare(source,input,request,reopen);
        var confirmation=new ExtraSlotConfirmation(preview.Token,preview.SourceHash,preview.TargetHash,true);
        var output=ExtraSlotSession.Commit(input,JsonSerializer.Serialize(confirmation,ExtraSlotJson.Default.ExtraSlotConfirmation));
        if(!output.SequenceEqual(oracle))
        {
            File.WriteAllBytes($".tmp/extra-actual-{save.GetType().Name}-{revision}.sav",output);
            File.WriteAllBytes($".tmp/extra-expected-{save.GetType().Name}-{revision}.sav",oracle);
            var actualP=ExtraSlots.Resolve(reopen(output),key).Read(reopen(output));
            var expectedP=ExtraSlots.Resolve(reopen(oracle),key).Read(reopen(oracle));
            Console.WriteLine($"Extra mismatch {save.GetType().Name}/{revision}: lengths {output.Length}/{oracle.Length}, entity equal={actualP.Data.SequenceEqual(expectedP.Data)}, first={Enumerable.Range(0,Math.Min(output.Length,oracle.Length)).FirstOrDefault(i=>output[i]!=oracle[i],-1)}");
            for(int i=0;i<Math.Min(actualP.Data.Length,expectedP.Data.Length);i++)if(actualP.Data[i]!=expectedP.Data[i])Console.WriteLine($"PKM offset {i:X}: actual={actualP.Data[i]:X2}, expected={expectedP.Data[i]:X2}");
            if(reopen(output) is SAV9SV actualSave&&reopen(oracle) is SAV9SV expectedSave)
                foreach(var block in actualSave.AllBlocks)
                {
                    var other=expectedSave.Blocks.GetBlock(block.Key);
                    if(!block.Data.SequenceEqual(other.Data))
                    {
                        Console.WriteLine($"Block mismatch {block.Key:X8}: {block.Data.Length}/{other.Data.Length}");
                        for(int i=0;i<Math.Min(block.Data.Length,other.Data.Length);i++)if(block.Data[i]!=other.Data[i])Console.WriteLine($"Block {block.Key:X8} offset {i:X}: {block.Data[i]:X2}/{other.Data[i]:X2}");
                    }
                }
        }
        Check(output.SequenceEqual(oracle),"Typed extra full-file oracle");
        Check(input.SequenceEqual(original)&&SaveChecksums.Valid(reopen(output)),"Typed extra source and checksum preservation");
        Mode(true);
        var empty=reopen(input).BlankPKM;
        var clear=request with{EditorFile=new("empty."+empty.Extension,Convert.ToBase64String(PokemonEditorMode.Snapshot(empty)))};
        var cleared=ExtraSlotSession.Prepare(reopen(input),input,clear,reopen);
        var clearedBytes=ExtraSlotSession.Commit(input,JsonSerializer.Serialize(new ExtraSlotConfirmation(cleared.Token,cleared.SourceHash,cleared.TargetHash,true),ExtraSlotJson.Default.ExtraSlotConfirmation));
        Check(cleared.Clear&&SaveChecksums.Valid(reopen(clearedBytes)),"Typed clear keeps a valid complete file including disappearing ZA entries");
        Check(input.SequenceEqual(original),"Typed extra operations preserve caller bytes");
        Console.WriteLine($"PASS extra typed {save.GetType().Name}/revision{revision}: exact complete-file oracle, mutable write, HaX clear and original; synthetic fixture only");
    }
}

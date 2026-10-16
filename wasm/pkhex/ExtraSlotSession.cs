// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;
internal sealed record ExtraSlotWriteRequest([property:JsonRequired]string SourceHash,[property:JsonRequired]ExtraSlotKey Target,[property:JsonRequired]PokemonFile EditorFile,[property:JsonRequired]PokemonDraftCapture Capture);
internal sealed record ExtraSlotConfirmation([property:JsonRequired]string Token,[property:JsonRequired]string SourceHash,[property:JsonRequired]string TargetHash,[property:JsonRequired]bool AllowCompatibility);
internal sealed record ExtraSlotPreview(string Token,string SourceHash,string TargetHash,ExtraSlotKey Target,LocalizedText Name,PokemonEntry Pokemon,PokemonFile EditorFile,LocalizedText[] Compatibility,bool Clear,bool Overwrite,int ChangedBytes);
internal static class ExtraSlotSession
{
    private sealed record Pending(string Token,string SourceHash,string TargetHash,string Policy,byte[] Output,bool Warnings);
    private static Pending? current;private static long revision;
    internal static void Clear()=>current=null;
    internal static void Discard(string token){if(current?.Token==token)Clear();}
    internal static ExtraSlotPreview Prepare(byte[] input,string json)
    {
        Clear();if(json is null||json.Length is 0 or >1048576)throw new ArgumentException("Extra slot preview exceeds limits.");
        using var doc=JsonDocument.Parse(json);PokemonSetSession.Unique(doc.RootElement);
        var request=JsonSerializer.Deserialize(json,ExtraSlotJson.Default.ExtraSlotWriteRequest)??throw new ArgumentException("Missing extra slot preview.");
        return Prepare(SaveService.OpenDatabaseSave(input),input,request,SaveService.OpenPreparedOutput);
    }
    internal static ExtraSlotPreview Prepare(SaveFile source,byte[] input,ExtraSlotWriteRequest request,Func<byte[],SaveFile> reopen)
    {
        Clear();SavePokemonEditing.Require(source);
        string hash=Br4Editing.Hash(input);
        if(request is null||request.SourceHash!=hash||request.Target is null||request.EditorFile is null||request.Capture is null)throw new ArgumentException("Extra slot preview is stale.");
        var target=ExtraSlots.Resolve(source,request.Target);
        if(!target.CanWriteTo(source))throw new ArgumentException("Extra slot is read-only.");
        var buffer=request.EditorFile;
        if(buffer.Data is null||buffer.Data.Length is 0 or >1048576||buffer.FileName is null||buffer.FileName.Length>1024)throw new ArgumentException("Invalid extra editor buffer.");
        byte[] data;try{data=Convert.FromBase64String(buffer.Data);}catch(FormatException){throw new ArgumentException("Invalid extra editor buffer.");}
        var opened=StandalonePokemon.Open(data,buffer.FileName,useFileFormat:true);var original=opened.Entity;
        if(original.GetType()!=source.PKMType)throw new ArgumentException("Extra editor format conflicts with the save.");
        if(original is GBPKM gb&&source.BlankPKM is GBPKM layout&&(gb.Japanese!=layout.Japanese||gb.Korean!=layout.Korean))throw new ArgumentException("Extra editor encoding conflicts with the save.");
        var p=PokemonDraftPreparing.PrepareExtra(source,original,target,request.Capture,opened.Party);
        if(target.CanWriteTo(source,p)!=WriteBlockedMessage.None)throw new ArgumentException("Extra slot write is unavailable.");
        string[] en=BattlePass4Editing.Compatibility(source,p,"en"),zh=BattlePass4Editing.Compatibility(source,p,"zh-Hans"),ja=BattlePass4Editing.Compatibility(source,p,"ja");
        if(en.Length!=zh.Length||en.Length!=ja.Length)throw new InvalidOperationException("Extra compatibility languages differ.");
        var warnings=Enumerable.Range(0,en.Length).Select(i=>new LocalizedText(zh[i],en[i],ja[i])).ToArray();
        var file=new PokemonFile("prepared."+p.Extension,Convert.ToBase64String(StandalonePokemon.Serialize(p.Clone(),true,false)));
        bool overwrite=target.Read(source).Species!=0;
        var scratch=PokemonEditorContext.CloneSave(source);var slot=ExtraSlots.Resolve(scratch,request.Target);
        if(!slot.CanWriteTo(scratch)||!slot.WriteTo(scratch,p.Clone()))throw new ArgumentException("Extra slot write was rejected.");
        int width=slot.PartyFormat?scratch.SIZE_PARTY:scratch.SIZE_STORED;
        byte[] expected=slot.Data.Span[..width].ToArray();
        var actual=slot.Read(scratch);
        byte[] output=scratch.Write().ToArray();var checkedSave=reopen(output.ToArray());
        var checkedSlot=VerificationSlot(checkedSave,request.Target,p.Species==0);
        if(output.Length!=input.Length||checkedSave.GetType()!=source.GetType()||!SaveChecksums.Valid(checkedSave)||!checkedSlot.Data.Span[..width].SequenceEqual(expected))throw new InvalidOperationException("Extra slot export verification failed.");
        string token="extra:"+(++revision).ToString(System.Globalization.CultureInfo.InvariantCulture),targetHash=Br4Editing.Hash(output);
        current=new(token,hash,targetHash,PokemonSetSession.Policy(),output,warnings.Length!=0);
        int changed=0;for(int i=0;i<input.Length;i++)if(input[i]!=output[i])changed++;
        return new(token,hash,targetHash,request.Target,ExtraSlots.Read(source,input).Slots.Single(e=>e.Key==request.Target).Name,
            PokemonReader.Read(actual,slot.PartyFormat?-1:0,slot.Slot),file,warnings,p.Species==0,overwrite,changed);
    }
    private static SlotInfoMisc VerificationSlot(SaveFile save,ExtraSlotKey key,bool cleared)
    {
        // ZA enumeration stops at the first empty event record. Clearing that
        // record must still verify its original physical bytes after reloading.
        if(cleared&&save is SAV9ZA za&&key.Type==(int)StorageSlotType.Scripted&&key.PartyFormat&&(uint)key.Slot<128)
            return new(za.Blocks.GetBlock(SaveBlockAccessor9ZA.KStoredEventEntity).Raw.Slice(key.Slot*0x1A8+8,za.SIZE_PARTY),key.Slot,true,true){Type=StorageSlotType.Scripted};
        return ExtraSlots.Resolve(save,key);
    }
    internal static byte[] Commit(byte[] input,string json)
    {
        var pending=current;Clear();
        if(json is null||json.Length>4096)throw new ArgumentException("Extra slot confirmation exceeds limits.");
        using var doc=JsonDocument.Parse(json);PokemonSetSession.Unique(doc.RootElement);
        var confirmation=JsonSerializer.Deserialize(json,ExtraSlotJson.Default.ExtraSlotConfirmation)??throw new ArgumentException("Missing extra slot confirmation.");
        if(pending is null||confirmation.Token!=pending.Token||confirmation.SourceHash!=pending.SourceHash||confirmation.TargetHash!=pending.TargetHash||Br4Editing.Hash(input)!=pending.SourceHash||PokemonSetSession.Policy()!=pending.Policy||pending.Warnings&&!confirmation.AllowCompatibility)throw new ArgumentException("Extra slot confirmation is stale or incompatible.");
        return pending.Output.ToArray();
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonSetRequest([property:JsonRequired]string SourceHash,[property:JsonRequired]string Scope,[property:JsonRequired]PokemonPosition Source,[property:JsonRequired]PokemonPosition Target,[property:JsonRequired]PokemonDraftCapture Capture,PokemonFile? EditorFile=null);
internal sealed record PokemonSetConfirmation([property:JsonRequired]string Token,[property:JsonRequired]string SourceHash,[property:JsonRequired]string TargetHash,[property:JsonRequired]bool AllowCompatibility);
internal sealed record PokemonSetTicket(string Token,string SourceHash,string TargetHash,PokemonPosition Source,PokemonPosition Target,PokemonEntry Pokemon,PokemonFile EditorFile,LocalizedText[] Compatibility,bool Overwrite,int ChangedBytes,bool Clear=false);
internal static class PokemonSetSession
{
    private sealed record Pending(string Token,string SourceHash,string TargetHash,string Policy,byte[] Output,bool Warnings);
    private static Pending? current;
    private static long revision;
    private static string Policy()
    {
        string json=JsonSerializer.Serialize(SaveProgramSettingsRuntime.Current??SaveProgramSettingsCodec.Defaults(),SaveProgramSettingsJson.Default.SaveProgramSettings);
        var settings=SaveFile.SetUpdateSettings;
        return Br4Editing.Hash(Encoding.UTF8.GetBytes(json+"|"+(int)settings.UpdateToSaveFile+"|"+(int)settings.UpdatePokeDex+"|"+(int)settings.UpdateRecord));
    }
    internal static void Unique(JsonElement element)
    {
        if(element.ValueKind==JsonValueKind.Object){var names=new HashSet<string>(StringComparer.Ordinal);foreach(var property in element.EnumerateObject()){if(!names.Add(property.Name))throw new ArgumentException("Duplicate editor request field.");Unique(property.Value);}}
        else if(element.ValueKind==JsonValueKind.Array)foreach(var value in element.EnumerateArray())Unique(value);
    }
    internal static PokemonSetRequest Decode(string json)
    {
        if(json is null||json.Length is 0 or >1048576)throw new ArgumentException("Prepared Pokemon request exceeds limits.");
        using var document=JsonDocument.Parse(json);Unique(document.RootElement);
        return JsonSerializer.Deserialize(json,PokemonSetJson.Default.PokemonSetRequest)??throw new ArgumentException("Missing prepared Pokemon request.");
    }
    internal static PokemonSetTicket Prepare(byte[] input,string json){current=null;return Prepare(input,Decode(json));}
    internal static PokemonSetTicket Prepare(byte[] input,PokemonSetRequest request){current=null;return Prepare(SaveService.OpenDatabaseSave(input),input,request,SaveService.OpenPreparedOutput);}
    internal static PokemonSetTicket Prepare(SaveFile source,byte[] input,PokemonSetRequest request,Func<byte[],SaveFile> reopen)
    {
        current=null;SavePokemonEditing.Require(source);
        string hash=Br4Editing.Hash(input);
        if(request is null||request.Capture is null||request.SourceHash!=hash||request.Scope!=request.Capture.Scope||request.Source is null||request.Target is null)throw new ArgumentException("Editor snapshot is stale or incomplete.");
        if(request.Source.Box==-1){if(!source.HasParty||(uint)request.Source.Slot>=6)throw new ArgumentException("Invalid editor source.");}
        else if((uint)request.Source.Box>=source.BoxCount||(uint)request.Source.Slot>=source.BoxSlotCount)throw new ArgumentException("Invalid editor source.");
        PKM original;bool? editorParty=null;
        if(request.EditorFile is{} buffer)
        {
            if(buffer.Data is null||buffer.Data.Length>1024*1024)throw new ArgumentException("Editor buffer is too large.");
            byte[] bytes;try{bytes=Convert.FromBase64String(buffer.Data);}catch(FormatException){throw new ArgumentException("Invalid editor buffer.");}
            var opened=StandalonePokemon.Open(bytes,buffer.FileName,useFileFormat:true);original=opened.Entity;editorParty=opened.Party;
            // SK2 has one fixed width and no language marker. Resolve ambiguous
            // names using the already recognized save's encoding, as its reader does.
            if(original is SK2 stadium&&source.BlankPKM is SK2 stadiumLayout)
            {
                if(!stadium.IsPossible(stadiumLayout.Japanese))throw new ArgumentException("Stadium editor encoding conflicts with the save.");
                original=new SK2(bytes.ToArray(),stadiumLayout.Japanese);
            }
            if(original is GBPKM gb&&source.BlankPKM is GBPKM blank&&(gb.Japanese!=blank.Japanese||gb.Korean!=blank.Korean))throw new ArgumentException("GB editor encoding conflicts with the save.");
        }
        else original=PokemonEditorMode.Read(source,request.Source);
        var p=PokemonDraftPreparing.Prepare(source,original,request.Source,request.Capture,editorParty);
        var target=StorageEditing.Target(source,request.Target);StorageEditing.Writable(source,target);
        ISlotInfo slot=target.Box==-1?new SlotInfoParty(target.Slot):new SlotInfoBox(target.Box,target.Slot,source);
        if(!slot.CanWriteTo(source)||slot.CanWriteTo(source,p)!=WriteBlockedMessage.None)throw new ArgumentException("Prepared Pokemon cannot be written to this slot or party configuration.");
        string[] en=BattlePass4Editing.Compatibility(source,p,"en"),zh=BattlePass4Editing.Compatibility(source,p,"zh-Hans"),ja=BattlePass4Editing.Compatibility(source,p,"ja");
        if(en.Length!=zh.Length||en.Length!=ja.Length)throw new InvalidOperationException("Compatibility translations do not match.");
        var warnings=Enumerable.Range(0,en.Length).Select(i=>new LocalizedText(zh[i],en[i],ja[i])).ToArray();
        var fileCopy=p.Clone();
        var file=new PokemonFile("prepared."+p.Extension,Convert.ToBase64String(StandalonePokemon.Serialize(fileCopy,true,false)));
        bool overwrite=target.Box==-1?target.Slot<source.PartyCount:source.GetBoxSlotAtIndex(target.Box,target.Slot).Species!=0;
        var scratch=PokemonEditorContext.CloneSave(source);var stored=p.Clone();
        if(target.Box==-1){if(!new SlotInfoParty(target.Slot).WriteTo(scratch,stored))throw new ArgumentException("Party write was rejected.");}
        else PokemonSlotWriter.Box(scratch,stored,target.Box,target.Slot,default(EntityImportSettings));
        // Some Core readers decrypt their supplied buffer in place. Verification
        // must never replace the encrypted bytes held by the confirmation ticket.
        var expected=StorageEditing.StoredData(scratch,target).ToArray();int partyCount=scratch.PartyCount;byte[] output=scratch.Write().ToArray();var checkedSave=reopen(output.ToArray());
        if(output.Length!=input.Length||checkedSave.GetType()!=source.GetType()||checkedSave.PartyCount!=partyCount||!SaveChecksums.Valid(checkedSave)||!StorageEditing.StoredData(checkedSave,target).SequenceEqual(expected))throw new InvalidOperationException("Prepared Pokemon export verification failed.");
        // Preview the actual imported target; EditorFile retains the pre-import
        // editor clone separately (for example, before a boxed form is reset).
        var actual=target.Box==-1&&target.Slot>=checkedSave.PartyCount?checkedSave.BlankPKM:PokemonEditing.Read(checkedSave,target.Box,target.Slot);
        var info=PokemonReader.Read(actual,target.Box,target.Slot);
        string token="set:"+(++revision).ToString(System.Globalization.CultureInfo.InvariantCulture),targetHash=Br4Editing.Hash(output);
        current=new(token,hash,targetHash,Policy(),output,warnings.Length!=0);
        int changed=0;for(int i=0;i<input.Length;i++)if(input[i]!=output[i])changed++;
        return new(token,hash,targetHash,request.Source,target,info,file,warnings,overwrite,changed,p.Species==0);
    }
    internal static byte[] Commit(byte[] input,PokemonSetConfirmation confirmation)
    {
        var pending=current;
        if(pending is null||confirmation.Token!=pending.Token||confirmation.SourceHash!=pending.SourceHash||confirmation.TargetHash!=pending.TargetHash||Br4Editing.Hash(input)!=pending.SourceHash||Policy()!=pending.Policy||pending.Warnings&&!confirmation.AllowCompatibility)throw new ArgumentException("Prepared Pokemon confirmation is missing, stale or incompatible.");
        current=null;return pending.Output.ToArray();
    }
    internal static void Discard(string token){if(current?.Token==token)current=null;}
}
public static partial class SaveService
{
    internal static SaveFile OpenPreparedOutput(byte[] output)=>OpenDerived(output);
}

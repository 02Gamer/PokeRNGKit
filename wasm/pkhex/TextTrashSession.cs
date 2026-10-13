// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record TextTrashTarget([property: JsonRequired] string Kind, [property: JsonRequired] string Field, int Box=0,int Slot=0,string? FileName=null,bool InputEncrypted=false,bool UseFileFormat=false);
public sealed record TextTrashRequest([property: JsonRequired] string SourceHash,[property: JsonRequired] TextTrashTarget Target,[property: JsonRequired] string InitialText,[property: JsonRequired] TextTrashEvent[] Events);
public sealed record TextTrashConfirmation([property: JsonRequired] string Token,[property: JsonRequired] string SourceHash,[property: JsonRequired] string TargetHash,[property: JsonRequired] TextTrashTarget Target);
public sealed record TextTrashCatalog(string SourceHash,string Format,int Generation,bool CanEdit,string Field,string StoredText,string StoredHex,TextTrashDraft Draft,OriginChoice[] Species,OriginChoice[] Languages);
public sealed record TextTrashTicket(string Token,string SourceHash,string TargetHash,TextTrashTarget Target,TextTrashCatalog Before,TextTrashCatalog Result,int[] ChangedNameBytes,int ChangedBytes);

internal static class TextTrashSession
{
    private static byte[]? output;private static TextTrashConfirmation? current;private static long revision;
    internal static void Reset(){output=null;current=null;}
    private static string FileName(TextTrashTarget target)=>target.FileName is {Length:>0 and <=1024} name?name:throw new ArgumentException("Missing name-edit file name.");
    private static TextTrashCatalog Catalog(PKM entity,string field,string hash,bool canEdit=true) {
        var languages=GameInfo.LanguageDataSource(entity.Generation,entity.Context).Select(v=>new OriginChoice(v.Value,new(GameInfo.GetStrings("zh-Hans").languageNames[v.Value],GameInfo.GetStrings("en").languageNames[v.Value],GameInfo.GetStrings("ja").languageNames[v.Value]))).ToArray();
        return new(hash,entity.GetType().Name,entity.Generation,canEdit,field,PokemonTextTrash.Name(entity,field),Convert.ToHexString(PokemonTextTrash.Buffer(entity,field)),PokemonTextTrash.Read(entity,field),Hall6TrashEditing.Species.Value,languages);
    }
    internal static TextTrashCatalog Read(byte[] input,TextTrashTarget target) {
        if(target is null)throw new ArgumentException("Missing name-edit target.");
        if(target.Kind=="save") {var save=SaveUtil.GetSaveFile(input.ToArray())??throw new ArgumentException("Unrecognized name-edit save.");return Catalog(PokemonEditing.Read(save,target.Box,target.Slot),target.Field,Br4Editing.Hash(input),save.State.Exportable&&SaveChecksums.Valid(save)&&StandalonePokemon.CanEdit(save.BlankPKM)&&(target.Box<0||!save.IsBoxSlotLocked(target.Box,target.Slot)));}
        PKM entity=target.Kind switch{"file"=>StandalonePokemon.Open(input,FileName(target),target.InputEncrypted,target.UseFileFormat).Entity,_=>throw new ArgumentException("Unknown name-edit target.")};
        return Catalog(entity,target.Field,Br4Editing.Hash(input));
    }
    internal static TextTrashDraft Draft(byte[] input,TextTrashRequest request) {
        Validate(input,request);PKM entity=request.Target.Kind switch{"file"=>StandalonePokemon.Open(input,FileName(request.Target),request.Target.InputEncrypted,request.Target.UseFileFormat).Entity,"save"=>PokemonEditing.Read(SaveUtil.GetSaveFile(input.ToArray())??throw new ArgumentException("Unrecognized name-edit save."),request.Target.Box,request.Target.Slot),_=>throw new ArgumentException("Unknown name-edit target.")};
        return PokemonTextTrash.Apply(entity,request.Target.Field,request.InitialText,request.Events);
    }
    private static void Validate(byte[] input,TextTrashRequest request){if(request is null||request.Target is null||request.SourceHash!=Br4Editing.Hash(input))throw new ArgumentException("Missing or stale name-edit request.");}
    internal static TextTrashTicket Prepare(byte[] input,TextTrashRequest request) {
        Reset();Validate(input,request);var target=request.Target;
        if(target.Kind=="file") {
            var file=StandalonePokemon.Open(input,FileName(target),target.InputEncrypted,target.UseFileFormat);var prepared=PokemonTextTrash.Prepare(file.Entity,target.Field,request.InitialText,request.Events);
            return Freeze(input,request,file.Entity,prepared,StandalonePokemon.Serialize(prepared,file.Party,false));
        }
        if(target.Kind!="save")throw new ArgumentException("Unknown name-edit target.");
        var source=SaveUtil.GetSaveFile(input.ToArray())??throw new ArgumentException("Unrecognized name-edit save.");
        if(!source.State.Exportable||!SaveChecksums.Valid(source)||!StandalonePokemon.CanEdit(source.BlankPKM))throw new ArgumentException("Save cannot export name edits.");
        var before=PokemonEditing.Read(source,target.Box,target.Slot);if(target.Box>=0&&source.IsBoxSlotLocked(target.Box,target.Slot))throw new ArgumentException("Storage slot is locked.");
        var after=PokemonTextTrash.Prepare(before,target.Field,request.InitialText,request.Events);var copy=source.Clone();
        if(target.Box==-1)copy.SetPartySlotAtIndex(after,target.Slot,EntityImportSettings.None);else copy.SetBoxSlotAtIndex(after,target.Box,target.Slot,EntityImportSettings.None);
        byte[] expected=StorageEditing.StoredData(copy,new(target.Box,target.Slot)),bytes=copy.Write().ToArray();
        var reopened=SaveUtil.GetSaveFile(bytes.ToArray())??throw new InvalidOperationException("Name-edited save recognition failed.");
        if(bytes.Length!=input.Length||reopened.GetType()!=source.GetType()||!SaveChecksums.Valid(reopened)||reopened.PartyCount!=copy.PartyCount||!StorageEditing.StoredData(reopened,new(target.Box,target.Slot)).SequenceEqual(expected))throw new InvalidOperationException("Name-edited save export verification failed.");
        var expectedEntity=PokemonEditing.Read(copy,target.Box,target.Slot);var actualEntity=PokemonEditing.Read(reopened,target.Box,target.Slot);
        if(!expectedEntity.NicknameTrash.SequenceEqual(actualEntity.NicknameTrash)||!expectedEntity.OriginalTrainerTrash.SequenceEqual(actualEntity.OriginalTrainerTrash)||!expectedEntity.HandlingTrainerTrash.SequenceEqual(actualEntity.HandlingTrainerTrash))throw new InvalidOperationException("Name-edited save text buffers changed during export.");
        return Freeze(input,request,before,after,bytes);
    }
    private static TextTrashTicket Freeze(byte[] input,TextTrashRequest request,PKM before,PKM after,byte[] bytes) {
        string hash=Br4Editing.Hash(input),targetHash=Br4Editing.Hash(bytes);var original=Catalog(before,request.Target.Field,hash);var result=Catalog(after,request.Target.Field,targetHash);
        var a=Convert.FromHexString(original.StoredHex);var b=Convert.FromHexString(result.StoredHex);if(a.Length!=b.Length)throw new InvalidOperationException("Name buffer width changed.");
        int[] changed=Enumerable.Range(0,a.Length).Where(i=>a[i]!=b[i]).ToArray();int total=Math.Abs(bytes.Length-input.Length);for(int i=0;i<Math.Min(input.Length,bytes.Length);i++)if(input[i]!=bytes[i])total++;
        string token="text-trash:"+(++revision).ToString(CultureInfo.InvariantCulture);current=new(token,hash,targetHash,request.Target);output=bytes.ToArray();return new(token,hash,targetHash,request.Target,original,result,changed,total);
    }
    internal static byte[] Commit(byte[] input,TextTrashConfirmation confirmation) {
        if(current is null||output is null||confirmation!=current)throw new ArgumentException("Name preview is missing or replaced.");
        if(Br4Editing.Hash(input)!=current.SourceHash)throw new ArgumentException("Name preview is stale.");
        if(Br4Editing.Hash(output)!=current.TargetHash)throw new InvalidOperationException("Name frozen output verification failed.");
        byte[] result=output.ToArray();Reset();return result;
    }
    internal static void Discard(string token){if(current?.Token==token)Reset();}
}

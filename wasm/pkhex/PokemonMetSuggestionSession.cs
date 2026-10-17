// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Runtime.InteropServices.JavaScript;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal sealed record MetSuggestionInput([property:JsonRequired]string SourceHash,[property:JsonRequired]PokemonDraftCapture Capture);
internal sealed record MetSuggestionConfirmation([property:JsonRequired]string Token,[property:JsonRequired]string SourceHash,[property:JsonRequired]string TargetHash);
internal sealed record MetSuggestionEnvelope([property:JsonRequired]string FileName,bool InputEncrypted=false,bool UseFileFormat=false,MetSuggestionInput? MetSuggestion=null,MetSuggestionConfirmation? MetSuggestionConfirmation=null,string? MetSuggestionToken=null);
internal sealed record MetSuggestionPreview(string SourceHash,bool Available,string? Token=null,string? TargetHash=null,MetSuggestionState? Before=null,MetSuggestionState? After=null,bool HatchMemory=false,int ChangedBytes=0);
internal static class PokemonMetSuggestionSession
{
    private sealed record Pending(string Token,string SourceHash,string TargetHash,string Policy,string File,byte[] Output);
    private static Pending? current;private static long revision;
    internal static void Reset()=>current=null;
    private static string Policy()=>PokemonSetSession.Policy()+"|"+PokemonEditorContext.Fingerprint;
    private static string File(MetSuggestionEnvelope request)=>request.FileName+"|"+request.InputEncrypted+"|"+request.UseFileFormat;
    private static MetSuggestionEnvelope Read(string json)
    {
        if(json is null||json.Length is 0 or >1048576)throw new ArgumentException("Met suggestion request exceeds limits.");
        using var doc=JsonDocument.Parse(json);PokemonSetSession.Unique(doc.RootElement);
        var request=JsonSerializer.Deserialize(json,MetSuggestionJson.Default.MetSuggestionEnvelope)??throw new ArgumentException("Missing met suggestion request.");
        if(request.FileName is not{Length:>0 and <=1024})throw new ArgumentException("Invalid met suggestion file name.");
        return request;
    }
    internal static MetSuggestionPreview Preview(byte[] input,string json)
    {
        Reset();var request=Read(json);var query=request.MetSuggestion;
        string hash=Br4Editing.Hash(input);
        if(query is null||query.SourceHash!=hash||query.Capture is null||request.MetSuggestionConfirmation is not null||request.MetSuggestionToken is not null)throw new ArgumentException("Met suggestion source is missing or stale.");
        var file=StandalonePokemon.Open(input,request.FileName,request.InputEncrypted,request.UseFileFormat);
        var p=PokemonDraftPreparing.PrepareFile(file.Entity,query.Capture,file.Party);
        var suggested=PokemonMetSuggestion.Prepare(p);
        if(suggested is null)return new(hash,false);
        byte[] output=suggested.Pokemon is GBPKML gb?StandaloneGb.Write(gb):StandalonePokemon.Serialize(suggested.Pokemon,file.Party,false);
        var reopened=StandalonePokemon.Open(output,"suggested."+suggested.Pokemon.Extension,useFileFormat:true).Entity;
        int width=file.Party?p.SIZE_PARTY:p.SIZE_STORED;
        bool same=suggested.Pokemon is GBPKML oldGb&&reopened is GBPKML newGb?StandaloneGb.Equal(oldGb,newGb):reopened.Data[..width].SequenceEqual(suggested.Pokemon.Data[..width]);
        if(reopened.GetType()!=p.GetType()||!reopened.ChecksumValid||!same)throw new InvalidOperationException("Met suggestion file export verification failed.");
        string token="met:"+(++revision).ToString(System.Globalization.CultureInfo.InvariantCulture),target=Br4Editing.Hash(output);
        current=new(token,hash,target,Policy(),File(request),output.ToArray());
        int changed=Math.Abs(input.Length-output.Length);for(int i=0;i<Math.Min(input.Length,output.Length);i++)if(input[i]!=output[i])changed++;
        return new(hash,true,token,target,suggested.Before,suggested.After,suggested.HatchMemory,changed);
    }
    internal static byte[] Commit(byte[] input,string json)
    {
        var pending=current;Reset();var request=Read(json);var confirmation=request.MetSuggestionConfirmation;
        if(request.MetSuggestion is not null||request.MetSuggestionToken is not null||pending is null||confirmation is null||
            confirmation.Token!=pending.Token||confirmation.SourceHash!=pending.SourceHash||confirmation.TargetHash!=pending.TargetHash||
            Br4Editing.Hash(input)!=pending.SourceHash||Policy()!=pending.Policy||File(request)!=pending.File)
            throw new ArgumentException("Met suggestion confirmation is missing or stale.");
        return pending.Output.ToArray();
    }
    internal static void Discard(string token){if(current?.Token==token)Reset();}
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase,UnmappedMemberHandling=JsonUnmappedMemberHandling.Disallow)]
[JsonSerializable(typeof(MetSuggestionEnvelope))]
[JsonSerializable(typeof(MetSuggestionPreview))]
internal partial class MetSuggestionJson:JsonSerializerContext{}
public static partial class Program
{
    [JSExport]public static string PreviewMetSuggestion(byte[] input,string json)=>JsonSerializer.Serialize(PokemonMetSuggestionSession.Preview(input,json),MetSuggestionJson.Default.MetSuggestionPreview);
    [JSExport]public static byte[] CommitMetSuggestion(byte[] input,string json)=>PokemonMetSuggestionSession.Commit(input,json);
    [JSExport]public static void DiscardMetSuggestion(string token)=>PokemonMetSuggestionSession.Discard(token);
}

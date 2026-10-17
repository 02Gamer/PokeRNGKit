// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Runtime.InteropServices.JavaScript;
namespace PokeRNGKit.SaveEditor;
internal sealed record PokemonHintsQuery([property:JsonRequired]string SourceHash,[property:JsonRequired]PokemonDraftCapture Capture);
internal sealed record PokemonHintsEnvelope([property:JsonRequired]string FileName,bool InputEncrypted=false,bool UseFileFormat=false,PokemonHintsQuery? DraftHints=null);
internal sealed record PokemonHintsPreviewReport(int ApiVersion,string SourceHash,string RequestHash,PokemonAutomaticHints? Hints);
internal static class PokemonHintsPreview
{
    internal static PokemonHintsPreviewReport Read(byte[] input,string json)
    {
        if(json is null||json.Length is 0 or >1048576)throw new ArgumentException("Hint request exceeds limits.");
        using var doc=JsonDocument.Parse(json);PokemonSetSession.Unique(doc.RootElement);
        var request=JsonSerializer.Deserialize(json,PokemonHintsJson.Default.PokemonHintsEnvelope)??throw new ArgumentException("Missing hint request.");
        string hash=Br4Editing.Hash(input);
        if(request.FileName is not{Length:>0 and <=1024}||request.DraftHints is not{} query||query.SourceHash!=hash||query.Capture is null)throw new ArgumentException("Hint source is missing or stale.");
        var file=StandalonePokemon.Open(input,request.FileName,request.InputEncrypted,request.UseFileFormat);
        var prepared=PokemonDraftPreparing.PrepareFile(file.Entity,query.Capture,file.Party);
        return new(SaveService.ApiVersion,hash,Br4Editing.Hash(Encoding.UTF8.GetBytes(json)),PokemonHints.Read(prepared,true));
    }
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase,UnmappedMemberHandling=JsonUnmappedMemberHandling.Disallow)]
[JsonSerializable(typeof(PokemonHintsEnvelope))]
[JsonSerializable(typeof(PokemonHintsPreviewReport))]
internal partial class PokemonHintsJson:JsonSerializerContext{}
public static partial class Program
{
    [JSExport]public static string ReadPokemonDraftHints(byte[] input,string json)=>JsonSerializer.Serialize(PokemonHintsPreview.Read(input,json),PokemonHintsJson.Default.PokemonHintsPreviewReport);
}

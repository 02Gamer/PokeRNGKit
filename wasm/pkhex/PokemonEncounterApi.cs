// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonEncounterOpenRequest(PokemonPosition? Position=null,string? FileName=null,
    PokemonEncounterCriteria? Criteria=null,PokemonEncounterTrainer[]? Trainers=null,PokemonEncounterDatabaseOptions? Options=null,PokemonFile[]? TrainerFiles=null);
internal sealed record PokemonEncounterReadRequest(PokemonEncounterDatabaseQuery? Query=null,int Offset=0);
internal sealed record PokemonEncounterCriteriaRequest(string Action,PokemonEncounterCriteria? Criteria=null);
internal sealed record PokemonEncounterDetails(string[] Zh,string[] En,string[] Ja);
internal sealed record PokemonEncounterRow(int Id,ushort Species,byte Form,int Gender,byte Generation,int Version,
    byte LevelMin,byte LevelMax,ushort Location,ushort EggLocation,bool Egg,bool Shiny,int Ability,string Type,string Sprite,PokemonEncounterDetails Details,PokemonArtwork? Artwork=null);
internal sealed record PokemonEncounterView(string SourceHash,int Matches,int Offset,int GridRows,
    PokemonEncounterCriteria Criteria,PokemonEncounterRow[] Rows,int TrainerFileCount=0);

public static partial class Program
{
    [JSExport]public static string OpenPokemonEncounters(byte[] data,byte[] entity,string json)=>SaveService.OpenPokemonEncounters(data,entity,json);
    [JSExport]public static string ReadPokemonEncounters(byte[] data,string json)=>SaveService.ReadPokemonEncounters(data,json);
    [JSExport]public static string ReadPokemonEncounterCatalog(byte[] data)=>SaveService.ReadPokemonEncounterCatalog(data);
    [JSExport]public static string SetPokemonEncounterCriteria(byte[] data,string json)=>SaveService.SetPokemonEncounterCriteria(data,json);
    [JSExport]public static string PreviewPokemonEncounter(byte[] data,int id)=>SaveService.PreviewPokemonEncounter(data,id);
    [JSExport]public static string CommitPokemonEncounter(byte[] data,string json)=>SaveService.CommitPokemonEncounter(data,json);
    [JSExport]public static void DiscardPokemonEncounter(string token)=>PokemonEncounterRuntime.Discard(token);
    [JSExport]public static void ResetPokemonEncounters()=>PokemonEncounterRuntime.Reset();
}
public static partial class SaveService
{
    public static string OpenPokemonEncounters(byte[] data,byte[] entity,string json)=>PokemonEncounterRuntime.Open(data,entity,json);
    public static string ReadPokemonEncounters(byte[] data,string json)=>PokemonEncounterRuntime.Read(data,json);
    public static string ReadPokemonEncounterCatalog(byte[] data)=>PokemonEncounterRuntime.Catalog(data);
    public static string SetPokemonEncounterCriteria(byte[] data,string json)=>PokemonEncounterRuntime.SetCriteria(data,json);
    public static string PreviewPokemonEncounter(byte[] data,int id)=>PokemonEncounterRuntime.Preview(data,id);
    public static string CommitPokemonEncounter(byte[] data,string json)=>PokemonEncounterRuntime.Commit(data,json);
}
internal static class PokemonEncounterRuntime
{
    private static PokemonEncounterSession? session;
    private static SaveFile? source;
    internal static string Open(byte[] input,byte[] entity,string json)
    {
        Reset();var request=Decode(json,PokemonEncounterJson.Default.PokemonEncounterOpenRequest,4*1024*1024);
        if(input is null||input.Length is 0 or >32*1024*1024||entity is null||entity.Length>PokemonFiles.MaximumSize||request.Trainers is {Length:>1024})throw new ArgumentException("Invalid encounter sources.");
        var save=SaveService.OpenDatabaseSave(input.ToArray());SaveSpriteView.Select(save);PKM prepared;
        if(entity.Length!=0) {
            if(request.Position is not null||string.IsNullOrEmpty(request.FileName))throw new ArgumentException("Choose one encounter editor source.");
            prepared=StandalonePokemon.Open(entity,request.FileName,false,true).Entity;
        }else {
            if(request.FileName is not null)throw new ArgumentException("Encounter entity data is missing.");
            prepared=request.Position is {} position?PokemonEditing.Read(save,position.Box,position.Slot):save.BlankPKM;
        }
        var trainers=request.Trainers?.Select(value=>value?.ToCore()??throw new ArgumentException("Missing encounter trainer.")).ToArray();
        var trainerPokemon=PokemonEncounterTrainerFiles.Read(request.TrainerFiles,save.Context);
        var next=new PokemonEncounterSession(input,prepared,request.Criteria?.ToCore(),trainers,request.Options,trainerPokemon);
        session=next;source=save;return View(next,0);
    }
    internal static string Read(byte[] input,string json)
    {
        var current=Session();
        try {
            current.AssertSource(input);
            var request=Decode(json,PokemonEncounterJson.Default.PokemonEncounterReadRequest);
            if(request.Query is not null)current.Search(input,request.Query);
            return View(current,request.Offset);
        }catch{current.Reset();throw;}
    }
    private static string View(PokemonEncounterSession current,int offset)
    {
        var results=current.Database.Results;
        if(offset<0||offset>results.Length)throw new ArgumentException("Invalid encounter page offset.");
        var rows=results.Skip(offset).Take(current.Database.GridRows*6).Select((value,index)=>new PokemonEncounterRow(offset+index,
            value.Species,value.Form,value is IFixedGender gender?gender.Gender:2,value.Generation,(int)value.Version,
            value.LevelMin,value.LevelMax,value.Location,value.EggLocation,value.IsEgg,value.IsShiny,(int)value.Ability,
            value.GetType().Name,Sprite(value),new(value.GetTextLines(language:"zh-Hans").ToArray(),value.GetTextLines(language:"en").ToArray(),value.GetTextLines(language:"ja").ToArray()),SaveProgramSettingsRuntime.Current is not null?SaveArtwork.Encounter(value):null)).ToArray();
        return JsonSerializer.Serialize(new PokemonEncounterView(current.SourceHash,results.Length,offset,current.Database.GridRows,
            PokemonEncounterCriteria.From(current.Database.Criteria),rows,current.Database.TrainerFileCount),PokemonEncounterJson.Default.PokemonEncounterView);
    }
    internal static string Sprite(IEncounterInfo value)
    {
        if(SaveProgramSettingsRuntime.Current is not null)return SaveArtwork.Encounter(value).Sprite;
        byte gender=value switch{MysteryGift gift=>Math.Max((byte)0,gift.Gender),IFixedGender {IsFixedGender:true} fixedGender=>Math.Max((byte)0,fixedGender.Gender),IPogoSlot pogo=>(byte)((int)pogo.Gender&1),_=>0};
        return value.IsEgg?value.Species==490?"b_490_e":"b_egg":"b"+SpriteName.GetResourceStringSprite(value.Species,value.Form,gender,0,value.Context,value.IsShiny);
    }
    internal static string Catalog(byte[] input)
    {
        var current=Session();
        try {current.AssertSource(input);return JsonSerializer.Serialize(PokemonEncounterCatalogReader.Read(source!,current.Database.EditorCriteria,current.Database.EditorFormats),PokemonEncounterJson.Default.PokemonEncounterCatalog);}
        catch{current.Reset();throw;}
    }
    internal static string SetCriteria(byte[] input,string json)
    {
        var current=Session();current.Reset();current.AssertSource(input);
        var request=Decode(json,PokemonEncounterJson.Default.PokemonEncounterCriteriaRequest);
        var criteria=request.Action switch{
            "reset"=>EncounterCriteria.Unrestricted,"editor"=>current.Database.EditorCriteria,
            "set"=>request.Criteria?.ToCore()??throw new ArgumentException("Missing encounter criteria."),
            _=>throw new ArgumentException("Invalid encounter criteria action.")};
        current.SetCriteria(input,criteria);return View(current,0);
    }
    internal static string Preview(byte[] input,int id)=>JsonSerializer.Serialize(Session().Prepare(input,id),PokemonEncounterJson.Default.PokemonEncounterTicket);
    internal static string Commit(byte[] input,string json)
    {
        var current=Session();
        try{return JsonSerializer.Serialize(current.Commit(input,Decode(json,PokemonEncounterJson.Default.PokemonEncounterConfirmation)),PokemonEncounterJson.Default.PokemonFile);}
        finally{current.Reset();}
    }
    internal static void Discard(string token)=>session?.Discard(token);
    internal static void Reset(){session?.Reset();session=null;source=null;}
    internal static IEncounterInfo HoverEntry(byte[] input,int id)
    {
        var current=Session();current.AssertSource(input);var results=current.Database.Results;
        return (uint)id<results.Length?results[id]:throw new ArgumentException("Invalid encounter hover id.");
    }
    private static PokemonEncounterSession Session()=>session??throw new ArgumentException("Load the encounter database first.");
    private static T Decode<T>(string json,System.Text.Json.Serialization.Metadata.JsonTypeInfo<T> type,int maximum=1024*1024)where T:class
    {
        if(json is null||json.Length>maximum)throw new ArgumentException("Encounter metadata exceeds the browser limit.");
        return JsonSerializer.Deserialize(json,type)??throw new ArgumentException("Missing encounter metadata.");
    }
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(PokemonEncounterOpenRequest))]
[JsonSerializable(typeof(PokemonEncounterReadRequest))]
[JsonSerializable(typeof(PokemonEncounterCriteriaRequest))]
[JsonSerializable(typeof(PokemonEncounterView))]
[JsonSerializable(typeof(PokemonEncounterCatalog))]
[JsonSerializable(typeof(PokemonEncounterTicket))]
[JsonSerializable(typeof(PokemonEncounterConfirmation))]
[JsonSerializable(typeof(PokemonFile))]
internal partial class PokemonEncounterJson:JsonSerializerContext;

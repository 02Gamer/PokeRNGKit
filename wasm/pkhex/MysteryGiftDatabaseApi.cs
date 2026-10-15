// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.IO.Compression;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal sealed record MysteryGiftDatabaseOpen(MysteryGiftDatabaseOptions? Options=null,PokemonFile[]? Files=null);
internal sealed record MysteryGiftDatabaseRead(MysteryGiftDatabaseQuery? Query=null,int Offset=0);
internal sealed record MysteryGiftDatabasePrepare([property:JsonRequired]int Id,[property:JsonRequired]bool ConvertToSave);
internal sealed record MysteryGiftDatabaseRow(int Id,int CardId,string Title,string Type,string FileName,ushort Species,
    byte Form,byte Generation,int Version,bool Egg,bool Shiny,string Sprite,LocalizedText[] Details,PokemonArtwork? Artwork=null);
internal sealed record MysteryGiftDatabaseView(string SourceHash,int Matches,int Offset,int GridRows,MysteryGiftDatabaseRow[] Rows);
public static partial class Program
{
    [JSExport] public static string ScanMysteryGiftFiles(string json)=>SaveService.ScanMysteryGiftFiles(json);
    [JSExport] public static string OpenMysteryGiftDatabase(byte[] data,string json)=>SaveService.OpenMysteryGiftDatabase(data,json);
    [JSExport] public static string ReadMysteryGiftDatabase(byte[] data,string json)=>SaveService.ReadMysteryGiftDatabase(data,json);
    [JSExport] public static string ReadMysteryGiftDatabaseCatalog(byte[] data,byte[] editor,string fileName)=>SaveService.ReadMysteryGiftDatabaseCatalog(data,editor,fileName);
    [JSExport] public static string PreviewMysteryGiftDatabase(byte[] data,string json)=>SaveService.PreviewMysteryGiftDatabase(data,json);
    [JSExport] public static string CommitMysteryGiftDatabase(byte[] data,string json)=>SaveService.CommitMysteryGiftDatabase(data,json);
    [JSExport] public static string ExportMysteryGiftDatabase(byte[] data,int id)=>SaveService.ExportMysteryGiftDatabase(data,id);
    [JSExport] public static string ExportAllMysteryGiftDatabase(byte[] data)=>SaveService.ExportAllMysteryGiftDatabase(data);
    [JSExport] public static byte[] ExportMysteryGiftDatabaseArchive(byte[] data)=>SaveService.ExportMysteryGiftDatabaseArchive(data);
    [JSExport] public static void DiscardMysteryGiftDatabase(string token)=>MysteryGiftDatabaseRuntime.Discard(token);
    [JSExport] public static void ResetMysteryGiftDatabase()=>MysteryGiftDatabaseRuntime.Reset();
}
public static partial class SaveService
{
    public static string ScanMysteryGiftFiles(string json)=>MysteryGiftDatabaseRuntime.ScanFiles(json);
    public static string OpenMysteryGiftDatabase(byte[] data,string json)=>MysteryGiftDatabaseRuntime.Open(data,json);
    public static string ReadMysteryGiftDatabase(byte[] data,string json)=>MysteryGiftDatabaseRuntime.Read(data,json);
    public static string ReadMysteryGiftDatabaseCatalog(byte[] data,byte[] editor,string fileName)=>MysteryGiftDatabaseRuntime.Catalog(data,editor,fileName);
    public static string PreviewMysteryGiftDatabase(byte[] data,string json)=>MysteryGiftDatabaseRuntime.Preview(data,json);
    public static string CommitMysteryGiftDatabase(byte[] data,string json)=>MysteryGiftDatabaseRuntime.Commit(data,json);
    public static string ExportMysteryGiftDatabase(byte[] data,int id)=>MysteryGiftDatabaseRuntime.Export(data,id);
    public static string ExportAllMysteryGiftDatabase(byte[] data)=>MysteryGiftDatabaseRuntime.ExportAll(data);
    public static byte[] ExportMysteryGiftDatabaseArchive(byte[] data)=>MysteryGiftDatabaseRuntime.Archive(data);
}
internal static class MysteryGiftDatabaseRuntime
{
    internal static string ScanFiles(string json)
    {
        var request=Decode(json,MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseOpen);
        var files=request.Files??[];
        if(files.Length>1024)throw new ArgumentException("Too many mystery gift files.");
        var accepted=new List<int>();long total=0;
        for(int index=0;index<files.Length;index++) {
            var file=files[index];
            if(file is null||string.IsNullOrEmpty(file.FileName)||file.FileName.Length>4096||file.Data is null||file.Data.Length>64*1024)
                throw new ArgumentException("Invalid external mystery gift file.");
            var bytes=Convert.FromBase64String(file.Data);total+=bytes.Length;
            if(total>16*1024*1024)throw new ArgumentException("External mystery gift library exceeds 16 MiB.");
            if(MysteryGift.IsMysteryGift(bytes.Length)&&MysteryGift.GetMysteryGift(bytes,Path.GetExtension(file.FileName)) is not null)accepted.Add(index);
        }
        return JsonSerializer.Serialize(accepted.ToArray(),MysteryGiftDatabaseJson.Default.Int32Array);
    }
    private static MysteryGiftDatabaseSession? session;
    private static SaveFile? source;
    internal static string Open(byte[] input,string json)
    {
        Reset();var request=Decode(json,MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseOpen);
        if(input is null || input.Length is 0 or >32*1024*1024 || request.Files is {Length:>1024})throw new ArgumentException("Invalid mystery gift database source.");
        var extra=new List<MysteryGift>();long total=0;
        foreach(var file in request.Files??[]) {
            if(file is null || file.FileName is null || file.FileName.Length>4096 || file.Data is null || file.Data.Length>64*1024)
                throw new ArgumentException("Invalid external mystery gift file.");
            var bytes=Convert.FromBase64String(file.Data);total+=bytes.Length;
            if(total>16*1024*1024)throw new ArgumentException("External mystery gift library exceeds 16 MiB.");
            var gift=MysteryGift.GetMysteryGift(bytes,Path.GetExtension(file.FileName))??throw new ArgumentException("Unrecognized mystery gift file.");
            if(gift.IsEntity && !gift.IsItem && gift.Species!=0)extra.Add(gift);
        }
        var save=SaveService.OpenDatabaseSave(input.ToArray());
        SaveSpriteView.Select(save);
        var gifts=(request.Files is null?EncounterEvent.GetAllEvents():ExternalMysteryGifts.BuiltInEvents().Concat(extra)).OrderBy(gift=>gift.Species);
        var next=new MysteryGiftDatabaseSession(input,gifts,request.Options);session=next;source=save;
        return View(next,0);
    }
    internal static string Read(byte[] input,string json)
    {
        var current=Session();
        try {current.AssertSource(input);var request=Decode(json,MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseRead);
            if(request.Query is not null)current.Search(input,request.Query);return View(current,request.Offset);
        }catch{current.Reset();throw;}
    }
    private static string View(MysteryGiftDatabaseSession current,int offset)
    {
        var results=current.Database.Results;
        if(offset<0 || offset>results.Length)throw new ArgumentException("Invalid mystery gift page offset.");
        var rows=results.Skip(offset).Take(current.Database.GridRows*6).Select((gift,index)=>new MysteryGiftDatabaseRow(offset+index,
            gift.CardID,gift.CardTitle,gift.GetType().Name,gift.FileName,gift.Species,gift.Form,gift.Generation,(int)gift.Version,
            gift.IsEgg,gift.IsShiny,PokemonEncounterRuntime.Sprite(gift),gift is DataMysteryGift data?WondercardDetails.Read(data):[],SaveProgramSettingsRuntime.Current is not null?SaveArtwork.Encounter(gift):null)).ToArray();
        return JsonSerializer.Serialize(new MysteryGiftDatabaseView(current.SourceHash,results.Length,offset,current.Database.GridRows,rows),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseView);
    }
    internal static string Catalog(byte[] input,byte[] editor,string fileName)
    {
        var current=Session();
        try {current.AssertSource(input);
            if(editor is null || editor.Length>PokemonFiles.MaximumSize)throw new ArgumentException("Invalid mystery gift editor source.");
            var entity=editor.Length==0?source!.BlankPKM:StandalonePokemon.Open(editor,fileName,false,true).Entity;
            return JsonSerializer.Serialize(MysteryGiftDatabaseCatalogReader.Read(source!,current.Database,entity),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseCatalog);
        }catch{current.Reset();throw;}
    }
    internal static string Preview(byte[] input,string json)
    {
        var current=Session();current.Reset();
        var request=Decode(json,MysteryGiftDatabaseJson.Default.MysteryGiftDatabasePrepare);
        return JsonSerializer.Serialize(current.Prepare(input,request.Id,request.ConvertToSave),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseTicket);
    }
    internal static string Commit(byte[] input,string json)
    {
        var current=Session();try{return JsonSerializer.Serialize(current.Commit(input,Decode(json,MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseConfirmation)),MysteryGiftDatabaseJson.Default.PokemonFile);}
        finally{current.Reset();}
    }
    internal static string Export(byte[] input,int id)
    {
        var current=Session();current.AssertSource(input);return JsonSerializer.Serialize(current.Database.ExportGift(id),MysteryGiftDatabaseJson.Default.PokemonFile);
    }
    internal static string ExportAll(byte[] input)
    {
        var current=Session();current.AssertSource(input);return JsonSerializer.Serialize(current.Database.ExportAll(),MysteryGiftDatabaseJson.Default.PokemonFileArray);
    }
    internal static void Discard(string token)=>session?.Discard(token);
    internal static byte[] Archive(byte[] input)
    {
        var current=Session();current.AssertSource(input);var files=current.Database.ExportAll();
        if(files.Length==0)throw new ArgumentException("No mystery gifts to export.");
        using var output=new MemoryStream();
        using(var archive=new ZipArchive(output,ZipArchiveMode.Create,true)) {
            for(int i=0;i<files.Length;i++) {
                var file=files[i];var name=PathUtil.CleanFileName(file.FileName).Replace('/','_').Replace('\\','_');
                var entry=archive.CreateEntry($"{i+1:D6}/{name}",CompressionLevel.Optimal);using var stream=entry.Open();
                stream.Write(Convert.FromBase64String(file.Data));
            }
        }
        return output.ToArray();
    }
    internal static void Reset(){session?.Reset();session=null;source=null;}
    internal static IEncounterInfo HoverEntry(byte[] input,int id)
    {
        var current=Session();current.AssertSource(input);var results=current.Database.Results;
        return (uint)id<results.Length?results[id]:throw new ArgumentException("Invalid gift hover id.");
    }
    private static MysteryGiftDatabaseSession Session()=>session??throw new ArgumentException("Load the mystery gift database first.");
    private static T Decode<T>(string json,System.Text.Json.Serialization.Metadata.JsonTypeInfo<T> type)where T:class
    {
        if(json is null || json.Length>24*1024*1024)throw new ArgumentException("Mystery gift metadata exceeds the browser limit.");
        return JsonSerializer.Deserialize(json,type)??throw new ArgumentException("Missing mystery gift metadata.");
    }
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(MysteryGiftDatabaseOpen))]
[JsonSerializable(typeof(MysteryGiftDatabaseRead))]
[JsonSerializable(typeof(MysteryGiftDatabasePrepare))]
[JsonSerializable(typeof(MysteryGiftDatabaseView))]
[JsonSerializable(typeof(MysteryGiftDatabaseCatalog))]
[JsonSerializable(typeof(MysteryGiftDatabaseTicket))]
[JsonSerializable(typeof(MysteryGiftDatabaseConfirmation))]
[JsonSerializable(typeof(PokemonFile))]
[JsonSerializable(typeof(PokemonFile[]))]
[JsonSerializable(typeof(int[]))]
internal partial class MysteryGiftDatabaseJson:JsonSerializerContext;

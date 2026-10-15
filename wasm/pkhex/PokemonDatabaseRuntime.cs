// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonDatabaseDescriptor([property:JsonRequired]string Id,[property:JsonRequired]string Name,
    [property:JsonRequired]int Offset,[property:JsonRequired]int Length,[property:JsonRequired]bool EntityFile,long Modified=0,bool UseFileFormat=false);
internal sealed record PokemonDatabaseOpenRequest([property:JsonRequired]PokemonDatabaseDescriptor[] Files,PokemonDatabaseOptions? Options=null);
internal sealed record PokemonDatabaseReadRequest([property:JsonRequired]PokemonDatabaseQuery Query,int Offset=0);
internal sealed record PokemonDatabaseViewRow(int Id,string Source,string Identity,string? FileId,string Format,PokemonPosition? Position,PokemonEntry Pokemon);
internal sealed record PokemonDatabaseView(string SourceHash,string FilesHash,int Total,int Matches,int Offset,int GridRows,
    PokemonDatabaseViewRow[] Rows,PokemonDatabaseFileResult[] Files);
internal sealed record PokemonDatabaseCommitRequest([property:JsonRequired]PokemonDatabaseDescriptor[] Files,
    [property:JsonRequired]PokemonDatabaseConfirmation Confirmation);
internal sealed record PokemonDatabasePreviewRequest([property:JsonRequired]PokemonDatabaseDescriptor[] Files,[property:JsonRequired]PokemonDatabaseEdit Edit);
internal sealed record PokemonDatabaseCommitDelta(byte[] Save,string[] Removed,PokemonDatabaseFile[] Added,string FilesHash);
internal sealed record PokemonDatabaseContext(int Id,string Name);
internal sealed record PokemonDatabaseCatalog(PokemonSearchCatalog Search,PokemonDatabaseContext[] Contexts,int Context,int Comparison,int Boxes);
internal sealed record PokemonDatabaseReportRequest([property:JsonRequired]PokemonDatabaseQuery Query,[property:JsonRequired]PokemonReportQuery Report);

// Single session per Worker. Binary sources are flattened outside JSON to avoid
// base64 expansion while loading or confirming a large selected save collection.
internal static class PokemonDatabaseRuntime
{
    private static PokemonDatabaseSession? session;
    internal static string Open(byte[] input,byte[] fileBytes,string json)
    {
        session?.Reset();session=null;
        var request=Decode(json,PokemonDatabaseJson.Default.PokemonDatabaseOpenRequest);
        var files=Files(fileBytes,request.Files);
        session=new(input,files,request.Options??new());
        return View(session,session.Database.Rows.ToArray(),0);
    }
    internal static string Read(string json)
    {
        var request=Decode(json,PokemonDatabaseJson.Default.PokemonDatabaseReadRequest);
        if(request.Query is null)throw new ArgumentException("Missing database search query.");
        var current=Session();
        var rows=current.Database.Search(request.Query);
        if(request.Offset<0 || request.Offset>rows.Length)throw new ArgumentException("Invalid database page offset.");
        return View(current,rows,request.Offset);
    }
    private static string View(PokemonDatabaseSession current,PokemonDatabaseRow[] rows,int offset)
    {
        var page=rows.Skip(offset).Take(current.Database.GridRows*6).Select(row=>
        {
            PokemonPosition? position=row.Entry.Source switch{SlotInfoBox b=>new(b.Box,b.Slot),SlotInfoParty p=>new(-1,p.Slot),_=>null};
            return new PokemonDatabaseViewRow(row.Id,row.Source,row.Identity,row.FileId,row.Entry.Entity.GetType().Name,position,
                PokemonReader.Read(row.Entry.Entity,position?.Box??-2,position?.Slot??row.Id));
        }).ToArray();
        return JsonSerializer.Serialize(new PokemonDatabaseView(current.SourceHash,current.FilesHash,current.Database.Rows.Count,
            rows.Length,offset,current.Database.GridRows,page,current.FileResults),PokemonDatabaseJson.Default.PokemonDatabaseView);
    }
    internal static string Prepare(byte[] input,byte[] fileBytes,string sourcesJson,string editJson)
    {
        var current=Session();
        try
        {
            var request=Decode(sourcesJson,PokemonDatabaseJson.Default.PokemonDatabaseOpenRequest);
            var edit=Decode(editJson,PokemonDatabaseJson.Default.PokemonDatabaseEdit);
            return JsonSerializer.Serialize(current.Prepare(input,Files(fileBytes,request.Files),edit),PokemonDatabaseJson.Default.PokemonDatabaseTicket);
        }
        catch{current.Reset();throw;}
    }
    internal static string Commit(byte[] input,byte[] fileBytes,string json)
    {
        var current=Session();
        try
        {
            var request=Decode(json,PokemonDatabaseJson.Default.PokemonDatabaseCommitRequest);
            return JsonSerializer.Serialize(current.Commit(input,Files(fileBytes,request.Files),request.Confirmation),PokemonDatabaseJson.Default.PokemonDatabaseCommit);
        }
        catch{current.Reset();throw;}
    }
    internal static string Preview(byte[] input,byte[] fileBytes,string json)
    {
        try {
            var request=Decode(json,PokemonDatabaseJson.Default.PokemonDatabasePreviewRequest);
            return Prepare(input,fileBytes,
                JsonSerializer.Serialize(new PokemonDatabaseOpenRequest(request.Files),PokemonDatabaseJson.Default.PokemonDatabaseOpenRequest),
                JsonSerializer.Serialize(request.Edit,PokemonDatabaseJson.Default.PokemonDatabaseEdit));
        }catch{session?.Reset();throw;}
    }
    internal static string CommitDelta(byte[] input,byte[] fileBytes,string json)
    {
        var current=Session();
        try {
            var request=Decode(json,PokemonDatabaseJson.Default.PokemonDatabaseCommitRequest);
            var files=Files(fileBytes,request.Files);
            var output=current.Commit(input,files,request.Confirmation);
            var removed=files.Where(f=>!output.Files.Any(o=>o.Id==f.Id)).Select(f=>f.Id).ToArray();
            var added=output.Files.Where(f=>!files.Any(o=>o.Id==f.Id)).ToArray();
            return JsonSerializer.Serialize(new PokemonDatabaseCommitDelta(output.Save,removed,added,PokemonDatabaseSession.HashFiles(output.Files)),PokemonDatabaseJson.Default.PokemonDatabaseCommitDelta);
        }catch{current.Reset();throw;}
    }
    internal static void AssertSource(byte[] input)
    {
        Session().AssertSource(input);
    }
    internal static PokemonFile Export(int id)=>PokemonDatabaseFiles.Export(Session().Database.Row(id));
    internal static (PKM Entity,StorageSlotType Storage) HoverEntry(byte[] input,int id)
    {
        var current=Session();current.AssertSource(input);var row=current.Database.Row(id);
        return(row.Entry.Entity.Clone(),row.Entry.Source.Type);
    }
    internal static PokemonFile ViewEntity(byte[] input,int id) {
        var current=Session();current.AssertSource(input);
        var entity=PokemonDatabaseFiles.Convert(current.Database.Row(id),SaveService.OpenDatabaseSave(input.ToArray()));
        entity.ForcePartyData();var bytes=new byte[entity.SIZE_PARTY];entity.WriteDecryptedDataParty(bytes);
        return new(PathUtil.CleanFileName(entity.FileName),Convert.ToBase64String(bytes));
    }
    internal static string Report(string json,bool csv)
    {
        var request=Decode(json,PokemonDatabaseJson.Default.PokemonDatabaseReportRequest);
        if(request.Query is null || request.Report is null)throw new ArgumentException("Missing database report query.");
        var rows=Session().Database.Search(request.Query);
        if(rows.Length>10000)throw new ArgumentException("Database reports support at most 10000 results.");
        var report=PokemonReport.Read(rows.Select(row=>row.Entry),request.Report);
        return csv ? PokemonReport.Csv(report) : JsonSerializer.Serialize(report,SaveJsonContext.Default.PokemonReportData);
    }
    internal static byte[] Archive(string json)
    {
        var request=Decode(json,PokemonDatabaseJson.Default.PokemonDatabaseReadRequest);
        if(request.Query is null)throw new ArgumentException("Missing database export query.");
        var rows=Session().Database.Search(request.Query);
        if(rows.Length is 0 or >10000)throw new ArgumentException("Database exports require 1 to 10000 results.");
        using var stream=new MemoryStream();
        using(var zip=new System.IO.Compression.ZipArchive(stream,System.IO.Compression.ZipArchiveMode.Create,true))
        foreach(var row in rows)
        {
            var file=PokemonDatabaseFiles.Export(row);
            var safe=string.Concat(file.FileName.Select(c=>char.IsControl(c)||"<>:\"/\\|?*".Contains(c)?'_':c));
            var entry=zip.CreateEntry($"{row.Id:000000}-{safe}",System.IO.Compression.CompressionLevel.NoCompression);
            entry.LastWriteTime=new(2000,1,1,0,0,0,TimeSpan.Zero);
            using var output=entry.Open();output.Write(Convert.FromBase64String(file.Data));
            if(stream.Length>64*1024*1024)throw new ArgumentException("Database archive exceeds 64 MiB.");
        }
        return stream.ToArray();
    }
    internal static string Catalog(int id)=>JsonSerializer.Serialize(Session().Database.Catalog(id),PokemonDatabaseJson.Default.PokemonDatabaseCatalog);
    internal static void Discard(string token)=>session?.Discard(token);
    internal static void Reset(){session?.Reset();session=null;}
    private static PokemonDatabaseSession Session()=>session??throw new ArgumentException("Load the database first.");
    private static T Decode<T>(string json,System.Text.Json.Serialization.Metadata.JsonTypeInfo<T> type) where T:class
    {
        if(json is null || json.Length>1024*1024)throw new ArgumentException("Database metadata exceeds the browser limit.");
        return JsonSerializer.Deserialize(json,type)??throw new ArgumentException("Missing database metadata.");
    }
    internal static PokemonDatabaseFile[] Files(byte[] data,PokemonDatabaseDescriptor[] descriptors)
    {
        if(data is null || data.Length>128*1024*1024 || descriptors is null || descriptors.Length>1024)throw new ArgumentException("Invalid database binary sources.");
        int end=0;var result=new List<PokemonDatabaseFile>();
        foreach(var file in descriptors)
        {
            if(file is null || file.Offset!=end || file.Length<=0 || file.Length>64*1024*1024 || file.Length>data.Length-end)throw new ArgumentException("Invalid database file slice.");
            result.Add(new(file.Id,file.Name,data.AsSpan(end,file.Length).ToArray(),file.EntityFile,file.Modified,file.UseFileFormat));end+=file.Length;
        }
        if(end!=data.Length)throw new ArgumentException("Database source buffer has extra bytes.");
        PokemonDatabaseFiles.Validate(result);return result.ToArray();
    }
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(PokemonDatabaseOpenRequest))]
[JsonSerializable(typeof(PokemonDatabaseReadRequest))]
[JsonSerializable(typeof(PokemonDatabaseView))]
[JsonSerializable(typeof(PokemonDatabaseEdit))]
[JsonSerializable(typeof(PokemonDatabaseTicket))]
[JsonSerializable(typeof(PokemonDatabaseCommitRequest))]
[JsonSerializable(typeof(PokemonDatabaseCommit))]
[JsonSerializable(typeof(PokemonDatabasePreviewRequest))]
[JsonSerializable(typeof(PokemonDatabaseCommitDelta))]
[JsonSerializable(typeof(PokemonFile))]
[JsonSerializable(typeof(PokemonDatabaseCatalog))]
[JsonSerializable(typeof(PokemonDatabaseReportRequest))]
internal partial class PokemonDatabaseJson:JsonSerializerContext;

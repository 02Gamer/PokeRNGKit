// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;

internal sealed record SaveFolderDescriptor([property:JsonRequired]string Id,[property:JsonRequired]string Name,
    [property:JsonRequired]string Folder,[property:JsonRequired]int Offset,[property:JsonRequired]int Length,
    [property:JsonRequired]long Modified,bool Recent=true,bool Backup=false,bool Remembered=false);
internal sealed record SaveFolderOpenRequest([property:JsonRequired]SaveFolderDescriptor[] Files);
internal sealed record SaveFolderPreviewRequest([property:JsonRequired]SaveFolderDescriptor[] Files,[property:JsonRequired]SaveFolderEdit Edit);
internal sealed record SaveFolderCommitRequest([property:JsonRequired]SaveFolderDescriptor[] Files,[property:JsonRequired]SaveFolderConfirmation Confirmation);
internal sealed record SaveFolderOpenFileRequest([property:JsonRequired]SaveFolderDescriptor[] Files,[property:JsonRequired]string Id);
internal sealed record SaveFolderReadRequest(SaveFolderQuery? Query=null,int Offset=0,int Limit=50);
internal sealed record SaveFolderView(int ApiVersion,string FilesHash,int Total,int Matches,int Offset,
    SaveFolderRow[] Rows,SaveFolderLoadError[] Errors);
internal sealed record SaveFolderDelta(string[] Removed,SaveFolderDescriptor[] Renamed,string FilesHash);
internal sealed record SaveFolderOpened(string Id,string Name,byte[] Data,string SourceHash);

public static partial class Program
{
    [JSExport]public static string OpenSaveFolder(byte[] data,string json)=>SaveService.OpenSaveFolder(data,json);
    [JSExport]public static string ReadSaveFolder(string json)=>SaveService.ReadSaveFolder(json);
    [JSExport]public static string PreviewSaveFolder(byte[] data,string json)=>SaveService.PreviewSaveFolder(data,json);
    [JSExport]public static string CommitSaveFolder(byte[] data,string json)=>SaveService.CommitSaveFolder(data,json);
    [JSExport]public static string OpenSaveFolderFile(byte[] data,string json)=>SaveService.OpenSaveFolderFile(data,json);
    [JSExport]public static void DiscardSaveFolder(string token)=>SaveFolderRuntime.Discard(token);
    [JSExport]public static void ResetSaveFolder()=>SaveFolderRuntime.Reset();
}
public static partial class SaveService
{
    public static string OpenSaveFolder(byte[] data,string json)=>SaveFolderRuntime.Open(data,json);
    public static string ReadSaveFolder(string json)=>SaveFolderRuntime.Read(json);
    public static string PreviewSaveFolder(byte[] data,string json)=>SaveFolderRuntime.Preview(data,json);
    public static string CommitSaveFolder(byte[] data,string json)=>SaveFolderRuntime.Commit(data,json);
    public static string OpenSaveFolderFile(byte[] data,string json)=>SaveFolderRuntime.OpenFile(data,json);
}
internal static class SaveFolderRuntime
{
    private static SaveFolderSession? session;
    internal static string Open(byte[] data,string json)
    {
        Reset();var request=Decode(json,SaveFolderJson.Default.SaveFolderOpenRequest);
        session=new(Files(data,request.Files));return View(session,new(),0,50);
    }
    internal static string Read(string json)
    {
        var request=Decode(json,SaveFolderJson.Default.SaveFolderReadRequest);
        return View(Session(),request.Query??new(),request.Offset,request.Limit);
    }
    private static string View(SaveFolderSession current,SaveFolderQuery query,int offset,int limit)
    {
        var rows=current.List.Read(query);
        if(offset<0||offset>rows.Length||limit is <1 or >200)throw new ArgumentException("Invalid save folder page.");
        return JsonSerializer.Serialize(new SaveFolderView(SaveService.ApiVersion,current.FilesHash,current.List.Rows.Length,
            rows.Length,offset,rows.Skip(offset).Take(limit).ToArray(),current.List.Errors),SaveFolderJson.Default.SaveFolderView);
    }
    internal static string Preview(byte[] data,string json)
    {
        var current=Session();current.Reset();
        var request=Decode(json,SaveFolderJson.Default.SaveFolderPreviewRequest);
        return JsonSerializer.Serialize(current.Prepare(Files(data,request.Files),request.Edit),SaveFolderJson.Default.SaveFolderTicket);
    }
    internal static string Commit(byte[] data,string json)
    {
        var current=Session();
        try{
            var request=Decode(json,SaveFolderJson.Default.SaveFolderCommitRequest);var before=Files(data,request.Files);
            var after=current.Commit(before,request.Confirmation);
            var removed=before.Where(file=>!after.Any(next=>next.Id==file.Id)).Select(file=>file.Id).ToArray();
            int offset=0;var renamed=new List<SaveFolderDescriptor>();
            foreach(var file in after){if(before.First(old=>old.Id==file.Id).Name!=file.Name)renamed.Add(new(file.Id,file.Name,file.Folder,offset,file.Data.Length,file.Modified,file.Recent,file.Backup,file.Remembered));offset+=file.Data.Length;}
            return JsonSerializer.Serialize(new SaveFolderDelta(removed,renamed.ToArray(),SaveFolderSession.Hash(after)),SaveFolderJson.Default.SaveFolderDelta);
        }finally{current.Reset();}
    }
    internal static string OpenFile(byte[] data,string json)
    {
        var request=Decode(json,SaveFolderJson.Default.SaveFolderOpenFileRequest);
        var file=Session().Open(Files(data,request.Files),request.Id);
        return JsonSerializer.Serialize(new SaveFolderOpened(file.Id,file.Name,file.Data,Br4Editing.Hash(file.Data)),SaveFolderJson.Default.SaveFolderOpened);
    }
    internal static void Discard(string token)=>session?.Discard(token);
    internal static void Reset(){session?.Reset();session=null;}
    private static SaveFolderSession Session()=>session??throw new ArgumentException("Load the save folder list first.");
    private static T Decode<T>(string json,System.Text.Json.Serialization.Metadata.JsonTypeInfo<T> type)where T:class
    {
        if(json is null||json.Length>1024*1024)throw new ArgumentException("Save folder metadata exceeds the browser limit.");
        return JsonSerializer.Deserialize(json,type)??throw new ArgumentException("Missing save folder metadata.");
    }
    internal static SaveFolderFile[] Files(byte[] data,SaveFolderDescriptor[] descriptors)
    {
        if(data is null||data.Length>128*1024*1024||descriptors is null||descriptors.Length>1024)throw new ArgumentException("Invalid save folder data.");
        int end=0;var result=new List<SaveFolderFile>();var ids=new HashSet<string>(StringComparer.Ordinal);
        foreach(var file in descriptors){
            if(file is null||string.IsNullOrEmpty(file.Id)||file.Id.Length>128||!ids.Add(file.Id)||string.IsNullOrEmpty(file.Name)||file.Name.Length>4096||file.Folder is null||file.Folder.Length>4096||file.Offset!=end||file.Length is <=0 or >32*1024*1024||file.Length>data.Length-end||file.Modified<0||file.Modified>253402300799999)throw new ArgumentException("Invalid save folder slice.");
            result.Add(new(file.Id,file.Name,file.Folder,data.AsSpan(end,file.Length).ToArray(),file.Modified,file.Recent,file.Backup,file.Remembered));end+=file.Length;
        }
        if(end!=data.Length)throw new ArgumentException("Save folder bytes contain unused trailing data.");
        return result.ToArray();
    }
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveFolderOpenRequest))]
[JsonSerializable(typeof(SaveFolderPreviewRequest))]
[JsonSerializable(typeof(SaveFolderCommitRequest))]
[JsonSerializable(typeof(SaveFolderOpenFileRequest))]
[JsonSerializable(typeof(SaveFolderReadRequest))]
[JsonSerializable(typeof(SaveFolderView))]
[JsonSerializable(typeof(SaveFolderTicket))]
[JsonSerializable(typeof(SaveFolderDelta))]
[JsonSerializable(typeof(SaveFolderOpened))]
internal partial class SaveFolderJson:JsonSerializerContext;

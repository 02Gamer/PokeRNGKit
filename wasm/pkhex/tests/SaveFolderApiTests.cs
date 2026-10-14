// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PokeRNGKit.SaveEditor;
internal static class SaveFolderApiTests
{
    internal static void Run()
    {
        byte[] source=File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"),before=source.ToArray();
        var descriptor=new SaveFolderDescriptor("save","main [old].bak","local",0,source.Length,123,Backup:true,Remembered:true);
        var opening=JsonSerializer.Serialize(new SaveFolderOpenRequest([descriptor]),SaveFolderJson.Default.SaveFolderOpenRequest);
        var view=JsonSerializer.Deserialize(SaveService.OpenSaveFolder(source,opening),SaveFolderJson.Default.SaveFolderView)!;
        var current=new SaveFolderFile(descriptor.Id,descriptor.Name,descriptor.Folder,source,descriptor.Modified,descriptor.Recent,descriptor.Backup,descriptor.Remembered);
        Check(view.ApiVersion==SaveService.ApiVersion&&view.FilesHash==SaveFolderSession.Hash([current])&&view.Rows.Single().Id=="save","Public opening and every file binding");
        view=JsonSerializer.Deserialize(SaveService.ReadSaveFolder("{\"query\":{\"backup\":true},\"limit\":1}"),SaveFolderJson.Default.SaveFolderView)!;
        Check(view.Matches==1&&view.Rows.Length==1,"Public paging and backup list");
        var open=JsonSerializer.Deserialize(SaveService.OpenSaveFolderFile(source,JsonSerializer.Serialize(new SaveFolderOpenFileRequest([descriptor],"save"),SaveFolderJson.Default.SaveFolderOpenFileRequest)),SaveFolderJson.Default.SaveFolderOpened)!;
        Check(open.Data.SequenceEqual(source)&&open.SourceHash==Br4Editing.Hash(source),"Public opening returns exact original container bytes");
        var request=new SaveFolderPreviewRequest([descriptor],new("cleanup"));
        var ticket=JsonSerializer.Deserialize(SaveService.PreviewSaveFolder(source,JsonSerializer.Serialize(request,SaveFolderJson.Default.SaveFolderPreviewRequest)),SaveFolderJson.Default.SaveFolderTicket)!;
        var delta=JsonSerializer.Deserialize(SaveService.CommitSaveFolder(source,JsonSerializer.Serialize(new SaveFolderCommitRequest([descriptor],ticket.Confirmation),SaveFolderJson.Default.SaveFolderCommitRequest)),SaveFolderJson.Default.SaveFolderDelta)!;
        Check(delta.Removed.Length==0&&delta.Renamed.Single().Id=="save"&&delta.FilesHash==SaveFolderSession.Hash([current with{Name=delta.Renamed[0].Name}]),"Public confirmation returns exact frozen rename delta");
        Reject(()=>SaveService.CommitSaveFolder(source,JsonSerializer.Serialize(new SaveFolderCommitRequest([descriptor],ticket.Confirmation),SaveFolderJson.Default.SaveFolderCommitRequest)));
        ticket=JsonSerializer.Deserialize(SaveService.PreviewSaveFolder(source,JsonSerializer.Serialize(request,SaveFolderJson.Default.SaveFolderPreviewRequest)),SaveFolderJson.Default.SaveFolderTicket)!;
        Reject(()=>SaveService.PreviewSaveFolder(source,"{\"files\":[]}"));
        Reject(()=>SaveService.CommitSaveFolder(source,JsonSerializer.Serialize(new SaveFolderCommitRequest([descriptor],ticket.Confirmation),SaveFolderJson.Default.SaveFolderCommitRequest)));
        Reject(()=>SaveService.OpenSaveFolder(source,"{\"files\":[{\"id\":\"save\"}]}"));Reject(()=>SaveService.ReadSaveFolder("{}"));
        Reject(()=>SaveFolderRuntime.Files(source,[descriptor with{Offset=1}]));Reject(()=>SaveFolderRuntime.Files(source,[descriptor with{Length=source.Length-1}]));
        Check(source.SequenceEqual(before),"Public list/edit/export/failure preserve original");
        Console.WriteLine("PASS save folder public API: JSON required metadata, full source binding, paging, exact container opening, frozen deltas, one-time/failure/reset and immutable buffers");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(Exception error)when(error is ArgumentException or JsonException){return;}throw new Exception("Invalid save folder API request accepted");}
}

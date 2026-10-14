// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
namespace PokeRNGKit.SaveEditor;

internal sealed record SaveFolderEdit(string Action,string? Id=null,bool DeleteUnrecognized=false);
internal sealed record SaveFolderConfirmation(string Token,string FilesHash,string OutputHash);
internal sealed record SaveFolderTicket(SaveFolderConfirmation Confirmation,SaveFolderCleanup[] Changes);

// The library owns copies. Confirm commits exactly the previewed library state;
// removal/rename never targets the owner-selected filesystem source.
internal sealed class SaveFolderSession
{
    private readonly SaveFolderFile[] files;
    internal SaveFolderList List {get;}
    internal string FilesHash {get;}
    private SaveFolderFile[]? frozen;
    private SaveFolderConfirmation? confirmation;
    private static long sequence;
    internal SaveFolderSession(IReadOnlyList<SaveFolderFile> input)
    {
        List=new(input);files=Copy(input);FilesHash=Hash(files);
    }
    internal SaveFolderFile Open(IReadOnlyList<SaveFolderFile> current,string id){AssertSource(current);return List.Open(id);}
    internal SaveFolderTicket Prepare(IReadOnlyList<SaveFolderFile> current,SaveFolderEdit edit)
    {
        Reset();AssertSource(current);
        if(edit is null)throw new ArgumentException("Missing save library edit.");
        SaveFolderCleanup[] changes;
        switch(edit.Action){
            case "remove":
                var file=files.FirstOrDefault(f=>f.Id==edit.Id)??throw new ArgumentException("Unknown save library file.");
                changes=[new(file.Id,"remove",file.Name)];break;
            case "cleanup":
                if(edit.Id is not null)throw new ArgumentException("Cleanup does not target one file.");
                changes=List.PlanCleanup(edit.DeleteUnrecognized);break;
            default:throw new ArgumentException("Invalid save library action.");
        }
        var next=Copy(files).ToList();
        foreach(var change in changes){
            int index=next.FindIndex(f=>f.Id==change.Id);if(index<0)throw new InvalidOperationException("Missing frozen save file.");
            if(change.Action=="remove")next.RemoveAt(index);
            else if(change.Action=="rename")next[index]=next[index] with{Name=change.Name};
            else throw new InvalidOperationException("Invalid cleanup plan.");
        }
        var output=next.ToArray();_ =new SaveFolderList(output);
        var ticket=new SaveFolderConfirmation("save-folder:"+Interlocked.Increment(ref sequence),FilesHash,Hash(output));
        frozen=output;confirmation=ticket;return new(ticket,changes);
    }
    internal SaveFolderFile[] Commit(IReadOnlyList<SaveFolderFile> current,SaveFolderConfirmation ticket)
    {
        try{
            AssertSource(current);
            if(frozen is null||confirmation is null||ticket!=confirmation)throw new ArgumentException("Save library preview is missing or expired.");
            if(Hash(frozen)!=ticket.OutputHash)throw new InvalidOperationException("Frozen save library changed.");
            return Copy(frozen);
        }finally{Reset();}
    }
    internal void Discard(string token){if(confirmation?.Token==token)Reset();}
    internal void Reset(){confirmation=null;frozen=null;}
    internal void AssertSource(IReadOnlyList<SaveFolderFile> current){if(Hash(current)!=FilesHash)throw new ArgumentException("Save library files changed. Reload the list.");}
    internal static string Hash(IReadOnlyList<SaveFolderFile> input)
    {
        if(input is null||input.Count>1024||input.Any(f=>f is null||f.Data is null||f.Data.Length>32*1024*1024)||input.Sum(f=>(long)f.Data.Length)>128L*1024*1024)throw new ArgumentException("Invalid save library binding.");
        using var hash=IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        void Field(string value){if(value is null)throw new ArgumentException("Missing save library metadata.");byte[] text=Encoding.UTF8.GetBytes(value),size=new byte[4];BinaryPrimitives.WriteInt32LittleEndian(size,text.Length);hash.AppendData(size);hash.AppendData(text);}
        foreach(var file in input){Field(file.Id);Field(file.Name);Field(file.Folder);Field(file.Modified.ToString(System.Globalization.CultureInfo.InvariantCulture));Field(file.Recent?"recent":"");Field(file.Backup?"backup":"");Field(file.Remembered?"remembered":"");Field(Br4Editing.Hash(file.Data));}
        return Convert.ToHexString(hash.GetHashAndReset());
    }
    private static SaveFolderFile[] Copy(IReadOnlyList<SaveFolderFile> input)=>input.Select(f=>f with{Data=f.Data.ToArray()}).ToArray();
}

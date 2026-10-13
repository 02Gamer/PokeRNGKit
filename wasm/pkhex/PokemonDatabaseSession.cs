// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using PKHeX.Core;
using PKHeX.Core.Searching;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonDatabaseEdit(string Action, int[]? Ids = null, int Box = 0,
    bool Clear = false, bool Overwrite = false, EntityImportSettings Settings = default,
    PokemonDatabaseFile? Add = null, PokemonDatabaseQuery? Query = null);
internal sealed record PokemonDatabaseConfirmation(string Token, string SourceHash, string FilesHash, string OutputHash);
internal sealed record PokemonDatabaseTicket(PokemonDatabaseConfirmation Confirmation, string Action,
    string[] RemovedFiles, string[] AddedFiles, int ChangedSaveBytes, int Imported, int DeletedSlots);
internal sealed record PokemonDatabaseCommit(byte[] Save, PokemonDatabaseFile[] Files);

// A Worker owns one instance. Confirm applies the exact frozen outputs and never
// repeats conversion or RNG. Every replacement/failure/cancel invalidates its ticket.
internal sealed class PokemonDatabaseSession
{
    internal PokemonDatabase Database { get; }
    internal PokemonDatabaseFileResult[] FileResults { get; }
    internal string SourceHash { get; }
    internal string FilesHash { get; }
    private readonly byte[] input;
    private readonly SaveFile source;
    private readonly PokemonDatabaseFile[] files;
    private PokemonDatabaseConfirmation? confirmation;
    private PokemonDatabaseCommit? frozen;
    private static long sequence;

    internal PokemonDatabaseSession(byte[] input, IReadOnlyList<PokemonDatabaseFile> files, PokemonDatabaseOptions options)
    {
        if(input is null || input.Length is 0 or > 32*1024*1024)throw new ArgumentException("Invalid database current save size.");
        this.input = input.ToArray();
        source=SaveService.OpenDatabaseSave(this.input);
        PokemonDatabaseFiles.Validate(files);this.files=CopyFiles(files);
        var loaded=PokemonDatabaseFiles.Load(source,this.files);
        Database=new(source,loaded.Slots,options,loaded.FileIds);FileResults=loaded.Files;
        SourceHash=Br4Editing.Hash(this.input);FilesHash=HashFiles(this.files);
    }
    internal PokemonDatabaseTicket Prepare(byte[] current, IReadOnlyList<PokemonDatabaseFile> currentFiles, PokemonDatabaseEdit edit)
    {
        Reset();Validate(current,currentFiles);
        if(edit is null)throw new ArgumentException("Missing database edit.");
        var nextFiles=files.ToList();SaveFile? nextSave=null;int imported=0,deleted=0;
        switch(edit.Action)
        {
            case "delete":
            {
                if(edit.Ids is not {Length:1})throw new ArgumentException("Select one database entry.");
                var row=Database.Row(edit.Ids[0]);
                if(row.Source=="file")
                {
                    if(row.FileId is null || nextFiles.RemoveAll(f=>f.Id==row.FileId && f.EntityFile)!=1)throw new ArgumentException("Database file is missing.");
                }
                else{if(!source.State.Exportable || !SaveChecksums.Valid(source))throw new ArgumentException("Database deletion requires a valid editable save.");nextSave=Database.DeleteCurrent(source,row.Id);deleted=1;}
                break;
            }
            case "import":
            {
                if(!source.State.Exportable || !SaveChecksums.Valid(source))throw new ArgumentException("Database import requires a valid editable save.");
                if(!Enum.IsDefined(edit.Settings.UpdateToSaveFile) || !Enum.IsDefined(edit.Settings.UpdatePokeDex) || !Enum.IsDefined(edit.Settings.UpdateRecord))throw new ArgumentException("Invalid database import option.");
                if(edit.Add is not null) {
                    if(edit.Ids is not null || edit.Query is not null || !edit.Add.EntityFile || !edit.Add.UseFileFormat)throw new ArgumentException("Prepared import must declare one independent entity.");
                    PokemonDatabaseFiles.Validate([edit.Add]);
                    var prepared=StandalonePokemon.Open(edit.Add.Data,edit.Add.Name,false,true).Entity;
                    if(prepared.Species==0 || !prepared.Valid)throw new ArgumentException("Invalid prepared import entity.");
                    if(!source.HasBox || (uint)edit.Box>=source.BoxCount)throw new ArgumentException("Invalid prepared import box.");
                    nextSave=PokemonDatabase.Copy(source);
                    imported=nextSave.LoadBoxes([prepared],out _,edit.Box,edit.Clear,edit.Overwrite,edit.Settings);break;
                }
                if(edit.Ids is not null && edit.Query is not null)throw new ArgumentException("Choose import entries or a search query.");
                var ids=edit.Query is null ? edit.Ids ?? throw new ArgumentException("Missing import entries.") : Database.Search(edit.Query).Select(row=>row.Id).ToArray();
                var result=Database.Import(source,ids,edit.Box,edit.Clear,edit.Overwrite,edit.Settings);
                nextSave=result.Save;imported=result.Count;break;
            }
            case "add":
            {
                var added=edit.Add ?? throw new ArgumentException("Missing added database file.");
                if(!added.EntityFile || nextFiles.Any(f=>f.Id==added.Id || f.EntityFile && f.Name==added.Name))throw new ArgumentException("Database entity file already exists.");
                var loaded=PokemonDatabaseFiles.Load(source,[added]);
                if(loaded.Slots.Length!=1 || !loaded.Slots[0].IsDataValid())throw new ArgumentException("Added database file must contain a valid entity.");
                nextFiles.Add(added with {Data=added.Data.ToArray()});break;
            }
            case "clones":
            {
                var dates=files.ToDictionary(f=>f.Id,f=>f.Modified,StringComparer.Ordinal);
                var ordered=Database.Rows.Where(r=>r.Source=="file").OrderByDescending(r=>r.FileId is null?0:dates[r.FileId]);
                var hasher=SearchUtil.GetCloneDetectMethod(CloneDetectionMethod.HashDetails);
                var duplicates=SearchUtil.GetExtraClones(ordered,r=>hasher(r.Entry.Entity));
                var ids=duplicates.Select(r=>r.FileId ?? throw new ArgumentException("Missing clone file owner.")).ToHashSet(StringComparer.Ordinal);
                nextFiles.RemoveAll(f=>ids.Contains(f.Id));
                if(!source.State.Exportable || !SaveChecksums.Valid(source))throw new ArgumentException("Clone deletion requires a valid editable save.");
                nextSave=PokemonDatabase.Copy(source);
                var clear=new BoxManipClearDuplicate<string>(BoxManipType.DeleteClones,hasher);
                deleted=source.HasBox ? clear.Execute(nextSave,new(0,source.BoxCount-1)) : 0;
                break;
            }
            default:throw new ArgumentException("Unknown database edit action.");
        }
        byte[] bytes=nextSave is null?input.ToArray():nextSave.Write().ToArray();
        if(nextSave is not null)
        {
            var reopened=SaveService.OpenDatabaseSave(bytes);
            if(reopened.GetType()!=source.GetType() || bytes.Length!=input.Length || !SaveChecksums.Valid(reopened))throw new InvalidOperationException("Database save export validation failed.");
        }
        PokemonDatabaseFiles.Validate(nextFiles);var finalFiles=CopyFiles(nextFiles);
        string outputHash=Br4Editing.Hash(bytes)+":"+HashFiles(finalFiles);
        var ticket=new PokemonDatabaseConfirmation("database:"+Interlocked.Increment(ref sequence),SourceHash,FilesHash,outputHash);
        frozen=new(bytes,finalFiles);confirmation=ticket;
        int changed=Math.Abs(bytes.Length-input.Length)+Enumerable.Range(0,Math.Min(bytes.Length,input.Length)).Count(i=>bytes[i]!=input[i]);
        return new(ticket,edit.Action,files.Where(f=>!finalFiles.Any(n=>n.Id==f.Id)).Select(f=>f.Id).ToArray(),finalFiles.Where(f=>!files.Any(n=>n.Id==f.Id)).Select(f=>f.Id).ToArray(),changed,imported,deleted);
    }
    internal PokemonDatabaseCommit Commit(byte[] current,IReadOnlyList<PokemonDatabaseFile> currentFiles,PokemonDatabaseConfirmation ticket)
    {
        try {
        if(confirmation is null || frozen is null || ticket!=confirmation)throw new ArgumentException("Database preview is missing or replaced.");
        Validate(current,currentFiles);
        if(Br4Editing.Hash(frozen.Save)+":"+HashFiles(frozen.Files)!=ticket.OutputHash)throw new InvalidOperationException("Database frozen output has changed.");
        return new PokemonDatabaseCommit(frozen.Save.ToArray(),CopyFiles(frozen.Files));
        } finally {Reset();}
    }
    internal void Discard(string token){if(confirmation?.Token==token)Reset();}
    internal void Reset(){confirmation=null;frozen=null;}
    private void Validate(byte[] current,IReadOnlyList<PokemonDatabaseFile> currentFiles)
    {
        AssertSource(current);
        if(HashFiles(currentFiles)!=FilesHash)throw new ArgumentException("Database sources have changed. Reload the database.");
    }
    internal void AssertSource(byte[] current)
    {
        if(current is null || Br4Editing.Hash(current)!=SourceHash || source is SAV4BR br && SaveService.OpenDatabaseSave(current) is SAV4BR selected && selected.CurrentSlot!=br.CurrentSlot)
            throw new ArgumentException("Database save context has changed. Reload the database.");
    }
    private static PokemonDatabaseFile[] CopyFiles(IReadOnlyList<PokemonDatabaseFile> files)=>files.Select(f=>f with{Data=f.Data.ToArray()}).ToArray();
    internal static string HashFiles(IReadOnlyList<PokemonDatabaseFile> files)
    {
        using var hash=IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        void String(string value){byte[] bytes=Encoding.UTF8.GetBytes(value);byte[] size=new byte[4];BinaryPrimitives.WriteInt32LittleEndian(size,bytes.Length);hash.AppendData(size);hash.AppendData(bytes);}
        foreach(var file in files)
        {
            String(file.Id);String(file.Name);String(file.EntityFile?"entity":"save");String(file.Modified.ToString(System.Globalization.CultureInfo.InvariantCulture));String(file.UseFileFormat?"declared":"detected");
            String(Br4Editing.Hash(file.Data));
        }
        return Convert.ToHexString(hash.GetHashAndReset());
    }
}

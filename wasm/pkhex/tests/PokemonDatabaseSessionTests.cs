// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Core.Searching;
using PokeRNGKit.SaveEditor;
internal static class PokemonDatabaseSessionTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"})
        {
            var save=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"))!;
            var entity=save.BlankPKM;entity.Species=25;entity.CurrentLevel=5;entity.ForcePartyData();entity.Valid=true;
            save.SetBoxSlotAtIndex(entity,0,0,EntityImportSettings.None);save.SetBoxSlotAtIndex(entity,0,1,EntityImportSettings.None);
            byte[] input=save.Write().ToArray(), original=input.ToArray();
            var data=new byte[entity.SIZE_PARTY];entity.WriteDecryptedDataParty(data);
            var files=new[]{new PokemonDatabaseFile("old","old."+entity.Extension,data,true,100),new PokemonDatabaseFile("new","new."+entity.Extension,data.ToArray(),true,200),new PokemonDatabaseFile("backup",fixture+".sav",input.ToArray(),false,300)};
            string initialFilesHash=PokemonDatabaseSession.HashFiles(files);
            var session=new PokemonDatabaseSession(input,files,new(FilterUnavailableSpecies:false));
            var current=session.Database.Rows.First(r=>r.Source=="current" && r.Entry.Source is SlotInfoBox{Box:0,Slot:0});
            var file=session.Database.Rows.First(r=>r.FileId=="old");
            var backup=session.Database.Rows.First(r=>r.Source=="backup");
            foreach(bool clear in new[]{false,true})foreach(bool overwrite in new[]{false,true})
            {
                var ticket=session.Prepare(input,files,new("import",[current.Id],1,clear,overwrite,EntityImportSettings.None));
                var output=session.Commit(input,files,ticket.Confirmation);
                var expected=SaveUtil.GetSaveFile(input.ToArray())!;int count=expected.LoadBoxes([current.Entry.Entity.Clone()],out _,1,clear,overwrite,EntityImportSettings.None);
                Check(output.Save.AsSpan().SequenceEqual(expected.Write().Span) && ticket.Imported==count,"Frozen import exact source full output/options");
                Check(PokemonDatabaseSession.HashFiles(output.Files)==initialFilesHash,"Import does not change chosen database files");
                Reject(()=>session.Commit(input,files,ticket.Confirmation));
            }
            var removed=session.Prepare(input,files,new("delete",[file.Id]));
            Check(removed.RemovedFiles.SequenceEqual(new[]{"old"}) && removed.ChangedSaveBytes==0,"Local file deletion preview only");
            var deleted=session.Commit(input,files,removed.Confirmation);
            Check(deleted.Files.Select(f=>f.Id).SequenceEqual(new[]{"new","backup"}) && deleted.Save.SequenceEqual(input),"Delete local copy preserves source file/save");
            var slotTicket=session.Prepare(input,files,new("delete",[current.Id]));
            var slotOutput=session.Commit(input,files,slotTicket.Confirmation);
            var slotOracle=SaveUtil.GetSaveFile(input.ToArray())!;slotOracle.SetBoxSlotAtIndex(slotOracle.BlankPKM,0,0,EntityImportSettings.None);
            Check(slotOutput.Save.AsSpan().SequenceEqual(slotOracle.Write().Span),"Frozen current box deletion complete output");
            Reject(()=>session.Prepare(input,files,new("delete",[backup.Id])));
            var add=new PokemonDatabaseFile("added","added."+entity.Extension,data.ToArray(),true,400);
            var addedTicket=session.Prepare(input,files,new("add",Add:add));
            var added=session.Commit(input,files,addedTicket.Confirmation);
            Check(added.Files.Last().Id=="added" && added.Files.Last().Data.SequenceEqual(data) && added.Save.SequenceEqual(input),"Frozen add exact local entity bytes");
            var cloneTicket=session.Prepare(input,files,new("clones"));
            Check(cloneTicket.RemovedFiles.SequenceEqual(new[]{"old"}),"Source clone deletion retains newest chosen file");
            var clones=session.Commit(input,files,cloneTicket.Confirmation);
            var oracle=SaveUtil.GetSaveFile(input.ToArray())!;
            var hasher=SearchUtil.GetCloneDetectMethod(CloneDetectionMethod.HashDetails);
            int cleared=new BoxManipClearDuplicate<string>(BoxManipType.DeleteClones,hasher).Execute(oracle,new(0,oracle.BoxCount-1));
            Check(clones.Save.AsSpan().SequenceEqual(oracle.Write().Span) && cloneTicket.DeletedSlots==cleared,"Frozen source clone clearing complete output");
            var stale=session.Prepare(input,files,new("delete",[file.Id]));
            var modified=input.ToArray();modified[^1]^=1;
            Reject(()=>session.Commit(modified,files,stale.Confirmation));Reject(()=>session.Commit(input,files,stale.Confirmation));
            stale=session.Prepare(input,files,new("delete",[file.Id]));
            var changedFiles=files.Select(f=>f with{Modified=f.Modified+1}).ToArray();
            Reject(()=>session.Commit(input,changedFiles,stale.Confirmation));
            stale=session.Prepare(input,files,new("delete",[file.Id]));session.Discard(stale.Confirmation.Token);Reject(()=>session.Commit(input,files,stale.Confirmation));
            stale=session.Prepare(input,files,new("delete",[file.Id]));Reject(()=>session.Prepare(input,files,new("unknown")));Reject(()=>session.Commit(input,files,stale.Confirmation));
            var replaced=session.Prepare(input,files,new("delete",[file.Id]));session.Prepare(input,files,new("add",Add:add));Reject(()=>session.Commit(input,files,replaced.Confirmation));
            Check(input.SequenceEqual(original) && PokemonDatabaseSession.HashFiles(files)==initialFilesHash,"All previews/commits/rejections preserve original inputs");
            Console.WriteLine($"PASS database sessions {fixture}: source import/delete/add/clones frozen whole outputs, newest-file retention, stale/replaced/cancel/one-use/failure and immutable inputs");
        }
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid database session action accepted");}
}

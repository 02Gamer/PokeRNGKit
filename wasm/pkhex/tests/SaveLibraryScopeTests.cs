// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class SaveLibraryScopeTests
{
    internal static void Run()
    {
        var front=JsonSerializer.Deserialize<string[]>(File.ReadAllText("src/features/saveeditor/save-library-console-paths.json"))!;
        Check(front.SequenceEqual(SaveLibraryScope.ConsolePaths),"Browser console locations exactly match unmodified Core enumerators");
        foreach(var root in front) {
            Check(SaveLibraryScope.ConsoleFolder("SD/"+root+"/game"),"Every selected console folder is detected");
            Check(!SaveLibraryScope.ConsoleFolder("prefix/"+root.Replace('/','_')+"2/game"),"Console folder boundary");
        }
        Check(SaveLibraryScope.ConsoleFolder("SD/JKSV2/JKSV/game"),"A later valid console path is not hidden by an earlier prefix");
        var settings=SaveProgramSettingsCodec.Defaults();settings.Backup.OtherBackupPaths=["extra","bak","extra/"];
        var input=File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        var files=new[]{
            new SaveFolderFile("extra","E.sav","extra/sub",input,1,Recent:false),
            new SaveFolderFile("excluded","main.bak","extra",input,2,Recent:false),
            new SaveFolderFile("root","main [old].bak","bak",input,3,Recent:false),
            new SaveFolderFile("nested","nested.sav","bak/sub",input,4,Recent:false),
            new SaveFolderFile("sibling","other.sav","baks",input,5,Recent:false),
            new SaveFolderFile("console","E.sav","SD/3ds/Checkpoint/saves/Game",input,6,Recent:false),
            new SaveFolderFile("remembered","main.bak","chosen",input,7,Remembered:true),
            new SaveFolderFile("unknown","bad","bak",[0],8,Recent:false),
            new SaveFolderFile("unknown-child","bad","bak/sub",[0],9,Recent:false),
        };
        var original=files.Select(f=>f with{Data=f.Data.ToArray()}).ToArray();
        try {
            SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
            var list=new SaveFolderList(files);
            Check(list.Read(new()).Select(f=>f.Id).ToHashSet().SetEquals(["extra","console","remembered"]),"Configured extra folders, console folders and remembered backup exception");
            Check(list.Read(new(Backup:true)).Select(f=>f.Id).ToHashSet().SetEquals(["root","nested"]),"Configured backup folder recursively includes unmarked originals");
            Check(list.Read(new(FolderRoot:"bak")).Select(f=>f.Id).ToHashSet().SetEquals(["root","nested"]),"Exact directory boundary excludes baks");
            Check(list.Read(new(FolderRoot:"baks")).Single().Id=="sibling","Directory navigation also exposes explicitly imported unlisted copies");
            Check(list.Read(new(FolderRoot:"extra\\",Column:8,Text:"E.sav")).Single().Id=="extra","Path scope composes with existing column filters");
            bool rejected=false;try{list.Read(new(FolderRoot:new string('a',32768)));}catch(ArgumentException){rejected=true;}
            Check(rejected,"Folder scope input limit");
            var session=new SaveFolderSession(files);var hash=SaveFolderSession.Hash(files);
            Check(session.FilesHash==hash,"Derived display flags never enter persisted source hashing");
            var ticket=session.Prepare(files,new("cleanup",DeleteUnrecognized:true));
            Check(ticket.Changes.Any(c=>c.Id=="unknown"&&c.Action=="remove")&&!ticket.Changes.Any(c=>c.Id is "unknown-child" or "nested"),"Configured cleanup is nonrecursive");
            var output=session.Commit(files,ticket.Confirmation);
            Check(output.All(f=>!f.Recent&&!f.Backup||f.Id=="remembered"),"Display classification does not overwrite owner metadata");
            Check(files.Zip(original).All(pair=>pair.First==(pair.Second with{Data=pair.First.Data})&&pair.First.Data.SequenceEqual(pair.Second.Data)),"Reading and cleanup preserve all original records and bytes");
            Console.WriteLine("PASS library scope: Core console paths, configured lists, root boundaries, filter composition, original metadata/hash/bytes and nonrecursive cleanup");
        }finally{SaveProgramSettingsRuntime.Reset();}
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
}

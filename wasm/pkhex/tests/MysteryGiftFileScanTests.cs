// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class MysteryGiftFileScanTests
{
    internal static void Run()
    {
        var gift=EncounterEvent.GetAllEvents().OfType<DataMysteryGift>().First();
        var original=gift.Data.ToArray();var raw=Convert.ToBase64String(original);
        var files=new[]{new PokemonFile("custom/"+gift.FileName,raw),new PokemonFile("notes.txt","AQID"),new PokemonFile("custom/sub/"+gift.FileName,raw)};
        var json=JsonSerializer.Serialize(new MysteryGiftDatabaseOpen(Files:files),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseOpen);
        var result=JsonSerializer.Deserialize<int[]>(SaveService.ScanMysteryGiftFiles(json))!;
        Check(result.SequenceEqual([0,2]),"Core size/content recognition keeps valid gifts and ignores unrelated files");
        Check(SaveService.ScanMysteryGiftFiles("{\"files\":[]}")=="[]","Empty folder classification");
        foreach(var file in files) {
            var bytes=Convert.FromBase64String(file.Data);
            bool valid=MysteryGift.IsMysteryGift(bytes.Length)&&MysteryGift.GetMysteryGift(bytes,Path.GetExtension(file.FileName)) is not null;
            Check(valid==result.Contains(Array.IndexOf(files,file)),"Exact Core directory loader semantics");
        }
        Reject(()=>SaveService.ScanMysteryGiftFiles(JsonSerializer.Serialize(new MysteryGiftDatabaseOpen(Files:Enumerable.Repeat(files[0],1025).ToArray()),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseOpen)));
        Reject(()=>SaveService.ScanMysteryGiftFiles("{\"files\":[{\"fileName\":\"x\",\"data\":\"invalid!\"}]}"));
        Check(gift.Data.SequenceEqual(original)&&files[0].Data==raw,"Scan does not modify built-in gifts or input records");
        Console.WriteLine("PASS gift directory scan: Core recognition, mixed/empty folders, nested source names, count/corrupt boundaries and original data");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(FormatException){return;}throw new Exception("Invalid gift directory scan accepted");}
}

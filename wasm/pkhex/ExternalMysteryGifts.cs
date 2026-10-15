// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public static partial class Program
{
    [JSExport] public static void ConfigureExternalMysteryGifts(string json)=>ExternalMysteryGifts.Configure(json);
}
internal static class ExternalMysteryGifts
{
    private static string? signature;
    internal static void Configure(string json)
    {
        if(json is null||json.Length>24*1024*1024)throw new ArgumentException("External mystery gift metadata exceeds the local size limit.");
        string fingerprint=Br4Editing.Hash(Encoding.UTF8.GetBytes(json));
        if(signature==fingerprint)return;
        if(signature is not null)throw new ArgumentException("Mystery gift data changed. Restart the save Worker before continuing.");
        var files=JsonSerializer.Deserialize(json,MysteryGiftDatabaseJson.Default.PokemonFileArray)??throw new ArgumentException("Missing external mystery gift files.");
        if(files.Length>1024)throw new ArgumentException("Too many external mystery gift files.");
        var contents=new List<(string Extension,byte[] Bytes)>();long total=0;
        foreach(var file in files) {
            if(file is null||string.IsNullOrEmpty(file.FileName)||file.FileName.Length>4096||file.Data is null||file.Data.Length>64*1024)
                throw new ArgumentException("Invalid external mystery gift file.");
            var bytes=Convert.FromBase64String(file.Data);total+=bytes.Length;
            if(total>16*1024*1024)throw new ArgumentException("External mystery gift library exceeds 16 MiB.");
            // Only preserve a supported extension, never an owner-supplied path.
            var extension=Path.GetExtension(file.FileName);
            if(MysteryGift.IsMysteryGift(bytes.Length)&&MysteryGift.GetMysteryGift(bytes,extension) is { } gift)
                contents.Add(("."+gift.Extension,gift.Data.ToArray()));
        }
        if(contents.Count==0)EncounterEvent.RefreshMGDB();
        else {
            // In browser-wasm this directory lives solely in the Worker's memory
            // filesystem. Use Core's own deduplication and generation routing.
            string directory=Path.Combine(Path.GetTempPath(),"pokerngkit-gifts-"+Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            try {
                for(int i=0;i<contents.Count;i++)File.WriteAllBytes(Path.Combine(directory,i.ToString("D4")+contents[i].Extension),contents[i].Bytes);
                EncounterEvent.RefreshMGDB(directory);
            } finally {Directory.Delete(directory,true);}
        }
        signature=fingerprint;
    }
    internal static void Reset(){EncounterEvent.RefreshMGDB();signature=null;}
    internal static IEnumerable<MysteryGift> BuiltInEvents()=>
        EncounterEvent.MGDB_G4.Cast<MysteryGift>().Concat(EncounterEvent.MGDB_G5).Concat(EncounterEvent.MGDB_G6)
        .Concat(EncounterEvent.MGDB_G7).Concat(EncounterEvent.MGDB_G7GG).Concat(EncounterEvent.MGDB_G8)
        .Concat(EncounterEvent.MGDB_G8A).Concat(EncounterEvent.MGDB_G8B).Concat(EncounterEvent.MGDB_G9).Concat(EncounterEvent.MGDB_G9A)
        .Where(gift=>gift is {IsItem:false,IsEntity:true,Species:not 0});
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

// Main.MainMenuEncounterDB / BoxUtil.GetPKMsFromPaths, over explicitly picked bytes.
internal static class PokemonEncounterTrainerFiles
{
    internal static PKM[] Read(PokemonFile[]? files,EntityContext context)
    {
        if(files is null)return [];
        if(files.Length>1024)throw new ArgumentException("Too many encounter trainer files.");
        var result=new List<PKM>();int total=0;
        foreach(var file in files) {
            if(file is null||string.IsNullOrEmpty(file.FileName)||file.FileName.Length>4096||file.Data is null||file.Data.Length>((PokemonFiles.MaximumSize+2)/3)*4)
                throw new ArgumentException("Invalid encounter trainer file.");
            var bytes=Convert.FromBase64String(file.Data);
            if(bytes.Length>PokemonFiles.MaximumSize||(total+=bytes.Length)>2*1024*1024)
                throw new ArgumentException("Encounter trainer files exceed the browser limit.");
            if(!EntityDetection.IsSizePlausible(bytes.Length))continue;
            var prefer=EntityFileExtension.GetContextFromExtension(Path.GetExtension(file.FileName),context);
            var pokemon=EntityFormat.GetFromBytes(bytes,prefer);
            if(pokemon?.Species is >0)result.Add(pokemon);
        }
        return result.ToArray();
    }
}

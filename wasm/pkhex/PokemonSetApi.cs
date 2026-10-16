// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;
public static partial class Program
{
    [JSExport]public static string PreviewPokemonSet(byte[] input,string json)=>JsonSerializer.Serialize(PokemonSetSession.Prepare(input,json),PokemonSetJson.Default.PokemonSetTicket);
    [JSExport]public static byte[] CommitPokemonSet(byte[] input,string json)
    {
        if(json is null||json.Length>4096)throw new ArgumentException("Prepared Pokemon confirmation exceeds limits.");
        using var document=JsonDocument.Parse(json);PokemonSetSession.Unique(document.RootElement);
        return PokemonSetSession.Commit(input,JsonSerializer.Deserialize(json,PokemonSetJson.Default.PokemonSetConfirmation)??throw new ArgumentException("Missing prepared Pokemon confirmation."));
    }
    [JSExport]public static void DiscardPokemonSet(string token)=>PokemonSetSession.Discard(token);
    [JSExport]public static string ReadPokemonEditorFile(byte[] input,string json)
    {
        var position=PokemonEditorContext.ReadPosition(json);
        var save=SaveService.OpenDatabaseSave(input);SavePokemonEditing.Require(save);var p=PokemonEditing.Read(save,position.Box,position.Slot);
        if(p.Species==0||!p.Valid||!p.ChecksumValid)throw new ArgumentException("Editor source must contain valid Pokemon data.");
        var file=new PokemonFile("editor."+p.Extension,Convert.ToBase64String(StandalonePokemon.Serialize(p.Clone(),true,false)));
        return JsonSerializer.Serialize(file,SaveJsonContext.Default.PokemonFile);
    }
}

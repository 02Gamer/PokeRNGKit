// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;
public static partial class Program
{
    [JSExport]public static string ReadExtraSlots(byte[] input)=>JsonSerializer.Serialize(ExtraSlots.Read(SaveService.OpenDatabaseSave(input),input),ExtraSlotJson.Default.ExtraSlotCatalog);
    [JSExport]public static string ReadExtraSlotEditor(byte[] input,string json)=>JsonSerializer.Serialize(ExtraSlots.Open(SaveService.OpenDatabaseSave(input),ExtraSlots.Decode(json)),SaveJsonContext.Default.PokemonFile);
    [JSExport]public static string PreviewExtraSlot(byte[] input,string json)=>JsonSerializer.Serialize(ExtraSlotSession.Prepare(input,json),ExtraSlotJson.Default.ExtraSlotPreview);
    [JSExport]public static byte[] CommitExtraSlot(byte[] input,string json)=>ExtraSlotSession.Commit(input,json);
    [JSExport]public static void DiscardExtraSlot(string token)=>ExtraSlotSession.Discard(token);
}

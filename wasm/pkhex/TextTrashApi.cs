// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;

namespace PokeRNGKit.SaveEditor;
public static partial class SaveService
{
    private static void TextTrashSize(byte[] data,string json,int maximum) { if(data.Length is 0 or > MaximumSize||json.Length>maximum)throw new ArgumentException("Name editor input is too large or empty."); }
    public static string ReadTextTrash(byte[] data,string json) {
        TextTrashSize(data,json,4096);var target=JsonSerializer.Deserialize(json,SaveJsonContext.Default.TextTrashTarget)??throw new ArgumentException("Missing name target.");
        return JsonSerializer.Serialize(TextTrashSession.Read(data,target),SaveJsonContext.Default.TextTrashCatalog);
    }
    public static string DraftTextTrash(byte[] data,string json) {
        TextTrashSize(data,json,64*1024);var request=JsonSerializer.Deserialize(json,SaveJsonContext.Default.TextTrashRequest)??throw new ArgumentException("Missing name draft.");
        return JsonSerializer.Serialize(TextTrashSession.Draft(data,request),SaveJsonContext.Default.TextTrashDraft);
    }
    public static string PreviewTextTrash(byte[] data,string json) {
        TextTrashSession.Reset();TextTrashSize(data,json,64*1024);var request=JsonSerializer.Deserialize(json,SaveJsonContext.Default.TextTrashRequest)??throw new ArgumentException("Missing name edit.");
        return JsonSerializer.Serialize(TextTrashSession.Prepare(data,request),SaveJsonContext.Default.TextTrashTicket);
    }
    public static byte[] CommitTextTrash(byte[] data,string json) {
        TextTrashSize(data,json,4096);var confirmation=JsonSerializer.Deserialize(json,SaveJsonContext.Default.TextTrashConfirmation)??throw new ArgumentException("Missing name confirmation.");
        return TextTrashSession.Commit(data,confirmation);
    }
    public static void DiscardTextTrash(string token)=>TextTrashSession.Discard(token);
}

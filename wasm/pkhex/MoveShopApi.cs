// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;

namespace PokeRNGKit.SaveEditor;
public static partial class SaveService
{
    public static string ReadMoveShop(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Move Shop query is too large.");
        var target = JsonSerializer.Deserialize(json, SaveJsonContext.Default.MoveShopTarget) ?? throw new ArgumentException("Missing Move Shop target.");
        return JsonSerializer.Serialize(MoveShopSession.Read(data, target), SaveJsonContext.Default.MoveShopCatalog);
    }
    public static string PreviewMoveShop(byte[] data, string json)
    {
        MoveShopSession.Reset();
        if (json.Length > 64 * 1024) throw new ArgumentException("Move Shop request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.MoveShopRequest) ?? throw new ArgumentException("Missing Move Shop request.");
        return JsonSerializer.Serialize(MoveShopSession.Prepare(data, request), SaveJsonContext.Default.MoveShopTicket);
    }
    public static byte[] CommitMoveShop(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Move Shop confirmation is too large.");
        var confirmation = JsonSerializer.Deserialize(json, SaveJsonContext.Default.MoveShopConfirmation) ?? throw new ArgumentException("Missing Move Shop confirmation.");
        return MoveShopSession.Commit(data, confirmation);
    }
    public static void DiscardMoveShop(string token) => MoveShopSession.Discard(token);
}

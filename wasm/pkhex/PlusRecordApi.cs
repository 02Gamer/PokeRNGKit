// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;

namespace PokeRNGKit.SaveEditor;
public static partial class SaveService
{
    public static string ReadPlusRecords(byte[] data, string json) {
        if (json.Length > 4096) throw new ArgumentException("Plus record query is too large.");
        var target = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PlusRecordTarget) ?? throw new ArgumentException("Missing technical record target.");
        return JsonSerializer.Serialize(PlusRecordSession.Read(data, target), SaveJsonContext.Default.PlusRecordCatalog);
    }
    public static string PreviewPlusRecords(byte[] data, string json) {
        PlusRecordSession.Reset();
        if (json.Length > 64 * 1024) throw new ArgumentException("Plus record request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PlusRecordRequest) ?? throw new ArgumentException("Missing technical record request.");
        return JsonSerializer.Serialize(PlusRecordSession.Prepare(data, request), SaveJsonContext.Default.PlusRecordTicket);
    }
    public static byte[] CommitPlusRecords(byte[] data, string json) {
        if (json.Length > 4096) throw new ArgumentException("Plus record confirmation is too large.");
        var confirmation = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PlusRecordConfirmation) ?? throw new ArgumentException("Missing technical record confirmation.");
        return PlusRecordSession.Commit(data, confirmation);
    }
    public static void DiscardPlusRecords(string token) => PlusRecordSession.Discard(token);
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;

namespace PokeRNGKit.SaveEditor;
public static partial class SaveService
{
    public static string ReadTechRecords(byte[] data, string json) {
        if (json.Length > 4096) throw new ArgumentException("Technical record query is too large.");
        var target = JsonSerializer.Deserialize(json, SaveJsonContext.Default.TechRecordTarget) ?? throw new ArgumentException("Missing technical record target.");
        return JsonSerializer.Serialize(TechRecordSession.Read(data, target), SaveJsonContext.Default.TechRecordCatalog);
    }
    public static string PreviewTechRecords(byte[] data, string json) {
        TechRecordSession.Reset();
        if (json.Length > 64 * 1024) throw new ArgumentException("Technical record request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.TechRecordRequest) ?? throw new ArgumentException("Missing technical record request.");
        return JsonSerializer.Serialize(TechRecordSession.Prepare(data, request), SaveJsonContext.Default.TechRecordTicket);
    }
    public static byte[] CommitTechRecords(byte[] data, string json) {
        if (json.Length > 4096) throw new ArgumentException("Technical record confirmation is too large.");
        var confirmation = JsonSerializer.Deserialize(json, SaveJsonContext.Default.TechRecordConfirmation) ?? throw new ArgumentException("Missing technical record confirmation.");
        return TechRecordSession.Commit(data, confirmation);
    }
    public static void DiscardTechRecords(string token) => TechRecordSession.Discard(token);
}

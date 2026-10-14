// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;

namespace PokeRNGKit.SaveEditor;

public static partial class SaveService
{
    public static string ReadSimpleTrainer(byte[] data)
    {
        SimpleTrainerSession.Clear();
        return JsonSerializer.Serialize(SimpleTrainerSession.Read(Open(data), data), SaveJsonContext.Default.SimpleTrainerCatalog);
    }
    public static string PreviewSimpleTrainer(byte[] data, string json)
    {
        SimpleTrainerSession.Clear();
        if (json.Length > 32767) throw new ArgumentException("Simple trainer request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SimpleTrainerRequest) ?? throw new ArgumentException("Missing simple trainer request.");
        return JsonSerializer.Serialize(SimpleTrainerSession.Prepare(Open(data), data, request), SaveJsonContext.Default.SimpleTrainerPreview);
    }
    public static byte[] CommitSimpleTrainer(byte[] data, string json)
    {
        try {
            if (json.Length > 4096) throw new ArgumentException("Simple trainer confirmation is too large.");
            var confirmation = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SimpleTrainerConfirmation) ?? throw new ArgumentException("Missing simple trainer confirmation.");
            return SimpleTrainerSession.Commit(data, confirmation);
        } catch { SimpleTrainerSession.Clear(); throw; }
    }
    public static void DiscardSimpleTrainer(string token) => SimpleTrainerSession.Discard(token);
}

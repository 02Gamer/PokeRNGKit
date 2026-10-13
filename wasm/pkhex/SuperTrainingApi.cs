// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;

namespace PokeRNGKit.SaveEditor;
public static partial class SaveService
{
    public static string ReadPokemonSuperTraining(byte[] data, string json) {
        if (json.Length > 4096) throw new ArgumentException("Super training query is too large.");
        var target = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SuperTrainingTarget) ?? throw new ArgumentException("Missing super training target.");
        return JsonSerializer.Serialize(SuperTrainingSession.Read(data, target), SaveJsonContext.Default.SuperTrainingCatalog);
    }
    public static string PreviewPokemonSuperTraining(byte[] data, string json) {
        SuperTrainingSession.Reset();
        if (json.Length > 64 * 1024) throw new ArgumentException("Super training request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SuperTrainingRequest) ?? throw new ArgumentException("Missing super training request.");
        return JsonSerializer.Serialize(SuperTrainingSession.Prepare(data, request), SaveJsonContext.Default.SuperTrainingTicket);
    }
    public static byte[] CommitPokemonSuperTraining(byte[] data, string json) {
        if (json.Length > 4096) throw new ArgumentException("Super training confirmation is too large.");
        var confirmation = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SuperTrainingConfirmation) ?? throw new ArgumentException("Missing super training confirmation.");
        return SuperTrainingSession.Commit(data, confirmation);
    }
    public static void DiscardPokemonSuperTraining(string token) => SuperTrainingSession.Discard(token);
}

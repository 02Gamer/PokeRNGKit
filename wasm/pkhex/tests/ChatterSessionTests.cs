// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PokeRNGKit.SaveEditor;

internal static class ChatterSessionTests
{
    public static void Run()
    {
        Check(SaveService.ApiVersion == 146, "Chatter product protocol");
        foreach (string version in new[] { "D", "Pt", "HG", "B", "B2" })
        {
            var input = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var original = input.ToArray(); var hash = Br4Editing.Hash(input);
            var request = new ChatterRequest(hash, [new("initialized", true)]);
            using var catalog = JsonDocument.Parse(SaveService.ReadChatter(input));
            Check(catalog.RootElement.GetProperty("sourceHash").GetString() == hash && catalog.RootElement.GetProperty("pcmSize").GetInt32() == 1000, "Actual source JSON catalog");
            using var json = JsonDocument.Parse(SaveService.PreviewChatter(input, JsonSerializer.Serialize(request, SaveJsonContext.Default.ChatterRequest)));
            var ticket = JsonSerializer.Deserialize(json.RootElement.GetRawText(), SaveJsonContext.Default.ChatterTicket)!;
            var confirmation = new ChatterConfirmation(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            var bytes = SaveService.CommitChatter(input, JsonSerializer.Serialize(confirmation, SaveJsonContext.Default.ChatterConfirmation));
            Check(bytes.SequenceEqual(ChatterEditing.Prepare(input, request.Actions)) && ticket.Result.Initialized && Br4Editing.Hash(bytes) == ticket.TargetHash, "Frozen public commit exact bytes and hash");
            Reject(() => ChatterSession.Commit(input, confirmation));
            var old = ChatterSession.Prepare(input, request); var fresh = ChatterSession.Prepare(input, request);
            Reject(() => ChatterSession.Commit(input, new(old.Token, old.SourceHash, old.TargetHash)));
            ChatterSession.Discard(old.Token); // Closing an old view must not clear a newer preview.
            var stale = input.ToArray(); stale[0] ^= 1;
            Reject(() => ChatterSession.Commit(stale, new(fresh.Token, fresh.SourceHash, fresh.TargetHash)));
            var committed = ChatterSession.Commit(input, new(fresh.Token, fresh.SourceHash, fresh.TargetHash));
            Check(committed.SequenceEqual(bytes), "Replacement/old discard/stale source preserve current frozen output");
            var discarded = ChatterSession.Prepare(input, request); ChatterSession.Discard(discarded.Token);
            Reject(() => ChatterSession.Commit(input, new(discarded.Token, discarded.SourceHash, discarded.TargetHash)));
            var prior = ChatterSession.Prepare(input, request);
            Reject(() => ChatterSession.Prepare(input, new("WRONG", request.Actions)));
            Reject(() => ChatterSession.Commit(input, new(prior.Token, prior.SourceHash, prior.TargetHash)));
            prior = ChatterSession.Prepare(input, request);
            Reject(() => ChatterSession.Prepare(input, new(hash, [new("import", Pcm: "?")])));
            Reject(() => ChatterSession.Commit(input, new(prior.Token, prior.SourceHash, prior.TargetHash)));
            prior = ChatterSession.Prepare(input, request);
            try { SaveService.PreviewChatter(input, "{}"); } catch (JsonException) { }
            Reject(() => ChatterSession.Commit(input, new(prior.Token, prior.SourceHash, prior.TargetHash)));
            Check(input.SequenceEqual(original), "Preview/commit/failure changed original");
            Console.WriteLine($"PASS Chatter session {version}: source JSON, frozen exact commit, one-time/replaced/stale tokens, targeted discard, failed-preview cleanup and original");
        }
    }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid Chatter session request accepted"); }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
}

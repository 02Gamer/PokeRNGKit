// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record SCBlockRequest([property: JsonRequired] string SourceHash, [property: JsonRequired] SCBlockAction[] Actions);
public sealed record SCBlockConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash, [property: JsonRequired] bool AcceptPartialImport);
public sealed record SCBlockTicket(string Token, string SourceHash, string TargetHash, SCBlockDifference[] Blocks, SCBlockImportResult[] Imports, int ChangedBytes, bool RequiresPartialAcceptance);

internal static class SCBlockSession
{
    private static byte[]? output;
    private static SCBlockTicket? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    internal static SCBlockTicket Prepare(byte[] original, SCBlockRequest request)
    {
        Reset(); var source = SaveDetectionContext.OpenCurrent(original) ?? throw new ArgumentException("SCBlock save is unrecognized.");
        return Prepare(source, original, request);
    }
    internal static SCBlockTicket Prepare(SaveFile source, byte[] original, SCBlockRequest request)
    {
        Reset(); string hash = Br4Editing.Hash(original);
        if (request.SourceHash != hash) throw new ArgumentException("SCBlock preview is stale.");
        var prepared = SCBlockEditing.Prepare(source, original, request.Actions);
        string target = Br4Editing.Hash(prepared.Output);
        var result = SCBlockEditing.Reopen(source, prepared.Output);
        var changes = SCBlockEditing.Compare(source, result, hash, target, "").Blocks;
        int bytes = 0; for (int i = 0; i < original.Length; i++) if (original[i] != prepared.Output[i]) bytes++;
        string token = "scblock:" + (++revision).ToString(CultureInfo.InvariantCulture);
        var ticket = new SCBlockTicket(token, hash, target, changes, prepared.Imports, bytes, prepared.Imports.Any(x => !x.Imported));
        output = prepared.Output; current = ticket; return ticket;
    }
    internal static byte[] Commit(byte[] original, SCBlockConfirmation confirmation)
    {
        if (current is null || output is null || current.Token != confirmation.Token || current.SourceHash != confirmation.SourceHash || current.TargetHash != confirmation.TargetHash) throw new ArgumentException("SCBlock preview is missing or replaced.");
        if (Br4Editing.Hash(original) != current.SourceHash) throw new ArgumentException("SCBlock preview is stale.");
        if (current.RequiresPartialAcceptance && !confirmation.AcceptPartialImport) throw new ArgumentException("SCBlock partial import requires explicit acceptance.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("SCBlock frozen output verification failed.");
        byte[] result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

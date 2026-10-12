// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Buffers.Binary;

namespace PokeRNGKit.SaveEditor;

public sealed record ChatterAction(string Kind, bool? Initialized = null, string? Pcm = null);
public sealed record ChatterCatalog(bool CanEdit, string SourceHash, bool Initialized, uint RawInitialized, int ConfusionChance, bool CanPlay, int PcmSize, string Pcm, string Wav);

internal static class ChatterEditing
{
    public static bool Supports(SaveFile save) => save is SAV4DP or SAV4Pt or SAV4HGSS or SAV5BW or SAV5B2W2;
    private static IChatter Recording(SaveFile save) => save switch
    {
        SAV4DP or SAV4Pt or SAV4HGSS => ((SAV4)save).Chatter,
        SAV5BW or SAV5B2W2 => ((SAV5)save).Chatter,
        _ => throw new ArgumentException("Chatter recording is not supported for this save."),
    };
    // Core Chatter4 hides its raw flag buffer. These verified offsets are
    // relative to the active General block, never an assumed file partition.
    private static Span<byte> Data(SaveFile save) => save switch
    {
        SAV4DP s => s.General.Slice(0x61CC, Chatter4.SIZE),
        SAV4Pt s => s.General.Slice(0x64EC, Chatter4.SIZE),
        SAV4HGSS s => s.General.Slice(0x4E74, Chatter4.SIZE),
        SAV5BW or SAV5B2W2 => ((SAV5)save).Chatter.Data,
        _ => throw new ArgumentException("Chatter recording is not supported for this save."),
    };
    public static ChatterCatalog Read(SaveFile save, string hash)
    {
        var chatter = Recording(save); var pcm = chatter.Recording.ToArray();
        return new(save.State.Exportable && SaveChecksums.Valid(save), hash, chatter.Initialized,
            BinaryPrimitives.ReadUInt32LittleEndian(Data(save)), chatter.ConfusionChance,
            chatter.Initialized || pcm.AsSpan().ContainsAnyExcept<byte>(0), IChatter.SIZE_PCM,
            Convert.ToBase64String(pcm), Convert.ToBase64String(Wave(pcm)));
    }
    public static void Apply(SaveFile save, ChatterAction[] actions)
    {
        if (!Supports(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Chatter editing requires a supported save with valid checksums.");
        if (actions is null || actions.Length > 512) throw new ArgumentException("Invalid Chatter action list.");
        // Decode and validate every action before touching even the working clone.
        var prepared = actions.Select(action => {
            if (action is null) throw new ArgumentException("Invalid Chatter action.");
            if (action.Kind == "initialized" && action.Initialized is not null && action.Pcm is null)
                return (Flag: action.Initialized, Pcm: (byte[]?)null);
            if (action.Kind == "import" && action.Initialized is null && action.Pcm is { Length: <= 2048 } text)
            {
                byte[] data;
                try { data = Convert.FromBase64String(text); } catch (FormatException) { throw new ArgumentException("Invalid Chatter PCM data."); }
                if (data.Length != IChatter.SIZE_PCM) throw new ArgumentException("Chatter PCM must contain exactly 1000 bytes.");
                return (Flag: (bool?)null, Pcm: (byte[]?)data);
            }
            throw new ArgumentException("Invalid Chatter action.");
        }).ToArray();
        var chatter = Recording(save);
        foreach (var action in prepared)
        {
            if (action.Flag is { } flag)
            {
                // A repeated checkbox value does not fire CheckedChanged.
                // Preserve noncanonical raw flags when the UI value is untouched.
                if (flag != chatter.Initialized) chatter.Initialized = flag;
            }
            else
            {
                action.Pcm!.CopyTo(chatter.Recording);
                chatter.Initialized = true; // Source import always sets the flag.
            }
        }
    }
    public static string Snapshot(SaveFile save) => Convert.ToHexString(Data(save));
    public static byte[] Prepare(byte[] original, ChatterAction[] actions)
    {
        var save = SaveUtil.GetSaveFile(original.ToArray()) ?? throw new ArgumentException("Chatter save is unrecognized.");
        Apply(save, actions); var expected = Snapshot(save); var output = save.Write().ToArray();
        var reopened = SaveUtil.GetSaveFile(output.ToArray());
        if (reopened is null || reopened.GetType() != save.GetType() || !SaveChecksums.Valid(reopened) || Snapshot(reopened) != expected)
            throw new InvalidOperationException("Chatter export verification failed.");
        return output;
    }
    // PKHeX.WinForms SAV_Chatter.ConvertPCMToWAV: unsigned 4-bit PCM,
    // low nibble first, 2000 Hz mono, unsigned 8-bit WAV with an exact header.
    public static byte[] Wave(ReadOnlySpan<byte> pcm)
    {
        if (pcm.Length != IChatter.SIZE_PCM) throw new ArgumentException("Chatter PCM must contain exactly 1000 bytes.");
        byte[] output = new byte[44 + 2 * IChatter.SIZE_PCM];
        ReadOnlySpan<byte> header = [0x52,0x49,0x46,0x46,0xF4,0x07,0,0,0x57,0x41,0x56,0x45,0x66,0x6D,0x74,0x20,0x10,0,0,0,1,0,1,0,0xD0,0x07,0,0,0xD0,0x07,0,0,1,0,8,0,0x64,0x61,0x74,0x61,0xD0,0x07,0,0];
        header.CopyTo(output);
        int index = header.Length;
        foreach (byte sample in pcm) { output[index++] = (byte)((sample & 15) << 4); output[index++] = (byte)(sample & 0xF0); }
        return output;
    }
}

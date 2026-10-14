// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

// A context lasts for one Worker task. The client will resend it after recreation
// and on undo; unrelated files continue through automatic recognition.
internal static class SaveDetectionContext
{
    private sealed record Bound(byte[] Source, SaveDetectionChoice Choice);
    private static Bound? Current;
    private static bool DerivedUsesManual;
    internal static void Configure(byte[] source, SaveDetectionChoice? choice)
    {
        Current = null;
        DerivedUsesManual = false;
        if (choice is null) return;
        // Validate before binding; a failed replacement must not keep an old file's context.
        _ = SaveDetection.Open(source, choice);
        Current = new(source.ToArray(), choice with { });
    }
    internal static void Clear() { Current = null; DerivedUsesManual = false; }
    internal static SaveFile? OpenCurrent(byte[] data)
    {
        DerivedUsesManual = Current is { } value && data.AsSpan().SequenceEqual(value.Source);
        if (DerivedUsesManual && Current is { } bound)
            return SaveDetection.Open(data, bound.Choice).Save;
        return SaveUtil.GetSaveFile(data.ToArray());
    }
    internal static SaveFile? OpenDerived(byte[] data)
        => DerivedUsesManual && Current is { } bound ? SaveDetection.Open(data, bound.Choice).Save : SaveUtil.GetSaveFile(data.ToArray());
}

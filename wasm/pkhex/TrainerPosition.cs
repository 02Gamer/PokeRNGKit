// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record TrainerPositionState(int Map, int X, int Z, int Y);
public sealed record TrainerPositionEdit(int? Map = null, int? X = null, int? Z = null, int? Y = null);
internal sealed record TrainerPositionSnapshot(TrainerPositionState Value, int? X2, int? Y2);
internal static class TrainerPosition
{
    public static TrainerPositionState? Read(SaveFile save) => save switch
    {
        SAV4 s => new(s.M, s.X, s.Z, s.Y),
        SAV5 s => new(s.PlayerPosition.M, s.PlayerPosition.X, s.PlayerPosition.Z, s.PlayerPosition.Y),
        _ => null,
    };
    public static TrainerPositionSnapshot? Snapshot(SaveFile save) => Read(save) is { } value
        ? new(value, save is SAV4 s4 ? s4.X2 : null, save is SAV4 s ? s.Y2 : null) : null;
    public static void Apply(SaveFile save, TrainerPositionEdit edit)
    {
        if (Read(save) is not { } before ||
            (edit.Map is int map && map != before.Map && (map < 0 || map > 1000)) ||
            edit.X is < 0 or > 65535 || edit.Y is < 0 or > 65535 || edit.Z is < -65535 or > 65535)
            throw new ArgumentException("Trainer position is unsupported or out of range.");
        // SAV_SimpleTrainer permits signed Z; Core encodes it as ushort and reads the unsigned value.
        var expected = new TrainerPositionState(edit.Map ?? before.Map, edit.X ?? before.X,
            edit.Z is int z ? unchecked((ushort)z) : before.Z, edit.Y ?? before.Y);
        switch (save)
        {
            case SAV4 s:
                if (expected.Map != before.Map) s.M = expected.Map;
                if (expected.X != before.X) s.X = expected.X; // Core also updates X2.
                if (expected.Z != before.Z) s.Z = expected.Z;
                if (expected.Y != before.Y) s.Y = expected.Y; // Core also updates Y2.
                break;
            case SAV5 s:
                var p = s.PlayerPosition;
                if (expected.Map != before.Map) p.M = expected.Map;
                if (expected.X != before.X) p.X = expected.X;
                if (expected.Z != before.Z) p.Z = expected.Z;
                if (expected.Y != before.Y) p.Y = expected.Y;
                break;
        }
        // Gen5's map getter reads int32, but its setter only changes the low ushort.
        // Do not silently claim to repair a map with nonzero high bits.
        if (Read(save) != expected)
            throw new ArgumentException("Trainer position cannot be represented without changing other data.");
    }
}

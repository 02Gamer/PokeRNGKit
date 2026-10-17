// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

// Independent concrete WinForms PreparePK6/7/PB7/8/PB8/PA8/9/PA9 sequences.
// Test fixtures select the source sequence; no product finalizer is called.
internal static class EditorFinalizingReference
{
    private static readonly (PKM Layout, Action<PKM, bool> Prepare)[] Sources =
    [
        (new PK6(), (p,m) => { var v=(PK6)p; v.Data[0xFE..].Clear(); v.FixMoves(); v.FixRelearn(); if(m)v.FixMemories(); v.RefreshChecksum(); }),
        (new PK7(), (p,m) => { var v=(PK7)p; v.Data[0xFE..].Clear(); v.FixMoves(); v.FixRelearn(); if(m)v.FixMemories(); v.RefreshChecksum(); }),
        (new PB7(), (p,m) => { var v=(PB7)p; v.FixMoves(); v.FixRelearn(); if(m)v.FixMemories(); v.RefreshChecksum(); }),
        (new PK8(), (p,m) => { var v=(PK8)p; v.FixMoves(); v.FixRelearn(); if(m)v.FixMemories(); v.RefreshChecksum(); }),
        (new PB8(), (p,m) => { var v=(PB8)p; v.FixMoves(); v.FixRelearn(); if(m)v.FixMemories(); v.RefreshChecksum(); }),
        (new PA8(), (p,m) => { var v=(PA8)p; v.FixMoves(); v.FixRelearn(); if(m)v.FixMemories(); v.RefreshChecksum(); }),
        (new PK9(), (p,m) => { var v=(PK9)p; v.FixMoves(); v.FixRelearn(); if(m)v.FixMemories(); v.RefreshChecksum(); }),
        (new PA9(), (p,m) => { var v=(PA9)p; v.FixMoves(); v.FixRelearn(); if(m)v.FixMemories(); v.RefreshChecksum(); }),
    ];
    internal static IEnumerable<PKM> Layouts() => Sources.Select(s => s.Layout.Clone());
    internal static void Apply(PKM p, bool modify)
    {
        var source = Sources.FirstOrDefault(s => s.Layout.GetType() == p.GetType());
        if (source.Prepare is { } prepare) prepare(p, modify);
        else { p.FixMoves(); p.RefreshChecksum(); }
    }
}

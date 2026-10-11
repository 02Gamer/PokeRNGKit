// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static class Trainer8Diglett
{
    // Presence/type metadata only. All writes stay in SAV8SWSH.UnlockAllDiglett.
    private static readonly (int Zone,int Max)[] Zones=[(201,16),(202,18),(203,6),(204,7),(205,5),(206,6),(207,5),(208,5),(209,13),(210,1),(211,8),(221,9),(222,5),(223,3),(224,1),(231,9)];
    internal static bool Available(SAV8SWSH s)
    {
        if(s.SaveRevision==0)return false;
        bool Flag(string name)=>s.Blocks.TryGetBlock(name.AsSpan(),out var b)&&b.Type is SCTypeCode.Bool1 or SCTypeCode.Bool2;
        bool Count(string name)=>s.Blocks.TryGetBlock(name.AsSpan(),out var b)&&b.Type==SCTypeCode.UInt32&&b.Data.Length==4;
        foreach(var (zone,max) in Zones){string stem=$"z_wr{zone:0000}_F_DHIGUDA";if(!Flag(stem)||!Count($"WK_EV_R1_DHIG_WR{zone:0000}"))return false;for(int i=0;i<=max;i++)if(!Flag($"{stem}_{i}"))return false;}
        return Flag("z_wr0223_F_TRIO")&&Flag("FE_R1_DHIGUDA_TRIO")&&Count("WK_EV_R1_DHIGUDA_ADD")&&Count("WK_EV_R1_DHIGUDA_COUNT")&&Count("WK_EV_R1_DHIGUDA_PROGRESS");
    }
}

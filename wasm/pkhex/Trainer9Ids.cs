// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Globalization;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;
public sealed record Trainer9IdEvent([property:JsonRequired]string Tid,[property:JsonRequired]string Sid);
internal static class Trainer9Ids
{
    internal static void Apply(ITrainerID32 trainer,Trainer9IdEvent[] events)
    {
        if(events.Length>512)throw new ArgumentException("Too many Trainer9 ID events.");
        foreach(var e in events)
        {
            if(e is null||e.Tid is null||e.Sid is null||e.Tid.Length>6||e.Sid.Length>4||e.Tid.Any(c=>c<'0'||c>'9')||e.Sid.Any(c=>c<'0'||c>'9'))throw new ArgumentException("Invalid Trainer9 ID text.");
            uint sid=e.Sid.Length==0?0:uint.Parse(e.Sid,CultureInfo.InvariantCulture);if(sid>4294){sid=4294;if(!trainer.IsValidTrainerID7(sid,trainer.GetTrainerTID7()))sid=4293;}else if(!trainer.IsValidTrainerID7(sid,trainer.GetTrainerTID7()))sid=4293;trainer.SetTrainerSID7(sid);
            uint tid=e.Tid.Length==0?0:uint.Parse(e.Tid,CultureInfo.InvariantCulture);if(tid>999999)tid=999999;else if(tid==999999&&trainer.IsValidTrainerID7(sid7:tid,trainer.GetTrainerTID7()))tid=999998;trainer.SetTrainerTID7(tid);
        }
    }
}

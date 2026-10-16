// SPDX-License-Identifier: GPL-3.0-or-later
// PKMEditor.EditsComplete and ContextMenuSAV.MenuOpening distinguish HaX empties.
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static class PokemonEditorMode
{
    internal static bool HaX=>SaveProgramSettingsRuntime.Current?.Startup.ForceHaXOnLaunch==true;
    internal static bool Readable(PKM p)=>HaX||(p.Species!=0&&p.Species<=p.MaxSpeciesID&&p.Valid&&p.ChecksumValid);
    internal static PKM Read(SaveFile save,PokemonPosition position)
    {
        if(HaX&&position.Box==-1)
        {
            if(!save.HasParty||(uint)position.Slot>=6)throw new ArgumentException("Invalid editor party source.");
            return save.GetPartySlotAtIndex(position.Slot);
        }
        return PokemonEditing.Read(save,position.Box,position.Slot);
    }
    internal static byte[] Snapshot(PKM p)
    {
        if(!HaX)return StandalonePokemon.Serialize(p.Clone(),true,false);
        // Preserve body bytes and a bad checksum when merely viewing. GB list
        // serialization also carries both name buffers outside the PKM body.
        if(p is GBPKML gb)return StandaloneGb.Write(gb);
        var copy=p.Clone();if(copy is BK4 bk4)bk4.IsDecryptedStateParty=true;
        var data=new byte[copy.SIZE_PARTY];copy.Data[..Math.Min(copy.Data.Length,data.Length)].CopyTo(data);return data;
    }
}

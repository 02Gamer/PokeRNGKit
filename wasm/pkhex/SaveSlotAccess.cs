// SPDX-License-Identifier: GPL-3.0-or-later
// ContextMenuSAV.MenuOpening / SlotViewInfo.CanWriteTo use these Core predicates.
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record SaveSlotAccessInfo(bool HasBox,bool HasParty,PokemonPosition[] Blocked);
internal static class SaveSlotAccess
{
    internal static SaveSlotAccessInfo Read(SaveFile save)
    {
        var blocked=new List<PokemonPosition>();
        if(save.HasBox)
            for(int box=0;box<save.BoxCount;box++)for(int slot=0;slot<save.BoxSlotCount;slot++)
                if(!new SlotInfoBox(box,slot,save).CanWriteTo(save))blocked.Add(new(box,slot));
        return new(save.HasBox,new SlotInfoParty(0).CanWriteTo(save),blocked.ToArray());
    }
}

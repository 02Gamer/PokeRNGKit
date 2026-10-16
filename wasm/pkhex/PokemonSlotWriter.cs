// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal static class PokemonSlotWriter
{
    internal static void Box(SaveFile save,PKM pokemon,int box,int slot,EntityImportSettings? settings=null)
    {
        var options=settings??EntityImportSettings.None;
        if(save is not SAV1StadiumJ){save.SetBoxSlotAtIndex(pokemon,box,slot,options);return;}
        _=StorageEditing.Target(save,new(box,slot));StorageEditing.Writable(save,new(box,slot));
        if(pokemon is not PK1 {Japanese:true} pk)throw new ArgumentException("Japanese Stadium storage requires the Japanese PK1 layout.");
        // SAV1StadiumJ.GetPKM reads 33 raw bytes followed by 6 nickname and 6 OT
        // bytes. Its inherited writer instead emits a wrapped PK1 list. Write
        // the exact inverse of the source reader; Core still owns save checksums.
        const int storedLength=0x21; // Core's internal PokeCrypto.SIZE_1STORED.
        if(save.SIZE_STORED!=storedLength+pk.NicknameTrash.Length+pk.OriginalTrainerTrash.Length)throw new InvalidOperationException("Unexpected Japanese Stadium slot width.");
        if(options!=EntityImportSettings.None)save.SetBoxSlot(pk,new byte[save.SIZE_BOXSLOT+pk.SIZE_PARTY+pk.SIZE_STORED],options);
        var target=save.Data.Slice(save.GetBoxSlotOffset(box,slot),save.SIZE_STORED);
        pk.Stat_LevelBox=pk.CurrentLevel;
        pk.Data[..storedLength].CopyTo(target);
        pk.NicknameTrash.CopyTo(target[storedLength..]);
        pk.OriginalTrainerTrash.CopyTo(target[(storedLength+pk.NicknameTrash.Length)..]);
        save.State.Edited=true;
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonDatabaseCardTests
{
    internal static void Run()
    {
        byte[] coloRaw=new byte[SaveUtil.SIZE_G3COLO];var colo=new SAV3Colosseum(coloRaw,false);Occupy(colo);
        byte[] xdRaw=new byte[XDCrypto.SAVE_SIZE];var xdSlot=XDCrypto.GetSlot(xdRaw,0).Span;
        int[] offsets=[0,0xCC30,0x10D60,0,0x1C9C0,0xF5D0,0,0x1CAA0];
        for(int i=0;i<offsets.Length;i++){BinaryPrimitives.WriteUInt16BigEndian(xdSlot[(0x40+i*4)..],(ushort)offsets[i]);BinaryPrimitives.WriteUInt16BigEndian(xdSlot[(0x42+i*4)..],(ushort)(offsets[i]>>16));}
        BinaryPrimitives.WriteUInt16BigEndian(xdSlot[0x2A..],4);XDCrypto.EncryptSlot(xdSlot);
        var xd=new SAV3XD(xdRaw);Occupy(xd);
        byte[] boxRaw=new byte[SaveUtil.SIZE_G3BOX];for(int i=0;i<46;i++)BinaryPrimitives.WriteUInt32BigEndian(boxRaw.AsSpan((i+1)*0x2000+4),(uint)(i%23));
        var box=new SAV3RSBox(boxRaw);Occupy(box);
        var games=new[]{("GC6E",colo.Write().ToArray()),("GXXE",xd.Write().ToArray()),("GPXE",box.Write().ToArray())};
        var target=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"));
        foreach(var selection in games.Select(game=>new[]{game}).Append(games))foreach(bool backupRecovery in new[]{false,true}) {
            byte[] card=Card(selection);if(backupRecovery)card[0x2000+100]^=1;byte[] original=card.ToArray();
            var files=new[]{new PokemonDatabaseFile("card","selected.raw",card,false)};
            var loaded=PokemonDatabaseFiles.Load(target,files);
            Check(loaded.Files[0].Error is null && loaded.FileIds.All(id=>id=="card"),"Selected card extracts each game with one owner");
            var database=new PokemonDatabase(target,loaded.Slots,new(FilterUnavailableSpecies:false),loaded.FileIds);
            var backups=database.Rows.Where(row=>row.Source=="backup").ToArray();
            Check(backups.Length==selection.Length && backups.All(row=>row.Entry.Entity.Species==25),"Each card game retains its occupied physical slot");
            Check(backups.Select(row=>row.Entry.SAV!.GetType()).Distinct().Count()==selection.Length,"Mixed card retains independent save ownership and entity formats");
            Check(card.SequenceEqual(original),"Backup directory repair stays inside copied card buffer");
        }
        Console.WriteLine("PASS database memory cards: COLO/XD/RSBOX, mixed ownership, physical slots, control checksums and backup recovery without original mutation; synthetic representative cards");
    }
    private static void Occupy(SaveFile save) {var p=save.BlankPKM;p.Species=25;p.Version=save.Version;p.Language=(int)LanguageID.English;p.CurrentLevel=5;p.Valid=true;save.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);}
    private static byte[] Card((string Code,byte[] Data)[] games) {
        const int block=0x2000;byte[] result=new byte[2*1024*1024];BinaryPrimitives.WriteUInt16BigEndian(result.AsSpan(0x22),16);
        int next=5;
        for(int i=0;i<games.Length;i++) {
            var game=games[i];Check(game.Data.Length%block==0,"Representative save uses exact card block width");var entry=new DEntry(result.AsSpan(block+i*0x40,0x40));
            Encoding.ASCII.GetBytes(game.Code).CopyTo(entry.GameCode);"01"u8.CopyTo(entry.MakerCode);entry.FirstBlock=(ushort)next;entry.BlockCount=(ushort)(game.Data.Length/block);game.Data.CopyTo(result.AsSpan(next*block));next+=entry.BlockCount;
        }
        result.AsSpan(block,block).CopyTo(result.AsSpan(2*block));
        Checksum(result,0,0x1FC,0x1FC);Checksum(result,block,0x1FFC,block+0x1FFC);Checksum(result,2*block,0x1FFC,2*block+0x1FFC);
        Checksum(result,3*block+4,0x1FFC,3*block);Checksum(result,4*block+4,0x1FFC,4*block);
        return result;
    }
    private static void Checksum(byte[] data,int start,int length,int at) {ushort sum=0,inverse=0;for(int i=start;i<start+length;i+=2){ushort value=BinaryPrimitives.ReadUInt16BigEndian(data.AsSpan(i));sum=unchecked((ushort)(sum+value));inverse=unchecked((ushort)(inverse+(ushort)~value));}BinaryPrimitives.WriteUInt16BigEndian(data.AsSpan(at),sum==ushort.MaxValue?(ushort)0:sum);BinaryPrimitives.WriteUInt16BigEndian(data.AsSpan(at+2),inverse==ushort.MaxValue?(ushort)0:inverse);}
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
}

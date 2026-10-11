// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Raid8EditingTests
{
    private static readonly uint[] Keys=[0x9033EB7B,0x158DA896,0x148DA703];
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static void Reject(Action a){try{a();throw new Exception("Invalid Raid8 edit accepted");}catch(ArgumentException){}}
    private static void ApplyRaw(SAV8SWSH s,Raid8Operation op)
    {
        var row=s.Blocks.GetBlock(Keys[op.Origin]).Data.Slice(op.Index*24,24);var bytes=row.ToArray();bool wish=bytes[18] is 3 or 4,rare=bytes[18] is 2 or 4;
        void Type(byte t){bytes[18]=t;if(t==5)Event(true);else if(t!=3)Event(false);}
        void Event(bool b){bytes[19]=(byte)((bytes[19]&~2)|(b?2:0));if(b&&bytes[18] is not(3 or 5))Type(5);else if(!b&&bytes[18]==5)Type(1);}
        switch(op.Property){case"hash":BinaryPrimitives.WriteUInt64LittleEndian(bytes,ulong.Parse(op.Value,System.Globalization.NumberStyles.HexNumber));break;case"seed":BinaryPrimitives.WriteUInt64LittleEndian(bytes.AsSpan(8),ulong.Parse(op.Value,System.Globalization.NumberStyles.HexNumber));break;case"stars":bytes[16]=byte.Parse(op.Value);break;case"randRoll":bytes[17]=byte.Parse(op.Value);break;case"flags":bytes[19]=byte.Parse(op.Value);break;case"denType":Type(byte.Parse(op.Value));break;case"rare":Type(bool.Parse(op.Value)?wish?(byte)4:(byte)2:wish?(byte)3:(byte)1);break;case"wishingPiece":Type(bool.Parse(op.Value)?rare?(byte)4:(byte)3:rare?(byte)2:(byte)1);break;case"event":Event(bool.Parse(op.Value));break;case"wattsHarvested":bytes[19]=(byte)((bytes[19]&~1)|(bool.Parse(op.Value)?1:0));break;}
        bytes.CopyTo(row);
    }
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.SW,GameVersion.SH})for(int revision=0;revision<3;revision++)
        {
            var synthetic=SwshBlockFixtureTests.Create(version,revision);var initial=new SAV8SWSH(synthetic.ToArray());
            // Remove DLC raid blocks according to the fixture layout; no padding or SaveUtil relaxation.
            var blocks=initial.AllBlocks.Where(b=>!(revision<1&&b.Key==Keys[1])&&!(revision<2&&b.Key==Keys[2])).ToArray();var s=new SAV8SWSH(SwishCrypto.Encrypt(blocks));foreach(uint key in Keys)if(s.Blocks.TryGetBlock(key,out var block))for(int i=0;i<block.Data.Length;i++)block.Data[i]=(byte)(i*71+0xA5);
            var data=s.Write().ToArray();var original=data.ToArray();var c=Raid8Editing.Read(new SAV8SWSH(data.ToArray()),Br4Editing.Hash(data));Check(c.CanEdit&&c.Regions.Count(r=>r.Available)==revision+1,"Raid8 layout availability");Check(c.Regions.Where(r=>r.Available).Select(r=>r.Entries.Length).SequenceEqual(new[]{100,90,86}.Take(revision+1)),"Raid8 exact source visible counts");
            var ops=new List<Raid8Operation>();for(int o=0;o<=revision;o++){int i=c.Regions[o].CountUsed-1;foreach(var (p,v) in new[]{("hash","FFFFFFFFFFFFFFFF"),("seed","FEDCBA9876543210"),("stars","255"),("randRoll","255"),("flags","255"),("denType","3"),("event","true"),("rare","true"),("wishingPiece","false"),("wattsHarvested","false"),("event","false"),("denType","255")})ops.Add(new(o,i,p,v));}
            var expected=new SAV8SWSH(data.ToArray());foreach(var op in ops)ApplyRaw(expected,op);var e=new Raid8Edit(c.SourceHash,ops.ToArray());var preview=Raid8Editing.Prepare(new SAV8SWSH(data.ToArray()),e,c.SourceHash,data.Length);var result=Raid8Editing.Prepare(new SAV8SWSH(data.ToArray()),e with{TargetHash=Br4Editing.Hash(preview)},c.SourceHash,data.Length);Check(result.SequenceEqual(expected.Write().ToArray()),"Raid8 ordered setter independent entire encrypted-file parity");Check(data.SequenceEqual(original),"Raid8 original immutable");Check(SwishCrypto.GetIsHashValid(result),"Raid8 encrypted hash valid");Check(Raid8Editing.Prepare(new SAV8SWSH(data.ToArray()),new(c.SourceHash,[]),c.SourceHash,data.Length).SequenceEqual(data),"Raid8 source no-op save");
            foreach(var op in new[]{new Raid8Operation(0,100,"seed","0"),new(0,0,"active","true"),new(0,0,"stars","256"),new(0,0,"event","1")})Reject(()=>Raid8Editing.Prepare(new SAV8SWSH(data.ToArray()),new(c.SourceHash,[op]),c.SourceHash,data.Length));if(revision<2)Reject(()=>Raid8Editing.Prepare(new SAV8SWSH(data.ToArray()),new(c.SourceHash,[new(2,0,"seed","0")]),c.SourceHash,data.Length));Reject(()=>Raid8Editing.Prepare(new SAV8SWSH(data.ToArray()),e with{SourceHash=new string('0',64)},c.SourceHash,data.Length));Reject(()=>Raid8Editing.Prepare(new SAV8SWSH(data.ToArray()),e with{TargetHash=new string('0',64)},c.SourceHash,data.Length));
            Console.WriteLine($"PASS Raid8 {version}/revision {revision}: synthetic typed blocks only; 100/90/86 source indices, full UInt64/byte limits, ordered derived setter parity, reserved/hidden/unrelated bytes, encrypted hash/frozen/atomic rejection/original; not SaveService or real-game acceptance");
        }
    }
}

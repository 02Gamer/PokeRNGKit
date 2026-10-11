// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Raid8Entry(int Index,string Hash,string Seed,int Stars,int RandRoll,int DenType,int Flags,bool Active,bool Rare,bool WishingPiece,bool WattsHarvested,bool Event,string Raw);
public sealed record Raid8Region(int Origin,int CountUsed,int CountAll,bool Available,Raid8Entry[] Entries);
public sealed record Raid8Catalog(bool CanEdit,string SourceHash,Raid8Region[] Regions);
public sealed record Raid8Operation(int Origin,int Index,string Property,string Value);
public sealed record Raid8Edit(string? SourceHash,Raid8Operation[] Operations,string? TargetHash=null);
public sealed record Raid8Preview(Raid8Edit Request,Raid8Catalog Result,int[] ChangedOffsets);
internal static class Raid8Editing
{
    private static readonly uint[] Keys=[0x9033EB7B,0x158DA896,0x148DA703];
    private static readonly int[] Counts=[100,90,86];
    internal static SAV8SWSH Save(SaveFile save)=>save is SAV8SWSH s?s:throw new ArgumentException("Raid8 requires Sword/Shield.");
    private static RaidSpawnList8 List(SAV8SWSH s,int origin)=>origin switch{0=>s.RaidGalar,1=>s.RaidArmor,2=>s.RaidCrown,_=>throw new ArgumentException("Invalid Raid8 origin.")};
    internal static Raid8Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var regions=Enumerable.Range(0,3).Select(o=>{bool exists=SCBlockAccessor.TryGetBlock(s.AllBlocks,Keys[o],out var block);int all=exists?block!.Data.Length/24:0;bool available=exists&&block!.Data.Length%24==0&&all>=Counts[o];var list=available?List(s,o):null;var rows=available?Enumerable.Range(0,Counts[o]).Select(i=>{var r=list!.GetRaid(i);return new Raid8Entry(i,r.Hash.ToString("X16"),r.Seed.ToString("X16"),r.Stars,r.RandRoll,(byte)r.DenType,r.Flags,r.IsActive,r.IsRare,r.IsWishingPiece,r.WattsHarvested,r.IsEvent,Convert.ToHexString(list.Data.Slice(i*24,24)));}).ToArray():[];return new Raid8Region(o,Counts[o],all,available,rows);}).ToArray();return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,regions);
    }
    internal static byte[] Prepare(SaveFile save,Raid8Edit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Raid8 requires valid checksums.");if(e.SourceHash!=hash)throw new ArgumentException("Raid8 preview is stale.");if(e.Operations is null||e.Operations.Length>4096)throw new ArgumentException("Invalid Raid8 operation count.");var catalog=Read(s,hash);var copy=(SAV8SWSH)s.Clone();
        foreach(var op in e.Operations){if(op.Origin<0||op.Origin>2||!catalog.Regions[op.Origin].Available||op.Index<0||op.Index>=Counts[op.Origin])throw new ArgumentException("Invalid Raid8 den index.");var r=List(copy,op.Origin).GetRaid(op.Index);
            ulong Hex(){var span=op.Value.AsSpan();if(span.StartsWith("0x",StringComparison.OrdinalIgnoreCase))span=span[2..];return ulong.TryParse(span,NumberStyles.HexNumber,CultureInfo.InvariantCulture,out var value)?value:0;}
            byte Byte(){if(!byte.TryParse(op.Value,NumberStyles.Integer,CultureInfo.InvariantCulture,out var value))throw new ArgumentException("Invalid Raid8 byte.");return value;}
            bool Bool(){if(!bool.TryParse(op.Value,out var value))throw new ArgumentException("Invalid Raid8 boolean.");return value;}
            switch(op.Property){case "hash":r.Hash=Hex();break;case "seed":r.Seed=Hex();break;case "stars":r.Stars=Byte();break;case "randRoll":r.RandRoll=Byte();break;case "denType":r.DenType=(RaidType)Byte();break;case "flags":r.Flags=Byte();break;case "rare":r.IsRare=Bool();break;case "wishingPiece":r.IsWishingPiece=Bool();break;case "wattsHarvested":r.WattsHarvested=Bool();break;case "event":r.IsEvent=Bool();break;default:throw new ArgumentException("Invalid Raid8 property.");}
        }
        var output=copy.Write().ToArray();var p=new SAV8SWSH(output.ToArray());if(p.Version!=copy.Version||p.SaveRevision!=s.SaveRevision||output.Length!=length||!SaveChecksums.Valid(p)||p.AllBlocks.Count!=copy.AllBlocks.Count||p.AllBlocks.Where((b,i)=>b.Key!=copy.AllBlocks[i].Key||b.Type!=copy.AllBlocks[i].Type||b.SubType!=copy.AllBlocks[i].SubType||!b.Data.SequenceEqual(copy.AllBlocks[i].Data)).Any())throw new InvalidOperationException("Raid8 export verification failed.");if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Raid8 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Raid8Edit ParseRaid8(string json)=>json.Length>1000000?throw new ArgumentException("Raid8 request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Raid8Edit)??throw new ArgumentException("Missing Raid8 edit.");
    public static string ReadRaid8(byte[] data)=>JsonSerializer.Serialize(Raid8Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Raid8Catalog);
    public static string PreviewRaid8(byte[] data,string json){var e=ParseRaid8(json);var output=Raid8Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Raid8Preview(e with{TargetHash=hash},Raid8Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Raid8Preview);}
    public static byte[] EditRaid8(byte[] data,string json){var e=ParseRaid8(json);if(e.TargetHash is null)throw new ArgumentException("Raid8 requires a frozen preview.");return Raid8Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
}

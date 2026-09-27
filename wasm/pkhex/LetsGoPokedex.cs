// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;
public sealed record Dex7Size([property: JsonRequired] bool Used,[property: JsonRequired] int Height,[property: JsonRequired] int Weight,[property: JsonRequired] bool Flagged);
internal static class LetsGoPokedex
{
    private static bool SizeIndex(SaveFile save,int index,out int sizeIndex)
    {
        sizeIndex=-1;if(save is not SAV7b)return false;
        var (species,form)=Gen7Pokedex.Identity(save,index);return Zukan7b.TryGetSizeEntryIndex(species,form,out sizeIndex);
    }
    public static Dex7Size[]? ReadSizes(SaveFile save,int index)
    {
        if(!SizeIndex(save,index,out int record))return null;
        var d=((SAV7b)save).Zukan;return Enumerable.Range(0,4).Select(i=>{bool used=d.GetSizeData((DexSizeType)i,record,out byte h,out byte w,out bool flag);return new Dex7Size(used,h,w,flag);}).ToArray();
    }
    public static void ValidateSizes(SaveFile save,Dex7State e)
    {
        bool applicable=SizeIndex(save,e.Index,out _);
        if(!applicable?e.Sizes is not null:e.Sizes is not {Length:4}||e.Sizes.Any(s=>s is null||s.Height is <0 or >255||s.Weight is <0 or >255))throw new ArgumentException("Pokedex size records are invalid.");
    }
    public static void WriteSizes(SaveFile save,Dex7State e)
    {
        if(e.Sizes is null||!SizeIndex(save,e.Index,out int index))return;
        var d=((SAV7b)save).Zukan;var old=ReadSizes(save,e.Index)!;
        for(int i=0;i<4;i++){
            var s=e.Sizes[i];if(s==old[i])continue; // Keep unknown flag values and reserved bytes on unchanged records.
            d.SetSizeData((DexSizeType)i,index,s.Used?(byte)s.Height:Zukan7b.DefaultEntryValueH,s.Used?(byte)s.Weight:Zukan7b.DefaultEntryValueW,s.Flagged);
        }
    }
    public static void ClearSizes(SAV7b save)
    {
        // All 186 size records, including the 33 form records skipped by the desktop's early return.
        for(int index=0;index<186;index++)for(int i=0;i<4;i++)save.Zukan.SetSizeData((DexSizeType)i,index,Zukan7b.DefaultEntryValueH,Zukan7b.DefaultEntryValueW,false);
    }
    public static void CompleteSizes(SAV7b save,ushort species)
    {
        for(int i=0;i<4;i++)if(!save.Zukan.GetSizeData((DexSizeType)i,species,0,out _,out _,out bool flag)){
            byte value=i%2==0?(byte)0:(byte)255;save.Zukan.SetSizeData((DexSizeType)i,species,0,value,value,flag);
        }
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Globalization;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;
public sealed record Capture7Entry(int Species, LocalizedText Name, string Captured, string Transferred);
public sealed record Capture7Catalog(Capture7Entry[] Entries, string TotalCaptured, string TotalTransferred);
public sealed record Capture7Edit(string Kind,[property: JsonRequired] int Species,string Captured,string Transferred,string TotalCaptured,string TotalTransferred);
internal static class LetsGoCapture
{
    public static bool Legal(int species)=>species is >=1 and <=151 or 808 or 809;
    public static Capture7Catalog Read(SAV7b save)
    {
        var c=save.Captured;
        return new(Enumerable.Range(0,153).Select(i=>{ushort s=CaptureRecords.GetIndexSpecies((ushort)i);return new Capture7Entry(s,new(GameInfo.GetStrings("zh-Hans").specieslist[s],GameInfo.GetStrings("en").specieslist[s],GameInfo.GetStrings("ja").specieslist[s]),c.GetCapturedCountIndex(i).ToString(),c.GetTransferredCountIndex(i).ToString());}).ToArray(),c.TotalCaptured.ToString(),c.TotalTransferred.ToString());
    }
    private static uint Count(string? text,uint max,uint old,bool preserve=true)
    {
        if(text is null||text.Length is <1 or >10||text.Any(c=>!char.IsAsciiDigit(c))||!uint.TryParse(text,NumberStyles.None,CultureInfo.InvariantCulture,out uint value)||(value>max&&(!preserve||value!=old)))throw new ArgumentException("Pokedex capture count is invalid.");return value;
    }
    public static void Apply(SAV7b save,Capture7Edit edit)
    {
        if(!Legal(edit.Species)||edit.Kind is not ("entry" or "sum" or "all"))throw new ArgumentException("Pokedex capture action is invalid.");
        var c=save.Captured;ushort species=(ushort)edit.Species;uint oldCaptured=c.GetCapturedCount(species),oldTransferred=c.GetTransferredCount(species);
        uint captured=Count(edit.Captured,9999,oldCaptured,edit.Kind!="all"), transferred=Count(edit.Transferred,999999999,oldTransferred,edit.Kind!="all");
        uint totalCaptured=Count(edit.TotalCaptured,999999999,c.TotalCaptured),totalTransferred=Count(edit.TotalTransferred,999999999,c.TotalTransferred);
        if(edit.Kind!="all"){
            if(captured!=oldCaptured)c.SetCapturedCount(species,captured);if(transferred!=oldTransferred)c.SetTransferredCount(species,transferred);
        }
        if(totalCaptured!=c.TotalCaptured)c.TotalCaptured=totalCaptured;if(totalTransferred!=c.TotalTransferred)c.TotalTransferred=totalTransferred;
        if(edit.Kind=="all"){
            for(ushort i=0;i<=CaptureRecords.MaxIndex;i++){
                bool caught=save.Zukan.GetCaught(CaptureRecords.GetIndexSpecies(i));
                if(captured==0||caught)c.SetCapturedCountIndex(i,captured);
                if(transferred==0||caught)c.SetTransferredCountIndex(i,transferred);
            }
        }
        if(edit.Kind is "sum" or "all"){
            ulong sumCaptured=0,sumTransferred=0;for(int i=0;i<=CaptureRecords.MaxIndex;i++){sumCaptured+=c.GetCapturedCountIndex(i);sumTransferred+=c.GetTransferredCountIndex(i);}
            uint cap=(uint)Math.Min(sumCaptured,999999999UL),tr=(uint)Math.Min(sumTransferred,999999999UL);
            if(edit.Kind=="sum"||cap<c.TotalCaptured)c.TotalCaptured=cap;
            if(edit.Kind=="sum"||tr<c.TotalTransferred)c.TotalTransferred=tr;
        }
    }
}

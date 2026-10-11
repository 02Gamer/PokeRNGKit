// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Dn9aFlavor(int Id,string Hash,LocalizedText Name,string Sprite,bool GeneratorAllowed);
public sealed record Dn9aEntry(int Index,bool CanLoad,bool HasMilliseconds,int Stars,int LevelBoost,int Donut,int Calories,int[] Berries,string[] Flavors,string Date,string Milliseconds,string Raw,int[] Profile,float[] Scale,string Sprite);
public sealed record Dn9aCatalog(bool CanEdit,string SourceHash,Dn9aEntry[] Entries,OriginChoice[] Donuts,OriginChoice[] Berries,Dn9aFlavor[] Flavors);
public sealed record Dn9aEdit(string Action,string? SourceHash,int Index=0,Tr7Value[]? Fields=null,string? Hex=null,int? Start=null,int? End=null,int[]? Flavors=null,string? Now=null,string? UiLanguage=null);
internal static class Donut9aEditing
{
    internal const uint Key=0xBE007476;
    private static readonly CultureInfo Invariant=CultureInfo.InvariantCulture;
    private static readonly string[] Languages=["zh-Hans","en","ja"];
    internal static SAV9ZA Save(SaveFile s)=>s is SAV9ZA z?z:throw new ArgumentException("Donut9a requires Legends: Z-A.");
    internal static bool Available(SAV9ZA s)=>s.Blocks.TryGetBlock(Key,out var b)&&b.Type==SCTypeCode.Object&&b.Data.Length>=999*0x48;
    private static LocalizedText Name(string[][] strings,int i)=>new(strings[0][i],strings[1][i],strings[2][i]);
    internal static OriginChoice[] Donuts(){var names=Languages.Select(l=>GameInfo.GetStrings(l).donutName).ToArray();return Enumerable.Range(0,names[0].Length).Select(i=>new OriginChoice(i,Name(names,i))).ToArray();}
    internal static OriginChoice[] Berries(){var names=Languages.Select(l=>GameInfo.GetStrings(l).itemlist).ToArray();return new[]{(ushort)0}.Concat(ItemStorage9ZA.Berry.ToArray()).Select(i=>new OriginChoice(i,Name(names,i))).ToArray();}
    internal static Dn9aFlavor[] Flavors(){var names=Languages.Select(l=>GameInfo.GetStrings(l).donutFlavor).ToArray();return DonutInfo.Flavors.Select((f,i)=>new Dn9aFlavor(i+1,f.Hash.ToString("X16"),Name(names,i),f.Name,GeneratorAllowed(f.Name))).ToArray();}
    private static bool GeneratorAllowed(string name)=>name.Length>=8&&int.TryParse(name.AsSpan(6,2),out int n)&&n is >=3 and <=21;
    private static DateTime LoadedDate(Donut9a d)
    {
        if(!d.HasDateTime())return Donut9a.Epoch;
        var date=d.DateTime1900.Timestamp;
        return date<new DateTime(1753,1,1)||date>new DateTime(4095,12,31)?Donut9a.Epoch:date;
    }
    private static string Sprite(Donut9a d)=>d.Donut switch{198=>"donut_uni491",199=>"donut_uni383",200=>"donut_uni382",201=>"donut_uni384",202=>"donut_uni807",_=>$"donut_{new[]{"sweet","spicy","sour","bitter","fresh","mix"}[d.Donut%6]}{d.Stars:00}"};
    internal static Dn9aEntry ReadEntry(Donut9a d,int index)
    {
        bool valid=true;string date="";try{date=LoadedDate(d).ToString("yyyy-MM-dd'T'HH:mm:ss",Invariant);}catch(ArgumentOutOfRangeException){valid=false;}
        var berries=new[]{(int)d.BerryName}.Concat(d.GetBerries().ToArray().Select(v=>(int)v)).ToArray();int[] profile=new int[5];d.RecalculateDonutFlavors(profile);
        return new(index,valid,d.MillisecondsSince1970!=0,d.Stars,d.LevelBoost,d.Donut,d.Calories,berries,d.GetFlavors().ToArray().Select(v=>v.ToString("X16")).ToArray(),date,d.MillisecondsSince1970.ToString(Invariant),Convert.ToHexString(d.Data),profile,profile.Select(Donut9a.GetStatScale).ToArray(),Sprite(d));
    }
    internal static Dn9aCatalog Read(SaveFile save,string hash){var s=Save(save);bool present=Available(s);return new(present&&s.State.Exportable&&SaveChecksums.Valid(s),hash,present?Enumerable.Range(0,999).Select(i=>ReadEntry(s.Donuts.GetDonut(i),i)).ToArray():[],Donuts(),Berries(),Flavors());}
    private static DateTime Now(string? text){if(text is null||!DateTime.TryParseExact(text,"yyyy-MM-dd'T'HH:mm:ss.fff",Invariant,DateTimeStyles.None,out var value)||value<Donut9a.Epoch||value>new DateTime(4095,12,31))throw new ArgumentException("Invalid Donut9a browser wall-clock time.");return value;}
    private static void SetTime(Donut9a d,DateTime value){d.MillisecondsSince1970=(ulong)(value-Donut9a.Epoch).TotalMilliseconds;d.DateTime1900.Timestamp=value;}
    internal static void Resave(Donut9a d)=>new Donut9aControls(d).Save(d);
    internal static byte[] Prepare(SaveFile save,Dn9aEdit e,string hash,int length,out string[] ignored)
    {
        var s=Save(save);if(!Available(s)||!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Donut9a requires a complete donut block and valid checksums.");if(e.SourceHash!=hash)throw new ArgumentException("Donut9a preview is stale.");if((uint)e.Index>=999)throw new ArgumentException("Invalid Donut9a index.");
        if(e.Action!="patch"&&e.Fields is not null||e.Action is not("import"or"hex")&&e.Hex is not null||e.Action!="generate"&&(e.Start is not null||e.End is not null||e.Flavors is not null)||e.Action is not("patch"or"randomLv3"or"shiny"or"generate")&&e.Now is not null||e.Action!="patch"&&e.UiLanguage is not null)throw new ArgumentException("Invalid Donut9a action fields.");
        var copy=(SAV9ZA)s.Clone();var donut=copy.Donuts.GetDonut(e.Index);ignored=[];
        switch(e.Action){case"patch":var controls=new Donut9aControls(donut);ignored=controls.Apply(e.Fields??throw new ArgumentException("Missing Donut9a fields."),e.UiLanguage,e.Now);controls.Save(donut);break;case"resave":Resave(donut);break;case"reset":donut.Clear();Resave(donut);break;case"clone":Resave(donut);copy.Donuts.CloneAllFromIndex(e.Index);break;case"import":if(e.Hex is null||e.Hex.Length!=144||e.Hex.Any(c=>!char.IsAsciiHexDigit(c)))throw new ArgumentException("Invalid Donut9a file size or bytes.");Convert.FromHexString(e.Hex).CopyTo(donut.Data);Resave(donut);break;case"hex":if(e.Hex is null||e.Hex.Length>32767)throw new ArgumentException("Invalid Donut9a clipboard text.");Util.GetBytesFromHexString(e.Hex.Trim().Replace(" ",""),donut.Data);Resave(donut);break;case"randomLv3":case"shiny":var now=Now(e.Now);if(e.Action=="randomLv3")copy.Donuts.SetAllRandomLv3();else copy.Donuts.SetAllAsShinyTemplate();for(int i=0;i<999;i++)SetTime(copy.Donuts.GetDonut(i),now.AddMilliseconds(i));Resave(copy.Donuts.GetDonut(e.Index));break;case"generate":if(e.Start is not {} start||e.End is not {} end||start<0||start>998||end<0||end>999||start>=end||e.Flavors is null||e.Flavors.Length==0||e.Flavors.Distinct().Count()!=e.Flavors.Length)throw new ArgumentException("Invalid Donut9a generator range or flavors.");var choices=Flavors();var selected=e.Flavors.Select(id=>choices.SingleOrDefault(f=>f.Id==id&&f.GeneratorAllowed)??throw new ArgumentException("Invalid Donut9a generator flavor.")).ToArray();var clock=Now(e.Now);Resave(donut);copy.Donuts.SetRandomShinyTemplateRange(selected.Select(f=>ulong.Parse(f.Hash,NumberStyles.HexNumber,Invariant)).ToArray(),start,end);for(int i=start;i<end;i++)SetTime(copy.Donuts.GetDonut(i),clock.AddMilliseconds(i));Resave(copy.Donuts.GetDonut(e.Index));break;default:throw new ArgumentException("Invalid Donut9a action.");}
        var output=copy.Write().ToArray();var parsed=new SAV9ZA(output.ToArray());if(output.Length!=length||parsed.SaveRevision!=s.SaveRevision||!SaveChecksums.Valid(parsed)||parsed.AllBlocks.Count!=copy.AllBlocks.Count||parsed.AllBlocks.Where((b,i)=>b.Key!=copy.AllBlocks[i].Key||b.Type!=copy.AllBlocks[i].Type||b.SubType!=copy.AllBlocks[i].SubType||!b.Data.SequenceEqual(copy.AllBlocks[i].Data)).Any())throw new InvalidOperationException("Donut9a export verification failed.");return output;
    }
}

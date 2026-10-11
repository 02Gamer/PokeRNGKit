// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static class Trainer8Position
{
    private static readonly string[] Keys=["map","x","z","y","sx","sz","sy","rotation"];
    private static decimal[] Values(SAV8SWSH s){var p=s.Coordinates;return[p.M,(decimal)(double)p.X,(decimal)(double)p.Z,(decimal)(double)p.Y,(decimal)(double)p.SX,(decimal)(double)p.SZ,(decimal)(double)p.SY,(decimal)(Math.Atan2(p.RZ,p.RW)*360/Math.PI)];}
    internal static Tr6Position Read(SAV8SWSH s){decimal[]? v=null;try{v=Values(s);}catch(OverflowException){}bool valid=v is not null&&v.Where((n,i)=>i>0&&(n < -99999999||n >99999999)).Count()==0;return new(valid,Keys.Select((key,i)=>new Tr6PositionField(key,v is null?"":v[i].ToString(CultureInfo.InvariantCulture),v is null?"":v[i].ToString(i==0?"F0":"F6",CultureInfo.InvariantCulture),i==0?"0":"-99999999",i==0?"18446744073709551615":"99999999",i==0?0:6)).ToArray());}
    private static void Write(SAV8SWSH s,decimal[] v){var p=s.Coordinates;p.M=(ulong)v[0];p.X=(float)v[1];p.Z=(float)v[2];p.Y=(float)v[3];p.SX=(float)v[4];p.SZ=(float)v[5];p.SY=(float)v[6];double angle=(double)v[7]*Math.PI/360;p.RX=0;p.RZ=(float)Math.Sin(angle);p.RY=0;p.RW=(float)Math.Cos(angle);}
    internal static string[] Apply(SAV8SWSH s,Tr7Value[] rows,string? language)
    {
        if(!Read(s).CanEdit)throw new ArgumentException("Trainer8 source coordinates cannot load.");if(rows.Length<1||rows.Length>8||rows.Select(v=>v.Key).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid Trainer8 coordinates.");var values=Values(s);bool dirty=values.Any(v=>v!=0);var ignored=new List<string>();var culture=Trainer8Editing.UiCulture(language);
        foreach(var row in rows){int i=Array.IndexOf(Keys,row.Key);if(i<0||row.Value is null||row.Value.Length>32767)throw new ArgumentException("Invalid Trainer8 coordinate text.");if(!decimal.TryParse(row.Value,NumberStyles.Number,culture,out var n)){ignored.Add(row.Key);continue;}n=Math.Clamp(n,i==0?0:-99999999,i==0?ulong.MaxValue:99999999);if(n!=values[i]){values[i]=n;dirty=true;}}
        if(dirty)Write(s,values);return ignored.ToArray();
    }
    internal static void Resave(SAV8SWSH s){if(Read(s).CanEdit){var v=Values(s);if(v.Any(n=>n!=0))Write(s,v);}}
}

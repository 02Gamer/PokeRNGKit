// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static class TrainerGGPosition
{
    private static readonly string[] Keys=["map","x","z","y","rotation","scaleX","scaleZ","scaleY"];
    private static decimal[] Values(SAV7b s){var p=s.Coordinates;return[p.M,(decimal)(double)p.X,(decimal)(double)p.Z,(decimal)(double)p.Y,(decimal)(Math.Atan2(p.RZ,p.RW)*360/Math.PI),(decimal)(double)p.SX,(decimal)(double)p.SZ,(decimal)(double)p.SY];}
    private static decimal Min(int i)=>i==0?0:-99999999;
    private static decimal Max(int i)=>i==0?ulong.MaxValue:99999999;
    internal static Tr6Position Read(SAV7b s)
    {
        decimal[]? values=null;try{values=Values(s);}catch(OverflowException){}
        bool valid=values is not null&&Enumerable.Range(0,8).All(i=>values[i]>=Min(i)&&values[i]<=Max(i));var p=s.Coordinates;
        string[] raw=[p.M.ToString(CultureInfo.InvariantCulture),p.X.ToString("R",CultureInfo.InvariantCulture),p.Z.ToString("R",CultureInfo.InvariantCulture),p.Y.ToString("R",CultureInfo.InvariantCulture),(Math.Atan2(p.RZ,p.RW)*360/Math.PI).ToString("R",CultureInfo.InvariantCulture),p.SX.ToString("R",CultureInfo.InvariantCulture),p.SZ.ToString("R",CultureInfo.InvariantCulture),p.SY.ToString("R",CultureInfo.InvariantCulture)];
        return new(valid,Enumerable.Range(0,8).Select(i=>new Tr6PositionField(Keys[i],values is null?raw[i]:values[i].ToString(CultureInfo.InvariantCulture),values is null?raw[i]:values[i].ToString(i==0?"F0":"F6",CultureInfo.InvariantCulture),Min(i).ToString(CultureInfo.InvariantCulture),Max(i).ToString(CultureInfo.InvariantCulture),i==0?0:6)).ToArray());
    }
    internal static string[] Apply(SAV7b s,Tr7Value[] rows,string? language)
    {
        if(!Read(s).CanEdit)throw new ArgumentException("TrainerGG source coordinates cannot load.");var culture=SuperTrain6Editing.Culture(language);
        if(rows.Length is <1 or >8||rows.Select(v=>v.Key).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid TrainerGG position list.");
        var values=Values(s);bool dirty=false;var ignored=new List<string>();
        foreach(var row in rows){int i=Array.IndexOf(Keys,row.Key);if(i<0||row.Value is null||row.Value.Length>32767)throw new ArgumentException("Invalid TrainerGG coordinate.");if(!decimal.TryParse(row.Value,NumberStyles.Number,culture,out var value)){ignored.Add(row.Key);continue;}value=Math.Clamp(value,Min(i),Max(i));if(value!=values[i]){dirty=true;values[i]=value;}}
        if(dirty){var p=s.Coordinates;p.M=(ulong)values[0];p.X=(float)values[1];p.Z=(float)values[2];p.Y=(float)values[3];p.SX=(float)values[5];p.SZ=(float)values[6];p.SY=(float)values[7];double angle=(double)values[4]*Math.PI/360;p.RX=0;p.RZ=(float)Math.Sin(angle);p.RY=0;p.RW=(float)Math.Cos(angle);}
        return ignored.ToArray();
    }
}

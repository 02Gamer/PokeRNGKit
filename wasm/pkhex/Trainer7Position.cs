// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static class Trainer7Position
{
    private static readonly string[] Keys=["map","x","z","y","rotation"];
    private static readonly decimal[] Minimum=[0,-99999999,-99999999,-99999999,-99999999],Maximum=[1000,99999999,99999999,99999999,99999999];
    private static decimal[] Values(SAV7 save){var p=save.Situation;return[p.M,(decimal)(p.X/60.0),(decimal)(p.Z/60.0),(decimal)(p.Y/60.0),(decimal)(Math.Atan2(p.RZ,p.RW)*360.0/Math.PI)];}
    internal static Tr6Position Read(SAV7 save)
    {
        decimal[]? values=null;try{values=Values(save);}catch(OverflowException){}
        bool valid=values is not null&&Enumerable.Range(0,5).All(i=>values[i]>=Minimum[i]&&values[i]<=Maximum[i]);var p=save.Situation;
        string[] fallback=[p.M.ToString(CultureInfo.InvariantCulture),(p.X/60.0).ToString("R",CultureInfo.InvariantCulture),(p.Z/60.0).ToString("R",CultureInfo.InvariantCulture),(p.Y/60.0).ToString("R",CultureInfo.InvariantCulture),(Math.Atan2(p.RZ,p.RW)*360.0/Math.PI).ToString("R",CultureInfo.InvariantCulture)];
        return new(valid,Enumerable.Range(0,5).Select(i=>new Tr6PositionField(Keys[i],values is null?fallback[i]:values[i].ToString(CultureInfo.InvariantCulture),values is null?fallback[i]:values[i].ToString(i==0?"F0":"F6",CultureInfo.InvariantCulture),Minimum[i].ToString(CultureInfo.InvariantCulture),Maximum[i].ToString(CultureInfo.InvariantCulture),i==0?0:6)).ToArray());
    }
    internal static string[] Apply(SAV7 save,Tr7Value[] rows,string? language)
    {
        var culture=SuperTrain6Editing.Culture(language);if(!Read(save).CanEdit)throw new ArgumentException("Trainer7 source position cannot be loaded.");if(rows.Length is <1 or >5||rows.Select(v=>v.Key).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid Trainer7 position list.");var values=Values(save);bool dirty=false;var ignored=new List<string>();
        foreach(var row in rows){int index=Array.IndexOf(Keys,row.Key);if(index<0||row.Value is null||row.Value.Length>32767)throw new ArgumentException("Invalid Trainer7 position field.");if(!decimal.TryParse(row.Value,NumberStyles.Number,culture,out decimal value)){ignored.Add(row.Key);continue;}value=Math.Clamp(value,Minimum[index],Maximum[index]);if(value!=values[index]){dirty=true;values[index]=value;}}
        if(dirty){var p=save.Situation;p.M=(int)values[0];p.X=(float)(values[1]*60);p.Z=(float)(values[2]*60);p.Y=(float)(values[3]*60);double angle=(double)values[4]*Math.PI/360.0;p.RX=0;p.RZ=(float)Math.Sin(angle);p.RY=0;p.RW=(float)Math.Cos(angle);p.UpdateOverworldCoordinates();}return ignored.ToArray();
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal sealed class Donut9aControls
{
    private decimal stars,calories,boost;
    private int donut;
    private readonly int[] berries;
    private readonly ulong[] flavors;
    private DateTime date;
    private string milliseconds;
    private static readonly CultureInfo Invariant=CultureInfo.InvariantCulture;
    internal Donut9aControls(Donut9a d)
    {
        var row=Donut9aEditing.ReadEntry(d,0);if(!row.CanLoad)throw new ArgumentException("Donut9a source date cannot load.");stars=Math.Min((int)d.Stars,6);calories=d.Calories;boost=d.LevelBoost;donut=Donut9aEditing.Donuts().Any(v=>v.Id==d.Donut)?d.Donut:0;var known=Donut9aEditing.Berries().Select(v=>v.Id).ToHashSet();berries=row.Berries.Select(v=>known.Contains(v)?v:0).ToArray();flavors=d.GetFlavors().ToArray().Select(v=>DonutInfo.TryGetFlavorName(v,out _)?v:0).ToArray();date=DateTime.ParseExact(row.Date,"yyyy-MM-dd'T'HH:mm:ss",Invariant);milliseconds=row.Milliseconds;
    }
    private DateTime Now(string? text){if(text is null||!DateTime.TryParseExact(text,"yyyy-MM-dd'T'HH:mm:ss.fff",Invariant,DateTimeStyles.None,out var n)||n<Donut9a.Epoch||n>new DateTime(4095,12,31))throw new ArgumentException("Donut9a invalid timestamp needs explicit current browser time.");return n;}
    private static bool Equivalent(DateTime a,DateTime b)=>a.Year==b.Year&&a.Month==b.Month&&a.Day==b.Day&&a.Hour==b.Hour&&a.Minute==b.Minute&&a.Second==b.Second;
    internal string[] Apply(Tr7Value[] rows,string? language,string? now)
    {
        if(rows.Length<1||rows.Length>512)throw new ArgumentException("Invalid Donut9a field list.");var culture=Trainer8Editing.UiCulture(language);var ignored=new List<string>();
        foreach(var r in rows){if(r.Value is null||r.Value.Length>32767)throw new ArgumentException("Invalid Donut9a text.");switch(r.Key){case"stars":case"calories":case"boost":if(!decimal.TryParse(r.Value,NumberStyles.Number,culture,out var n)){ignored.Add(r.Key);break;}n=Math.Clamp(n,0,r.Key=="stars"?6:r.Key=="boost"?255:65535);if(r.Key=="stars")stars=n;else if(r.Key=="boost")boost=n;else calories=n;break;case"donut":if(!int.TryParse(r.Value,NumberStyles.None,Invariant,out var id)||!Donut9aEditing.Donuts().Any(v=>v.Id==id))throw new ArgumentException("Invalid Donut9a sprite choice.");donut=id;break;case"milliseconds":milliseconds=r.Value;if(!ulong.TryParse(milliseconds,NumberStyles.Integer,culture,out var ms)){ignored.Add("milliseconds-date");break;}try{var d=Donut9a.Epoch.AddMilliseconds(ms);if(!Equivalent(date,d)){if(d<new DateTime(1753,1,1)||d>new DateTime(4095,12,31))throw new ArgumentOutOfRangeException();date=d;}}catch(ArgumentOutOfRangeException){date=Now(now);milliseconds=((ulong)(date-Donut9a.Epoch).TotalMilliseconds).ToString(Invariant);}break;case"date":if(!DateTime.TryParseExact(r.Value,"yyyy-MM-dd'T'HH:mm:ss",Invariant,DateTimeStyles.None,out var requested)||requested<new DateTime(1753,1,1)||requested>new DateTime(4095,12,31))throw new ArgumentException("Invalid Donut9a date.");date=requested;if(!ulong.TryParse(milliseconds,NumberStyles.Integer,culture,out ms)){ignored.Add("date-milliseconds");break;}try{var old=Donut9a.Epoch.AddMilliseconds(ms);if(!Equivalent(date,old)){ulong delta=unchecked((ulong)(date-Donut9a.Epoch).TotalMilliseconds);delta-=delta%1000;delta+=ms%1000;milliseconds=delta.ToString(Invariant);}}catch(ArgumentOutOfRangeException){date=Now(now);milliseconds=((ulong)(date-Donut9a.Epoch).TotalMilliseconds).ToString(Invariant);}break;default:if(r.Key.StartsWith("berry",StringComparison.Ordinal)&&int.TryParse(r.Key.AsSpan(5),out int b)&&b is >=0 and <=8&&int.TryParse(r.Value,NumberStyles.None,Invariant,out id)&&Donut9aEditing.Berries().Any(v=>v.Id==id))berries[b]=id;else if(r.Key.StartsWith("flavor",StringComparison.Ordinal)&&int.TryParse(r.Key.AsSpan(6),out int f)&&f is >=0 and <=2&&int.TryParse(r.Value,NumberStyles.None,Invariant,out id)){flavors[f]=id==0?0:Donut9aEditing.Flavors().SingleOrDefault(v=>v.Id==id) is {} choice?ulong.Parse(choice.Hash,NumberStyles.HexNumber,Invariant):throw new ArgumentException("Invalid Donut9a flavor.");}else throw new ArgumentException("Invalid Donut9a field.");break;}}
        return ignored.ToArray();
    }
    internal void Save(Donut9a d)
    {
        d.Stars=(byte)stars;d.Calories=(ushort)calories;d.LevelBoost=(byte)boost;d.Donut=(ushort)donut;d.BerryName=(ushort)berries[0];d.Berry1=(ushort)berries[1];d.Berry2=(ushort)berries[2];d.Berry3=(ushort)berries[3];d.Berry4=(ushort)berries[4];d.Berry5=(ushort)berries[5];d.Berry6=(ushort)berries[6];d.Berry7=(ushort)berries[7];d.Berry8=(ushort)berries[8];d.Flavor0=flavors[0];d.Flavor1=flavors[1];d.Flavor2=flavors[2];if(date is{Year:1900,Month:1,Day:1,Hour:0,Minute:0,Second:0})d.ClearDateTime();else d.DateTime1900.Timestamp=new DateTime(date.Year,date.Month,date.Day,date.Hour,date.Minute,date.Second);d.MillisecondsSince1970=ulong.TryParse(milliseconds,NumberStyles.Integer,Invariant,out var ms)?ms:0;
    }
}

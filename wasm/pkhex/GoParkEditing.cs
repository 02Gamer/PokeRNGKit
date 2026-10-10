// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;
public sealed record GoParkEntry(int Index,int Species,int Form,int Gender,bool Shiny,LocalizedText Name,string Sprite,string Nickname,int Level,string LevelRaw,int Cp,int Hp,int[] Ivs,int Date,string City,string Username1,string Username2,int[] Moves,LocalizedText[] MoveNames,string Height,string Weight);
public sealed record GoParkFile(string Name,string Data);
public sealed record GoParkPlacement(int File,int Index);
public sealed record GoParkSkipped(int File,string Reason);
public sealed record GoParkReceipt(GoParkPlacement[] Placements,GoParkSkipped[] Skipped,int[] Unplaced);
public sealed record GoParkExport(int Index,string Name,string Data);
internal static class GoParkEditing
{
    internal static void Index(int index){if(index is <0 or >=GoParkStorage.Count)throw new ArgumentException("TrainerGG GO Park index is outside 0–999.");}
    private static LocalizedText SpeciesNameOf(int species){var languages=new[]{"zh-Hans","en","ja"}.Select(GameInfo.GetStrings).ToArray();return species<languages[0].specieslist.Length?new(languages[0].specieslist[species],languages[1].specieslist[species],languages[2].specieslist[species]):new($"未知种类 ({species})",$"Unknown species ({species})",$"不明な種類 ({species})");}
    private static LocalizedText MoveName(int go){int id;try{id=MoveInfo.GetMoveIndexFromGOIndex(go);}catch(IndexOutOfRangeException){id=-1;}var g=new[]{"zh-Hans","en","ja"}.Select(GameInfo.GetStrings).ToArray();return id>=0&&id<g[0].movelist.Length?new(g[0].movelist[id],g[1].movelist[id],g[2].movelist[id]):new($"未知招式 ({go})",$"Unknown move ({go})",$"不明な技 ({go})");}
    internal static GoParkEntry[] Read(SAV7b s)=>Enumerable.Range(0,GoParkStorage.Count).Select(i=>{var p=s.Park[i];bool known=p.Species>0&&p.Species<GameInfo.GetStrings("en").specieslist.Length;return new GoParkEntry(i,p.Species,p.Form,p.Gender,p.IsShiny,SpeciesNameOf(p.Species),known?"b"+SpriteName.GetResourceStringSprite(p.Species,p.Form,p.Gender,0,EntityContext.Gen7b,p.IsShiny):"",p.Nickname,p.Level,p.LevelF.ToString("R",System.Globalization.CultureInfo.InvariantCulture),p.CP,p.Stat_HP,[p.IV_HP,p.IV_ATK,p.IV_DEF],p.Date,p.GeoCityName,p.Username1,p.Username2,[p.Move1,p.Move2],[MoveName(p.Move1),MoveName(p.Move2)],p.HeightF.ToString("R",System.Globalization.CultureInfo.InvariantCulture),p.WeightF.ToString("R",System.Globalization.CultureInfo.InvariantCulture));}).ToArray();
    private static byte[] Decode(GoParkFile f){if(f.Name is null||f.Name.Length is 0 or >255||f.Data is null||f.Data.Length>2300000)throw new ArgumentException("TrainerGG GO Park file metadata is invalid.");try{return Convert.FromBase64String(f.Data);}catch(FormatException){throw new ArgumentException("TrainerGG GP1 file base64 is invalid.");}}
    internal static GoParkReceipt Import(SAV7b s,int index,GoParkFile[] files,bool single)
    {
        Index(index);if(files.Length is <1 or >1000||single&&files.Length!=1)throw new ArgumentException("Invalid TrainerGG GO Park import count.");
        var entries=files.Select((f,i)=>(File:f,Index:i,Bytes:Decode(f))).ToArray();var placed=new List<GoParkPlacement>();var skipped=new List<GoParkSkipped>();var unplaced=new List<int>();int cursor=index;
        foreach(var e in entries){if(!single&&Path.GetExtension(e.File.Name)!=".gp1"){skipped.Add(new(e.Index,"extension"));continue;}if(e.Bytes.Length!=GP1.SIZE){if(single)throw new ArgumentException("TrainerGG GP1 requires exactly 432 bytes.");skipped.Add(new(e.Index,"size"));continue;}
            if(!single)while(cursor<GoParkStorage.Count&&s.Park[cursor].Species!=0)cursor++;
            if(cursor>=GoParkStorage.Count){unplaced.Add(e.Index);continue;}
            s.Park[cursor]=new GP1(e.Bytes);placed.Add(new(e.Index,cursor));cursor++;
        }
        return new(placed.ToArray(),skipped.ToArray(),unplaced.ToArray());
    }
    internal static GoParkExport[] Export(SAV7b s,int? index)
    {
        if(index is {} selected)Index(selected);
        return Enumerable.Range(0,GoParkStorage.Count).Where(i=>index is {} selected?i==selected:s.Park[i].Species!=0).Select(i=>{var p=s.Park[i];string name=p.Species<GameInfo.GetStrings("en").specieslist.Length?p.FileName:$"go-park-{i:0000}.gp1";name=string.Concat(name.Select(c=>char.IsControl(c)||"<>:\"/\\|?*".Contains(c)?'_':c)).Trim(' ','.');return new GoParkExport(i,name,Convert.ToBase64String(p.Data));}).ToArray();
    }
}

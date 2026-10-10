// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Misc8bAction(string Key,bool Enabled);
public sealed record Misc8bValue(string Key,string Group,int Index,string Value,LocalizedText Name);
public sealed record Misc8bCatalog(bool CanEdit,string SourceHash,Misc8bAction[] Actions,Misc8bValue[] Values);
public sealed record Misc8bEdit(string Action,string? SourceHash,string? TargetHash=null);
public sealed record Misc8bPreview(Misc8bEdit Request,Misc8bCatalog Result,int[] ChangedOffsets);
internal static class Misc8bEditing
{
    private static readonly int[] Flags=[244,245,249,301,308,393,420,531,532,545,1508,1623];
    private static readonly int[] Work=[84,188,275,276,278,279,280,281,291,292];
    internal static SAV8BS Save(SaveFile s)=>s is SAV8BS bs?bs:throw new ArgumentException("Misc8b requires Brilliant Diamond/Shining Pearl.");
    internal static Misc8bAction[] Actions(SAV8BS s)
    {
        var u=new EventUnlocker8b(s);return[new("spiritomb",u.UnlockReadySpiritomb),new("shaymin",u.UnlockReadyShaymin),new("darkrai",u.UnlockReadyDarkrai),new("arceus",u.UnlockReadyArceus),new("boxLegend",u.UnlockReadyBoxLegend),new("roamers",u.ResetReadyRoamerMesprit||u.ResetReadyRoamerCresselia),new("rebattle",s.BattleTrainer.AnyDefeated),new("defeat",s.BattleTrainer.AnyUndefeated),new("zones",true),new("fashion",true)];
    }
    private static readonly Lazy<Dictionary<(string Group,int Index),LocalizedText>> Labels=new(()=>
    {
        var result=new Dictionary<(string,int),LocalizedText>();foreach(string group in new[]{"flag","system","work"}){
            var maps=new[]{"zh-Hans","en","ja"}.Select(lang=>group=="work"?EventLabelParsing.GetWork(GameLanguage.GetStrings("bdsp",lang,group),500).ToDictionary(v=>v.Index,v=>v.Name):EventLabelParsing.GetFlags(GameLanguage.GetStrings("bdsp",lang,group),group=="flag"?4000:1000).ToDictionary(v=>v.Index,v=>v.Name)).ToArray();
            foreach(int i in maps[1].Keys)result[(group,i)]=new(maps[0].GetValueOrDefault(i,$"{group} {i}"),maps[1][i],maps[2].GetValueOrDefault(i,$"{group} {i}"));
        }return result;
    });
    internal static Misc8bValue[] Values(SAV8BS s)
    {
        var result=new List<Misc8bValue>();
        void Row(string key,string group,int index,string value,LocalizedText name)=>result.Add(new(key,group,index,value,name));
        void Event(string group,int index,int offset){string key=group+"."+index;int raw=BinaryPrimitives.ReadInt32LittleEndian(s.FlagWork.Data[(offset+index*4)..]);Row(key,group,index,raw.ToString(CultureInfo.InvariantCulture),Labels.Value.GetValueOrDefault((group,index),new($"{(group=="flag"?"事件标记":group=="system"?"系统标记":"事件数值")} {index}",$"{group} {index}",$"{(group=="work"?"イベント値":"フラグ")} {index}")));}
        foreach(int i in Flags.Concat(Enumerable.Range(1246,12)))Event("flag",i,FlagWork8b.OFS_FLAG);foreach(int i in Work)Event("work",i,0);foreach(int i in new[]{5}.Concat(Enumerable.Range(134,624)))Event("system",i,FlagWork8b.OFS_SYSTEM);
        Row("npc","state",0,s.UgSaveData.TalkedNPC.ToString(CultureInfo.InvariantCulture),new("已交流地下 NPC 数","Underground NPCs greeted","会話済みの地下 NPC 数"));Row("npcRaw","state",0,Convert.ToHexString(s.UgSaveData.GetTrainers()),new("地下 NPC 原始记录","Raw underground NPC records","地下 NPC の保存データ"));
        Row("nationalDex","state",0,s.Zukan.HasNationalDex?"1":"0",new("全国图鉴","National Pokédex","全国図鑑"));Row("mesprit","state",0,s.Encounter.Roamer1Encount.ToString(CultureInfo.InvariantCulture),new("艾姆利多徘徊状态","Mesprit roamer state","エムリットの徘徊状態"));Row("cresselia","state",1,s.Encounter.Roamer2Encount.ToString(CultureInfo.InvariantCulture),new("克雷色利亚徘徊状态","Cresselia roamer state","クレセリアの徘徊状態"));
        foreach(ushort item in new ushort[]{452,454,455}){var names=new[]{"zh-Hans","en","ja"}.Select(l=>GameInfo.GetStrings(l).itemlist[item]).ToArray();Row("item."+item,"item",item,s.Items.GetItemQuantity(item).ToString(CultureInfo.InvariantCulture),new(names[0],names[1],names[2]));Row("itemRaw."+item,"itemRaw",item,Convert.ToHexString(s.Items.Data.Slice(item*InventoryItem8b.SIZE,InventoryItem8b.SIZE)),new(names[0],names[1],names[2]));}
        int wins=Enumerable.Range(0,707).Count(s.BattleTrainer.GetIsWin),searcher=Enumerable.Range(0,707).Count(s.BattleTrainer.GetIsBattleSearcher);
        Row("wins","trainer",0,wins.ToString(CultureInfo.InvariantCulture),new("已击败训练家数","Defeated trainers","撃破済みトレーナー数"));Row("searchers","trainer",1,searcher.ToString(CultureInfo.InvariantCulture),new("再战标记训练家数","Battle Searcher trainer flags","再戦フラグのトレーナー数"));Row("trainerHash","trainerRaw",0,Br4Editing.Hash(s.BattleTrainer.Data.ToArray()),new("训练家记录摘要","Trainer record digest","トレーナーデータのハッシュ"));
        return result.ToArray();
    }
    internal static Misc8bCatalog Read(SaveFile save,string hash){var s=Save(save);return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,Actions(s),Values(s));}
    internal static byte[] Prepare(SaveFile save,Misc8bEdit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Misc8b editing requires valid checksums.");if(e.SourceHash!=hash)throw new ArgumentException("Misc8b preview is stale.");if(!Actions(s).Any(a=>a.Key==e.Action&&a.Enabled))throw new ArgumentException("Misc8b operation is unavailable in the source window.");var copy=(SAV8BS)s.Clone();var u=new EventUnlocker8b(copy);
        switch(e.Action){case "spiritomb":u.UnlockSpiritomb();break;case "shaymin":u.UnlockShaymin();break;case "darkrai":u.UnlockDarkrai();break;case "arceus":u.UnlockArceus();break;case "boxLegend":u.UnlockBoxLegend();break;case "roamers":u.RespawnRoamer();break;case "rebattle":copy.BattleTrainer.RebattleAll();break;case "defeat":copy.BattleTrainer.DefeatAll();break;case "zones":u.UnlockZones();break;case "fashion":u.UnlockFashion();break;}
        var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray());if(check is not SAV8BS parsed||parsed.Version!=copy.Version||parsed.SaveRevision!=s.SaveRevision||output.Length!=length||!SaveChecksums.Valid(parsed)||!parsed.Data.SequenceEqual(copy.Data))throw new InvalidOperationException("Misc8b export verification failed.");if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Misc8b preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Misc8bEdit ParseMisc8b(string json)=>json.Length>512?throw new ArgumentException("Misc8b request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Misc8bEdit)??throw new ArgumentException("Missing Misc8b edit.");
    public static string ReadMisc8b(byte[] data)=>JsonSerializer.Serialize(Misc8bEditing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Misc8bCatalog);
    public static string PreviewMisc8b(byte[] data,string json){var e=ParseMisc8b(json);var output=Misc8bEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Misc8bPreview(e with{TargetHash=hash},Misc8bEditing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Misc8bPreview);}
    public static byte[] EditMisc8b(byte[] data,string json){var e=ParseMisc8b(json);if(e.TargetHash is null)throw new ArgumentException("Misc8b requires a frozen preview.");return Misc8bEditing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
}

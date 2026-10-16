// SPDX-License-Identifier: GPL-3.0-or-later
// PKHeX Core Editing/Saves/Slots/Extensions.cs and SlotInfoMisc; WinForms SAVEditor.
using PKHeX.Core;
using System.Text.Json;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;

internal sealed record ExtraSlotKey([property:JsonRequired]int Type,[property:JsonRequired]int Slot,[property:JsonRequired]bool PartyFormat);
internal sealed record ExtraSlotSource([property:JsonRequired]ExtraSlotKey Extra);
internal sealed record ExtraSlotEntry(ExtraSlotKey Key,LocalizedText Name,bool CanWrite,bool HideLegality,bool CanView,PokemonEntry Pokemon);
internal sealed record ExtraSlotCatalog(int ApiVersion,string SourceHash,bool HaX,ExtraSlotEntry[] Slots);
internal static class ExtraSlots
{
    internal static ExtraSlotKey Key(SlotInfoMisc slot)=>new((int)slot.Type,slot.Slot,slot.PartyFormat);
    internal static ExtraSlotKey Decode(string json)
    {
        if(json is null||json.Length is 0 or >4096)throw new ArgumentException("Invalid extra slot key.");
        using var doc=JsonDocument.Parse(json);PokemonSetSession.Unique(doc.RootElement);
        var key=JsonSerializer.Deserialize(json,ExtraSlotJson.Default.ExtraSlotKey)??throw new ArgumentException("Missing extra slot key.");
        if(!Enum.IsDefined((StorageSlotType)key.Type)||(uint)key.Type>255||key.Slot is <0 or >127)throw new ArgumentException("Invalid extra slot key.");
        return key;
    }
    internal static SlotInfoMisc Resolve(SaveFile save,ExtraSlotKey key)
    {
        var slots=save.GetExtraSlots(PokemonEditorMode.HaX);
        return slots.SingleOrDefault(slot=>Key(slot)==key)??throw new ArgumentException("Extra slot is not available in this save and mode.");
    }
    internal static ExtraSlotCatalog Read(SaveFile save,byte[] input)
    {
        SaveSpriteView.Select(save);
        var entries=save.GetExtraSlots(PokemonEditorMode.HaX).Select(slot=>{
            var p=slot.Read(save);
            return new ExtraSlotEntry(Key(slot),Name(slot.Type),slot.CanWriteTo(save),slot.HideLegality,PokemonEditorMode.Readable(p),
                PokemonReader.Read(p,slot.PartyFormat?-1:0,slot.Slot));
        }).ToArray();
        if(entries.Select(e=>e.Key).Distinct().Count()!=entries.Length)throw new InvalidOperationException("Duplicate extra slot identity.");
        return new(SaveService.ApiVersion,Br4Editing.Hash(input),PokemonEditorMode.HaX,entries);
    }
    internal static PokemonFile Open(SaveFile save,ExtraSlotKey key)
    {
        var slot=Resolve(save,key);var p=slot.Read(save);
        if(!PokemonEditorMode.Readable(p))throw new ArgumentException("Extra slot is empty or invalid.");
        return new("extra."+p.Extension,Convert.ToBase64String(PokemonEditorMode.Snapshot(p)));
    }
    private static LocalizedText Name(StorageSlotType type)=>type switch
    {
        StorageSlotType.BattleBox=>new("对战箱","Battle Box","バトルボックス"),
        StorageSlotType.Daycare=>new("寄放记录","Day Care","預かり記録"),
        StorageSlotType.Scripted=>new("脚本宝可梦","Scripted Pokémon","イベントのポケモン"),
        StorageSlotType.GTS=>new("全球交换站","GTS","GTS"),
        StorageSlotType.PGL=>new("全球链接","Pokémon Global Link","ポケモングローバルリンク"),
        StorageSlotType.SurpriseTrade=>new("惊喜交换记录","Surprise Trade","マジカル交換"),
        StorageSlotType.Shiny=>new("异色宝可梦缓存","Shiny cache","色違いキャッシュ"),
        StorageSlotType.Underground=>new("地下大洞窟记录","Underground","地下大洞窟"),
        StorageSlotType.Resort=>new("宝可度假地","Poké Pelago","ポケリゾート"),
        StorageSlotType.Ride=>new("坐骑宝可梦","Ride Pokémon","ライドポケモン"),
        StorageSlotType.BattleAgency=>new("对战经纪人","Battle Agency","バトルエージェント"),
        StorageSlotType.Pokéwalker=>new("宝可计步器","Pokéwalker","ポケウォーカー"),
        StorageSlotType.FusedKyurem=>new("酋雷姆合体记录","Kyurem fusion","キュレムの合体記録"),
        StorageSlotType.FusedNecrozmaS=>new("奈克洛兹玛（日）合体记录","Necrozma (Sun) fusion","ネクロズマ（日）の合体記録"),
        StorageSlotType.FusedNecrozmaM=>new("奈克洛兹玛（月）合体记录","Necrozma (Moon) fusion","ネクロズマ（月）の合体記録"),
        StorageSlotType.FusedCalyrex=>new("蕾冠王合体记录","Calyrex fusion","バドレックスの合体記録"),
        _=>new("额外记录","Extra record","追加記録"),
    };
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase,UnmappedMemberHandling=JsonUnmappedMemberHandling.Disallow)]
[JsonSerializable(typeof(ExtraSlotKey))]
[JsonSerializable(typeof(ExtraSlotSource))]
[JsonSerializable(typeof(ExtraSlotCatalog))]
[JsonSerializable(typeof(ExtraSlotWriteRequest))]
[JsonSerializable(typeof(ExtraSlotConfirmation))]
[JsonSerializable(typeof(ExtraSlotPreview))]
internal partial class ExtraSlotJson:JsonSerializerContext { }

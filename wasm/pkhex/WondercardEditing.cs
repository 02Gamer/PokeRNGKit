// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json.Serialization;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;

namespace PokeRNGKit.SaveEditor;

public sealed record WondercardAction([property: JsonRequired] string Kind, int Index = 0, int Source = 0, string? Data = null, string? FileName = null, bool Value = false);
public sealed record WondercardEntry(int Index, string Type, int Bytes, bool Empty, bool Used, int CardId, string Title, string FileName, string Data, string Sprite, int ItemId, int Species, bool Shiny, bool Egg, LocalizedText[] Description, string? Error)
{
    public bool IsEntity { get; init; } public bool IsItem { get; init; }
    public int HeldItem { get; init; } public int Ball { get; init; } public int Quantity { get; init; }
    public LocalizedText SpeciesName { get; init; } = new("", "", "");
    public LocalizedText ItemName { get; init; } = new("", "", "");
}
public sealed record WondercardCatalog(string SourceHash, string Format, int Generation, bool CanEdit, bool CanUse, int FlagMax, int[] Received, WondercardEntry[] Album, string[] Issues);
internal sealed class WondercardEditing
{
    private readonly SaveFile save;
    private readonly bool canEdit;
    private readonly IMysteryGiftStorage cards;
    private readonly IMysteryGiftFlags? flags;
    private readonly DataMysteryGift[] album;
    private readonly List<int> received = [];
    private readonly List<string> issues = [];
    internal static bool Supports(SaveFile value) => value.Generation is >= 4 and <= 7 && value is IMysteryGiftStorageProvider;
    internal WondercardEditing(SaveFile source)
    {
        if (!Supports(source)) throw new ArgumentException("Mystery Gift albums are unsupported for this save.");
        // SAV5 getters decrypt the clone; capability must be evaluated on the serialized source first.
        canEdit = source.State.Exportable && SaveChecksums.Valid(source);
        save = source.Clone(); cards = ((IMysteryGiftStorageProvider)save).MysteryGiftStorage; flags = cards as IMysteryGiftFlags;
        album = new DataMysteryGift[cards.GiftCountMax + (save is SAV4HGSS ? 1 : 0)];
        for (int i = 0; i < cards.GiftCountMax; i++) album[i] = cards.GetMysteryGift(i);
        if (save is SAV4HGSS hgss) album[^1] = hgss.LockCapsuleSlot;
        if (flags is { } f) for (int i = 1; i < f.MysteryGiftReceivedFlagMax; i++) if (f.GetMysteryGiftReceivedFlag(i)) received.Add(i);
        if (cards is WB7Records) issues.Add("lgpe-received-clear-source-offset");
    }
    internal WondercardCatalog Read(string hash) => new(hash, save.GetType().Name, save.Generation, canEdit, album[0] is not WR7, flags?.MysteryGiftReceivedFlagMax ?? 0, received.ToArray(), album.Select((g, i) => Entry(g, i)).ToArray(), issues.Distinct().ToArray());
    internal static WondercardEntry Entry(DataMysteryGift gift, int index)
    {
        string title = "", name = "", sprite = "b_unknown"; LocalizedText[] description = []; string? error = null;
        int id = 0, item = 0, species = 0; bool shiny = false, egg = false, used = false;
        try
        {
            title = gift.CardTitle; name = gift.FileName; id = gift.CardID; item = gift.ItemID; species = gift.Species; shiny = gift.IsShiny; egg = gift.IsEgg; used = gift.GiftUsed;
            description = WondercardDetails.Read(gift);
            if (gift.IsEmpty) sprite = "b_0";
            else if (gift.IsEntity || gift is { IsEgg: true, Species: 490 })
                sprite = gift.IsEgg ? (gift.Species == 490 ? "b_490_e" : "b_egg") : "b" + SpriteName.GetResourceStringSprite(gift.Species, gift.Form, Math.Max((byte)0, gift.Gender), 0, gift.Context);
            else if (gift.IsItem) { int spriteItem = ItemStorage7USUM.GetCrystalHeld((ushort)item, out var held) ? held : item; sprite = "item_" + spriteItem; }
        }
        catch (Exception e) when (e is not OutOfMemoryException) { error = e.GetType().Name; }
        var result = new WondercardEntry(index, gift.Type, gift.Data.Length, gift.IsEmpty, used, id, title, name, Convert.ToBase64String(gift.Write()), sprite, item, species, shiny, egg, description, error);
        if (error is not null) return result;
        try {
            string Name(string[] values, int value) => (uint)value < values.Length ? values[value] : "#" + value;
            LocalizedText Text(Func<GameStrings, string> read) => new(read(GameInfo.GetStrings("zh-Hans")), read(GameInfo.GetStrings("en")), read(GameInfo.GetStrings("ja")));
            return result with { IsEntity = gift.IsEntity, IsItem = gift.IsItem, HeldItem = gift.HeldItem, Ball = (int)gift.FixedBall, Quantity = gift.Quantity,
                SpeciesName = Text(s => Name(s.specieslist, species)), ItemName = Text(s => Name(s.GetItemStrings(gift.Context, gift.Version), item)) };
        } catch (Exception e) when (e is not OutOfMemoryException) { return result with { Error = e.GetType().Name }; }
    }
    private DataMysteryGift Parse(WondercardAction action)
    {
        if (action.Data is null || action.Data.Length > 4 * 1024 * 1024 || action.FileName?.Length > 1024) throw new ArgumentException("Invalid mystery gift data.");
        byte[] data;
        if (action.Kind == "qrSet")
        {
            int separator = action.Data.IndexOf('#');
            if (separator < 0 || (!action.Data.StartsWith("http", StringComparison.Ordinal) && !action.Data.StartsWith("null/#", StringComparison.Ordinal))) throw new ArgumentException("Invalid mystery gift QR payload.");
            data = Convert.FromBase64String(action.Data[(separator + 1)..]);
        }
        else data = Convert.FromBase64String(action.Data);
        var gift = (action.Kind == "qrSet" ? MysteryGift.GetMysteryGift(data) : MysteryGift.GetMysteryGift(data, Path.GetExtension(action.FileName ?? ""))) ?? throw new ArgumentException("Unrecognized mystery gift.");
        if (action.Kind == "qrSet" && (album[0] is WR7 || album.All(g => g.Data.Length != data.Length) || album.All(g => g.Type != gift.Type) || !save.CanReceiveGift(gift))) throw new ArgumentException("Incompatible mystery gift QR payload.");
        return gift;
    }
    internal WondercardEntry InspectImport(string data, string fileName, bool qr = false) => Entry(Parse(new(qr ? "qrSet" : "set", Data: data, FileName: fileName)), -1);
    internal string QR(int index)
    {
        Index(index); return QRFor(album[index]);
    }
    internal string QRImport(string data, string fileName) => QRFor(Parse(new("set", Data: data, FileName: fileName)));
    private string QRFor(DataMysteryGift gift)
    {
        if (album[0] is WR7 || gift is WR7 || gift.IsEmpty || (save.Generation == 6 && gift is { ItemID: 726, IsItem: true })) throw new ArgumentException("This gift cannot be exported as a QR code.");
        return QRMessageUtil.GetMessage(gift);
    }
    private void Index(int index) { if ((uint)index >= album.Length) throw new ArgumentException("Invalid mystery gift slot."); }
    private void Set(int index, DataMysteryGift gift, bool dropped)
    {
        Index(index);
        if (!dropped && !gift.IsCardCompatible(save, out _)) throw new ArgumentException("Incompatible mystery gift card.");
        int empty = Array.FindIndex(album, g => g.IsEmpty && g.Type == gift.Type);
        if (empty >= 0 && empty < index && (!dropped || album[empty].Type == album[index].Type)) index = empty;
        if (gift is PCD { IsLockCapsule: true }) index = 11;
        Index(index);
        if (gift is PCD { CanConvertToPGT: true } pcd && album[index] is PGT) gift = pcd.Gift;
        else if (gift.Type != album[index].Type) throw new ArgumentException("Incompatible mystery gift slot type.");
        else if (!dropped && gift is PCD card && card.IsLockCapsule != (index == 11)) throw new ArgumentException("Invalid Lock Capsule slot.");
        album[index] = gift.Clone();
        if (flags is { } f && (uint)gift.CardID < f.MysteryGiftReceivedFlagMax && !received.Contains(gift.CardID)) received.Add(gift.CardID);
    }
    internal void Apply(WondercardAction[] actions)
    {
        if (actions is null || actions.Length > 512) throw new ArgumentException("Invalid mystery gift actions.");
        foreach (var a in actions)
        {
            if (a is null) throw new ArgumentException("Missing mystery gift action.");
            switch (a.Kind)
            {
                case "set": case "drop": case "qrSet": Set(a.Index, Parse(a), a.Kind == "drop"); break;
                case "copy": Index(a.Source); Set(a.Index, album[a.Source], false); break;
                case "delete":
                    Index(a.Index); album[a.Index].Clear();
                    for (int i = a.Index; i < album.Length - 1 && !album[i + 1].IsEmpty && album[i + 1].Type == album[i].Type; i++) (album[i], album[i + 1]) = (album[i + 1], album[i]);
                    break;
                case "used":
                    Index(a.Index); if (album[a.Index] is WR7) throw new ArgumentException("Used state does not apply to gift records."); album[a.Index].GiftUsed = a.Value; break;
                case "usedAll":
                    if (album[0] is WR7) throw new ArgumentException("Used state does not apply to gift records."); foreach (var gift in album) gift.GiftUsed = a.Value; break;
                case "received":
                    if (flags is null || (uint)a.Index >= flags.MysteryGiftReceivedFlagMax) throw new ArgumentException("Invalid mystery gift received flag.");
                    if (a.Value && !received.Contains(a.Index)) received.Add(a.Index); else if (!a.Value) received.Remove(a.Index); break;
                case "swap": Swap(a.Index, a.Source); break;
                case "save": break;
                default: throw new ArgumentException("Unknown mystery gift action.");
            }
        }
    }
    private void Swap(int dest, int src)
    {
        Index(dest); Index(src); if (dest == src) return;
        var first = album[dest]; var second = album[src];
        if (first.Type != second.Type)
        {
            if (second is PCD { CanConvertToPGT: true } && first is PGT) { int empty = Array.FindIndex(album, g => g.IsEmpty); if ((uint)empty < dest) dest = empty; Set(dest, second, false); issues.Add("pcd-to-pgt-alternate-slot"); return; }
            throw new ArgumentException("Incompatible mystery gift swap types.");
        }
        if ((first is PCD && dest == 11) || (second is PCD && src == 11)) throw new ArgumentException("Cannot swap the Lock Capsule slot.");
        if (!first.IsEmpty) { (album[src], album[dest]) = (first, second); return; }
        // Preserve the source's forward bubble behavior. A source exception rejects the clone atomically.
        for (int i = src; i != dest; i++) { if (i + 1 >= album.Length) throw new ArgumentException("Mystery gift source move exceeds the album."); if (album[i + 1].IsEmpty) return; (album[i + 1], album[i]) = (album[i], album[i + 1]); }
        throw new ArgumentException("Mystery gift source move did not terminate at an empty slot.");
    }
    internal byte[] Save(byte[] original)
    {
        if (!save.State.Exportable) throw new ArgumentException("Mystery gift save is not exportable.");
        if (flags is { } f) { f.ClearReceivedFlags(); foreach (int id in received) f.SetMysteryGiftReceivedFlag(id, true); }
        if (cards is MysteryBlock4 four) { four.IsDeliveryManActive = album.Any(g => !g.IsEmpty); MysteryBlock4.UpdateSlotPGT(album, save is SAV4HGSS); if (save is SAV4HGSS hgss) hgss.LockCapsuleSlot = (PCD)album[^1]; }
        for (int i = 0; i < cards.GiftCountMax; i++) cards.SetMysteryGift(i, album[i]);
        if (cards is MysteryBlock5 five) five.EndAccess();
        byte[] output = save.Write().ToArray(); var reopened = SaveDetectionContext.OpenDerived(output);
        if (reopened is null || reopened.GetType() != save.GetType() || output.Length != original.Length || !SaveChecksums.Valid(reopened)) throw new InvalidOperationException("Mystery gift export verification failed.");
        return output;
    }
    internal static (byte[] Output, string[] Issues) Prepare(byte[] original, WondercardAction[] actions)
    {
        var source = SaveDetectionContext.OpenCurrent(original) ?? throw new ArgumentException("Unrecognized mystery gift save.");
        if (!SaveChecksums.Valid(source)) throw new ArgumentException("Mystery gift editing requires valid checksums.");
        var editor = new WondercardEditing(source); editor.Apply(actions); return (editor.Save(original), editor.issues.Distinct().ToArray());
    }
}

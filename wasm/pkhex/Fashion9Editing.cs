// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record F9Row(int Index, string Value, bool IsNew, bool? IsNewShop, bool? IsNewGroup, bool? IsEquipped, bool? IsOwned, string Raw);
public sealed record F9Group(string Id, string Key, string Kind, bool Available, int Count, int Bytes, F9Row[] Rows);
public sealed record F9Catalog(bool CanEdit, bool CanOwn, string SourceHash, F9Group[] Groups);
public sealed record F9ReadQuery(string Group = "", string Filter = "", int Offset = 0, int Limit = 50);
public sealed record F9Page(bool CanEdit, bool CanOwn, string SourceHash, F9Group[] Groups, string Group, string Filter, int Offset, int Limit, int Total, F9Row[] Rows);
public sealed record F9RowChange(int Index, string? Value = null, bool? IsNew = null, bool? IsNewShop = null, bool? IsNewGroup = null, bool? IsEquipped = null, bool? IsOwned = null);
public sealed record F9Operation(string Action, string Group, F9RowChange[]? Changes = null, string? Data = null, bool? Owned = null, bool? All = null);
public sealed record F9Edit(string SourceHash, F9Operation[] Operations);
public sealed record F9RowDiff(string Group, int Index, F9Row Before, F9Row After);

internal static class Fashion9Editing
{
    internal sealed record Definition(string Id, uint Key, string Kind);
    internal static readonly Definition[] SV =
    [
        new("Eyewear", 0xCBA20ED5, "sv"), new("Gloves", 0x581667B1, "sv"),
        new("Bag", 0x5D6F8110, "sv"), new("Footwear", 0x0221A618, "sv"),
        new("Headwear", 0x860CD8FB, "sv"), new("Legwear", 0xD186222E, "sv"),
        new("Clothing", 0x78FF2CB2, "sv"), new("PhoneCase", 0xED0AC675, "sv"),
    ];
    internal static readonly Definition[] ZA =
    [
        new("Tops", 0xD4BCE690, "za"), new("Bottoms", 0x4DCB6EBC, "za"),
        new("AllInOne", 0x324F26DD, "za"), new("Headwear", 0x293B1722, "za"),
        new("Eyewear", 0xF4439BD4, "za"), new("Gloves", 0x502EA6C8, "za"),
        new("Legwear", 0x6019F261, "za"), new("Footwear", 0x954C8BAB, "za"),
        new("Satchels", 0x08638763, "za"), new("Earrings", 0xFA089054, "za"),
        new("HairMake00StyleHair", 0x8E466865, "hair"), new("HairMake01StyleBangs", 0x7D78DBBB, "hair"),
        new("HairMake02ColorHair", 0xA9BF43AF, "hair"), new("HairMake03ColorHair", 0x0AABCD8F, "hair"),
        new("HairMake04ColorHair", 0x9D48303D, "hair"), new("HairMake05StyleEyebrow", 0x1354939F, "hair"),
        new("HairMake06ColorEyebrow", 0xF428AFF2, "hair"), new("HairMake07StyleEyes", 0x267FB825, "hair"),
        new("HairMake08ColorEyes", 0x4856C1F4, "hair"), new("HairMake09StyleEyelash", 0xDE67CD9D, "hair"),
        new("HairMake10ColorEyelash", 0x53106AFC, "hair"), new("HairMake11Lips", 0xDACF515D, "hair"),
        new("HairMake12BeautyMark", 0x0B758BF5, "hair"), new("HairMake13Freckles", 0xFC08F055, "hair"),
        new("HairMake14DarkCircles", 0x550EC7E1, "hair"),
    ];
    internal static Definition[] Definitions(SaveFile save) => save switch
    { SAV9SV => SV, SAV9ZA => ZA, _ => throw new ArgumentException("Fashion9 requires Scarlet/Violet or Legends: Z-A.") };
    internal static ISCBlockArray Blocks(SaveFile save) { _ = Definitions(save); return (ISCBlockArray)save; }
    internal static SaveFile OpenLike(SaveFile save, byte[] data) => save is SAV9SV ? new SAV9SV(data) : save is SAV9ZA ? new SAV9ZA(data) : throw new ArgumentException("Unsupported Fashion9 save.");
    internal static int Revision(SaveFile save) => ((ISaveFileRevision)save).SaveRevision;

    // These editors consume Raw directly; do not infer or rewrite a block's metadata.
    internal sealed class Grid
    {
        internal readonly Definition Definition;
        internal readonly SCBlock Block;
        internal F9Row[] Rows = [];
        internal Grid(Definition definition, SCBlock block) { Definition = definition; Block = block; Load(); }
        internal void Load()
        {
            string Raw(int i) => Convert.ToHexString(Block.Data.Slice(i * 8, 8));
            Rows = Definition.Kind switch
            {
                "sv" => FashionItem9.GetArray(Block.Data).Select((p, i) => new F9Row(i, p.Value.ToString(CultureInfo.InvariantCulture), p.IsNew, null, null, null, null, Raw(i))).ToArray(),
                "za" => FashionItem9a.GetArray(Block.Data).Select((p, i) => new F9Row(i, p.Value.ToString(CultureInfo.InvariantCulture), p.IsNew, p.IsNewShop, p.IsNewGroup, p.IsEquipped, p.IsOwned, Raw(i))).ToArray(),
                "hair" => HairMakeItem9a.GetArray(Block.Data).Select((p, i) => new F9Row(i, p.Value.ToString(CultureInfo.InvariantCulture), p.IsNew, null, null, null, null, Raw(i))).ToArray(),
                _ => throw new InvalidOperationException("Invalid Fashion9 editor kind."),
            };
        }
        internal void Patch(F9RowChange change)
        {
            if ((uint)change.Index >= Rows.Length || change.Value?.Length > 32767 ||
                Definition.Kind != "za" && (change.IsNewShop is not null || change.IsNewGroup is not null || change.IsEquipped is not null || change.IsOwned is not null))
                throw new ArgumentException("Invalid Fashion9 row or fields.");
            var row = Rows[change.Index];
            Rows[change.Index] = row with
            {
                Value = change.Value ?? row.Value, IsNew = change.IsNew ?? row.IsNew,
                IsNewShop = change.IsNewShop ?? row.IsNewShop, IsNewGroup = change.IsNewGroup ?? row.IsNewGroup,
                IsEquipped = change.IsEquipped ?? row.IsEquipped, IsOwned = change.IsOwned ?? row.IsOwned,
            };
        }
        internal void Save(List<string> reset)
        {
            uint Value(int i)
            {
                if (uint.TryParse(Rows[i].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)) return value;
                reset.Add(Definition.Id + ":" + i.ToString(CultureInfo.InvariantCulture));
                Rows[i] = Rows[i] with { Value = "65535" }; return ushort.MaxValue;
            }
            if (Definition.Kind == "sv")
            {
                var array = FashionItem9.GetArray(Block.Data);
                for (int i = 0; i < array.Length; i++) { array[i].Value = Value(i); array[i].IsNew = Rows[i].IsNew; }
                FashionItem9.SetArray(array, Block.Data);
            }
            else if (Definition.Kind == "hair")
            {
                var array = HairMakeItem9a.GetArray(Block.Data);
                for (int i = 0; i < array.Length; i++) { array[i].Value = Value(i); array[i].IsNew = Rows[i].IsNew; }
                HairMakeItem9a.SetArray(array, Block.Data);
            }
            else
            {
                var array = FashionItem9a.GetArray(Block.Data);
                for (int i = 0; i < array.Length; i++)
                {
                    var item = array[i]; var row = Rows[i]; item.Value = Value(i); item.IsNew = row.IsNew;
                    item.IsNewShop = row.IsNewShop == true; item.IsNewGroup = row.IsNewGroup == true;
                    item.IsEquipped = row.IsEquipped == true; item.IsOwned = row.IsOwned == true;
                }
                FashionItem9a.SetArray(array, Block.Data);
            }
        }
        internal void Own(bool state, List<string> reset)
        {
            if (Definition.Kind != "za") return; // Source SV and hair editors are no-ops.
            Save(reset); FashionItem9a.ModifyAll(Block.Data, item => item.IsOwned = state); Load();
        }
    }
    internal static Grid? Get(SaveFile save, Definition d) => Blocks(save).Accessor.TryGetBlock(d.Key, out var block) ? new(d, block) : null;
    internal static F9Catalog Read(SaveFile save, string hash, bool includeRows = true)
    {
        var groups = Definitions(save).Select(d =>
        {
            bool available = Blocks(save).Accessor.TryGetBlock(d.Key, out var block);
            return new F9Group(d.Id, d.Key.ToString("X8"), d.Kind, available, available ? block.Data.Length / 8 : 0, available ? block.Raw.Length : 0, available && includeRows ? new Grid(d, block).Rows : []);
        }).ToArray();
        return new(save.State.Exportable && SaveChecksums.Valid(save) && groups.All(g => g.Available), save is SAV9ZA, hash, groups);
    }
    internal static F9Page Page(SaveFile save, string hash, F9ReadQuery query)
    {
        var catalog = Read(save, hash, false);
        if (query.Filter is null || query.Filter.Length > 32767 || query.Offset < 0 || query.Limit is < 1 or > 200) throw new ArgumentException("Invalid Fashion9 read query.");
        string group = query.Group == "" ? catalog.Groups[0].Id : query.Group;
        var d = Definitions(save).SingleOrDefault(d => d.Id == group) ?? throw new ArgumentException("Invalid Fashion9 group.");
        var rows = Get(save, d)?.Rows ?? [];
        if (query.Offset > rows.Length) throw new ArgumentException("Invalid Fashion9 page offset.");
        var filtered = rows.Where(row => row.Value.Contains(query.Filter, StringComparison.OrdinalIgnoreCase)).ToArray();
        return new(catalog.CanEdit, catalog.CanOwn, hash, catalog.Groups, group, query.Filter, query.Offset, query.Limit, filtered.Length, filtered.Skip(query.Offset).Take(query.Limit).ToArray());
    }
    internal static byte[] Prepare(SaveFile save, F9Edit edit, string hash, int length, out string[] resets)
    {
        var definitions = Definitions(save);
        if (edit.SourceHash != hash) throw new ArgumentException("Fashion9 preview is stale.");
        if (!Read(save, hash, false).CanEdit) throw new ArgumentException("Fashion9 requires all source blocks, exportable data and valid checksums.");
        if (edit.Operations is null || edit.Operations.Length > 512) throw new ArgumentException("Invalid Fashion9 operation count.");
        var copy = save.Clone(); var grids = definitions.Select(d => Get(copy, d)!).ToArray(); var reset = new List<string>();
        foreach (var operation in edit.Operations)
        {
            if (operation is null) throw new ArgumentException("Invalid Fashion9 operation.");
            var current = grids.SingleOrDefault(g => g.Definition.Id == operation.Group) ?? throw new ArgumentException("Invalid Fashion9 operation group.");
            if (operation.Action != "rows" && operation.Changes is not null || operation.Action != "import" && operation.Data is not null || operation.Action != "owned" && (operation.Owned is not null || operation.All is not null))
                throw new ArgumentException("Invalid Fashion9 action fields.");
            switch (operation.Action)
            {
                case "rows":
                    if (operation.Changes is null || operation.Changes.Any(c => c is null) || operation.Changes.Length > current.Rows.Length || operation.Changes.Select(c => c.Index).Distinct().Count() != operation.Changes.Length) throw new ArgumentException("Invalid Fashion9 row changes.");
                    foreach (var change in operation.Changes) current.Patch(change);
                    break;
                case "import":
                    if (operation.Data is null || operation.Data.Length > 131072 || operation.Data.Length != current.Block.Raw.Length * 2 || operation.Data.Any(c => !char.IsAsciiHexDigit(c))) throw new ArgumentException("Fashion9 import must match the source block and not exceed 65536 bytes.");
                    current.Block.ChangeData(Convert.FromHexString(operation.Data)); current.Load();
                    break;
                case "owned":
                    if (save is not SAV9ZA || operation.Owned is not { } state || operation.All is not { } all) throw new ArgumentException("Invalid Fashion9 ownership operation.");
                    foreach (var g in all ? grids : [current]) g.Own(state, reset);
                    break;
                case "resave": break; // Source window saves all grids below.
                default: throw new ArgumentException("Invalid Fashion9 action.");
            }
        }
        foreach (var g in grids) g.Save(reset);
        var output = copy.Write().ToArray(); var parsed = OpenLike(save, output.ToArray()); var before = Blocks(copy).AllBlocks; var after = Blocks(parsed).AllBlocks;
        if (output.Length != length || parsed.Version != save.Version || Revision(parsed) != Revision(save) || !SaveChecksums.Valid(parsed) || after.Count != before.Count || after.Where((b, i) => b.Key != before[i].Key || b.Type != before[i].Type || b.SubType != before[i].SubType || !b.Data.SequenceEqual(before[i].Data)).Any())
            throw new InvalidOperationException("Fashion9 export verification failed.");
        resets = reset.Distinct().ToArray(); return output;
    }
    internal static Ew9aBlockChange[] BlockChanges(SaveFile before, SaveFile after) => Definitions(before).Select(d =>
    {
        var b = Blocks(before).Accessor.GetBlock(d.Key); var a = Blocks(after).Accessor.GetBlock(d.Key);
        return new Ew9aBlockChange(d.Key.ToString("X8"), b.Type.ToString(), a.Type.ToString(), b.SubType.ToString(), a.SubType.ToString(), Convert.ToHexString(b.Data), Convert.ToHexString(a.Data));
    }).Where(b => b.Before != b.After || b.BeforeType != b.AfterType || b.BeforeSubtype != b.AfterSubtype).ToArray();
    internal static F9RowDiff[] RowChanges(SaveFile before, SaveFile after) => Definitions(before).SelectMany(d =>
    {
        var b = Get(before, d)!.Rows; var a = Get(after, d)!.Rows;
        return Enumerable.Range(0, b.Length).Where(i => b[i] != a[i]).Select(i => new F9RowDiff(d.Id, i, b[i], a[i]));
    }).ToArray();
}

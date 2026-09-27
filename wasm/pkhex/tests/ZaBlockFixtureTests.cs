// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using static System.Buffers.Binary.BinaryPrimitives;

// Engineering fixtures only: unknown metadata and revision block sets are synthetic.
// Never pad to a recognized SaveUtil length or loosen production hash/format detection.
internal static class ZaBlockFixtureTests
{
    internal const uint DexKey = 0x2D87BE5C;
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    internal static byte[] Create(int revision)
    {
        if (revision is < 0 or > 2) throw new ArgumentOutOfRangeException(nameof(revision));
        var blank = new SAV9ZA { Version = GameVersion.ZA, OT = "TEST", Language = 9 };
        var blocks = new List<SCBlock>();
        foreach (var source in blank.AllBlocks)
        {
            var data = source.Data.ToArray();
            var type = data.Length == 0 ? SCTypeCode.Bool1 : SCTypeCode.Object;
            var subtype = SCTypeCode.None;
            if (source.Key == SaveBlockAccessor9ZA.KSaveRevision)
            {
                type = SCTypeCode.UInt64;
                WriteUInt64LittleEndian(data, (ulong)revision);
            }
            if (source.Key is SaveBlockAccessor9ZA.KCurrentBox or SaveBlockAccessor9ZA.KBoxesUnlocked) type = SCTypeCode.Byte;
            if (source.Key == SaveBlockAccessor9ZA.KMoney) type = SCTypeCode.UInt32;
            if (source.Key == SaveBlockAccessor9ZA.KBoxWallpapers) { type = SCTypeCode.Array; subtype = SCTypeCode.Byte; }
            blocks.Add(SwshBlockFixtureTests.Typed(source.Key, data, type, subtype));
        }
        // Revision must be set before construction: Initialize caches the species ceiling.
        var save = new SAV9ZA(SwishCrypto.Encrypt(blocks)) { CurrentBox = 3, BoxesUnlocked = 32, Money = 123456 };
        var dex = save.Blocks.GetBlock(DexKey).Data;
        for (int offset = 0; offset + PokeDexEntry9a.SIZE <= dex.Length; offset += PokeDexEntry9a.SIZE)
        {
            var e = dex.Slice(offset, PokeDexEntry9a.SIZE);
            WriteUInt16LittleEndian(e[8..], 0xFC00);
            e[10] = 0xA7; e[11] = 0xA0; e[16] = 0xE0; e[17] = 0xB9;
            e.Slice(0x12, 0x48).Fill(0xD3);
            e[0x5C] = 0xC1;
            e[0x5D..].Fill(0xE5);
        }
        return save.Write().ToArray();
    }
    public static void Run()
    {
        for (int revision = 0; revision < 3; revision++)
        {
            var input = Create(revision); var original = input.ToArray();
            var save = new SAV9ZA(input.ToArray());
            Check(SwishCrypto.GetIsHashValid(input) && save.SaveRevision == revision && save.Version == GameVersion.ZA, "ZA fixture hash and uint64 revision");
            Check(save.MaxSpeciesID == (revision == 0 ? (ushort)Species.Falinks : (ushort)Species.Gholdengo), "ZA cached revision species limits");
            Check(save.Language == 9 && save.CurrentBox == 3 && save.BoxesUnlocked == 32 && save.Money == 123456, "ZA typed scalars survive serialization");
            Check(save.Write().Span.SequenceEqual(input), "ZA exact no-op encrypted output");
            var before = save.AllBlocks.Select(b => b.Clone()).ToArray();
            var expected = save.Blocks.GetBlock(DexKey).Data.ToArray();
            var offsets = Enumerable.Range(0, save.MaxSpeciesID + 1).Select(s => SpeciesConverter.GetInternal9((ushort)s) * PokeDexEntry9a.SIZE).ToArray();
            Check(offsets.Distinct().Count() == offsets.Length && offsets.All(o => o + PokeDexEntry9a.SIZE <= expected.Length), "ZA unique in-range internal dex addresses");
            for (ushort species = 1; species <= save.MaxSpeciesID; species++)
            {
                var e = save.Zukan.GetEntry(species); var bytes = expected.AsSpan(offsets[species], PokeDexEntry9a.SIZE);
                byte f = (byte)(species % 32), gender = (byte)(species % 3), mega = (byte)(species % 3);
                e.SetIsFormCaught(f, true); e.SetIsFormSeen((byte)((f + 1) % 32), true); e.SetIsShinySeen((byte)((f + 2) % 32), true);
                e.SetIsGenderSeen(gender, true); e.SetIsSeenMega(mega, true);
                foreach (int lang in new[] { 1, 2, 3, 4, 5, 7, 8, 9, 10, 11 }) e.SetLanguageFlag(lang, true);
                e.DisplayForm = f; e.DisplayGender = (DisplayGender9a)(species % 4);
                WriteUInt32LittleEndian(bytes, 1u << f); WriteUInt32LittleEndian(bytes[4..], 1u << ((f + 1) % 32)); WriteUInt32LittleEndian(bytes[12..], 1u << ((f + 2) % 32));
                WriteUInt16LittleEndian(bytes[8..], 0xFFFF); bytes[11] |= (byte)(1 << gender); bytes[16] |= (byte)(1 << mega);
                bytes[0x5A] = f; bytes[0x5B] = (byte)(species % 4);
            }
            var output = save.Write().ToArray(); var after = new SAV9ZA(output.ToArray());
            Check(SwishCrypto.GetIsHashValid(output), "ZA edited encrypted hash");
            Check(before.Length == after.AllBlocks.Count, "ZA block count retained");
            for (int i = 0; i < before.Length; i++)
            {
                var a = before[i]; var b = after.AllBlocks[i];
                Check(a.Key == b.Key && a.Type == b.Type && a.SubType == b.SubType && a.Data.Length == b.Data.Length, "ZA block metadata/order retained");
                Check(b.Data.SequenceEqual(a.Key == DexKey ? expected : a.Data), "ZA exact edited bits, raw booleans, padding and unrelated blocks");
            }
            for (ushort species = 1; species <= after.MaxSpeciesID; species++)
            {
                var e = after.Zukan.GetEntry(species);
                Check(e.GetLanguageFlag((int)LanguageID.SpanishL) && (byte)e.DisplayGender == species % 4 && e.GetIsSeenMega((byte)(species % 3)), "ZA tenth language, four display genders and Mega bits readback");
            }
            foreach (int offset in new[] { 0, output.Length / 2, output.Length - 1 })
            {
                var corrupt = output.ToArray(); corrupt[offset] ^= 1;
                Check(!SwishCrypto.GetIsHashValid(corrupt), "ZA encrypted damage detection");
            }
            Check(input.SequenceEqual(original), "ZA original input retained");
            Console.WriteLine($"PASS ZA synthetic revision {revision}: {offsets.Length} addresses, 32-bit form groups, ten languages, four display genders, Mega bits and full encrypted output; not a real-save or SaveService acceptance fixture");
        }
    }
}

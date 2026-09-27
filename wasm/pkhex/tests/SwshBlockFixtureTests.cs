// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

// Engineering fixtures only. Unknown block metadata is synthetic, not a game-save schema.
// Do not pad these files to a recognized SaveUtil size or weaken production format detection.
internal static class SwshBlockFixtureTests
{
    private const uint Galar = 0x4716C404, Armor = 0x3F936BA9, Crown = 0x3C9366F0;
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }

    // Build through the public wire-format reader; no reflection or changes to vendored Core.
    private static SCBlock Typed(uint key, byte[] data, SCTypeCode type, SCTypeCode subtype = SCTypeCode.None)
    {
        using var stream = new MemoryStream();
        using var writer = new BinaryWriter(stream);
        var xor = new SCXorShift32(key);
        writer.Write(key);
        writer.Write((byte)((byte)type ^ xor.Next()));
        if (type == SCTypeCode.Object) writer.Write(data.Length ^ xor.Next32());
        if (type == SCTypeCode.Array)
        {
            Check(data.Length % subtype.GetTypeSize() == 0, "Synthetic array element width");
            writer.Write((data.Length / subtype.GetTypeSize()) ^ xor.Next32());
            writer.Write((byte)((byte)subtype ^ xor.Next()));
        }
        foreach (byte value in data) writer.Write((byte)(value ^ xor.Next()));
        var raw = stream.ToArray();
        int offset = 0;
        var result = SCBlock.ReadFromOffset(raw, ref offset);
        Check(offset == raw.Length && result.Data.SequenceEqual(data), "Synthetic typed block decoding");
        return result;
    }

    internal static byte[] Create(GameVersion version, int revision)
    {
        var blank = new SAV8SWSH { Version = version, OT = "TEST" };
        var blocks = new List<SCBlock>();
        foreach (var source in blank.AllBlocks)
        {
            if (revision < 2 && source.Key == Crown || revision < 1 && source.Key == Armor) continue;
            var type = source.Data.Length == 0 ? SCTypeCode.Bool1 : SCTypeCode.Object;
            var subtype = SCTypeCode.None;
            // Explicit types used by the tested public accessors.
            if (source.Key is SaveBlockAccessor8SWSH.KCurrentBox or SaveBlockAccessor8SWSH.KBoxesUnlocked) type = SCTypeCode.Byte;
            if (source.Key == SaveBlockAccessor8SWSH.KGameLanguage) type = SCTypeCode.UInt32;
            if (source.Key == SaveBlockAccessor8SWSH.KEnteredHallOfFame) type = SCTypeCode.UInt64;
            if (source.Key == SaveBlockAccessor8SWSH.KBoxWallpapers) { type = SCTypeCode.Array; subtype = SCTypeCode.Byte; }
            blocks.Add(Typed(source.Key, source.Data.ToArray(), type, subtype));
        }
        var encoded = SwishCrypto.Encrypt(blocks);
        var save = new SAV8SWSH(encoded.ToArray()) { Language = 9, CurrentBox = 3, BoxesUnlocked = 32 };
        save.SetBoxWallpaper(3, 7);
        // Distinct reserved bytes detect accidental whole-entry or whole-block rewrites.
        foreach (uint key in new[] { Galar, Armor, Crown })
            if (save.Blocks.TryGetBlock(key, out var block))
                for (int i = 0; i < block.Data.Length / 0x30; i++) block.Data[i * 0x30 + 0x2F] = 0xA7;
        return save.Write().ToArray();
    }

    public static void Run()
    {
        foreach (var version in new[] { GameVersion.SW, GameVersion.SH })
        for (int revision = 0; revision <= 2; revision++)
        {
            var input = Create(version, revision);
            var original = input.ToArray();
            Check(SwishCrypto.GetIsHashValid(input), "SWSH encrypted fixture hash");
            var save = new SAV8SWSH(input.ToArray());
            Check(save.Version == version && save.SaveRevision == revision && save.Language == 9, "SWSH fixture identity and dex block revision");
            Check(save.GetValue<uint>(SaveBlockAccessor8SWSH.KGameLanguage) == 8 && save.CurrentBox == 3 && save.BoxesUnlocked == 32 && save.GetBoxWallpaper(3) == 7, "SWSH scalar and array types survive serialization");
            Check(save.Write().Span.SequenceEqual(input), "SWSH unchanged serialization is byte-exact");
            var entries = Zukan8.GetRawIndexes(save.Personal, revision, Zukan8Index.TotalCount);
            Check(entries.Count == new[] { 400, 611, 821 }[revision], "SWSH physical dex entry counts");
            Check(entries.Select(e => e.Entry.AbsoluteIndex).Distinct().Count() == entries.Count, "SWSH physical dex addresses are unique");
            if (revision > 0) Check(entries.Select(e => e.Species).Distinct().Count() < entries.Count, "SWSH duplicate species across regions must remain separate");
            var before = save.AllBlocks.Select(b => b.Clone()).ToArray();
            var selected = entries.Last().Entry;
            uint dexKey = selected.DexType switch { Zukan8Type.Galar => Galar, Zukan8Type.Armor => Armor, _ => Crown };
            save.Zukan.SetCaught(selected, true);
            save.Zukan.SetSeenRegion(selected, 63, 3, true);
            save.Zukan.SetBattledCount(selected, uint.MaxValue);
            var output = save.Write().ToArray();
            Check(SwishCrypto.GetIsHashValid(output), "SWSH edited file hash regenerated");
            var reread = new SAV8SWSH(output.ToArray());
            Check(reread.Zukan.GetCaught(selected) && reread.Zukan.GetSeenRegion(selected, 63, 3) && reread.Zukan.GetBattledCount(selected) == uint.MaxValue, "SWSH dex fields survive encrypted roundtrip");
            Check(before.Length == reread.AllBlocks.Count, "SWSH block count preserved");
            for (int i = 0; i < before.Length; i++)
            {
                var a = before[i]; var b = reread.AllBlocks[i];
                Check(a.Key == b.Key && a.Type == b.Type && a.SubType == b.SubType && a.Data.Length == b.Data.Length, "SWSH block order and metadata preserved");
                if (a.Key != dexKey) Check(a.Data.SequenceEqual(b.Data), "SWSH unrelated block bytes preserved");
                else
                {
                    var expected = a.Data.ToArray();
                    expected[selected.Offset + 0x1F] |= 0x80;
                    expected[selected.Offset + 0x20] |= 1;
                    expected.AsSpan(selected.Offset + 0x24, 4).Fill(0xFF);
                    Check(b.Data.SequenceEqual(expected), "SWSH exact changed bits, count and reserved bytes");
                }
            }
            foreach (int offset in new[] { 0, input.Length / 2, input.Length - 1 })
            {
                var corrupt = output.ToArray(); corrupt[offset] ^= 1;
                Check(!SwishCrypto.GetIsHashValid(corrupt), "SWSH damaged payload/hash detected");
            }
            Check(input.SequenceEqual(original), "SWSH original encrypted bytes preserved");
            Console.WriteLine($"PASS {version} synthetic block revision {revision}: hash, typed serialization, {entries.Count} dex addresses and unrelated bytes; not a real-game or SaveService acceptance fixture");
        }
    }
}

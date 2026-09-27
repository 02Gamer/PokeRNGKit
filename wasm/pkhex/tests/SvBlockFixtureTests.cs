// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using static System.Buffers.Binary.BinaryPrimitives;

// Synthetic serialization fixtures, not a complete historical game-save schema.
// Keep production SaveUtil length/hash recognition intact; never pad these fixtures.
internal static class SvBlockFixtureTests
{
    internal const uint Paldea = 0x0DEAAEBD, Kitakami = 0xF5D7C0E2;
    private const uint RaidDlc = 0x100B93DA;
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }

    internal static byte[] Create(GameVersion version, int revision)
    {
        if (version is not (GameVersion.SL or GameVersion.VL) || revision is < 0 or > 2)
            throw new ArgumentOutOfRangeException(nameof(revision));
        var blank = new SAV9SV { Version = version, OT = "TEST" };
        var blocks = new List<SCBlock>();
        foreach (var source in blank.AllBlocks)
        {
            if (revision < 2 && source.Key == SaveBlockAccessor9SV.KBlueberryPoints ||
                revision < 1 && source.Key is Kitakami or RaidDlc) continue;
            var type = source.Data.Length == 0 ? SCTypeCode.Bool1 : SCTypeCode.Object;
            var subtype = SCTypeCode.None;
            // Use accessor value types, not comments: CurrentBox is byte and language is int32.
            if (source.Key is SaveBlockAccessor9SV.KCurrentBox or SaveBlockAccessor9SV.KBoxesUnlocked) type = SCTypeCode.Byte;
            if (source.Key == SaveBlockAccessor9SV.KGameLanguage) type = SCTypeCode.Int32;
            if (source.Key is SaveBlockAccessor9SV.KMoney or SaveBlockAccessor9SV.KLeaguePoints or SaveBlockAccessor9SV.KBlueberryPoints) type = SCTypeCode.UInt32;
            if (source.Key == SaveBlockAccessor9SV.KBoxWallpapers) { type = SCTypeCode.Array; subtype = SCTypeCode.Byte; }
            blocks.Add(SwshBlockFixtureTests.Typed(source.Key, source.Data.ToArray(), type, subtype));
        }
        var save = new SAV9SV(SwishCrypto.Encrypt(blocks)) { Language = 9, CurrentBox = 3, BoxesUnlocked = 32, Money = 123456, LeaguePoints = 654321 };
        if (revision == 2) save.BlueberryPoints = 4321;
        foreach (uint key in new[] { Paldea, Kitakami })
        {
            if (!save.Blocks.TryGetBlock(key, out var block)) continue;
            int stride = key == Paldea ? PokeDexEntry9Paldea.SIZE : PokeDexEntry9Kitakami.SIZE;
            for (int offset = 0; offset + stride <= block.Data.Length; offset += stride)
            {
                // Unused bits, alignment and non-canonical booleans must survive unrelated writes.
                if (key == Paldea)
                {
                    block.Data[offset + 9] = 0xA0;
                    block.Data[offset + 11] = 0xE0;
                    block.Data[offset + 12] = 0xA7;
                    block.Data[offset + 14] = 0xB1;
                    block.Data[offset + 15] = 0xC2;
                    block.Data[offset + 23] = 0xD3;
                }
                else
                {
                    block.Data[offset + 17] = 0xE0;
                    block.Data[offset + 18] = 0xA0;
                    block.Data[offset + 19] = 0xA1;
                    block.Data[offset + 22] = 0xA7;
                    block.Data[offset + 23] = 0xB1;
                    block.Data[offset + 27] = 0xC2;
                    block.Data[offset + 31] = 0xD3;
                }
            }
        }
        return save.Write().ToArray();
    }

    public static void Run()
    {
        foreach (var version in new[] { GameVersion.SL, GameVersion.VL })
        for (int revision = 0; revision <= 2; revision++)
        {
            var input = Create(version, revision);
            var original = input.ToArray();
            Check(SwishCrypto.GetIsHashValid(input), "SV synthetic encrypted hash");
            var save = new SAV9SV(input.ToArray());
            Check(save.Version == version && save.SaveRevision == revision && save.Zukan.GetRevision() == (revision == 0 ? 0 : 1), "SV save revision and dex layout are separate");
            Check(save.MaxSpeciesID == new[] { 1010, 1017, 1025 }[revision], "SV revision species ceiling");
            Check(save.Language == 9 && save.MyStatus.RuntimeLanguageId == RuntimeLanguage.ChineseS && save.CurrentBox == 3 && save.BoxesUnlocked == 32, "SV byte/int32 metadata readback");
            Check(save.Money == 123456 && save.LeaguePoints == 654321 && (revision != 2 || save.BlueberryPoints == 4321), "SV uint32 metadata readback");
            Check(save.Write().Span.SequenceEqual(input), "SV no-op full encrypted byte preservation");
            uint active = revision == 0 ? Paldea : Kitakami;
            int stride = revision == 0 ? PokeDexEntry9Paldea.SIZE : PokeDexEntry9Kitakami.SIZE;
            var block = save.Blocks.GetBlock(active);
            var addresses = Enumerable.Range(0, save.MaxSpeciesID + 1).Select(s => SpeciesConverter.GetInternal9((ushort)s) * stride).ToArray();
            Check(addresses.Distinct().Count() == addresses.Length && addresses.All(o => o + stride <= block.Data.Length), "SV species-to-internal dex addresses are unique and in bounds");
            Check(addresses.Where((o, s) => o != s * stride).Any(), "SV fixture covers non-identity species conversion");
            var before = save.AllBlocks.Select(b => b.Clone()).ToArray();
            var expected = block.Data.ToArray();
            // Cover every address, all 32 independent bits, all language bits and three display regions.
            for (ushort species = 1; species <= save.MaxSpeciesID; species++)
            {
                int offset = addresses[species];
                var bytes = expected.AsSpan(offset, stride);
                byte form = (byte)(species % 32);
                if (revision == 0)
                {
                    var entry = save.Zukan.DexPaldea.Get(species);
                    entry.SetState((uint)(species % 4));
                    entry.SetIsFormSeen(form, true);
                    entry.SetIsGenderSeen((byte)(species % 3), true);
                    entry.SetDisplayIsNew(true);
                    entry.SetDisplayForm(form);
                    entry.SetDisplayGender(species % 3);
                    entry.SetDisplayIsShiny(true);
                    entry.SetDisplayGenderIsDifferent(true);
                    foreach (int lang in new[] { 1, 2, 3, 4, 5, 7, 8, 9, 10 }) entry.SetLanguageFlag(lang, true);
                    WriteUInt32LittleEndian(bytes, (uint)(species % 4));
                    WriteUInt32LittleEndian(bytes[4..], 1u << form);
                    bytes[8] |= (byte)(1 << (species % 3));
                    WriteUInt16LittleEndian(bytes[10..], 0xE1FF);
                    bytes[13] = 1;
                    WriteUInt32LittleEndian(bytes[16..], form);
                    bytes[20] = (byte)(species % 3); bytes[21] = 1; bytes[22] = 1;
                }
                else
                {
                    var entry = save.Zukan.DexKitakami.Get(species);
                    entry.SetObtainedForm(form, true);
                    entry.SetSeenForm((byte)((form + 1) % 32), true);
                    entry.SetHeardForm((byte)((form + 2) % 32), true);
                    entry.SetCheckedForm((byte)((form + 3) % 32), true);
                    entry.SetIsGenderSeen((byte)(species % 3), true);
                    entry.SetIsModelSeen(true, true);
                    foreach (int lang in new[] { 1, 2, 3, 4, 5, 7, 8, 9, 10 }) entry.SetLanguageFlag(lang, true);
                    entry.SetLocalKitakami(form, 1, 1);
                    entry.SetLocalBlueberry((byte)(31 - form), 2, 0);
                    for (int i = 0; i < 4; i++) WriteUInt32LittleEndian(bytes[(i * 4)..], 1u << ((form + i) % 32));
                    WriteUInt16LittleEndian(bytes[16..], 0xE1FF);
                    bytes[18] |= (byte)(1 << (species % 3)); bytes[19] |= 2;
                    bytes[24] = form; bytes[25] = 1; bytes[26] = 1;
                    bytes[28] = (byte)(31 - form); bytes[29] = 2; bytes[30] = 0;
                }
            }
            var output = save.Write().ToArray();
            Check(SwishCrypto.GetIsHashValid(output), "SV edited hash regenerated");
            var reread = new SAV9SV(output.ToArray());
            Check(reread.AllBlocks.Count == before.Length, "SV block count preserved");
            for (int i = 0; i < before.Length; i++)
            {
                var a = before[i]; var b = reread.AllBlocks[i];
                Check(a.Key == b.Key && a.Type == b.Type && a.SubType == b.SubType && a.Data.Length == b.Data.Length, "SV block order and metadata preserved");
                Check(b.Data.SequenceEqual(a.Key == active ? expected : a.Data), "SV exact edited bits, inactive dex and unrelated bytes preserved");
            }
            foreach (int offset in new[] { 0, output.Length / 2, output.Length - 1 })
            {
                var corrupt = output.ToArray(); corrupt[offset] ^= 1;
                Check(!SwishCrypto.GetIsHashValid(corrupt), "SV payload/hash damage detected");
            }
            Check(input.SequenceEqual(original), "SV original input preserved");
            Console.WriteLine($"PASS {version} synthetic revision {revision}: both dex layouts, {addresses.Length} internal addresses, full encrypted roundtrip and untouched bytes; not real-game or SaveService acceptance");
        }
    }
}

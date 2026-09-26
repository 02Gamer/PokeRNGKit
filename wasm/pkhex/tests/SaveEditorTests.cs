using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class SaveEditorTests
{
    private static void Require(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static void Main()
    {
        foreach (var version in new[] { GameVersion.E, GameVersion.D, GameVersion.Pt, GameVersion.HG, GameVersion.B, GameVersion.B2, GameVersion.X, GameVersion.OR, GameVersion.SN, GameVersion.US, GameVersion.BD })
        {
            var save = CreateFixture(version);
            save.Money = 100;
            var pokemon = save.BlankPKM;
            pokemon.Species = 25;
            pokemon.TID16 = 12345;
            pokemon.SID16 = 54321;
            pokemon.OriginalTrainerName = "TEST";
            pokemon.CurrentLevel = 25;
            pokemon.IV_ATK = 27;
            pokemon.EV_SPE = 12;
            pokemon.Move1 = 85;
            pokemon.RefreshChecksum();
            save.SetBoxSlotAtIndex(pokemon, 0, 0);
            save.SetPartySlotAtIndex(pokemon, 0);
            save.SetBoxSlotAtIndex(pokemon, save.BoxCount - 1, save.BoxSlotCount - 1);
            var input = save.Write().ToArray();
            var original = input.ToArray();
            var report = SaveService.Inspect(input);
            using var document = JsonDocument.Parse(report);
            Require(document.RootElement.GetProperty("checksumsValid").GetBoolean(), $"{version}: blank fixture checksum");
            var entries = document.RootElement.GetProperty("pokemon");
            Require(entries.GetArrayLength() == 3, $"{version}: party and box entries");
            Require(entries[2].GetProperty("box").GetInt32() == save.BoxCount - 1 && entries[2].GetProperty("slot").GetInt32() == save.BoxSlotCount - 1, $"{version}: final box slot");
            Require(entries[0].GetProperty("box").GetInt32() == -1 && entries[1].GetProperty("box").GetInt32() == 0, $"{version}: storage addresses");
            Require(entries[0].GetProperty("speciesName").GetProperty("zh").GetString() == "皮卡丘", $"{version}: Chinese species");
            Require(entries[1].GetProperty("ivs")[1].GetInt32() == 27 && entries[1].GetProperty("evs")[5].GetInt32() == 12, $"{version}: stat order");
            Require(entries[1].GetProperty("moves")[0].GetProperty("en").GetString() == "Thunderbolt", $"{version}: move names");
            var edited = SaveService.Export(input, "{\"ot\":\"EDIT\",\"tid\":65535,\"sid\":0,\"money\":500}");
            Require(input.SequenceEqual(original), $"{version}: original mutated");
            var reread = SaveUtil.GetSaveFile(edited.ToArray())!;
            Require(reread.ChecksumsValid && reread.OT == "EDIT" && reread.TID16 == 65535 && reread.SID16 == 0 && reread.Money == 500, $"{version}: roundtrip");
            var before = SaveUtil.GetSaveFile(input.ToArray())!;
            Require(reread.BoxData.Select(p => Convert.ToBase64String(p.Data)).SequenceEqual(before.BoxData.Select(p => Convert.ToBase64String(p.Data))), $"{version}: boxes changed");
            Require(reread.PartyData.Select(p => Convert.ToBase64String(p.Data)).SequenceEqual(before.PartyData.Select(p => Convert.ToBase64String(p.Data))), $"{version}: party changed");
            Directory.CreateDirectory(".tmp/pkhex-fixtures");
            File.WriteAllBytes($".tmp/pkhex-fixtures/{version}.sav", input);
            File.WriteAllBytes($".tmp/pkhex-fixtures/{version}-edited.sav", edited);
            Console.WriteLine($"PASS {version}: read, edit, checksum, original preservation, boxes");
        }
        try { SaveService.Inspect(new byte[32]); throw new Exception("Bad data accepted"); }
        catch (ArgumentException) { Console.WriteLine("PASS unsupported data rejected"); }
        // The upstream SWSH blank template has untyped (SCTypeCode.None) blocks.
        // It is not a serialized game save and must not count as a roundtrip fixture.
        var template = BlankSaveFile.Get(GameVersion.SW, "TEST").Write().ToArray();
        try { SaveService.Inspect(template); throw new Exception("Unserialized SWSH template accepted"); }
        catch (ArgumentException) { Console.WriteLine("PASS unserialized SWSH template rejected; SWSH roundtrip still requires a representative fixture"); }
        var valid = File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        var corrupt = valid.ToArray();
        corrupt[0x100] ^= 1;
        using var damagedReport = JsonDocument.Parse(SaveService.Inspect(corrupt));
        Require(!damagedReport.RootElement.GetProperty("canEdit").GetBoolean(), "Damaged save remained editable");
        RejectExport(corrupt, "{\"ot\":\"TEST\",\"tid\":1,\"sid\":2,\"money\":100}");
        RejectExport(valid, "{\"ot\":\"TEST\",\"tid\":1,\"sid\":2,\"money\":4294967295}");
        RejectExport(valid, "{\"ot\":\"TOOLONGNAME\",\"tid\":1,\"sid\":2,\"money\":100}");
        Console.WriteLine("PASS invalid checksum, money and trainer-name edits rejected");
    }

    private static void RejectExport(byte[] data, string edit)
    {
        var original = data.ToArray();
        try { SaveService.Export(data, edit); throw new Exception("Invalid edit accepted"); }
        catch (ArgumentException) { Require(data.SequenceEqual(original), "Rejected edit mutated original"); }
    }

    private static SaveFile CreateFixture(GameVersion version)
    {
        if (version == GameVersion.E) return CreateEmerald();
        if (version is not (GameVersion.D or GameVersion.Pt or GameVersion.HG))
        {
            var blank = BlankSaveFile.Get(version, "TEST");
            if (blank is SAV_BEEF)
                System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(blank.Data[^0x1F0..], 0x42454546);
            return blank;
        }
        var data = new byte[SaveUtil.SIZE_G4RAW];
        SAV4 save = version switch
        {
            GameVersion.D => new SAV4DP(data),
            GameVersion.Pt => new SAV4Pt(data),
            _ => new SAV4HGSS(data),
        };
        var size = version switch
        {
            GameVersion.D => SAV4DP.GeneralSize,
            GameVersion.Pt => SAV4Pt.GeneralSize,
            _ => SAV4HGSS.GeneralSize,
        };
        for (var slot = 0; slot < 2; slot++)
            System.Buffers.Binary.BinaryPrimitives.WriteInt32LittleEndian(data.AsSpan(slot * 0x40000 + size - 12), size);
        save.Magic = SAV4.MAGIC_JAPAN_INTL;
        save.OT = "TEST";
        save.TID16 = 12345;
        save.SID16 = 54321;
        return save;
    }

    private static SaveFile CreateEmerald()
    {
        // BlankSaveFile supplies an in-memory template without serialized GBA sectors.
        // Construct the sector directory required by SAV3 and SaveUtil detection.
        var data = new byte[SaveUtil.SIZE_G3RAW];
        for (var slot = 0; slot < 2; slot++)
        for (ushort sector = 0; sector < 14; sector++)
        {
            var offset = (slot * 14 + sector) * 0x1000;
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(offset + 0xFF4), sector);
            System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(data.AsSpan(offset + 0xFF8), 0x08012025);
        }
        data[0xAC] = 2; // Emerald security key; distinguishes it from FRLG and empty RS.
        data[0x890] = 1; // Emerald's small block extends beyond the RS small block.
        data[6] = data[7] = 0xFF; // International trainer-name encoding.
        return new SAV3E(data) { OT = "TEST", TID16 = 12345, SID16 = 54321 };
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class SaveDetectionTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); throw new Exception("Invalid manual recognition accepted"); } catch (ArgumentException) { } }
    internal static void Run()
    {
        Check(SaveDetection.Handlers.Select(SaveDetection.HandlerName).SequenceEqual(new[] { "Default", "FooterRTC", "GCI", "DeSmuME", "ARDS", "NSO" }), "Complete source handler order");
        foreach (var type in new[] { SaveFileType.RBY, SaveFileType.GSC })
        foreach (var version in SaveDetection.Versions(type))
        foreach (var language in Enum.GetValues<LanguageID>()) {
            SaveFile blank = type == SaveFileType.RBY ? new SAV1(language, version) : new SAV2(language, version);
            blank.OT = language == LanguageID.Japanese ? "ア" : "A";
            byte[] input = blank.Write().ToArray(), original = input.ToArray();
            var selected = SaveDetection.Open(input, new(type, version, language, "Default", "manual.sav"));
            SaveFile oracle = type == SaveFileType.RBY ? new SAV1(input.ToArray(), language, version) : new SAV2(input.ToArray(), language, version);
            Check(selected.Save.GetType() == oracle.GetType() && selected.Save.Version == oracle.Version && selected.Save.Language == oracle.Language, "GB explicit version and language match source");
            Check(selected.Save.Write().Span.SequenceEqual(oracle.Write().Span), "GB complete explicit output oracle");
            Check(input.SequenceEqual(original), "GB regional original preserved");
        }
        Console.WriteLine("PASS Manual GB: every source subversion and language, exact constructor and complete output");
        void Typed(SaveFileType type, byte[] input, Func<byte[], SaveFile> constructor) {
            var original = input.ToArray();
            var result = SaveDetection.Open(input, new(type, SaveDetection.Versions(type).FirstOrDefault(), LanguageID.English, "Default", "manual.sav"));
            var oracle = constructor(input.ToArray());
            Check(result.Save.GetType() == oracle.GetType() && result.Save.Write().Span.SequenceEqual(oracle.Write().Span), "Selected constructor complete output: " + type);
            Check(input.SequenceEqual(original), "Selected constructor input preserved: " + type);
            Console.WriteLine("PASS Manual remaining type: " + type);
        }
        byte[] gba = new byte[SaveUtil.SIZE_G3RAW];
        for (int slot=0;slot<2;slot++) for (ushort sector=0;sector<14;sector++) {
            int at=(slot*14+sector)*0x1000;
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(gba.AsSpan(at+0xFF4),sector);
            System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(gba.AsSpan(at+0xFF8),0x08012025);
        }
        gba[6]=gba[7]=255;
        Typed(SaveFileType.RS, new SAV3RS(gba.ToArray()).Write().ToArray(), data => new SAV3RS(data));
        gba[0xAC]=1;
        Typed(SaveFileType.FRLG, new SAV3FRLG(gba.ToArray()).Write().ToArray(), data => new SAV3FRLG(data));
        Typed(SaveFileType.AODemo, new SAV6AODemo().Write().ToArray(), data => new SAV6AODemo(data));
        Typed(SaveFileType.SWSH, SwshBlockFixtureTests.Create(GameVersion.SW, 0), data => new SAV8SWSH(data));
        var legends = new SAV8LA(LegendsPokedexTests.Fixture(0));
        legends.LastSaved.Timestamp = new DateTime(2020, 1, 1);
        Typed(SaveFileType.LA, legends.Write().ToArray(), data => new SAV8LA(data));
        var scarlet = new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL, 0));
        scarlet.LastSaved.Timestamp = new DateTime(2020, 1, 1);
        Typed(SaveFileType.SV, scarlet.Write().ToArray(), data => new SAV9SV(data));
        var za = new SAV9ZA(ZaBlockFixtureTests.Create(0));
        za.LastSaved.Timestamp = new DateTime(2020, 1, 1);
        Typed(SaveFileType.ZA, za.Write().ToArray(), data => new SAV9ZA(data));
        Typed(SaveFileType.BattleRevolution, Br4EditingTests.Fixture(false, 0), data => new SAV4BR(data));
        Typed(SaveFileType.Stadium1J, new byte[SaveUtil.SIZE_G1STAD], data => new SAV1StadiumJ(data));
        Typed(SaveFileType.Stadium1, new byte[SaveUtil.SIZE_G1STAD], data => new SAV1Stadium(data));
        Typed(SaveFileType.Stadium2, new byte[SaveUtil.SIZE_G2STAD], data => new SAV2Stadium(data));
        Typed(SaveFileType.Bulk3, new byte[SaveUtil.SIZE_G4BANK], data => new Bank3(data));
        Typed(SaveFileType.Bulk4, new byte[SaveUtil.SIZE_G4BANK], data => new Bank4(data));
        foreach (int size in new[] { SaveUtil.SIZE_G7BANK_1, SaveUtil.SIZE_G7BANK_2 }) {
            byte[] bank = new byte[size];
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(bank.AsSpan(0x15C), (ushort)(size == SaveUtil.SIZE_G7BANK_1 ? BankRevision.Gen6 : BankRevision.Gen7));
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(bank.AsSpan(0x15E), 100);
            Typed(SaveFileType.Bulk7, bank, data => Bank7.GetBank7(data));
        }
        foreach (int size in new[] { SaveUtil.SIZE_G4RANCH, SaveUtil.SIZE_G4RANCH_PLAT }) {
            byte[] data = new byte[size];
            System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(data.AsSpan(0x24), 0x100);
            System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(data.AsSpan(0x2C), 0x200);
            System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(data.AsSpan(0x34), 0x300);
            System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(data.AsSpan(0x3C), 0x308);
            Typed(SaveFileType.Ranch, data, value => new SAV4Ranch(value));
        }
        foreach (var (version, type) in new[] { ("E", SaveFileType.Emerald), ("D", SaveFileType.DP), ("Pt", SaveFileType.Pt), ("HG", SaveFileType.HGSS), ("B", SaveFileType.BW), ("B2", SaveFileType.B2W2), ("X", SaveFileType.XY), ("OR", SaveFileType.AO), ("SN", SaveFileType.SM), ("US", SaveFileType.USUM), ("GP", SaveFileType.LGPE), ("BD", SaveFileType.BDSP) }) {
            byte[] input = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"), original = input.ToArray();
            var sub = SaveDetection.Versions(type).FirstOrDefault();
            var choice = new SaveDetectionChoice(type, sub, LanguageID.English, "Default", "selected.sav");
            var result = SaveDetection.Open(input, choice);
            var oracle = SaveUtil.GetSaveFile(input.ToArray())!;
            Check(result.Save.GetType() == oracle.GetType() && result.DataLength == input.Length && result.HeaderLength == 0 && result.FooterLength == 0, "Source constructors and raw boundaries");
            Check(result.Save.Write().Span.SequenceEqual(oracle.Write().Span), "Complete output matches independent automatic source oracle");
            Check(input.SequenceEqual(original), "Original file unchanged");
            result.Save.Data[0] ^= 1; Check(input.SequenceEqual(original), "Owned result remains independent");
            Reject(() => SaveDetection.Open(input, choice with { Handler = "unknown" }));
            Reject(() => SaveDetection.Open(input, choice with { Language = (LanguageID)255 }));
            Console.WriteLine($"PASS Manual recognition {version}: selected type, complete file oracle, metadata, input ownership and invalid parameters");
        }
        byte[] dp = File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav");
        foreach (string handlerName in new[] { "DeSmuME", "ARDS" }) {
            int header = handlerName == "ARDS" ? 0xA4 : 0, footer = handlerName == "DeSmuME" ? 0x7A : 0;
            byte[] wrapped = new byte[header + dp.Length + footer];
            for (int i = 0; i < wrapped.Length; i++) wrapped[i] = (byte)(i * 13);
            dp.CopyTo(wrapped, header);
            if (footer != 0) "|-DESMUME SAVE-|"u8.CopyTo(wrapped.AsSpan(wrapped.Length - 16));
            var original = wrapped.ToArray();
            var selected = SaveDetection.Open(wrapped, new(SaveFileType.DP, GameVersion.D, LanguageID.English, handlerName, "selected.bin"));
            Check(selected.Save is SAV4DP && selected.HeaderLength == header && selected.FooterLength == footer && selected.DataLength == dp.Length, "Manual handler uses split body, not the container");
            var expected = SaveUtil.GetSaveFile(dp.ToArray())!; selected.Save.Money = expected.Money = 123;
            byte[] expectedWhole = original.ToArray(); expected.Write().Span.CopyTo(expectedWhole.AsSpan(header, dp.Length));
            Check(selected.Save.Write().Span.SequenceEqual(expectedWhole), "Selected container header/footer survive complete export");
            Check(wrapped.SequenceEqual(original), "Wrapped original immutable");
            Console.WriteLine($"PASS Manual {handlerName}: corrected split boundary, preserved full container, metadata and original");
        }
        byte[] emerald = File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        foreach (int footer in new[] { 7, 12, 14, 48 }) {
            byte[] data = new byte[emerald.Length + footer]; emerald.CopyTo(data, 0); data.AsSpan(emerald.Length).Fill(0xA5);
            var result = SaveDetection.Open(data, new(SaveFileType.Emerald, GameVersion.E, LanguageID.English, "FooterRTC", "selected.sav"));
            Check(result.FooterLength == footer && result.Save.Write().Span[^footer..].ToArray().All(value => value == 0xA5), "Every source RTC footer boundary retained");
        }
        Reject(() => SaveDetection.Open(emerald, new(SaveFileType.None, GameVersion.Any, LanguageID.English, "Default", "x")));
        Reject(() => SaveDetection.Open(emerald, new(SaveFileType.Emerald, GameVersion.D, LanguageID.English, "Default", "x")));
        Reject(() => SaveDetection.Open(emerald, new(SaveFileType.Emerald, GameVersion.E, LanguageID.English, "DeSmuME", "x")));
        CheckGCI();
        foreach (var language in new[] { LanguageID.English, LanguageID.Japanese }) {
            var gb = new SAV1(language, GameVersion.RB) { OT = language == LanguageID.Japanese ? "ア" : "A" };
            var pokemon = gb.BlankPKM; pokemon.Species = 25; pokemon.CurrentLevel = 5; gb.PartyData = [pokemon]; gb.SetBoxSlotAtIndex(pokemon, 0, 0);
            byte[] raw = gb.Write().ToArray();
            foreach (bool rtc in new[] { false, true }) {
                const int buildLength = 11; int headerLength = 0x35 + buildLength + (rtc ? 0x20 : 0) + 0x28;
                byte[] wrapped = new byte[headerLength + raw.Length]; "SRAM"u8.CopyTo(wrapped);
                wrapped[0x30] = buildLength; wrapped.AsSpan(0x34, buildLength).Fill((byte)'B'); wrapped[0x34 + buildLength] = rtc ? (byte)1 : (byte)0;
                raw.CopyTo(wrapped, headerLength); new SaveHandlerNSO().Finalize(wrapped);
                byte[] original = wrapped.ToArray();
                var choice = new SaveDetectionChoice(SaveFileType.RBY, GameVersion.RD, language, "NSO", "selected.sram");
                var result = SaveDetection.Open(wrapped, choice); var expected = new SAV1(raw.ToArray(), language, GameVersion.RD);
                result.Save.Money = expected.Money = 123;
                var expectedWhole = original.ToArray(); expected.Write().Span.CopyTo(expectedWhole.AsSpan(headerLength)); new SaveHandlerNSO().Finalize(expectedWhole);
                Check(result.HeaderLength == headerLength && result.Save.Write().Span.SequenceEqual(expectedWhole), "NSO complete header, body and source SHA1 finalization");
                Check(wrapped.SequenceEqual(original), "NSO original immutable");
                var malformed = original.ToArray(); malformed[0x30] = 255;
                try { SaveDetection.Open(malformed, choice); throw new Exception("Invalid NSO accepted"); } catch (ArgumentException) { }
                Console.WriteLine($"PASS Manual NSO {language}/RTC={rtc}: header preservation, SHA1 resignment, exact body, original and invalid bounds");
            }
        }
    }
    private static void CheckGCI()
    {
        byte[] coloRaw = new byte[SaveUtil.SIZE_G3COLO]; var colo = new SAV3Colosseum(coloRaw, false);
        byte[] xdRaw = new byte[XDCrypto.SAVE_SIZE]; var xdSlot = XDCrypto.GetSlot(xdRaw, 0).Span;
        int[] offsets = [0, 0xCC30, 0x10D60, 0, 0x1C9C0, 0xF5D0, 0, 0x1CAA0];
        for (int i = 0; i < offsets.Length; i++) {
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(xdSlot[(0x40 + i * 4)..], (ushort)offsets[i]);
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(xdSlot[(0x42 + i * 4)..], (ushort)(offsets[i] >> 16));
        }
        System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(xdSlot[0x2A..], 4); XDCrypto.EncryptSlot(xdSlot);
        byte[] boxRaw = new byte[SaveUtil.SIZE_G3BOX];
        for (int i = 0; i < 46; i++) System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(boxRaw.AsSpan((i + 1) * 0x2000 + 4), (uint)(i % 23));
        foreach (var (seed, type, prefix) in new (SaveFile, SaveFileType, string)[] { (colo, SaveFileType.Colosseum, "GC6"), (new SAV3XD(xdRaw), SaveFileType.XD, "GXX"), (new SAV3RSBox(boxRaw), SaveFileType.RSBox, "GPX") }) {
            var pokemon = seed.BlankPKM; pokemon.Species = 25; pokemon.CurrentLevel = 5; pokemon.Valid = true;
            seed.SetBoxSlotAtIndex(pokemon, 0, 0, EntityImportSettings.None);
            byte[] body = seed.Write().ToArray();
            foreach (char region in "JEP") {
                byte[] wrapped = new byte[body.Length + 0x40]; wrapped.AsSpan(0, 0x40).Fill(0xA5);
                System.Text.Encoding.ASCII.GetBytes(prefix + region).CopyTo(wrapped, 0); body.CopyTo(wrapped, 0x40);
                byte[] original = wrapped.ToArray();
                var choice = new SaveDetectionChoice(type, SaveDetection.Versions(type).FirstOrDefault(), LanguageID.English, "GCI", "selected.gci");
                var result = SaveDetection.Open(wrapped, choice);
                Check(result.Save.GetType() == seed.GetType() && result.HeaderLength == 0x40 && result.FooterLength == 0, "GCI selected constructor and owned header");
                var direct = SaveDetection.Open(body, choice with { Handler = "Default" });
                var output = result.Save.Write().ToArray();
                Check(output.AsSpan(0, 0x40).SequenceEqual(original.AsSpan(0, 0x40)) && output.AsSpan(0x40).SequenceEqual(direct.Save.Write().Span), "GCI complete output matches independent raw constructor");
                Check(wrapped.SequenceEqual(original), "GCI original remains unchanged");
                var wrong = wrapped.ToArray(); wrong[0] = (byte)'X'; Reject(() => SaveDetection.Open(wrong, choice));
                Console.WriteLine($"PASS Manual GCI {prefix + region}: complete game container, exact header/body, original and invalid code");
            }
        }
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class SimpleTrainerEditingTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); throw new Exception("Invalid simple trainer edit accepted"); } catch (ArgumentException) { } }
    private static SaveFile OpenGC(SaveFile kind, byte[] bytes) => kind is SAV3Colosseum ? new SAV3Colosseum(bytes.ToArray()) : new SAV3XD(bytes.ToArray());
    internal static void Run()
    {
        foreach (var language in new[] { LanguageID.English, LanguageID.Japanese })
        foreach (var version in new[] { GameVersion.RB, GameVersion.YW, GameVersion.GS, GameVersion.C })
        {
            SaveFile save = version is GameVersion.RB or GameVersion.YW ? new SAV1(language, version) : new SAV2(language, version);
            save.OT = language == LanguageID.Japanese ? "ア" : "A";
            var pokemon = save.BlankPKM; pokemon.Species = 25; pokemon.CurrentLevel = 5;
            save.PartyData = [pokemon]; save.SetBoxSlotAtIndex(pokemon, 0, 0);
            if (save is SAV1 s) {
                s.Data[s.Japanese ? 0x29B9 : 0x29C3] = version == GameVersion.YW ? (byte)0x54 : (byte)0x99;
                s.Data[s.Japanese ? 0x2712 : 0x271C] = version == GameVersion.YW ? (byte)1 : (byte)0;
            }
            var input = save.Write().ToArray(); var original = input.ToArray();
            var source = SaveUtil.GetSaveFile(input.ToArray())!;
            var sourceData = source.Data.ToArray();
            var sourceBox = source.GetBoxSlotAtIndex(0, 0).Data.ToArray();
            var sourceParty = source.GetPartySlotAtIndex(0).Data.ToArray();
            var read = SimpleTrainerEditing.Read(source);
            Check(read.Badges?.Count == (source is SAV1 ? 8 : 16) && read.Coins is not null, "GB exact badge width and coins");
            Check((read.Friendship is not null) == (version == GameVersion.YW), "Yellow-only exposed fields");
            foreach (int speed in Enumerable.Range(0, 8))
            foreach (int sound in Enumerable.Range(0, source is SAV1 ? 4 : 2))
            foreach (int style in new[] { 0, 1 })
            foreach (int effect in new[] { 0, 1 }) {
                var edit = new SimpleTrainerExtraEdit(Coins: 9999, Badges: (1 << read.Badges!.Count) - 1,
                    Options: new(speed, style, sound, effect), Hours: 12, Minutes: 99, Seconds: 99);
                var changed = SimpleTrainerEditing.Patch(source, edit);
                var expected = SaveUtil.GetSaveFile(input.ToArray())!; expected.PlayedHours = 12; expected.PlayedMinutes = expected.PlayedSeconds = 39;
                if (expected is SAV1 g1) {
                    g1.Coin = 9999; g1.Badges = 255; g1.TextSpeed = speed; g1.Sound = sound;
                    g1.BattleStyleSwitch = style == 0; g1.BattleEffects = effect == 1;
                } else { var g2 = (SAV2)expected; g2.Coin = 9999; g2.Badges = 65535; g2.TextSpeed = speed;
                    g2.Sound = sound == 0 ? 0 : 2; g2.BattleStyleSwitch = style == 0; g2.BattleEffects = effect == 1; }
                var output = changed.Write().ToArray(); Check(output.SequenceEqual(expected.Write().ToArray()), "Independent full-file GB patch oracle");
                Check(SaveChecksums.Valid(SaveUtil.GetSaveFile(output.ToArray())!), "GB checksum");
                Check(source.Data.SequenceEqual(sourceData) && source.GetBoxSlotAtIndex(0, 0).Data.SequenceEqual(sourceBox)
                    && source.GetPartySlotAtIndex(0).Data.SequenceEqual(sourceParty) && input.SequenceEqual(original), "GB original remains unchanged");
            }
            Reject(() => SimpleTrainerEditing.Patch(source, new(Coins: 10000)));
            Reject(() => SimpleTrainerEditing.Patch(source, new(Badges: 1 << read.Badges!.Count)));
            Reject(() => SimpleTrainerEditing.Patch(source, new(Options: new(Sound: source is SAV1 ? 4 : 2))));
            if (version == GameVersion.YW) {
                var patched = (SAV1)SimpleTrainerEditing.Patch(source, new(Friendship: 255, BeachScore: 9999));
                Check(patched.PikaFriendship == 255 && patched.PikaBeachScore == 9999, "Yellow boundaries");
            } else Reject(() => SimpleTrainerEditing.Patch(source, new(Friendship: 1)));
            var noOp = SimpleTrainerEditing.Patch(source, new());
            Check(noOp.Write().Span.SequenceEqual(SaveUtil.GetSaveFile(input.ToArray())!.Write().Span), "GB no-op retains Core serialization behavior");
            // The source resave writes time fields even when their controls were unchanged.
            if (source is SAV1 maxed) {
                maxed.PlayedHours = 255; maxed.PlayedMinutes = 123; maxed.PlayedSeconds = 234; maxed.PlayedFrames = 7;
                var resaved = (SAV1)SimpleTrainerEditing.Resave(maxed);
                Check(resaved.PlayedHours == 255 && resaved.PlayedMaximum && resaved.PlayedMinutes == 12 && resaved.PlayedSeconds == 23 && resaved.PlayedFrames == 0,
                    "GB source resave follows masks and hour setter side effects");
                Check(maxed.PlayedMinutes == 123 && maxed.PlayedSeconds == 234 && maxed.PlayedFrames == 7, "Source resave preserves original unnormalized time");
            }
            Console.WriteLine($"PASS SimpleTrainer {version}/{language}: all options, coins, badges, time, Yellow fields, independent full-file oracle and original");
            CheckSession(input, new(Coins: 9999, Badges: 1));
            using (var report = System.Text.Json.JsonDocument.Parse(SaveService.Inspect(input)))
                Check(report.RootElement.GetProperty("trainerOnly").GetBoolean() && !report.RootElement.GetProperty("canEdit").GetBoolean(), "GB trainer capability does not imply ordinary Pokemon editing");
            foreach (string name in new[] { "", language == LanguageID.Japanese ? "ア" : "B" }) {
                var basis = SaveUtil.GetSaveFile(input.ToArray())!;
                var identity = new TrainerEdit(name, 54321, 0, (uint)basis.MaxMoney);
                var exported = SaveService.Export(input, System.Text.Json.JsonSerializer.Serialize(identity, SaveJsonContext.Default.TrainerEdit));
                var after = SaveUtil.GetSaveFile(exported.ToArray())!;
                Check(after.OT == name && after.TID16 == 54321 && after.Money == basis.MaxMoney && SaveChecksums.Valid(after), "GB public identity, empty name, max cash and export");
                Reject(() => SaveService.Export(input, System.Text.Json.JsonSerializer.Serialize(identity with { Sid = 1 }, SaveJsonContext.Default.TrainerEdit)));
                Check(input.SequenceEqual(original), "GB identity edits preserve original file bytes");
            }
            CheckHourOnly(input, source is SAV1 ? 255 : 13);
        }
        foreach (string version in new[] { "E", "D", "Pt", "HG", "B", "B2" }) {
            var input = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var source = SaveUtil.GetSaveFile(input.ToArray())!; var old = source.Data.ToArray();
            var result = SimpleTrainerEditing.Resave(source);
            Check(source.Data.SequenceEqual(old), "Resave never mutates source");
            Check(result.OT == source.OT && result.TID16 == source.TID16 && result.SID16 == source.SID16, "Resave identity");
            Check(SaveChecksums.Valid(SaveUtil.GetSaveFile(result.Write().ToArray())!), "Resave checksum");
            var clearedName = SaveService.Export(input, System.Text.Json.JsonSerializer.Serialize(new TrainerEdit("", source.TID16, source.SID16, source.Money), SaveJsonContext.Default.TrainerEdit));
            Check(SaveUtil.GetSaveFile(clearedName.ToArray())!.OT == "" && input.SequenceEqual(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav")), "Simple trainer window permits an empty name and preserves original");
            if (source is SAV4 or SAV5) {
                source.SecondsToStart = checked((uint)(new DateTime(2099, 12, 31, 23, 59, 59) - new DateTime(2000, 1, 1)).TotalSeconds);
                Check(SimpleTrainerEditing.Resave(source).SecondsToStart == source.SecondsToStart, "DS last-day unsigned date fix");
                source.SecondsToStart = uint.MaxValue; Reject(() => SimpleTrainerEditing.Resave(source));
            }
            Console.WriteLine($"PASS SimpleTrainer {version}: owned resave, identity, checksum and DS unsigned date bounds");
        }
        byte[] coloRaw = new byte[SaveUtil.SIZE_G3COLO];
        for (int i = 0; i < 3; i++) System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(coloRaw.AsSpan(0x6000 + i * 0x1E000), 0x101);
        var colo = new SAV3Colosseum(coloRaw, false);
        byte[] xdRaw = new byte[XDCrypto.SAVE_SIZE]; var xdSlot = XDCrypto.GetSlot(xdRaw, 0).Span;
        for (int i = 0; i < 2; i++) System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(xdRaw.AsSpan(0x6000 + i * 0x28000), 0x101);
        int[] offsets = [0, 0xCC30, 0x10D60, 0, 0x1C9C0, 0xF5D0, 0, 0x1CAA0];
        for (int i = 0; i < offsets.Length; i++) {
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(xdSlot[(0x40 + i * 4)..], (ushort)offsets[i]);
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(xdSlot[(0x42 + i * 4)..], (ushort)(offsets[i] >> 16));
        }
        System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(xdSlot[0x2A..], 4); XDCrypto.EncryptSlot(xdSlot);
        var jpRaw = xdRaw.ToArray(); var jpSlot = XDCrypto.GetSlot(jpRaw, 0).Span; XDCrypto.DecryptSlot(jpSlot);
        System.Buffers.Binary.BinaryPrimitives.WriteUInt16BigEndian(jpSlot[0x2E..], 0x1E00); XDCrypto.EncryptSlot(jpSlot);
        var jpXd = new SAV3XD(jpRaw) { CurrentRegion = GCRegion.NTSC_J, OriginalRegion = GCRegion.NTSC_J, GCLanguage = LanguageGC.Japanese };
        foreach (var seed in new SaveFile[] { colo, new SAV3XD(xdRaw), jpXd }) {
            seed.OT = "A"; var p = seed.BlankPKM; p.Species = 25; p.CurrentLevel = 5; seed.PartyData = [p]; seed.SetBoxSlotAtIndex(p, 0, 0);
            var input = seed.Write().ToArray(); var original = input.ToArray();
            Check(SaveUtil.GetSaveFile(input.ToArray())?.GetType() == seed.GetType(), "GC intro signatures support ordinary automatic recognition");
            foreach (int hour in new[] { 0, 12, 65535 }) {
                var source = OpenGC(seed, input); var sourceData = source.Data.ToArray();
                var patched = SimpleTrainerEditing.Patch(source, new(Hours: hour, Minutes: 99, Seconds: 99));
                var oracle = OpenGC(seed, input);
                if (oracle.PlayedHours != hour) oracle.PlayedHours = hour;
                if (oracle.PlayedMinutes != 39) oracle.PlayedMinutes = 39;
                if (oracle.PlayedSeconds != 39) oracle.PlayedSeconds = 39;
                var output = patched.Write().ToArray();
                Check(output.SequenceEqual(oracle.Write().ToArray()), "GC independent full-file setter order/precision oracle");
                var restored = OpenGC(seed, output);
                Check(SaveChecksums.Valid(restored) && restored.GetType() == source.GetType(), "GC complete container round trip");
                Check(source.Data.SequenceEqual(sourceData) && input.SequenceEqual(original), "GC source immutable");
                Reject(() => SimpleTrainerEditing.Patch(source, new(Coins: 1)));
            }
            var resaveSource = OpenGC(seed, input); var resaveData = resaveSource.Data.ToArray();
            var resave = SimpleTrainerEditing.Resave(resaveSource);
            Check(SaveChecksums.Valid(OpenGC(seed, resave.Write().ToArray())) && resaveSource.Data.SequenceEqual(resaveData), "GC resave checksum and original");
            CheckSession(input, new(Hours: 12, Minutes: 99, Seconds: 99));
            CheckHourOnly(input, 13);
            Console.WriteLine($"PASS SimpleTrainer {seed.Version}: complete encrypted containers, time setter order/precision, source resave and original");
        }
        var korean = new SAV2(LanguageID.Korean, GameVersion.GS); korean.OT = "A";
        var koreanPokemon = korean.BlankPKM; koreanPokemon.Species = 25; koreanPokemon.CurrentLevel = 5;
        korean.PartyData = [koreanPokemon]; korean.SetBoxSlotAtIndex(koreanPokemon, 0, 0);
        var koreanBytes = korean.Write().ToArray();
        Check(SaveUtil.GetSaveFile(koreanBytes.ToArray()) is SAV2 { Korean: true }, "Korean GS automatic recognition");
        CheckSession(koreanBytes, new(Coins: 9999, Badges: 65535, Options: new(7, 1, 1, 1)));
        CheckHourOnly(koreanBytes, 13);
        Console.WriteLine("PASS SimpleTrainer Korean GS: recognition, checksum layout, frozen export and hour-only preservation");
        Reject(() => SimpleTrainerEditing.Read(new SAV6XY()));
        CheckSession(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"), new(Badges: 255));
        foreach (string version in new[] { "B", "B2" }) {
            var source = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var g5 = (SAV5)source; g5.AdventureInfo.SecondsToStart = 0xCAFE123400000001; g5.AdventureInfo.SecondsToFame = 0xABCD567800000002;
            var data = source.Write().ToArray(); var loaded = SaveUtil.GetSaveFile(data.ToArray())!;
            var ticket = SimpleTrainerSession.Prepare(loaded, data, new("resave", Br4Editing.Hash(data)));
            Check(ticket.Before.Fields.Single(v => v.Key == "startHigh").Value == "0xCAFE1234" && ticket.Result.Fields.Single(v => v.Key == "startHigh").Value == "0x00000000", "Resave exposes lost upper date data in complete preview");
            var output = SimpleTrainerSession.Commit(data, new(ticket.Token, ticket.SourceHash, ticket.TargetHash));
            Check(((SAV5)SaveUtil.GetSaveFile(output.ToArray())!).AdventureInfo.SecondsToStart == 1, "Frozen resave writes source uint date property");
        }
    }
    private static void CheckSession(byte[] input, SimpleTrainerExtraEdit edit)
    {
        var source = SaveUtil.GetSaveFile(input.ToArray())!; var original = input.ToArray();
        var request = new SimpleTrainerRequest("patch", Br4Editing.Hash(input), edit);
        var ticket = SimpleTrainerSession.Prepare(source, input, request);
        var confirmation = new SimpleTrainerConfirmation(ticket.Token, ticket.SourceHash, ticket.TargetHash);
        // Display models never own the frozen export.
        if (ticket.ChangedOffsets.Length > 0) ticket.ChangedOffsets[0] = -1;
        var output = SimpleTrainerSession.Commit(input, confirmation);
        Check(Br4Editing.Hash(output) == ticket.TargetHash && input.SequenceEqual(original), "Exact frozen output and original");
        Reject(() => SimpleTrainerSession.Commit(input, confirmation));
        var replaced = SimpleTrainerSession.Prepare(source, input, request);
        var latest = SimpleTrainerSession.Prepare(source, input, request);
        SimpleTrainerSession.Discard(replaced.Token);
        output = SimpleTrainerSession.Commit(input, new(latest.Token, latest.SourceHash, latest.TargetHash));
        Check(Br4Editing.Hash(output) == latest.TargetHash, "Old cancellation cannot discard the replacement");
        var stale = SimpleTrainerSession.Prepare(source, input, request);
        var changed = input.ToArray(); changed[0] ^= 1;
        Reject(() => SimpleTrainerSession.Commit(changed, new(stale.Token, stale.SourceHash, stale.TargetHash)));
        Reject(() => SimpleTrainerSession.Commit(input, new(stale.Token, stale.SourceHash, stale.TargetHash)));
        var failed = SimpleTrainerSession.Prepare(source, input, request);
        Reject(() => SimpleTrainerSession.Prepare(source, input, request with { Action = "invalid" }));
        Reject(() => SimpleTrainerSession.Commit(input, new(failed.Token, failed.SourceHash, failed.TargetHash)));
        var catalog = System.Text.Json.JsonSerializer.Deserialize(SaveService.ReadSimpleTrainer(input), SaveJsonContext.Default.SimpleTrainerCatalog)!;
        Check(catalog.SourceHash == Br4Editing.Hash(input) && catalog.CanEdit, "Public catalog and supported capability");
        var json = System.Text.Json.JsonSerializer.Serialize(request, SaveJsonContext.Default.SimpleTrainerRequest);
        var publicTicket = System.Text.Json.JsonSerializer.Deserialize(SaveService.PreviewSimpleTrainer(input, json), SaveJsonContext.Default.SimpleTrainerPreview)!;
        var publicConfirmation = new SimpleTrainerConfirmation(publicTicket.Token, publicTicket.SourceHash, publicTicket.TargetHash);
        var publicOutput = SaveService.CommitSimpleTrainer(input, System.Text.Json.JsonSerializer.Serialize(publicConfirmation, SaveJsonContext.Default.SimpleTrainerConfirmation));
        Check(Br4Editing.Hash(publicOutput) == publicTicket.TargetHash && input.SequenceEqual(original), "Public JSON frozen complete export and original");
        var missing = System.Text.Json.JsonSerializer.Deserialize(SaveService.PreviewSimpleTrainer(input, json), SaveJsonContext.Default.SimpleTrainerPreview)!;
        try { SaveService.PreviewSimpleTrainer(input, "{}"); throw new Exception("Missing JSON accepted"); }
        catch (System.Text.Json.JsonException) { }
        Reject(() => SimpleTrainerSession.Commit(input, new(missing.Token, missing.SourceHash, missing.TargetHash)));
    }
    private static void CheckHourOnly(byte[] input, int hours)
    {
        var seed = SaveUtil.GetSaveFile(input.ToArray())!;
        seed.PlayedHours = 12; seed.PlayedMinutes = 34; seed.PlayedSeconds = 56;
        var data = seed.Write().ToArray();
        var source = SaveUtil.GetSaveFile(data.ToArray())!; var original = source.Data.ToArray();
        var output = SimpleTrainerEditing.Patch(source, new(Hours: hours)).Write().ToArray();
        var oracle = SaveUtil.GetSaveFile(data.ToArray())!;
        oracle.PlayedHours = hours; oracle.PlayedMinutes = 34; oracle.PlayedSeconds = 56;
        Check(output.SequenceEqual(oracle.Write().ToArray()), "Hour-only patch preserves omitted minutes and seconds in source order");
        Check(source.Data.SequenceEqual(original), "Hour-only source unchanged");
    }
}

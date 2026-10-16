// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonAlphaMoveTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid alpha mastery request accepted"); }
    private static PA8 Entity(bool alpha)
    {
        var p = new PA8 { Species = 25, Version = GameVersion.PLA, Language = 2, Nickname = "TEST", OriginalTrainerName = "TEST", PID = 12345, EncryptionConstant = 54321, IsAlpha = alpha, AlphaMove = 85, Move1 = 85, Move2 = 98, Move1_PP = 3, Move1_PPUps = 2 };
        p.CurrentLevel = 25; p.PurchasedRecord.Fill(0xA5); p.MasteredRecord.Fill(0xC3);
        p.ResetPartyStats(); p.Stat_HPCurrent = Math.Max(1, p.Stat_HPMax / 2); p.Status_Condition = 8; p.RefreshChecksum(); return p;
    }
    internal static void Run()
    {
        var sourceMoves = new FilteredGameDataSource(new SAV8LA(), new GameDataSource(GameInfo.GetStrings("en"))).Moves.Select(m => m.Value).ToHashSet();
        int firstMove = sourceMoves.Where(id => id != 0).Min();
        var catalogEntity = Entity(true);
        int unavailable = Enumerable.Range(0, catalogEntity.MaxMoveID + 1).First(id => !sourceMoves.Contains(id));
        var choices = PokemonReader.MoveChoices(catalogEntity);
        for (int id = 0; id <= catalogEntity.MaxMoveID; id++)
        {
            Check(PokemonAlphaMove.IsSelectable(catalogEntity,id) == sourceMoves.Contains(id) && choices[id].AlphaSelectable == sourceMoves.Contains(id), "Every move against the upstream filtered source catalog");
            var copy = catalogEntity.Clone();
            if (sourceMoves.Contains(id)) { PokemonAlphaMove.Apply(copy,id); Check(PokemonAlphaMove.Read(copy) == id,"Every selectable ID accepted"); }
            else Reject(() => PokemonAlphaMove.Apply(copy,id));
        }
        foreach (bool alpha in new[] { false, true })
        foreach (bool party in new[] { false, true })
        foreach (bool encrypted in new[] { false, true })
        {
            var p = Entity(alpha); byte[] input = StandalonePokemon.Serialize(p, party, encrypted), original = input.ToArray();
            var request = new StandalonePokemonRequest("entity.pa8", InputEncrypted: encrypted, UseFileFormat: true);
            var opened = (PA8)StandalonePokemon.Open(input, request.FileName, encrypted, true).Entity;
            Check(StandalonePokemon.Inspect(input, request.FileName, encrypted, true).Pokemon.AlphaMove == 85, "Standalone reader exposes original field");
            foreach (int move in new[] { 0, firstMove, 85, (int)p.MaxMoveID })
            {
                var raw = new PokemonRawEdit(0, 0, "alphaMove", AlphaMove: move);
                var json = JsonSerializer.Serialize(request with { Raw = raw }, StandalonePokemonJson.Default.StandalonePokemonRequest);
                byte[] output = PokeRNGKit.SaveEditor.Program.EditStandalonePokemonRaw(input, json);
                var expected = (PA8)opened.Clone(); expected.AlphaMove = (ushort)move; expected.RefreshChecksum();
                Check(output.AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected, party, false)), "Public standalone complete serialized oracle / health, moves, PP, flags and padding");
                var actual = StandalonePokemon.Inspect(output, request.FileName, useFileFormat: true);
                Check(actual.Pokemon.AlphaMove == move && actual.Pokemon.Valid, "Standalone edited readback and checksum");
            }
            foreach (var raw in new[] { new PokemonRawEdit(0, 0, "alphaMove"), new(0, 0, "alphaMove", AlphaMove: -1), new(0, 0, "alphaMove", AlphaMove: p.MaxMoveID + 1), new(0,0,"alphaMove",AlphaMove:unavailable), new(0, 0, "values", Pid: 1, AlphaMove: 1) })
                Reject(() => PokeRNGKit.SaveEditor.Program.EditStandalonePokemonRaw(input, JsonSerializer.Serialize(request with { Raw = raw }, StandalonePokemonJson.Default.StandalonePokemonRequest)));
            Check(input.AsSpan().SequenceEqual(original), "Independent source remains immutable");
        }
        foreach (int revision in new[] { 0, 1 })
        foreach (int box in new[] { -1, 0 })
        {
            var seed = new SAV8LA(LegendsPokedexTests.Fixture(revision)); var p = Entity(true);
            seed.SetPartySlotAtIndex(p, 0, EntityImportSettings.None); seed.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            byte[] input = seed.Write().ToArray(), original = input.ToArray(); var source = new SAV8LA(input.ToArray());
            Check(PokemonReader.Read(source).First(x => x.Box == box && x.Slot == 0).AlphaMove == 85, "Save reader at party and box positions");
            foreach (int move in new[] { 0, firstMove, (int)p.MaxMoveID })
            {
                var actual = new SAV8LA(input.ToArray()); PokemonRawEditing.Apply(actual, new(box, 0, "alphaMove", AlphaMove: move));
                var expected = source.Clone(); var entity = (PA8)PokemonEditing.Read(expected, box, 0); entity.AlphaMove = (ushort)move; entity.RefreshChecksum();
                if (box == -1) expected.SetPartySlotAtIndex(entity, 0, EntityImportSettings.None); else expected.SetBoxSlotAtIndex(entity, 0, 0, EntityImportSettings.None);
                Check(actual.Write().Span.SequenceEqual(expected.Write().Span), "Both LA revisions / party and box complete save oracle");
                Check(PokemonReader.Read(actual).First(x => x.Box == box && x.Slot == 0).AlphaMove == move, "Save readback");
            }
            Check(source.Write().Span.SequenceEqual(original) && input.AsSpan().SequenceEqual(original), "Save source remains immutable");
        }
        foreach (PKM entity in new PKM[] { new PK3(), new PK8(), new PB8(), new PK9(), new PA9() })
        {
            Check(PokemonAlphaMove.Read(entity) is null, "Unavailable outside PA8");
            byte[] before = entity.Data.ToArray(); Reject(() => PokemonAlphaMove.Apply(entity, 0));
            Check(entity.Data.SequenceEqual(before), "Unsupported formats not mutated");
        }
        var invalid = Entity(true); invalid.AlphaMove = ushort.MaxValue; invalid.RefreshChecksum();
        Check(PokemonReader.Read(invalid, 0, 0).AlphaMove == ushort.MaxValue, "Invalid existing source field remains readable");
        invalid.AlphaMove=(ushort)unavailable;invalid.RefreshChecksum();
        Check(PokemonReader.Read(invalid,0,0).AlphaMove==unavailable&&!choices[unavailable].AlphaSelectable!.Value,"Filtered-out original remains readable");
        Console.WriteLine($"PASS alpha mastery: PA8 range 0..{invalid.MaxMoveID}, {sourceMoves.Count} source-filtered choices/every ID, four file layouts/alpha flags, public readback/full output, both LA revisions/party/box, immutable inputs and rejected wrong actions/formats");
    }
}

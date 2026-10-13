// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class RealSaveSmokeTests
{
    internal static void Run()
    {
        string path = Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH") ?? throw new ArgumentException("Provide the owner-authorized save path.");
        byte[] input = File.ReadAllBytes(path), original = input.ToArray();
        var save = SaveUtil.GetSaveFile(input.ToArray()) ?? throw new Exception("Real save recognition failed.");
        var personal = JsonSerializer.Deserialize(SaveService.ReadPersonalChart(input), SaveJsonContext.Default.PersonalChartCatalog)!;
        Check(personal.Rows.Length == PersonalChart.Read(save).Rows.Length && personal.Rows.Length > 0, "Real save personal chart complete row count");
        Check(input.SequenceEqual(original), "Real save personal chart preserves original buffer");
        using var report = JsonDocument.Parse(SaveService.Inspect(input));
        Check(report.RootElement.GetProperty("checksumsValid").GetBoolean(), "Real save checksums");
        Check(report.RootElement.GetProperty("canEdit").GetBoolean(), "Real save edit capability");
        int occupied = 0; (int Box, int Slot)? selected = null;
        for (int box = 0; box < save.BoxCount; box++) for (int slot = 0; slot < save.BoxSlotCount; slot++) {
            var p = save.GetBoxSlotAtIndex(box, slot); if (p.Species == 0) continue;
            occupied++; if (selected is null && p.Valid && p.ChecksumValid && !save.IsBoxSlotLocked(box, slot)) selected = (box, slot);
        }
        Check(selected is not null, "Real save contains an editable box Pokemon");
        var position = selected!.Value; var entity = PokemonEditing.Read(save, position.Box, position.Slot);
        var searchQuery = new PokemonSearchQuery(Species: entity.Species);
        var searchResult = JsonSerializer.Deserialize(SaveService.SearchPokemon(input, JsonSerializer.Serialize(searchQuery, SaveJsonContext.Default.PokemonSearchQuery)), SaveJsonContext.Default.PokemonSearchResults)!;
        int expectedMatches = 0;
        for (int box = 0; box < save.BoxCount; box++) for (int slot = 0; slot < save.BoxSlotCount; slot++) if (save.GetBoxSlotAtIndex(box, slot).Species == entity.Species) expectedMatches++;
        Check(searchResult.Matches.Length == expectedMatches && searchResult.Matches.Contains(new(position.Box, position.Slot)), "Real save physical Pokemon search");
        var searchCatalog = JsonSerializer.Deserialize(SaveService.ReadPokemonSearchCatalog(input, JsonSerializer.Serialize(new PokemonSearchTarget(position.Box, position.Slot), SaveJsonContext.Default.PokemonSearchTarget)), SaveJsonContext.Default.PokemonSearchCatalog)!;
        Check(searchCatalog.Formats.Length > 0 && input.SequenceEqual(original), "Real save selected entity catalog and original bytes");
        var edit = new PokemonEdit(position.Box, position.Slot, entity.Nickname, entity.CurrentLevel, (byte)(entity.CurrentFriendship == 255 ? 254 : entity.CurrentFriendship + 1), entity.OriginalTrainerName, entity.TID16, entity.SID16, [entity.IV_HP, entity.IV_ATK, entity.IV_DEF, entity.IV_SPA, entity.IV_SPD, entity.IV_SPE], [entity.EV_HP, entity.EV_ATK, entity.EV_DEF, entity.EV_SPA, entity.EV_SPD, entity.EV_SPE], [entity.Move1, entity.Move2, entity.Move3, entity.Move4], [entity.Move1_PP, entity.Move2_PP, entity.Move3_PP, entity.Move4_PP], [entity.Move1_PPUps, entity.Move2_PPUps, entity.Move3_PPUps, entity.Move4_PPUps]);
        byte[] edited = SaveService.EditPokemon(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.PokemonEdit));
        byte[] exported = SaveService.ExportWorkingCopy(edited); var reopened = SaveUtil.GetSaveFile(exported.ToArray()) ?? throw new Exception("Real edited save recognition failed.");
        Check(exported.Length == input.Length && SaveChecksums.Valid(reopened) && reopened.GetType() == save.GetType(), "Real edited export length/format/checksums");
        PokemonEditing.Verify(reopened, edit);
        for (int box = 0; box < save.BoxCount; box++) for (int slot = 0; slot < save.BoxSlotCount; slot++) if ((box, slot) != position) Check(StorageEditing.StoredData(save, new(box, slot)).SequenceEqual(StorageEditing.StoredData(reopened, new(box, slot))), "Other box slots preserved");
        for (int slot = 0; slot < save.PartyCount; slot++) Check(StorageEditing.StoredData(save, new(-1, slot)).SequenceEqual(StorageEditing.StoredData(reopened, new(-1, slot))), "Party preserved");
        Check(input.AsSpan().SequenceEqual(original) && File.ReadAllBytes(path).AsSpan().SequenceEqual(original), "Memory input and real source file preserved");
        Console.WriteLine($"PASS owner-authorized real save: {save.GetType().Name}/{save.Version}, bytes={input.Length}, boxes={save.BoxCount}, slots={save.BoxSlotCount}, occupied={occupied}, party={save.PartyCount}; public recognition, Pokemon read/edit/export/reopen, other slots and source preservation; native evidence only, browser not accepted");
    }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
}

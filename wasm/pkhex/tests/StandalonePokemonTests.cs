// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class StandalonePokemonTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Expected standalone entity rejection");
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var p = save.GetBoxSlotAtIndex(0, 0);
            // Core's entity personal tables use the latest compatible game within each PKM format.
            var referenceVersion = p switch { PK4 => "HG", PK5 => "B2", PK6 => "OR", PK7 => "US", _ => version };
            var catalogSave = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{referenceVersion}.sav"))!;
            var file = new byte[p.SIZE_STORED]; p.WriteDecryptedDataStored(file);
            var report = StandalonePokemon.Inspect(file, "entity." + p.Extension);
            Check(JsonSerializer.Serialize(report.Pokemon) == JsonSerializer.Serialize(PokemonReader.Read(p, 0, 0)), "Standalone entry equals save-slot entry");
            Check(report.AttributeChoices.Species.Length == p.MaxSpeciesID && report.MoveChoices.Length == p.MaxMoveID + 1, "Catalog uses entity limits");
            foreach (ushort species in new ushort[] { 1, 25, 29, 32, 81, 201 })
            {
                var forms = PokemonIdentity.Forms(p, species, GameInfo.GetStrings("en"));
                var saveForms = PokemonIdentity.Forms(catalogSave, species, GameInfo.GetStrings("en"));
                if (version == "X" && species == 25)
                {
                    // PK6.PersonalInfo is AO, while SAV6XY.Personal is XY; standalone cosplay forms are intentional.
                    Check(forms.Length == 7 && PokemonIdentity.Forms(save, species, GameInfo.GetStrings("en")).Length == 1, "PK6 retains all ORAS Pikachu forms independently of XY save restrictions");
                }
                Check(forms.SequenceEqual(saveForms), $"Common form catalog matches real save {version}/{species}");
                for (int form = 0; form < forms.Length; form++)
                    Check(PokemonIdentity.Genders(p, species, (byte)form).SequenceEqual(PokemonIdentity.Genders(catalogSave, species, (byte)form)), $"Gender limits match entity-format reference {version}/{species}/{form}");
            }
            Exercise(p);
            Console.WriteLine($"PASS {version}: independent reader/catalog, common save limits, plaintext/encrypted stored/party, edits, health, rejection and original");
        }
        foreach (PKM p in new PKM[] {new CK3 {Version = GameVersion.CXD}, new XK3 {Version = GameVersion.CXD}, new BK4 {Version = GameVersion.D}, new PB7 {Version = GameVersion.GP}, new PK8 {Version = GameVersion.SW}, new PA8 {Version = GameVersion.PLA}, new PK9 {Version = GameVersion.SL}, new PA9 {Version = GameVersion.ZA}})
        {
            p.Species = 25; p.Language = 2; p.PID = 12345; p.Nickname = "TEST"; p.OriginalTrainerName = "TEST";
            p.CurrentLevel = 25; p.Move1 = 85; p.Move1_PP = 10;
            p.ResetPartyStats(); p.RefreshChecksum();
            Console.WriteLine($"CHECK standalone {p.GetType().Name}");
            var data = new byte[p.SIZE_STORED]; p.WriteDecryptedDataStored(data);
            var report = StandalonePokemon.Inspect(data, "entity." + p.Extension);
            Check(report.CanEdit && report.Pokemon.Species == 25 && report.AttributeChoices.Species.Length == p.MaxSpeciesID,
                "Additional entity formats expose full localized basic catalogs");
            Exercise(p);
            Console.WriteLine($"PASS standalone {p.GetType().Name}: encrypted/plain storage modes, shared editing, health and original");
        }
        Reject(() => StandalonePokemon.Open([], "empty.pk3"));
        Reject(() => StandalonePokemon.Open(new byte[PokemonFiles.MaximumSize + 1], "large.pk3"));
        foreach (PKM p in new PKM[] {new PK1(), new PK2()})
        {
            p.Species = 25; p.Nickname = "TEST"; p.OriginalTrainerName = "TEST"; p.CurrentLevel = 25;
            var data = new byte[p.SIZE_STORED]; p.WriteDecryptedDataStored(data);
            var report = StandalonePokemon.Inspect(data, "entity." + p.Extension);
            Check(!report.CanEdit && report.Pokemon.Species == 25, "Early-generation list containers remain read-only");
            Reject(() => StandalonePokemon.Export(data, "entity." + p.Extension, false, false));
        }
    }
    private static void Exercise(PKM p)
    {
        var filename = "entity." + p.Extension;
        foreach (bool party in new[] {false, true})
        foreach (bool encrypted in new[] {false, true})
        {
            var entity = p.Clone(); entity.ResetPartyStats(); entity.Stat_HPCurrent = 1; entity.Status_Condition = 8; entity.RefreshChecksum();
            var input = new byte[party ? entity.SIZE_PARTY : entity.SIZE_STORED];
            if (party) { if (encrypted) entity.WriteEncryptedDataParty(input); else entity.WriteDecryptedDataParty(input); }
            else { if (encrypted) entity.WriteEncryptedDataStored(input); else entity.WriteDecryptedDataStored(input); }
            var before = input.ToArray();
            Reject(() => StandalonePokemon.Open(input, "conflict.pk1"));
            Reject(() => StandalonePokemon.Open(input[..^1], filename));
            var opened = StandalonePokemon.Open(input, filename, encrypted);
            Check(opened.Party == (input.Length == entity.SIZE_PARTY), "Party stats are recognized even when stored and party sizes coincide");
            Check(opened.Entity.GetType() == p.GetType() && opened.Entity.ChecksumValid, "Explicit extension roundtrip type/checksum " + p.GetType().Name);
            var roundtrip = StandalonePokemon.Export(input, filename, party, encrypted, encrypted);
            Check(roundtrip.SequenceEqual(input), "No-op export preserves every input byte " + p.GetType().Name);
            foreach (bool targetParty in new[] { false, true })
            foreach (bool targetEncrypted in new[] { false, true })
            {
                var reference = StandalonePokemon.Open(input, filename, encrypted).Entity;
                if (targetParty && !opened.Party && reference.SIZE_PARTY != reference.SIZE_STORED) reference.ForcePartyData();
                var expected = new byte[targetParty ? reference.SIZE_PARTY : reference.SIZE_STORED];
                if (targetParty) { if (targetEncrypted) reference.WriteEncryptedDataParty(expected); else reference.WriteDecryptedDataParty(expected); }
                else { if (targetEncrypted) reference.WriteEncryptedDataStored(expected); else reference.WriteDecryptedDataStored(expected); }
                Check(StandalonePokemon.Export(input, filename, targetParty, targetEncrypted, encrypted).SequenceEqual(expected), "Storage/encryption conversion matches Core serialization " + p.GetType().Name);
            }
            var ivs = new[] {entity.IV_HP, entity.IV_ATK, entity.IV_DEF, entity.IV_SPA, entity.IV_SPD, entity.IV_SPE};
            var evs = new[] {entity.EV_HP, entity.EV_ATK, entity.EV_DEF, entity.EV_SPA, entity.EV_SPD, entity.EV_SPE};
            var edit = new PokemonEdit(777, 777, "EDIT", 26, 70, "EDIT", 42, 43, ivs, evs, entity.Moves,
                [entity.Move1_PP, entity.Move2_PP, entity.Move3_PP, entity.Move4_PP]);
            var output = StandalonePokemon.Edit(input, filename, edit, encrypted);
            var actual = StandalonePokemon.Open(output, filename).Entity;
            PokemonEditing.Verify(actual, edit);
            Check(output.Length == input.Length, "Original stored/party width survives editing");
            if (opened.Party) Check(actual.Stat_HPCurrent == opened.Entity.Stat_HPCurrent && actual.Status_Condition == opened.Entity.Status_Condition && actual.Stat_Level == 26, "Party recalculation preserves serialized health/status");
            if (actual is PB7 cp) Check(cp.Stat_CP == cp.CalcCP, "Changed level/friendship refreshes Let's Go CP");
            Reject(() => StandalonePokemon.Edit(input, filename, edit with {Level = 0}, encrypted));
            Reject(() => StandalonePokemon.Edit(input, filename, edit with {Ivs = [int.MaxValue, 0, 0, 0, 0, 0]}, encrypted));
            Reject(() => StandalonePokemon.Edit(input, filename, edit with {Identity = new(0, 0, 0, false)}, encrypted));
            var gender = PokemonIdentity.Genders(actual, 81, 0)[0];
            var identityEdit = edit with {Identity = new(81, 0, gender, true)};
            var changed = StandalonePokemon.Open(StandalonePokemon.Edit(input, filename, identityEdit, encrypted), filename).Entity;
            Check(changed.Species == 81 && changed.Gender == 2 && !changed.IsNicknamed, "Standalone identity applies personal constraints");
            if (changed is PB7 size) Check(size.HeightAbsolute == size.CalcHeightAbsolute && size.WeightAbsolute == size.CalcWeightAbsolute, "Changed species refreshes Let's Go absolute size");
            Check(input.SequenceEqual(before), "Operations and rejected edits preserve original bytes");
        }
        if (p is PK3)
        {
            var invalid = new byte[p.SIZE_STORED]; p.WriteDecryptedDataStored(invalid); invalid[0x1C] ^= 1;
            Reject(() => StandalonePokemon.Inspect(invalid, filename));
            Reject(() => StandalonePokemon.Export(invalid, filename, false, false));
        }
        if (p is PB7 originalSize)
        {
            var custom = originalSize.Clone(); custom.Stat_CP = 4321; custom.HeightAbsolute = 42; custom.WeightAbsolute = 43;
            var source = new byte[custom.SIZE_STORED]; custom.WriteDecryptedDataStored(source);
            var rename = new PokemonEdit(0, 0, "RENAMED", custom.CurrentLevel, custom.CurrentFriendship, custom.OriginalTrainerName, custom.TID16, custom.SID16,
                [custom.IV_HP, custom.IV_ATK, custom.IV_DEF, custom.IV_SPA, custom.IV_SPD, custom.IV_SPE],
                [custom.EV_HP, custom.EV_ATK, custom.EV_DEF, custom.EV_SPA, custom.EV_SPD, custom.EV_SPE], custom.Moves,
                [custom.Move1_PP, custom.Move2_PP, custom.Move3_PP, custom.Move4_PP]);
            var renamed = (PB7)StandalonePokemon.Open(StandalonePokemon.Edit(source, filename, rename), filename).Entity;
            Check(renamed.Stat_CP == 4321 && renamed.HeightAbsolute == 42 && renamed.WeightAbsolute == 43, "Nickname-only edit preserves unrelated CP and size anomalies");
        }
    }
}

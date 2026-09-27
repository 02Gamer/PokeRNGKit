// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class Pk3ChecksumTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    public static void Run()
    {
        var source = File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        var save = (SAV3)SaveUtil.GetSaveFile(source.ToArray())!;
        var p = (PK3)save.GetBoxSlotAtIndex(0, 0);
        p.Checksum ^= 1;
        Check(p.Valid && !p.ChecksumValid, "Upstream G3 Valid does not check checksum");
        var import = BoxImportPreview.Prepare(source, [p], 1, false, false, EntityImportSettings.None);
        Check(import.Summary.Written == 0 && import.Summary.Outcomes.Single().Status == "invalid", "Import refuses invalid PK3 checksum");
        var damagedFile = p.Data[..p.SIZE_STORED].ToArray();
        var files = FilePropertyBatch.Preview(source, [new("damaged.pk3", damagedFile)], ".IV_HP=31", "en");
        Check(files.Summary.ExportedFiles == 0 && files.Summary.Files.Single().Status == "invalid", "File editor cannot implicitly repair invalid PK3 input");
        save.Storage[save.GetBoxSlotOffset(0, 0) + 0x1C] ^= 1;
        var damagedSave = save.Write().ToArray();
        var snapshot = damagedSave.ToArray();
        var batch = PropertyBatch.Preview(damagedSave, new(".IV_HP=31", "box", 0, "en"));
        Check(batch.Summary.ChangedSlots == 0 && batch.Summary.Outcomes.Any(o => o.Result == "invalid"), "Save batch reports checksum failure even if decoding yields empty species");
        Check(damagedSave.SequenceEqual(snapshot), "Damaged source remains unchanged");
        var partySave = (SAV3)SaveUtil.GetSaveFile(source.ToArray())!;
        var healthy = partySave.GetBoxSlotAtIndex(0, 0); healthy.IV_HP = 5;
        partySave.SetPartySlotAtIndex(healthy, 0, EntityImportSettings.None);
        partySave.SetPartySlotAtIndex(healthy.Clone(), 1, EntityImportSettings.None);
        partySave.LargeBlock.PartyBuffer[0x1C] ^= 1;
        var partyInput = partySave.Write().ToArray(); var partyBefore = partyInput.ToArray();
        bool rejected = false;
        try { PropertyBatch.Preview(partyInput, new(".IV_HP=31", "party", 0, "en")); }
        catch (ArgumentException) { rejected = true; }
        Check(rejected && partyInput.SequenceEqual(partyBefore), "Editing another party member cannot rewrite or discard a damaged member during compaction");
        Console.WriteLine("PASS PK3 checksum: Core Valid contract, import and file batch rejection, save-slot reporting, damaged-party guard and source preservation");
    }
}

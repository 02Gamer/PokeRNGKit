// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

// Locks down the desktop folder workflow before exposing a browser file adapter.
internal static class FolderBatchContractTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static bool Apply(PKM pk, string text)
    {
        var set = StringInstructionSet.GetBatchSets(text.AsSpan()).Single();
        return new EntityBatchProcessor().Process(pk, set.Filters, set.Instructions);
    }
    private static byte[] Export(PKM pk)
    {
        pk.ForcePartyData();
        var bytes = new byte[pk.SIZE_PARTY];
        pk.WriteDecryptedDataParty(bytes);
        return bytes;
    }
    private static bool Meta(SlotCache slot, string text) => EntityBatchEditor.IsFilterMatchMeta(
        StringInstructionSet.GetBatchSets(text.AsSpan()).Single().Filters, slot);

    public static void Run()
    {
        var context = SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!;
        var contextBefore = context.Data.ToArray();
        var types = new HashSet<Type>();
        foreach (string version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var seed = save.BlankPKM;
            seed.Species = 25; seed.Version = Enum.Parse<GameVersion>(version); seed.Language = 2;
            seed.CurrentLevel = 25; seed.IV_HP = 9; seed.IV_ATK = 17; seed.RefreshChecksum();
            foreach (bool encrypted in new[] { false, true })
            {
                var bytes = new byte[seed.SIZE_STORED];
                if (encrypted) seed.WriteEncryptedDataStored(bytes); else seed.WriteDecryptedDataStored(bytes);
                var original = bytes.ToArray();
                Check(EntityDetection.IsSizePlausible(bytes.Length), "Stored entity passes folder size filter");
                Check(FileUtil.TryGetPKM(bytes.ToArray(), out var loaded, "." + seed.Extension, context), "Mixed-format file recognized with Gen III context");
                var p = loaded!;
                if (encrypted && seed is PK5)
                {
                    // GetFormat45 reads its format hints before decrypting. A valid checksum is insufficient here.
                    Check(p is PK4 && p.Valid, "Known encrypted PK5 fixture is misidentified as valid PK4 by upstream");
                    Check(bytes.SequenceEqual(original), "Rejected ambiguous encrypted source stays unchanged");
                    Console.WriteLine($"PASS {version}: pinned upstream encrypted PK5/PK4 ambiguity; browser adapter must not edit this as PK4");
                    continue;
                }
                Check(p.GetType() == seed.GetType() && p.Valid && p.Species == 25, $"{version} encrypted={encrypted}: expected {seed.GetType().Name}, got {p.GetType().Name}, valid={p.Valid}, species={p.Species}");
                types.Add(p.GetType());
                var entry = new SlotCache(new SlotInfoFileSingle($"root/{version}/same.{seed.Extension}"), p);
                Check(Meta(entry, $"=IdentifierContains=root/{version}/"), "Metadata retains relative directory");
                Check(!Meta(entry, "=IdentifierContains=missing/"), "Unmatched path is filtered");
                Check(Meta(entry, "=Slot=1") && !Meta(entry, "=Slot=2") && !Meta(entry, "=Box=1"), "Single files have slot one and no box");
                Check(!entry.Source.CanWriteTo(context), "File metadata cannot overwrite save slots");
                Check(Apply(p, ".IV_HP=31\n.MissingProperty=1\n.IV_ATK=29"), "Partial errors retain successful edits in folder workflow");
                var output = Export(p);
                Check(output.Length == p.SIZE_PARTY, "Stored and encrypted inputs export decrypted party bytes");
                Check(FileUtil.TryGetPKM(output.ToArray(), out var reopened, "." + seed.Extension, context), "Export reopens");
                Check(reopened!.GetType() == seed.GetType() && reopened.Valid && reopened.IV_HP == 31 && reopened.IV_ATK == 29, "Export retains native type and successful changes");
                Check(Export(reopened).SequenceEqual(output), "Party export is byte-stable after reopening");
                var beforeFilter = p.Data.ToArray();
                Check(!Apply(p, "!Species=25\n.IV_HP=0") && p.Data.SequenceEqual(beforeFilter), "Filtered files remain unchanged");
                var invalid = seed.Clone(); invalid.Species = 0; invalid.RefreshChecksum();
                Check(!Apply(invalid, ".IV_HP=31"), "Empty entities are skipped");
                Check(bytes.SequenceEqual(original), "Source bytes remain unchanged");
            }
            Console.WriteLine($"PASS {version}: folder recognition, mixed context, encrypted input, native format, metadata and party export");
        }
        Check(types.Count >= 6, "Mixed directory covers distinct native entity types");
        var pk6 = new PK6 { Species = 700, Version = GameVersion.X, Language = 2 };
        pk6.CurrentLevel = 25; pk6.RefreshChecksum();
        Check(!pk6.PartyStatsPresent, "Stored-style fixture has no party stats");
        Check(Apply(pk6, ".IV_HP=31"), "First group applies");
        Export(pk6);
        Check(pk6.PartyStatsPresent && Apply(pk6, ">Stat_HPMax=0\n.IV_ATK=30"), "Next group sees prior export's generated party stats");
        Check(pk6.Species > context.MaxSpeciesID, "Folder edits are not limited by trainer context species range");
        var left = new SlotCache(new SlotInfoFileSingle("root/a/same.pk6"), pk6.Clone());
        var right = new SlotCache(new SlotInfoFileSingle("root/b/same.pk6"), pk6.Clone());
        Check(left != right && Meta(left, "=IdentifierContains=root/a/") && !Meta(right, "=IdentifierContains=root/a/"), "Duplicate basenames remain distinct source entries");
        var damaged = (PK6)pk6.Clone(); damaged.Checksum ^= 0xFFFF;
        var damagedBefore = damaged.Data.ToArray();
        Check(!Apply(damaged, ".IV_HP=0") && damaged.Data.SequenceEqual(damagedBefore), "Invalid checksum blocks modification without repairing input");
        var empty = new PK6(); empty.RefreshChecksum();
        Check(!Apply(empty, ".IV_HP=31"), "Empty recognized files do not create output");
        var giftCollision = new byte[pk6.SIZE_STORED]; pk6.WriteDecryptedDataStored(giftCollision);
        Check(!FileUtil.TryGetPKM(giftCollision, out _, ".pgt", context), "Gift extension disambiguates colliding entity size");
        Check(!EntityDetection.IsSizePlausible(1), "Invalid file size is skipped before recognition");
        Check(context.Data.SequenceEqual(contextBefore), "Folder operations preserve trainer context save");
        Console.WriteLine("PASS folder batch sequencing: party initialization before later filters, gift collision and context preservation");
    }
}

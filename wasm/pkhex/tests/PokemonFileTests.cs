using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonFileTests
{
    private static SaveFile Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray())!;
    private static PokemonFile Export(byte[] data, PokemonPosition position) => JsonSerializer.Deserialize(
        SaveService.ExportPokemon(data, JsonSerializer.Serialize(position, SaveJsonContext.Default.PokemonPosition)), SaveJsonContext.Default.PokemonFile)!;
    private static byte[] Import(byte[] data, PokemonPosition position, PokemonFile file) => SaveService.ImportPokemon(data,
        JsonSerializer.Serialize(new PokemonImport(position.Box, position.Slot, file.FileName, file.Data), SaveJsonContext.Default.PokemonImport));
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }

    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var save = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            var p = save.GetBoxSlotAtIndex(0, 0);
            p.Version = Enum.Parse<GameVersion>(version); p.PID = 444; p.RefreshChecksum();
            save.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            save.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            var input = save.Write().ToArray(); var original = input.ToArray();
            var file = Export(input, new(0, 0));
            var entityBytes = Convert.FromBase64String(file.Data);
            var entity = EntityFormat.GetFromBytes(entityBytes, save.Context)!;
            Require(entity.GetType() == save.PKMType && entity.ChecksumValid && entity.PID == 444, $"{version}: exported {entity.GetType().Name}, checksum={entity.ChecksumValid}, PID={entity.PID}, version={entity.Version}");
            Require(entityBytes.Length == p.SIZE_PARTY && file.FileName.EndsWith('.' + p.Extension), $"{version}: filename/party size");
            var partyFile = Export(input, new(-1, 0));
            Require(EntityFormat.GetFromBytes(Convert.FromBase64String(partyFile.Data), save.Context)!.PID == 444, $"{version}: party export");
            foreach (var target in new[] { new PokemonPosition(0, 1), new PokemonPosition(save.BoxCount - 1, save.BoxSlotCount - 1), new PokemonPosition(-1, 5) })
            {
                var after = Open(Import(input, target, file));
                var actualPosition = target.Box == -1 ? target with { Slot = save.PartyCount } : target;
                var actual = PokemonEditing.Read(after, actualPosition.Box, actualPosition.Slot);
                Require(after.ChecksumsValid && actual.Data[..actual.SIZE_STORED].SequenceEqual(entity.Data[..entity.SIZE_STORED]), $"{version}: imported stored payload");
                Require(after.PartyCount == save.PartyCount + (target.Box == -1 ? 1 : 0), $"{version}: party count");
                for (var b = 0; b < save.BoxCount; b++)
                    for (var slot = 0; slot < save.BoxSlotCount; slot++)
                    {
                        var position = new PokemonPosition(b, slot);
                        if (position == target) continue;
                        Require(StorageEditing.StoredData(save, position).SequenceEqual(StorageEditing.StoredData(after, position)), $"{version}: untouched box");
                    }
                Require(input.SequenceEqual(original), $"{version}: input mutation");
            }
            Reject(input, new(0, 0), new("bad.pk3", "not base64"));
            Reject(input, new(0, 0), new("bad.pk3", Convert.ToBase64String([1, 2, 3])));
            Reject(input, new(0, 0), file with { FileName = "gift.PGT" });
            Reject(input, new(-1, 6), file);
            Reject(input, new(save.BoxCount, 0), file);
            Console.WriteLine($"PASS {version}: box/party entity export, empty/occupied/party import, payload and original preservation");
        }
        var pk3 = new PokemonFile("legal.pk3", Convert.ToBase64String(File.ReadAllBytes("third_party/pkhex/legality-fixtures/legal-shedinja.pk3")));
        var diamond = File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav");
        var converted = Open(Import(diamond, new(0, 1), pk3));
        Require(converted.GetBoxSlotAtIndex(0, 1) is PK4 { Species: 292 } && converted.ChecksumsValid, "PK3 to PK4 conversion");
        var newer = Export(File.ReadAllBytes(".tmp/pkhex-fixtures/US.sav"), new(0, 0));
        Reject(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"), new(0, 1), newer);
        Console.WriteLine("PASS upstream PK3 to PK4 conversion and unsupported backward conversion rejection");
    }
    private static void Reject(byte[] input, PokemonPosition position, PokemonFile file)
    {
        var original = input.ToArray();
        try { Import(input, position, file); }
        catch (ArgumentException) { Require(input.SequenceEqual(original), "Rejected import changed input"); return; }
        throw new Exception("Invalid entity import was accepted");
    }
}

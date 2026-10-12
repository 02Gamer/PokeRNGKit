// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;

internal static class RegisteredGroupsTests
{
    // PKHeX.Core.PokeCrypto.SIZE_1STORED is internal: 33 raw entity bytes,
    // followed by separate nickname/OT buffers in the Stadium GetTeam layout.
    private const int StoredPk1Size = 33;
    public static void Run()
    {
        Check(SaveService.ApiVersion == 145, "Registered group product protocol");
        // The SAV1StadiumJ blank constructor routes PK1 list serialization into
        // a Stadium raw slot and throws. Use exact-sized typed input readers.
        foreach (var seed in new SAV_STADIUM[] { new SAV1StadiumJ(new byte[SaveUtil.SIZE_G1STADJ]), new SAV1Stadium(new byte[SaveUtil.SIZE_G1STAD], false), new SAV1Stadium(new byte[SaveUtil.SIZE_G1STAD], true), new SAV2Stadium(new byte[SaveUtil.SIZE_G2STAD], false), new SAV2Stadium(new byte[SaveUtil.SIZE_G2STAD], true) })
        {
            // Exact source box footers, not size-padding or relaxed detection.
            // SAV1StadiumJ.SetBoxMetadata is unimplemented in this revision.
            int boxHeader = seed switch { SAV1StadiumJ => 0x14, SAV1Stadium { Japanese: true } => 0x0C, SAV1Stadium => 0x10, _ => 0x20 };
            int boxSize = seed switch { SAV1StadiumJ => 0x560, SAV1Stadium { Japanese: true } => 0x558, SAV1Stadium => 0x468, SAV2Stadium { Japanese: true } => 0x730, _ => 0x4D8 };
            uint footerMagic = seed is SAV2Stadium ? 0x30763350u : 0x454B4F50u; // P3v0 / POKE
            for (int box = 0; box < seed.BoxCount; box++)
                System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(seed.Data[(seed.GetBoxOffset(box) - boxHeader + boxSize - 6)..], footerMagic);
            int count = seed switch { SAV1StadiumJ => 16, SAV1Stadium { Japanese: true } => 108, SAV1Stadium => 70, _ => 60 };
            var blank = RegisteredGroups.Read(seed);
            Check(blank.Groups.Length == count && blank.InitialGroup == 0 && blank.Groups.All(g => g.Slots.Length == 6 && g.Slots.All(s => s.Pokemon is null)), "Empty real groups and first-selection fallback");
            // Populate raw member locations from each source GetTeam layout,
            // including the last international Stadium team after its omissions.
            foreach (var (physical, slot) in new[] { (3, 2), (seed is SAV1Stadium { Japanese: false } ? 89 : count - 1, 5) })
            {
                int offset = seed switch { SAV1StadiumJ => SAV1StadiumJ.GetTeamOffset(physical), SAV1Stadium s => s.GetTeamOffset(physical), _ => SAV2Stadium.GetTeamOffset(physical) };
                int header = seed switch { SAV1StadiumJ => 0x14, SAV1Stadium { Japanese: true } => 0x0C, _ => 0x10 };
                var pokemon = seed.BlankPKM;
                pokemon.Species = 25; pokemon.CurrentLevel = 5; pokemon.Nickname = "PIKA"; pokemon.OriginalTrainerName = "A";
                if (pokemon is PK1 p1)
                {
                    p1.Stat_LevelBox = 5;
                    var target = seed.Data.Slice(offset + header + slot * seed.SIZE_STORED, seed.SIZE_STORED);
                    p1.Data[..StoredPk1Size].CopyTo(target);
                    int nameLength = seed.Japanese ? 6 : 11;
                    p1.NicknameTrash[..nameLength].CopyTo(target[StoredPk1Size..]);
                    p1.OriginalTrainerTrash[..nameLength].CopyTo(target[(StoredPk1Size + nameLength)..]);
                }
                else pokemon.Data.CopyTo(seed.Data.Slice(offset + header + slot * seed.SIZE_STORED, seed.SIZE_STORED));
            }
            var original = seed.Data.ToArray();
            var source = seed.GetRegisteredTeams();
            var catalog = RegisteredGroups.Read(seed);
            int expectedFirst = Array.FindIndex(source, g => g.Slots.Any(p => p.Species != 0));
            Check(catalog.InitialGroup == expectedFirst && catalog.Groups.Length == source.Length, "Source first occupied group and real count");
            for (int group = 0; group < source.Length; group++)
            {
                var row = catalog.Groups[group];
                Check(row.Index == group && row.Name == source[group].GroupName && row.Storage == source[group].Type.ToString(), "Core group names/order/storage context");
                for (int slot = 0; slot < 6; slot++)
                {
                    var expected = source[group].Slots[slot];
                    var actual = RegisteredGroups.Member(seed, new(group, slot));
                    Check(actual.Species == expected.Species && actual.Nickname == expected.Nickname && actual.OriginalTrainerName == expected.OriginalTrainerName, "Every actual member position");
                    Check(row.Slots[slot].Slot == slot && (row.Slots[slot].Pokemon?.Species ?? 0) == expected.Species, "Physical empty and occupied catalog members");
                    if (expected.Species != 0)
                    {
                        var legal = new LegalityAnalysis(expected.Clone(), seed.Personal, source[group].Type);
                        Check(row.Slots[slot].Legality == (!legal.Parsed ? "unparsed" : legal.Valid ? "valid" : "invalid"), "Source context legality marker");
                        var details = RegisteredGroups.Analyze(seed, new(group, slot));
                        Check(details.Box == RegisteredGroups.ReadOnlyBox && details.Slot == slot && details.Valid == (legal.Parsed && legal.Valid), "Separate-position legality details");
                        Check(row.Slots[slot].Pokemon!.Box == RegisteredGroups.ReadOnlyBox && row.Slots[slot].Pokemon!.Sprite.Length > 0, "Separate read-only member namespace and real sprite");
                        actual.Species = 1;
                        Check(RegisteredGroups.Member(seed, new(group, slot)).Species == 25, "Returned member is detached");
                    }
                    else { Check(row.Slots[slot].Legality is null, "Empty slot has no false legality indicator"); Reject(() => RegisteredGroups.Analyze(seed, new(group, slot))); }
                }
            }
            foreach (var position in new[] { new RegisteredGroupPosition(-1, 0), new(count, 0), new(0, -1), new(0, 6) })
                Reject(() => RegisteredGroups.Member(seed, position));
            Reject(() => PokemonEditing.Read(seed, RegisteredGroups.ReadOnlyBox, 0));
            Check(seed.Data.SequenceEqual(original), "Group reading mutated save bytes");
            using var json = JsonDocument.Parse(JsonSerializer.Serialize(catalog, SaveJsonContext.Default.RegisteredGroupCatalog));
            Check(json.RootElement.GetProperty("groups").GetArrayLength() == count && json.RootElement.GetProperty("initialGroup").GetInt32() == expectedFirst, "Source-generated group JSON count and first selection");
            var recognizedBytes = seed.Write().ToArray();
            var recognizedOriginal = recognizedBytes.ToArray();
            using var api = JsonDocument.Parse(SaveService.ReadRegisteredGroups(recognizedBytes));
            Check(api.RootElement.GetProperty("groups").GetArrayLength() == count, "Recognized fixture group public API");
            using var inspection = JsonDocument.Parse(SaveService.Inspect(recognizedBytes));
            Check(inspection.RootElement.GetProperty("apiVersion").GetInt32() == 145 && inspection.RootElement.GetProperty("registeredTeams").GetBoolean(), "Public group capability and API version");
            var query = new RegisteredGroupPosition(expectedFirst, 2);
            using var result = JsonDocument.Parse(SaveService.AnalyzeRegisteredGroup(recognizedBytes, JsonSerializer.Serialize(query, SaveJsonContext.Default.RegisteredGroupPosition)));
            Check(result.RootElement.GetProperty("position").GetProperty("group").GetInt32() == expectedFirst && result.RootElement.GetProperty("report").GetProperty("box").GetInt32() == RegisteredGroups.ReadOnlyBox, "Analysis response carries independent group position");
            foreach (var payload in new[] { "{}", "{\"group\":0}", "{\"slot\":0}", "{\"group\":0.5,\"slot\":2}", "{\"group\":\"3\",\"slot\":2}" })
            {
                try { SaveService.AnalyzeRegisteredGroup(recognizedBytes, payload); }
                catch (JsonException) { continue; }
                throw new Exception("Malformed group JSON was accepted");
            }
            foreach (var position in new[] { new RegisteredGroupPosition(-1, 0), new(count, 0), new(0, -1), new(0, 6) })
                Reject(() => SaveService.AnalyzeRegisteredGroup(recognizedBytes, JsonSerializer.Serialize(position, SaveJsonContext.Default.RegisteredGroupPosition)));
            Check(recognizedBytes.SequenceEqual(recognizedOriginal), "Public group API changed recognized original bytes");
            Console.WriteLine($"PASS registered groups {seed.GetType().Name}/JP={seed.Japanese}: {count} groups/all six physical slots, source order/names, first occupied, sprites, detached members, bounds and unchanged save; typed Core fixture only");
        }
        Check(!RegisteredGroups.Supports(new SAV3E()), "Unsupported save does not expose groups");
        Reject(() => RegisteredGroups.Read(new SAV3E()));
    }

    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid registered group request accepted"); }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
}

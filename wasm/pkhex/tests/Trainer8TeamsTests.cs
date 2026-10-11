// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Globalization;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class Trainer8TeamsTests
{
    private static void Check(bool v, string text) { if (!v) throw new Exception(text); }
    private static void Reject(Action action) { bool rejected = false; try { action(); } catch (ArgumentException) { rejected = true; } Check(rejected, "Invalid display team request accepted"); }
    private static byte[] Data(SAV8SWSH s, string team) => s.Blocks.GetBlock(team == "card" ? 0x874DA6FAu : 0xE9BE28BFu).Data.ToArray();
    private static int Start(string team, int i) => team == "card" ? 0xC8 + i * 0x1C : i * 0x28;
    public static void Run()
    {
        foreach (var version in new[] { GameVersion.SW, GameVersion.SH })
        for (int revision = 0; revision <= 2; revision++)
        {
            byte[] input = SwshBlockFixtureTests.Create(version, revision), original = input.ToArray();
            foreach (string team in new[] { "card", "title" })
            {
                var save = new SAV8SWSH(input.ToArray());
                uint key = team == "card" ? 0x874DA6FAu : 0xE9BE28BFu;
                save.Blocks.GetBlock(key).Data.Fill(0xA7);
                var before = save.AllBlocks.Select(b => b.Data.ToArray()).ToArray();
                byte[] expected = Data(save, team); int offset = Start(team, 5);
                Tr8TeamValue[] rows = [new(5, "species", "65535"), new(5, "form", "255"), new(5, "gender", "255"), new(5, "shiny", "False"), new(5, "ec", "0xFFFFFFFF"), new(5, "formArgument", "-2147483648")];
                BinaryPrimitives.WriteUInt32LittleEndian(expected.AsSpan(offset), 65535);
                BinaryPrimitives.WriteUInt32LittleEndian(expected.AsSpan(offset + 4), 255);
                BinaryPrimitives.WriteUInt32LittleEndian(expected.AsSpan(offset + 8), 255);
                expected[offset + 12] = 0;
                BinaryPrimitives.WriteUInt32LittleEndian(expected.AsSpan(offset + 16), uint.MaxValue);
                BinaryPrimitives.WriteInt32LittleEndian(expected.AsSpan(offset + (team == "card" ? 24 : 20)), int.MinValue);
                var unknown = team == "card" ? new[] { ("unknown", 20) } : new[] { ("unknown18", 24), ("unknown1c", 28), ("unknown20", 32), ("unknown24", 36) };
                rows = [.. rows, .. unknown.Select(v => new Tr8TeamValue(5, v.Item1, "4294967295"))];
                foreach (var (_, address) in unknown) BinaryPrimitives.WriteUInt32LittleEndian(expected.AsSpan(offset + address), uint.MaxValue);
                Trainer8Teams.Patch(save, team, rows, CultureInfo.InvariantCulture);
                Check(Data(save, team).SequenceEqual(expected), "Independent raw display fields and reserved-byte parity");
                Check(save.AllBlocks.Where((b, i) => b.Key != key && !b.Data.SequenceEqual(before[i])).Count() == 0, "Unrelated display blocks changed");
                var members = Trainer8Teams.Read(save, team);
                Check(members.Length == 6 && members[5].Species == 65535 && members[5].Sprite == "" && members[5].Fields.Length == (team == "card" ? 7 : 10), "Full CLR ranges and unknown species retained");
                foreach (var bad in new[] { new Tr8TeamValue(-1, "species", "1"), new(6, "species", "1"), new(0, "species", "65536"), new(0, "form", "256"), new(0, "ec", "4294967296"), new(0, "formArgument", "-2147483649"), new(0, "shiny", "1"), new(0, "invalid", "1"), new(0, "ec", "") })
                {
                    var snapshot = Data(save, team);
                    Reject(() => Trainer8Teams.Patch(save, team, [new(0, "species", "25"), bad], CultureInfo.InvariantCulture));
                    Check(Data(save, team).SequenceEqual(snapshot), "Invalid later field mutated prior field");
                }
                Trainer8Teams.Patch(save, team, [new(0, "species", "25"), new(0, "species", "26"), new(0, "formArgument", "2147483647")], CultureInfo.GetCultureInfo("zh-CN"));
                Check(Trainer8Teams.Read(save, team)[0].Species == 26, "Ordered PropertyGrid edits");

                save.PartyData = [new PK8 { Species = 869, Form = 5, Gender = 1, EncryptionConstant = 0x12345678, FormArgument = 6 }, new PK8 { Species = 25, Gender = 0, EncryptionConstant = 0xABCDEF01 }];
                var party = save.PartyData;
                expected = Data(save, team);
                for (int i = 0; i < 6; i++)
                {
                    int start = Start(team, i); int size = team == "card" ? 0x1C : 0x28;
                    if (i >= party.Count) { expected.AsSpan(start, size).Clear(); continue; }
                    var p = party[i];
                    BinaryPrimitives.WriteUInt32LittleEndian(expected.AsSpan(start), p.Species);
                    BinaryPrimitives.WriteUInt32LittleEndian(expected.AsSpan(start + 4), p.Form);
                    BinaryPrimitives.WriteUInt32LittleEndian(expected.AsSpan(start + 8), p.Gender);
                    expected[start + 12] = p.IsShiny ? (byte)1 : (byte)0;
                    BinaryPrimitives.WriteUInt32LittleEndian(expected.AsSpan(start + 16), p.EncryptionConstant);
                    BinaryPrimitives.WriteInt32LittleEndian(expected.AsSpan(start + (team == "card" ? 24 : 20)), i == 0 ? 6 : -1);
                }
                Trainer8Teams.CopyParty(save, team);
                Check(Data(save, team).SequenceEqual(expected), "Party copy: unknown bytes retained, trailing slots cleared, Alcremie argument");
                var art = Trainer8Teams.Read(save, team);
                Check(art[0].Sprite == "b_869_5_0" && art[1].Sprite == "b_25", "Local sprite resource names");
                var exported = save.Write().ToArray(); var reread = new SAV8SWSH(exported.ToArray());
                Check(SwishCrypto.GetIsHashValid(exported) && Data(reread, team).SequenceEqual(expected), "Encrypted display team roundtrip");
                Reject(() => Trainer8Teams.Read(save, "unknown"));
                foreach (bool missing in new[] { false, true })
                {
                    var blocks = save.AllBlocks.Where(b => !missing || b.Key != key).Select(b => b.Key == key ? SwshBlockFixtureTests.Typed(key, new byte[Start(team, 5) + (team == "card" ? 0x1C : 0x28) - 1], SCTypeCode.Object) : b.Clone()).ToArray();
                    if (missing)
                    {
                        bool rejected = false;
                        try { _ = new SAV8SWSH(SwishCrypto.Encrypt(blocks)); } catch (KeyNotFoundException) { rejected = true; }
                        Check(rejected, "Core accepted a missing required display block");
                        continue;
                    }
                    var invalid = new SAV8SWSH(SwishCrypto.Encrypt(blocks));
                    Reject(() => Trainer8Teams.Read(invalid, team));
                    Reject(() => Trainer8Teams.CopyParty(invalid, team));
                }
            }
            Check(input.SequenceEqual(original), "Immutable synthetic original");
            Console.WriteLine($"PASS Trainer8 display teams {version}/revision {revision}: independent raw setters, CLR boundaries, atomic rejection, party copy and encrypted roundtrip; typed synthetic only, no SaveService/real-save acceptance");
        }
    }
}

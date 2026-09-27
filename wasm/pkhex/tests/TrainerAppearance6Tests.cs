// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerAppearance6Tests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile s) => new(s.OT, s.TID16, s.SID16, s.Money);
    private static byte[] Export(byte[] data, TrainerEdit edit) => SaveService.Export(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.TrainerEdit));
    private static SAV6XY Read(byte[] data) => (SAV6XY)SaveUtil.GetSaveFile(data.ToArray())!;
    public static void Run()
    {
        foreach (byte gender in new byte[] { 0, 1 })
        {
            var save = Read(File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav"));
            save.OT = "A"; save.Gender = gender;
            save.Status.Data.Slice(0x30, 16).Fill(0xFF);
            save.Status.Nickname = "Old";
            save.Status.Data.Slice(0x62 + 8, 18).Fill(0xA5);
            var data = save.Write().ToArray(); var original = data.ToArray(); var basis = Original(save);
            var state = TrainerAppearance6.Read(save)!;
            var properties = save.Status.Fashion.GetType().GetProperties();
            Require(state.Fields.Length == properties.Length && state.Fields.Length == (gender == 0 ? 30 : 34), "Every upstream fashion property exposed");
            Require(state.Fields.All(f => f.Choices.All(c => c.Id <= f.Max)), "Enum choices fit bit width");
            var unchanged = new TrainerAppearance6Edit(gender, state.Nickname, state.Fields.ToDictionary(f => f.Key, f => f.Value));
            Require(Export(data, basis with { Appearance6 = unchanged }).SequenceEqual(data), "All unchanged fields preserve raw noncanonical bools, unknown bits and name padding");
            foreach (var field in state.Fields)
            foreach (uint value in new[] { 0u, field.Max }.Concat(field.Choices.Select(c => c.Id)).Distinct())
            {
                var expected = Read(data); var fashion = expected.Status.Fashion;
                if (value != field.Value)
                {
                    var property = properties.Single(p => p.Name == field.Key);
                    object typed = property.PropertyType == typeof(bool) ? value == 1 : property.PropertyType.IsEnum ? Enum.ToObject(property.PropertyType, value) : value;
                    property.SetValue(fashion, typed); expected.Status.Fashion = fashion;
                }
                var output = Export(data, basis with { Appearance6 = new(gender, Fields: new() { [field.Key] = value }) });
                Require(output.SequenceEqual(expected.Write().ToArray()), $"{gender}/{field.Key}/{value}: independent Core property matches full output");
                Require(Read(output).ChecksumsValid && TrainerAppearance6.Read(Read(output))!.Fields.Single(f => f.Key == field.Key).Value == value, "Appearance round trip");
            }
            foreach (var name in new[] { "", "ABCDEFGHIJKL", "训练家", "テスト", "A♂♀" })
            {
                var expected = Read(data); expected.Status.Nickname = name;
                var output = Export(data, basis with { Appearance6 = new(gender, name) });
                Require(output.SequenceEqual(expected.Write().ToArray()) && Read(output).Status.Nickname == name, "Nickname empty/max/Unicode and full output");
            }
            foreach (var invalid in new[] { new TrainerAppearance6Edit(gender, "1234567890123"), new(gender, "a\0b"), new(gender, "a\u0085b"), new(gender ^ 1, "new"), new(gender, Fields: new() { ["missing"] = 0 }), new(gender, Fields: new() { ["Skin"] = 4 }) })
            {
                var bad = Read(data); var before = bad.Write().ToArray();
                try { TrainerAppearance6.Apply(bad, invalid); throw new Exception("Invalid appearance accepted"); }
                catch (ArgumentException) { Require(bad.Write().ToArray().SequenceEqual(before), "Reject invalid appearance before writing"); }
            }
            // Desktop applies the appearance object loaded for the old gender before reinterpreting it.
            var combined = Export(data, basis with { Gender = gender ^ 1, Language = 1, Appearance6 = new(gender, "テスト", new() { ["HairColor"] = 2 }) });
            var expectedCombined = Read(data); var appearance = expectedCombined.Status.Fashion;
            properties.Single(p => p.Name == "HairColor").SetValue(appearance, TrainerFashion6.F6HairColor.Honey);
            expectedCombined.Status.Fashion = appearance; expectedCombined.Language = 1; expectedCombined.Status.Nickname = "テスト"; expectedCombined.Gender = (byte)(gender ^ 1);
            Require(combined.SequenceEqual(expectedCombined.Write().ToArray()), "Combined gender/language uses loaded appearance layout and target nickname language");
            Require(data.SequenceEqual(original), "Original source unchanged");
            Console.WriteLine($"PASS XY gender {gender}: all {state.Fields.Length} properties and enum choices, complete output, bool/unknown preservation, nickname, atomic validation, combined gender/language");
        }
        foreach (var fixture in new[] { "OR", "SN", "BD" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"))!;
            Require(TrainerAppearance6.Read(save) is null, "XY-specific availability");
            try { TrainerAppearance6.Apply(save, new(save.Gender, "A")); throw new Exception("Unsupported appearance accepted"); } catch (ArgumentException) { }
        }
    }
}

using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using BoxEdit = PokeRNGKit.SaveEditor.BoxEdit;

internal static class BoxEditingTests
{
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var input = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var original = input.ToArray();
            var before = SaveUtil.GetSaveFile(input.ToArray())!;
            var options = BoxEditing.Options(before);
            var count = version switch { "E" or "SN" or "US" => 16, "BD" => 32, _ => 24 };
            var length = before.Generation switch { 6 or 7 => 14, 8 => 16, _ => 8 };
            Require(options.Wallpapers.Length == count && options.NameLength == length && options.CanName, $"{version}: upstream options");
            foreach (var (name, wallpaper) in new[] { (new string('A', length), count - 1), ("", 0) })
            {
                var edit = new BoxEdit(before.BoxCount - 1, name, wallpaper);
                var output = SaveService.EditBox(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.BoxEdit));
                var after = SaveUtil.GetSaveFile(output)!;
                Require(after.ChecksumsValid, $"{version}: checksum");
                var expectedName = version == "BD" && name.Length == 0 ? BoxDetailNameExtensions.GetDefaultBoxName(edit.Box) : name;
                Require(((IBoxDetailNameRead)after).GetBoxName(edit.Box) == expectedName, $"{version}: name");
                Require(((IBoxDetailWallpaper)after).GetBoxWallpaper(edit.Box) == wallpaper, $"{version}: wallpaper");
                Require(after.BoxData.Select(p => Convert.ToBase64String(p.Data)).SequenceEqual(before.BoxData.Select(p => Convert.ToBase64String(p.Data))), $"{version}: box Pokemon changed");
                Require(after.PartyData.Select(p => Convert.ToBase64String(p.Data)).SequenceEqual(before.PartyData.Select(p => Convert.ToBase64String(p.Data))), $"{version}: party Pokemon changed");
                Require(((IBoxDetailNameRead)after).GetBoxName(0) == ((IBoxDetailNameRead)before).GetBoxName(0) &&
                    ((IBoxDetailWallpaper)after).GetBoxWallpaper(0) == ((IBoxDetailWallpaper)before).GetBoxWallpaper(0), $"{version}: other box changed");
                Require(input.SequenceEqual(original), $"{version}: original changed");
            }
            foreach (var edit in new[] {
                new BoxEdit(-1, "A", null), new BoxEdit(before.BoxCount, "A", null),
                new BoxEdit(0, new string('A', length + 1), null), new BoxEdit(0, "A\n", null),
                new BoxEdit(0, null, -1), new BoxEdit(0, null, count) })
            {
                try { SaveService.EditBox(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.BoxEdit)); }
                catch (ArgumentException) { Require(input.SequenceEqual(original), $"{version}: rejected edit mutated input"); continue; }
                throw new Exception($"{version}: invalid box edit accepted: {edit}");
            }
            Console.WriteLine($"PASS {version}: box names, wallpaper boundaries, empty/max names, Pokemon preservation and invalid edits");
        }
    }
    private static void Require(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }
}

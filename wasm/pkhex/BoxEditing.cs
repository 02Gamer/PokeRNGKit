// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record BoxEdit(int Box, string? Name, int? Wallpaper);
public sealed record BoxOptions(bool CanName, int NameLength, LocalizedText[] Wallpapers);

internal static class BoxEditing
{
    // PKHeX.WinForms/Subforms/Save Editors/Gen6/SAV_BoxLayout.cs.
    public static BoxOptions Options(SaveFile save)
    {
        var length = save.Generation switch
        {
            2 when save is SAV2 { Japanese: false, Korean: false } => 16,
            3 when save is SAV3RSBox => 8 + SAV3RSBox.BoxNamePrefix,
            6 or 7 => 14,
            >= 8 => 16,
            _ => 8,
        };
        var count = save is not IBoxDetailWallpaper ? 0 : save.Generation switch
        {
            3 when save is SAV3 or SAV3RSBox => 16,
            4 or 5 or 6 => 24,
            7 => 16,
            8 when save is SAV8BS => 32,
            8 => 19,
            9 => 20,
            _ => 0,
        };
        var named = save.Generation < 8 || save is SAV8BS;
        var wallpapers = Enumerable.Range(0, count).Select(i => named
            ? new LocalizedText(GameInfo.GetStrings("zh-Hans").wallpapernames[i],
                GameInfo.GetStrings("en").wallpapernames[i], GameInfo.GetStrings("ja").wallpapernames[i])
            : new LocalizedText($"壁纸 {i + 1}", $"Wallpaper {i + 1}", $"壁紙 {i + 1}")).ToArray();
        return new(save is IBoxDetailName, length, wallpapers);
    }

    public static void Apply(SaveFile save, BoxEdit edit)
    {
        if ((uint)edit.Box >= save.BoxCount)
            throw new ArgumentException("Invalid box position.");
        var options = Options(save);
        if (edit.Name is { } name)
        {
            if (save is not IBoxDetailName names || name.Length > options.NameLength || name.Any(char.IsControl))
                throw new ArgumentException("Invalid box name.");
            names.SetBoxName(edit.Box, name);
            if (names.GetBoxName(edit.Box) != DisplayName(save, edit.Box, name))
                throw new ArgumentException("This game cannot represent the requested box name.");
        }
        if (edit.Wallpaper is { } wallpaper)
        {
            if (save is not IBoxDetailWallpaper backgrounds || (uint)wallpaper >= options.Wallpapers.Length)
                throw new ArgumentException("Invalid box wallpaper.");
            backgrounds.SetBoxWallpaper(edit.Box, wallpaper);
        }
    }

    public static void Verify(SaveFile save, BoxEdit edit)
    {
        if ((edit.Name is { } name && ((IBoxDetailNameRead)save).GetBoxName(edit.Box) != DisplayName(save, edit.Box, name)) ||
            (edit.Wallpaper is { } wallpaper && ((IBoxDetailWallpaper)save).GetBoxWallpaper(edit.Box) != wallpaper))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
    }

    // BoxLayout8b.GetBoxName displays a default when the stored string is empty.
    private static string DisplayName(SaveFile save, int box, string name) =>
        save is SAV8BS && name.Length == 0 ? BoxDetailNameExtensions.GetDefaultBoxName(box) : name;
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record SaveDetectionChoice(SaveFileType Type, GameVersion SubVersion, LanguageID Language, string Handler, string FileName);
internal sealed record SaveDetectionResult(SaveFile Save, SaveDetectionChoice Choice, int HeaderLength, int DataLength, int FooterLength);

internal static class SaveDetection
{
    internal static IReadOnlyList<ISaveHandler> Handlers { get; } = new ISaveHandler[] { new SaveHandlerDefault() }.Concat(SaveUtil.Handlers).ToArray();
    internal static string HandlerName(ISaveHandler handler) => handler.GetType().Name["SaveHandler".Length..];
    internal static GameVersion[] Versions(SaveFileType type) => GameUtil.GameVersions.Where(version => version.SaveFileType == type).Distinct().ToArray();
    internal static SaveDetectionResult Open(byte[] original, SaveDetectionChoice choice)
    {
        if (original.Length is 0 or > SaveService.MaximumSize || choice.Type == SaveFileType.None ||
            !Enum.IsDefined(choice.Type) || !Enum.IsDefined(choice.Language) || !Enum.IsDefined(choice.SubVersion) ||
            choice.FileName is null || choice.FileName.Length > 32767 || choice.FileName.Any(char.IsControl)) throw Invalid();
        var versions = Versions(choice.Type);
        if (versions.Length == 0 ? choice.SubVersion != GameVersion.Any : !versions.Contains(choice.SubVersion)) throw Invalid();
        // The Korean offset table has no Crystal gender/palette fields. Core
        // accepts the constructor pair but fails when reading its trainer data.
        if(choice.Type==SaveFileType.GSC&&choice.SubVersion==GameVersion.C&&choice.Language==LanguageID.Korean)throw Invalid();
        var handler = Handlers.SingleOrDefault(value => HandlerName(value) == choice.Handler) ?? throw Invalid();
        if (!handler.IsRecognized(original.Length)) throw Invalid();
        // Selected handler runs on its own memory; the caller's container is never parsed in place.
        byte[] owned = original.ToArray();
        var split = handler.TrySplit(owned) ?? throw Invalid();
        if (split.Data.Length == 0 || split.Data.Length + split.Header.Length + split.Footer.Length != original.Length) throw Invalid();
        if (handler is SaveHandlerNSO && !HeaderInfoNSO.AllowedBaseSizes.Contains(split.Data.Length)) throw Invalid();
        // Source manual overload constructs from the whole container instead of split.Data.
        // Correct that boundary while matching all source SaveTypeInfo constructors.
        var save = Construct(split.Data.ToArray(), choice);
        save.Metadata.SetExtraInfo(split.Header.ToArray(), split.Footer.ToArray(), handler);
        if (choice.FileName.Length != 0) save.Metadata.SetExtraInfo(choice.FileName);
        return new(save, choice with { }, split.Header.Length, split.Data.Length, split.Footer.Length);
    }
    private static SaveFile Construct(byte[] data, SaveDetectionChoice choice) => choice.Type switch
    {
        SaveFileType.RBY => new SAV1(data, choice.Language, choice.SubVersion),
        SaveFileType.GSC => new SAV2(data, choice.Language, choice.SubVersion),
        SaveFileType.RS => new SAV3RS(data),
        SaveFileType.Emerald => new SAV3E(data),
        SaveFileType.FRLG => new SAV3FRLG(data),
        SaveFileType.DP => new SAV4DP(data),
        SaveFileType.Pt => new SAV4Pt(data),
        SaveFileType.HGSS => new SAV4HGSS(data),
        SaveFileType.BW => new SAV5BW(data),
        SaveFileType.B2W2 => new SAV5B2W2(data),
        SaveFileType.XY => new SAV6XY(data),
        SaveFileType.AO => new SAV6AO(data),
        SaveFileType.AODemo => new SAV6AODemo(data),
        SaveFileType.SM => new SAV7SM(data),
        SaveFileType.USUM => new SAV7USUM(data),
        SaveFileType.LGPE => new SAV7b(data),
        SaveFileType.SWSH => new SAV8SWSH(data),
        SaveFileType.BDSP => new SAV8BS(data),
        SaveFileType.LA => new SAV8LA(data),
        SaveFileType.SV => new SAV9SV(data),
        SaveFileType.ZA => new SAV9ZA(data),
        SaveFileType.Colosseum => new SAV3Colosseum(data),
        SaveFileType.XD => new SAV3XD(data),
        SaveFileType.RSBox => new SAV3RSBox(data),
        SaveFileType.BattleRevolution => new SAV4BR(data),
        SaveFileType.Ranch => new SAV4Ranch(data),
        SaveFileType.Stadium1J => new SAV1StadiumJ(data),
        SaveFileType.Stadium1 => new SAV1Stadium(data),
        SaveFileType.Stadium2 => new SAV2Stadium(data),
        SaveFileType.Bulk3 => new Bank3(data),
        SaveFileType.Bulk4 => new Bank4(data),
        SaveFileType.Bulk7 => Bank7.GetBank7(data),
        _ => throw Invalid(),
    };
    private static ArgumentException Invalid() => new("Manual save recognition parameters or container are invalid.");
}

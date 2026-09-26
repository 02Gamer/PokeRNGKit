// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record TrainerGameOptionState(int TextSpeed, int BattleStyle, int Sound, int BattleEffects);
public sealed record TrainerGameOptionEdit(int? TextSpeed = null, int? BattleStyle = null, int? Sound = null, int? BattleEffects = null);
internal static class TrainerGameOptions
{
    public static TrainerGameOptionState? Read(SaveFile save) => save is SAV3 s
        ? new(s.SmallBlock.TextSpeed, s.SmallBlock.OptionBattleStyle ? 1 : 0,
            s.SmallBlock.OptionSound ? 1 : 0, s.SmallBlock.OptionBattleScene ? 0 : 1) : null;

    public static void Apply(SaveFile save, TrainerGameOptionEdit edit)
    {
        if (save is not SAV3 s || edit.TextSpeed is < 0 or > 7 || edit.BattleStyle is < 0 or > 1 ||
            edit.Sound is < 0 or > 1 || edit.BattleEffects is < 0 or > 1)
            throw new ArgumentException("Trainer game options are unsupported or out of range.");
        var block = s.SmallBlock;
        // Preserve unchanged three-bit source values. The vendored setter only writes two bits.
        if (edit.TextSpeed is int speed && speed != block.TextSpeed)
        {
            if (speed > 3) throw new ArgumentException("Trainer text speed cannot be preserved by this core version.");
            block.TextSpeed = speed;
            if (block.TextSpeed != speed) throw new ArgumentException("Trainer text speed cannot be preserved by this core version.");
        }
        if (edit.BattleStyle is int style && (style == 1) != block.OptionBattleStyle) block.OptionBattleStyle = style == 1;
        if (edit.Sound is int sound && (sound == 1) != block.OptionSound) block.OptionSound = sound == 1;
        if (edit.BattleEffects is int effects && (effects == 0) != block.OptionBattleScene) block.OptionBattleScene = effects == 0;
    }
}

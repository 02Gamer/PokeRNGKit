// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record SimpleTrainerExtra(int? Coins, int? Friendship, uint? BeachScore,
    TrainerGameOptionState? Options, TrainerBadgeState? Badges, int Hours, int Minutes, int Seconds);
public sealed record SimpleTrainerExtraEdit(int? Coins = null, int? Friendship = null, int? BeachScore = null,
    TrainerGameOptionEdit? Options = null, int? Badges = null, int? Hours = null, int? Minutes = null, int? Seconds = null);

internal static class SimpleTrainerEditing
{
    private static SaveFile OwnedClone(SaveFile source)
    {
        // GB/GBA CloneInternal serializes into the source before creating its copy.
        // Preserve the source object's bytes and edit state even if serialization fails.
        var bytes = source.Data.ToArray(); bool edited = source.State.Edited;
        try { return source.Clone(); }
        finally { bytes.CopyTo(source.Data); source.State.Edited = edited; }
    }
    internal static bool Supports(SaveFile save) => save is SAV1 or SAV2 or SAV3 or SAV3Colosseum or SAV3XD or SAV4DP or SAV4Pt or SAV4HGSS or SAV5;
    internal static SimpleTrainerExtra Read(SaveFile save)
    {
        if (!Supports(save)) throw Invalid();
        var options = save switch {
            SAV1 s => new TrainerGameOptionState(s.TextSpeed, s.BattleStyleSwitch ? 0 : 1, s.Sound, s.BattleEffects ? 1 : 0),
            SAV2 s => new TrainerGameOptionState(s.TextSpeed, s.BattleStyleSwitch ? 0 : 1, s.Sound == 0 ? 0 : 1, s.BattleEffects ? 1 : 0),
            _ => TrainerGameOptions.Read(save),
        };
        var badges = save switch { SAV1 s => new TrainerBadgeState(8, s.Badges), SAV2 s => new TrainerBadgeState(16, s.Badges), _ => TrainerBadges.Read(save) };
        return new(save switch { SAV1 s => (int)s.Coin, SAV2 s => (int)s.Coin, _ => null },
            save is SAV1 yellow && yellow.Version.Contains(GameVersion.YW) ? yellow.PikaFriendship : null,
            save is SAV1 beach && beach.Version.Contains(GameVersion.YW) ? beach.PikaBeachScore : null,
            options, badges, save.PlayedHours, save.PlayedMinutes, save.PlayedSeconds);
    }

    // Always mutate an owned clone, including when the last field fails validation.
    internal static SaveFile Patch(SaveFile source, SimpleTrainerExtraEdit edit)
    {
        var before = Read(source);
        if ((edit.Coins is int coins && (before.Coins is null || coins < 0 || coins > source.MaxCoins)) ||
            (edit.Friendship is int friend && (before.Friendship is null || friend is < 0 or > 255)) ||
            (edit.BeachScore is int beach && (before.BeachScore is null || beach is < 0 or > 9999)) ||
            (edit.Badges is int badges && (before.Badges is null || badges < 0 || badges >= (1 << before.Badges.Count))) ||
            edit.Hours is < 0 or > 65535 || edit.Minutes is < 0 or > 99 || edit.Seconds is < 0 or > 99)
            throw Invalid();
        if (edit.Options is { } options && (before.Options is null || options.TextSpeed is < 0 or > 7 ||
            options.BattleStyle is < 0 or > 1 || options.BattleEffects is < 0 or > 1 ||
            options.Sound is int requestedSound && (requestedSound < 0 || requestedSound > (source is SAV1 ? 3 : 1)))) throw Invalid();
        var save = OwnedClone(source);
        if (edit.Coins is int c && c != before.Coins) { if (save is SAV1 s) s.Coin = (uint)c; else ((SAV2)save).Coin = (uint)c; }
        if (save is SAV1 y) {
            if (edit.Friendship is int f && f != before.Friendship) y.PikaFriendship = (byte)f;
            if (edit.BeachScore is int b && b != before.BeachScore) y.PikaBeachScore = (uint)b;
        }
        if (edit.Badges is int badge && badge != before.Badges!.Value) {
            if (save is SAV1 s) s.Badges = badge; else if (save is SAV2 s2) s2.Badges = badge; else TrainerBadges.Apply(save, badge);
        }
        if (edit.Options is { } opt) {
            if (save is SAV1 s) {
                if (opt.TextSpeed is int speed && speed != before.Options!.TextSpeed) s.TextSpeed = speed;
                if (opt.Sound is int sound && sound != before.Options!.Sound) s.Sound = sound;
                if (opt.BattleStyle is int style && style != before.Options!.BattleStyle) s.BattleStyleSwitch = style == 0;
                if (opt.BattleEffects is int effect && effect != before.Options!.BattleEffects) s.BattleEffects = effect == 1;
            } else if (save is SAV2 s2) {
                if (opt.TextSpeed is int speed && speed != before.Options!.TextSpeed) s2.TextSpeed = speed;
                if (opt.Sound is int sound && sound != before.Options!.Sound) s2.Sound = sound == 0 ? 0 : 2;
                if (opt.BattleStyle is int style && style != before.Options!.BattleStyle) s2.BattleStyleSwitch = style == 0;
                if (opt.BattleEffects is int effect && effect != before.Options!.BattleEffects) s2.BattleEffects = effect == 1;
            } else TrainerGameOptions.Apply(save, opt);
        }
        bool timeChanged = edit.Hours is int nextHour && nextHour != before.Hours ||
            edit.Minutes is int nextMinute && nextMinute % 60 != before.Minutes ||
            edit.Seconds is int nextSecond && nextSecond % 60 != before.Seconds;
        if (timeChanged) {
            if (edit.Hours is int h && h != before.Hours) save.PlayedHours = h;
            // XD's hour setter removes minutes/seconds; Gen I's max-hour setter clears them.
            // Restore omitted components in the source control order instead of dropping time.
            int minutes = edit.Minutes is int m ? m % 60 : before.Minutes;
            int seconds = edit.Seconds is int sec ? sec % 60 : before.Seconds;
            if (minutes != save.PlayedMinutes) save.PlayedMinutes = minutes;
            if (seconds != save.PlayedSeconds) save.PlayedSeconds = seconds;
        }
        return save;
    }

    private static int Prefix(long number, int width) {
        string text = number.ToString(CultureInfo.InvariantCulture);
        if (text.StartsWith('-')) text = text[1..];
        return int.Parse(text[..Math.Min(width, text.Length)], CultureInfo.InvariantCulture);
    }
    internal static SaveFile Resave(SaveFile source)
    {
        var before = Read(source);
        if (source.Gender > 1 || before.Hours is < 0 or > 65535) throw Invalid();
        if (TrainerPosition.Read(source) is { Map: < 0 or > 1000 }) throw Invalid();
        var save = OwnedClone(source);
        // Match the window's control order; GB/GC setters can affect other time components.
        save.Gender = source.Gender; save.TID16 = source.TID16; save.SID16 = source.SID16;
        int moneyWidth = (int)Math.Floor(Math.Log10(source.MaxMoney) + 1);
        save.Money = (uint)Prefix(source.Money, moneyWidth);
        save.PlayedHours = before.Hours; save.PlayedMinutes = Prefix(before.Minutes, 2) % 60; save.PlayedSeconds = Prefix(before.Seconds, 2) % 60;
        if (save is SAV1 s) {
            s.Coin = (uint)Math.Min(Prefix(before.Coins!.Value, 4), source.MaxCoins); s.Badges = before.Badges!.Value;
            s.PikaFriendship = (byte)Math.Min(255, Prefix(source is SAV1 old ? old.PikaFriendship : 0, 3));
            s.PikaBeachScore = (uint)Math.Min(9999, Prefix(((SAV1)source).PikaBeachScore, 4));
            s.BattleEffects = before.Options!.BattleEffects == 1; s.BattleStyleSwitch = before.Options.BattleStyle == 0;
            s.Sound = before.Options.Sound; s.TextSpeed = before.Options.TextSpeed;
        } else if (save is SAV2 s2) {
            s2.Coin = (uint)Math.Min(Prefix(before.Coins!.Value, 4), source.MaxCoins); s2.Badges = before.Badges!.Value;
            s2.BattleEffects = before.Options!.BattleEffects == 1; s2.BattleStyleSwitch = before.Options.BattleStyle == 0;
            s2.Sound = before.Options.Sound == 0 ? 0 : 2; s2.TextSpeed = before.Options.TextSpeed;
        } else if (save is SAV3 s3) {
            s3.Badges = before.Badges!.Value; var opt = before.Options!;
            s3.SmallBlock.OptionBattleStyle = opt.BattleStyle == 1; s3.SmallBlock.OptionSound = opt.Sound == 1;
            s3.SmallBlock.TextSpeed = opt.TextSpeed; s3.SmallBlock.OptionBattleScene = opt.BattleEffects == 0;
        } else if (save is SAV4 s4) {
            s4.Badges = (byte)before.Badges!.Value;
            if (s4 is SAV4HGSS hg) hg.Badges16 = before.Badges.Value >> 8;
            var geo = TrainerEditing.Options(source).Geography!;
            s4.Country = geo.Countries.Any(v => v.Id == ((SAV4)source).Country) ? ((SAV4)source).Country : -1;
            var regionChoices = geo.Regions.FirstOrDefault(v => v.Country == s4.Country)?.Choices.Select(v => v.Id)
                ?? Util.GetCountryRegionList("gen4_sr_default", "en").Select(v => v.Value);
            s4.Region = regionChoices.Contains(((SAV4)source).Region) ? ((SAV4)source).Region : -1;
        } else if (save is SAV5 s5) {
            s5.Misc.Badges = before.Badges!.Value;
            s5.BattleSubway.BP = Math.Min(Prefix(((SAV5)source).BattleSubway.BP, 4), source.MaxCoins);
            var geo = TrainerEditing.Options(source).Geography!;
            s5.Country = geo.Countries.Any(v => v.Id == ((SAV5)source).Country) ? ((SAV5)source).Country : -1;
            var regionChoices = geo.Regions.FirstOrDefault(v => v.Country == s5.Country)?.Choices.Select(v => v.Id)
                ?? Util.GetCountryRegionList("gen5_sr_default", "en").Select(v => v.Value);
            s5.Region = regionChoices.Contains(((SAV5)source).Region) ? ((SAV5)source).Region : -1;
        }
        if (save is SAV4 or SAV5) {
            var epoch = new DateTime(2000, 1, 1);
            foreach (uint seconds in new[] { source.SecondsToStart, source.SecondsToFame })
                if (epoch.AddSeconds(seconds).Date > new DateTime(2099, 12, 31)) throw Invalid();
            // Explicit Web correction: avoid DateUtil's signed-int overflow after 2068.
            save.SecondsToStart = source.SecondsToStart; save.SecondsToFame = source.SecondsToFame;
        }
        return save;
    }
    private static ArgumentException Invalid() => new("Simple trainer fields are unsupported or out of range.");
}

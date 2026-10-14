// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record SimpleTrainerField(string Key, LocalizedText Name, string Value);
public sealed record SimpleTrainerCatalog(bool CanEdit, string SourceHash, string Format, byte Generation, int MaxCoins, SimpleTrainerExtra Extra, SimpleTrainerField[] Fields);
public sealed record SimpleTrainerRequest([property: JsonRequired] string Action, [property: JsonRequired] string SourceHash, SimpleTrainerExtraEdit? Extra = null);
public sealed record SimpleTrainerConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash);
public sealed record SimpleTrainerPreview(string Token, string SourceHash, string TargetHash, SimpleTrainerCatalog Before, SimpleTrainerCatalog Result, int[] ChangedOffsets);

internal static class SimpleTrainerSession
{
    private sealed record Pending(string Token, byte[] Source, byte[] Target, string SourceHash, string TargetHash);
    private static Pending? Current;
    internal static SimpleTrainerCatalog Read(SaveFile save, byte[] source) =>
        new(save.State.Exportable && SaveChecksums.Valid(save), Br4Editing.Hash(source), save.GetType().Name, save.Generation, save.MaxCoins, SimpleTrainerEditing.Read(save), Fields(save));
    private static SimpleTrainerField[] Fields(SaveFile save)
    {
        var fields = new List<SimpleTrainerField>();
        void Add(string key, string zh, string en, string ja, object value) => fields.Add(new(key, new(zh, en, ja), Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? ""));
        Add("name", "训练家姓名", "Trainer name", "トレーナー名", save.OT);
        Add("money", "金钱", "Money", "お金", save.Money);
        Add("tid", "表 ID", "Trainer ID", "トレーナー ID", save.TID16);
        if (save.Generation > 2) Add("sid", "里 ID", "Secret ID", "裏 ID", save.SID16);
        Add("hours", "游玩小时", "Played hours", "プレイ時間", save.PlayedHours);
        Add("minutes", "游玩分钟", "Played minutes", "プレイ時間（分）", save.PlayedMinutes);
        Add("seconds", "游玩秒数", "Played seconds", "プレイ時間（秒）", save.PlayedSeconds);
        if (save is SAV1 g1) {
            Add("frames", "游玩时间帧数", "Play time frames", "プレイ時間（フレーム）", g1.PlayedFrames);
            Add("maximum", "游玩时间达到上限", "Play time maximum flag", "プレイ時間上限フラグ", g1.PlayedMaximum ? 1 : 0);
        }
        if (TrainerEditing.Options(save).Geography is { } geo) {
            Add("country", "国家", "Country", "国", geo.Value.Country);
            Add("region", "地区", "Region", "地域", geo.Value.Region);
        }
        foreach (var date in TrainerDates.Read(save))
            Add(date.Key, date.Key == "started" ? "冒险开始日期" : "名人堂日期", date.Key == "started" ? "Adventure started" : "Hall of Fame date", date.Key == "started" ? "冒険開始日" : "殿堂入り日", date.Value);
        if (save is SAV5 g5) {
            Add("startHigh", "开始日期附加数据", "Adventure date upper data", "冒険開始日時の上位データ", $"0x{g5.AdventureInfo.SecondsToStart >> 32:X8}");
            Add("fameHigh", "名人堂日期附加数据", "Hall of Fame date upper data", "殿堂入り日時の上位データ", $"0x{g5.AdventureInfo.SecondsToFame >> 32:X8}");
            Add("bp", "对战点数", "Battle Points", "バトルポイント", g5.BattleSubway.BP);
        }
        return fields.ToArray();
    }
    internal static SimpleTrainerPreview Prepare(SaveFile save, byte[] source, SimpleTrainerRequest request)
    {
        Current = null;
        string hash = Br4Editing.Hash(source);
        if (!save.State.Exportable || !SaveChecksums.Valid(save) || request.SourceHash != hash || !SimpleTrainerEditing.Supports(save)) throw Invalid();
        var before = Read(save, source);
        var result = request.Action switch {
            "patch" when request.Extra is not null => SimpleTrainerEditing.Patch(save, request.Extra),
            "resave" when request.Extra is null => SimpleTrainerEditing.Resave(save),
            _ => throw Invalid(),
        };
        byte[] output = result.Write().ToArray();
        if (output.Length != source.Length) throw Invalid();
        var checkedSave = SaveDetectionContext.OpenDerived(output) ?? throw Invalid();
        if (checkedSave.GetType() != save.GetType() || checkedSave.Version != save.Version || !SaveChecksums.Valid(checkedSave)) throw Invalid();
        // JSON record equality does not provide deep array/data checks; compare all stored bytes.
        if (!checkedSave.Data.SequenceEqual(result.Data)) throw new InvalidOperationException("Simple trainer export verification failed.");
        string target = Br4Editing.Hash(output), token = Guid.NewGuid().ToString("N");
        Current = new(token, source.ToArray(), output.ToArray(), hash, target);
        return new(token, hash, target, before, Read(checkedSave, output), Enumerable.Range(0, output.Length).Where(index => output[index] != source[index]).ToArray());
    }
    internal static byte[] Commit(byte[] source, SimpleTrainerConfirmation confirmation)
    {
        var pending = Current; Current = null;
        if (pending is null || confirmation.Token != pending.Token || confirmation.SourceHash != pending.SourceHash ||
            confirmation.TargetHash != pending.TargetHash || !source.AsSpan().SequenceEqual(pending.Source)) throw Invalid();
        return pending.Target.ToArray();
    }
    internal static void Clear() => Current = null;
    internal static void Discard(string token) { if (Current?.Token == token) Current = null; }
    private static ArgumentException Invalid() => new("Invalid or stale simple trainer operation.");
}

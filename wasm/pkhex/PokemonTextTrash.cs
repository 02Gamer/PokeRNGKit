// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;

namespace PokeRNGKit.SaveEditor;

public sealed record TextTrashEvent([property: JsonRequired] string Kind, string? Text = null, int Index = 0, int Value = 0, int Species = 0, int Language = 0, int Generation = 0, string UiLanguage = "en");
public sealed record TextTrashDraft(string Field, string InitialText, string Text, string Hex, int MaxLength, int[] Characters);

internal static class PokemonTextTrash
{
    internal static Span<byte> Buffer(PKM entity, string field) => field switch {
        "nickname" => entity.NicknameTrash, "originalTrainer" => entity.OriginalTrainerTrash,
        "handlingTrainer" => entity.HandlingTrainerTrash, _ => throw new ArgumentException("Unknown name field."),
    };
    internal static string Name(PKM entity, string field) => field switch {
        "nickname" => entity.Nickname, "originalTrainer" => entity.OriginalTrainerName,
        "handlingTrainer" => entity.HandlingTrainerName, _ => throw new ArgumentException("Unknown name field."),
    };
    private static void Name(PKM entity, string field, string text) {
        switch (field) { case "nickname": entity.Nickname = text; break; case "originalTrainer": entity.OriginalTrainerName = text; break; case "handlingTrainer": entity.HandlingTrainerName = text; break; default: throw new ArgumentException("Unknown name field."); }
    }
    internal static int[] Characters(EntityContext context) => context switch {
        EntityContext.Gen5 => Enumerable.Range(0x2460, 9).Concat(Enumerable.Range(0x246C, 25)).ToArray(),
        EntityContext.Gen6 or EntityContext.Gen7 or EntityContext.Gen7b => Hall6TrashEditing.Chars.ToArray(),
        _ when !context.IsEraPreSwitch => "…♂♀♠♣♥♦★◎○□△◇♪☀☁☂☃".Select(c => (int)c).ToArray(),
        _ => [],
    };
    private static int Maximum(PKM entity, string field) => field == "nickname" ? entity.MaxStringLengthNickname : entity.MaxStringLengthTrainer;
    private static byte[] Encode(PKM entity, string text, int size) {
        byte[] temporary = new byte[size]; int written = entity.SetString(temporary, text, text.Length, StringConverterOption.None);
        return temporary[..written];
    }
    internal static TextTrashDraft Read(PKM source, string field) => Apply(source, field, Name(source, field), []);
    internal static TextTrashDraft Apply(PKM source, string field, string initialText, TextTrashEvent[] events) {
        if (!StandalonePokemon.CanEdit(source) || source.Species == 0 || source.Species > source.MaxSpeciesID || !source.Valid || !source.ChecksumValid || events is null || events.Length > 512)
            throw new ArgumentException("Name byte editing requires a valid supported entity and bounded events.");
        int maximum = Maximum(source, field);
        if (initialText is null || initialText.Length > maximum && initialText != Name(source, field)) throw new ArgumentException("Name exceeds the entity text limit.");
        var entity = source.Clone(); Name(entity, field, initialText); // Parent writes current textbox before opening Text.cs.
        byte[] raw = Buffer(entity, field).ToArray(); string text = initialText; int[] characters = Characters(entity.Context);
        foreach (var item in events) {
            if (item is null) throw new ArgumentException("Missing name event.");
            switch (item.Kind) {
                case "text":
                    if (item.Text is null || item.Text.Length > maximum) throw new ArgumentException("Invalid name text.");
                    if (text != item.Text) { text = item.Text; if (raw.Length != 0) { var encoded = Encode(entity, text, raw.Length); encoded.AsSpan(0, Math.Min(encoded.Length, raw.Length)).CopyTo(raw); } } break;
                case "character":
                    if (!characters.Contains(item.Value)) throw new ArgumentException("Unavailable source character.");
                    if (text.Length < maximum) { text += (char)item.Value; if (raw.Length != 0) Encode(entity, text, raw.Length).CopyTo(raw, 0); } break;
                case "byte":
                    if ((uint)item.Index >= raw.Length || (uint)item.Value > 255) throw new ArgumentException("Invalid physical name byte.");
                    if (raw[item.Index] != item.Value) { raw[item.Index] = (byte)item.Value; text = entity.GetString(raw); } break;
                case "clear":
                    if (raw.Length == 0) throw new ArgumentException("Name has no physical byte buffer.");
                    int start = Encode(entity, text, raw.Length).Length;
                    for (int i = start; i < raw.Length; i++) if (raw[i] != 0) { raw[i] = 0; text = entity.GetString(raw); } break;
                case "layer":
                    var languages = GameInfo.LanguageDataSource(entity.Generation, entity.Context);
                    if (raw.Length == 0 || !Hall6TrashEditing.Species.Value.Any(v => v.Id == item.Species) || !languages.Any(v => v.Value == item.Language) || item.Generation is < 0 or > 100 || item.UiLanguage is not ("zh" or "en" or "ja"))
                        throw new ArgumentException("Invalid source name layer choices.");
                    string layerText = SpeciesName.GetSpeciesNameGeneration((ushort)item.Species, item.Language, (byte)item.Generation);
                    if (layerText.Length == 0) { var name = Hall6TrashEditing.Species.Value.Single(v => v.Id == item.Species).Name; layerText = item.UiLanguage == "zh" ? name.Zh : item.UiLanguage == "ja" ? name.Ja : name.En; }
                    byte[] layer = Encode(entity, layerText, raw.Length); int current = Encode(entity, text, raw.Length).Length;
                    if (layer.Length <= current || layer.Length > raw.Length) throw new ArgumentException("Name layer is hidden or too long.");
                    for (int i = current; i < layer.Length; i++) if (raw[i] != layer[i]) { raw[i] = layer[i]; text = entity.GetString(raw); } break;
                default: throw new ArgumentException("Unknown name event.");
            }
        }
        return new(field, initialText, text, Convert.ToHexString(raw), maximum, characters);
    }
    internal static PKM Prepare(PKM source, string field, string initialText, TextTrashEvent[] events) {
        var draft = Apply(source, field, initialText, events);
        if (draft.Hex.Length != Buffer(source, draft.Field).Length * 2) throw new ArgumentException("Name buffer width mismatch.");
        var copy = source.Clone(); Name(copy, draft.Field, draft.InitialText); Convert.FromHexString(draft.Hex).CopyTo(Buffer(copy, draft.Field)); copy.RefreshChecksum(); return copy;
    }
}

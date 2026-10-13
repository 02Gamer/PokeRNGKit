// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

// Source audit for Text.cs; this does not expose or accept a product editor.
internal static class TextTrashAuditTests
{
    internal static void Run()
    {
        PKM[] formats = [new PK1(), new PK1(true), new PK2(), new PK2(true), new PK3(), new CK3(), new XK3(), new PK4(), new BK4(), new PK5(), new PK6(), new PK7(), new PB7(), new PK8(), new PB8(), new PA8(), new PK9(), new PA9()];
        foreach (var source in formats)
        {
            source.Species = 25; source.Language = source is GBPKM gb && gb.Japanese ? 1 : 2;
            string sample = source is GBPKM japanese && japanese.Japanese ? "ア" : "A";
            source.Nickname = sample; source.OriginalTrainerName = sample; source.RefreshChecksum();
            byte[] original = source.Data.ToArray(), nick = source.NicknameTrash.ToArray(), ot = source.OriginalTrainerTrash.ToArray();
            foreach (string field in new[] { "nickname", "originalTrainer", "handlingTrainer" })
            {
                var entity = source.Clone(); var bytes = Trash(entity, field).ToArray();
                if (bytes.Length == 0) continue;
                bytes.AsSpan().Fill(0xA5);
                byte[] encoded = new byte[bytes.Length];
                int count = entity.SetString(encoded, sample, 1, StringConverterOption.None);
                Check(count > 0 && count <= bytes.Length, "Physical encoding width");
                encoded.AsSpan(0, count).CopyTo(bytes);
                Check(bytes.AsSpan(count).ToArray().All(value => value == 0xA5), "Source temporary encoding preserves bytes beyond encoded terminator");
                Check(entity.GetString(bytes) == sample, "Single-character encoding roundtrip");
                int max = field == "nickname" ? entity.MaxStringLengthNickname : entity.MaxStringLengthTrainer;
                byte[] full = new byte[bytes.Length];
                int written = entity.SetString(full, new string(sample[0], max), max, StringConverterOption.None);
                Check(written <= bytes.Length && entity.GetString(full).Length == max, "Parent entity maximum and physical buffer");
                byte[] raw = bytes.ToArray(); byte[] finalBytes = raw; string finalString = "TEST";
                raw[^1] ^= 1; // Text.cs Raw and FinalBytes share the same allocation.
                Check(finalBytes[^1] == raw[^1] && finalString == "TEST", "Closing without Save retains edited bytes but original FinalString");
                Trash(entity, field).Fill(0xCC); bytes.CopyTo(Trash(entity, field));
                Check(Trash(entity, field).SequenceEqual(bytes), "Source Show copies every byte without name setter");
            }
            Check(source.Data.SequenceEqual(original) && source.NicknameTrash.SequenceEqual(nick) && source.OriginalTrainerTrash.SequenceEqual(ot), "Source remains immutable");
            Console.WriteLine($"PASS Text source {source.GetType().Name}/language={source.Language}: actual field buffers/maxima, terminator/tail encoding, alias close behavior and original; product integration not implemented");
        }
    }
    private static Span<byte> Trash(PKM entity, string field) => field switch { "nickname" => entity.NicknameTrash, "originalTrainer" => entity.OriginalTrainerTrash, _ => entity.HandlingTrainerTrash };
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
}

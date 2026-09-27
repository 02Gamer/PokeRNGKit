// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record StandalonePokemonFile(PKM Entity, bool Party);
internal sealed record StandalonePokemonReport(string Format, string Extension, bool Party, bool CanEdit, PokemonEntry Pokemon,
    AttributeChoices AttributeChoices, MoveChoice[] MoveChoices, int Generation, bool CanMemories, CareField[] Care)
{
    public int ApiVersion => SaveService.ApiVersion;
}

internal static class StandalonePokemon
{
    public static PokemonLegalityReport Analyze(byte[] input, string filename, bool inputEncrypted = false)
    {
        var file = Open(input, filename, inputEncrypted);
        var p = file.Entity;
        if (!p.Valid || !p.ChecksumValid || p.Species == 0 || p.Species > p.MaxSpeciesID)
            throw new ArgumentException("Entity file analysis requires valid data.");
        // File serialization width does not establish its original save slot. Use the
        // entity personal info and Core's independent-entity context, not a fictitious save.
        return PokemonLegality.Report(new LegalityAnalysis(p, StorageSlotType.None), new(file.Party ? -1 : 0, 0));
    }

    public static StandalonePokemonFile Open(byte[] input, string filename, bool inputEncrypted = false)
    {
        if (input is null || input.Length is 0 or > PokemonFiles.MaximumSize)
            throw new ArgumentException("Entity file size is invalid.");
        var extension = Path.GetExtension(filename ?? string.Empty).ToLowerInvariant();
        if (inputEncrypted && extension == ".bk4")
        {
            var layout = new BK4();
            if (input.Length != layout.SIZE_STORED && input.Length != layout.SIZE_PARTY)
                throw new ArgumentException("Entity file size is invalid.");
            input = input.ToArray();
            // BK4 only shuffles blocks: its checksum cannot distinguish the two layouts.
            PokeCrypto.Decrypt4BE(input.AsSpan(0, layout.SIZE_STORED));
        }
        if (!PokemonFiles.TryRead(input, extension, null, out var pokemon) || PokemonFiles.HasFormatConflict(extension, pokemon))
            throw new ArgumentException("Entity file format is unrecognized or conflicts with the extension.");
        if (input.Length != pokemon.SIZE_STORED && input.Length != pokemon.SIZE_PARTY)
            throw new ArgumentException("Entity file container requires a dedicated reader.");
        // Colosseum/XD and Let's Go keep party stats in their only storage representation.
        return new(pokemon, input.Length == pokemon.SIZE_PARTY);
    }

    public static bool CanEdit(PKM p) => p is PK3 or CK3 or XK3 or PK4 or BK4 or PK5 or PK6 or PK7 or PB7 or PK8 or PB8 or PA8 or PK9 or PA9;

    public static StandalonePokemonReport Inspect(byte[] input, string filename, bool inputEncrypted = false)
    {
        var file = Open(input, filename, inputEncrypted); var p = file.Entity;
        if (p.Species == 0 || p.Species > p.MaxSpeciesID || !p.Valid || !p.ChecksumValid)
            throw new ArgumentException("Entity file must contain valid Pokemon data.");
        return new(p.GetType().Name, p.Extension, file.Party, CanEdit(p), PokemonReader.Read(p, file.Party ? -1 : 0, 0),
            PokemonReader.Attributes(p), PokemonReader.MoveChoices(p), p.Format, p is ITrainerMemories, p.Format >= 6 ? PokemonCare.Read(p) : []);
    }

    public static byte[] Edit(byte[] input, string filename, PokemonEdit edit, bool inputEncrypted = false)
    {
        var file = Open(input, filename, inputEncrypted); var p = file.Entity;
        if (!CanEdit(p) || !p.Valid || !p.ChecksumValid || p.Species == 0 || p.Species > p.MaxSpeciesID)
            throw new ArgumentException("Entity file editing is unavailable for this data.");
        var original = p.Clone();
        var applied = PokemonEditing.Apply(p, edit, file.Party, identity => PokemonIdentity.Apply(p, identity, file.Party ? -1 : 0));
        if (p is PB7 letsGo && original is PB7 prior)
        {
            // Identity changes refresh all derived values, as in desktop auto mode. Unrelated edits preserve stored anomalies.
            if (letsGo.Species != prior.Species || letsGo.Form != prior.Form) letsGo.ResetCalculatedValues();
            else if (letsGo.CalcCP != prior.CalcCP) letsGo.ResetCP();
        }
        var output = Serialize(p, file.Party, false);
        var reopened = Open(output, "." + p.Extension).Entity;
        PokemonEditing.Verify(reopened, applied);
        return output;
    }

    public static byte[] Export(byte[] input, string filename, bool party, bool encrypted, bool inputEncrypted = false)
    {
        var file = Open(input, filename, inputEncrypted); var p = file.Entity;
        if (!CanEdit(p) || !p.Valid || !p.ChecksumValid || p.Species == 0 || p.Species > p.MaxSpeciesID)
            throw new ArgumentException("Entity file export requires valid data.");
        if (party && !file.Party && p.SIZE_PARTY != p.SIZE_STORED) p.ForcePartyData();
        return Serialize(p, party, encrypted);
    }

    public static byte[] EditRaw(byte[] input, string filename, PokemonRawEdit edit, bool inputEncrypted = false)
    {
        var file = Open(input, filename, inputEncrypted); var p = file.Entity;
        if (!CanEdit(p) || !p.Valid || !p.ChecksumValid || p.Species == 0 || p.Species > p.MaxSpeciesID)
            throw new ArgumentException("Entity file editing is unavailable for this data.");
        var original = p.Clone();
        PokemonRawEditing.Apply(p, edit with {Box = file.Party ? -1 : 0, Slot = 0}, file.Party);
        if (p is PB7 letsGo && original is PB7 prior)
        {
            Span<ushort> before = stackalloc ushort[6]; Span<ushort> after = stackalloc ushort[6];
            prior.LoadStats(prior.PersonalInfo, before); letsGo.LoadStats(letsGo.PersonalInfo, after);
            if (!before.SequenceEqual(after))
            {
                var hp = letsGo.Stat_HPCurrent; var status = letsGo.Status_Condition;
                letsGo.ResetPartyStats(); letsGo.Stat_HPCurrent = Math.Min(hp, letsGo.Stat_HPMax); letsGo.Status_Condition = status;
            }
            if (letsGo.CalcCP != prior.CalcCP) letsGo.ResetCP();
        }
        return Serialize(p, file.Party, false);
    }

    private static byte[] Serialize(PKM p, bool party, bool encrypted)
    {
        // BK4's constructor marks party-sized data as initialized. Match that representation
        // when expanding a stored file, without changing flags for stored-size exports.
        if (party && p is BK4 bk4) bk4.IsDecryptedStateParty = true;
        var data = new byte[party ? p.SIZE_PARTY : p.SIZE_STORED];
        if (party) { if (encrypted) p.WriteEncryptedDataParty(data); else p.WriteDecryptedDataParty(data); }
        else { if (encrypted) p.WriteEncryptedDataStored(data); else p.WriteDecryptedDataStored(data); }
        var reopened = Open(data, "." + p.Extension, encrypted).Entity;
        if (reopened.GetType() != p.GetType() || !reopened.Valid || !reopened.ChecksumValid ||
            !p.Data[..(party ? p.SIZE_PARTY : p.SIZE_STORED)].SequenceEqual(reopened.Data[..(party ? p.SIZE_PARTY : p.SIZE_STORED)]))
            throw new InvalidOperationException("Entity file export verification failed.");
        return data;
    }
}

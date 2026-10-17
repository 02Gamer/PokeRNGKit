// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonTrainerIdInfo(string Format, string Tid, string Sid, int TidWidth, int SidWidth, uint Id32, ushort Tid16, ushort Sid16, uint Tsv);
public sealed record PokemonTrainerIdInput(string Tid, string Sid);
internal static class PokemonTrainerIds
{
    public static PokemonTrainerIdInfo? Read(PKM p)
    {
        if (p.Format < 3) return null;
        bool modern = p.TrainerIDDisplayFormat == TrainerIDFormat.SixDigit;
        return new(p.TrainerIDDisplayFormat.ToString(), p.GetDisplayTID().ToString(modern ? "D6" : "D5", CultureInfo.InvariantCulture),
            p.GetDisplaySID().ToString(modern ? "D4" : "D5", CultureInfo.InvariantCulture), modern ? 6 : 5, modern ? 4 : 5, p.ID32, p.TID16, p.SID16, p.GetTSV(p.Format));
    }
    private static uint Mask(string text, int width)
    {
        if (text is null || text.Length > width || text.Any(c => c != ' ' && (c is < '0' or > '9'))) throw new ArgumentException("Trainer ID input does not match the source decimal mask.");
        return uint.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out uint value) ? value : 0;
    }
    public static void Apply(PKM p, PokemonTrainerIdInput input)
    {
        var source = Read(p) ?? throw new ArgumentException("This trainer ID control is unavailable.");
        uint tid = Mask(input.Tid, source.TidWidth), sid = Mask(input.Sid, source.SidWidth);
        var copy = p.Clone();
        // TrainerIDManager saves SID first, then TID. TID7 intentionally uses Core's uint wrap.
        if (copy.TrainerIDDisplayFormat == TrainerIDFormat.SixDigit)
        {
            sid = Math.Min(4294, sid);
            if (!copy.IsValidTrainerID7(sid, copy.GetTrainerTID7())) sid = 4293;
            copy.SetTrainerSID7(sid);
            tid = Math.Min(999999, tid);
            // Preserve the desktop Save6 branch, including its SID-position validity test.
            if (tid == 999999 && copy.IsValidTrainerID7(tid, copy.GetTrainerTID7())) tid--;
            copy.SetTrainerTID7(tid);
        }
        else copy.SetTrainerID16((ushort)Math.Min(65535, tid), (ushort)Math.Min(65535, sid));
        copy.Data.CopyTo(p.Data);
    }
}

public sealed record PokemonExtraByte(int Offset, int Value);
public sealed record PokemonExpertCatalog(int Ability, int? AbilityNumber, OriginChoice[] Abilities, PokemonExtraByte[] ExtraBytes);
public sealed record PokemonExpertEdit(string Action = "values", int? Ability = null, int? AbilityNumber = null, int? Offset = null, int? ByteValue = null);
internal static class PokemonIdentityTools
{
    public static PokemonExpertCatalog Read(PKM p, int? saveMaxAbility = null)
    {
        if (p.Format < 3) throw new ArgumentException("Expert Pokemon controls are unavailable for this format.");
        var rules=PokemonModeRules.Read(p);
        var abilities = rules.ManualAbility ? PokemonOrigin.Localize(s => s.AbilityDataSource.Where(c => c.Value <= Math.Min(p.MaxAbilityID, saveMaxAbility ?? p.MaxAbilityID))) : [];
        return new(p.Ability, rules.AbilityNumber ? p.AbilityNumber : null, abilities,
            p.ExtraBytes.ToArray().Where(offset => offset < p.Data.Length).Select(offset => new PokemonExtraByte(offset, p.Data[offset])).ToArray());
    }
    public static void Apply(PKM p, PokemonExpertEdit edit, int? saveMaxAbility = null)
    {
        var source = Read(p, saveMaxAbility);var copy = p.Clone();
        bool values = edit.Ability is not null || edit.AbilityNumber is not null || edit.Offset is not null || edit.ByteValue is not null;
        if (edit.Action == "abilityFromNumber")
        {
            if (values || source.AbilityNumber is not (1 or 2 or 4)) throw new ArgumentException("Ability lookup requires a stored slot number of 1, 2 or 4.");
            IPersonalAbility personal = copy.PersonalInfo;
            if (copy is PA9)
            {
                var encounter = new LegalityAnalysis(copy).EncounterMatch;
                personal = PersonalTable.ZA[encounter.Species, encounter.Form];
            }
            SetAbility(copy, personal.GetAbilityAtIndex(source.AbilityNumber.Value >> 1), source);
        }
        else if (edit.Action == "values" && values)
        {
            if (edit.AbilityNumber is int number && (source.AbilityNumber is null || number != source.AbilityNumber && (number is < 0 or > 9))) throw new ArgumentException("Ability number requires the source one-position mask.");
            if (edit.Offset.HasValue != edit.ByteValue.HasValue || edit.Offset is int offset && !source.ExtraBytes.Any(b => b.Offset == offset) || edit.ByteValue is < 0 or > 999) throw new ArgumentException("Extra byte selection is outside the source offset/mask directory.");
            if (edit.Ability is int ability) SetAbility(copy, ability, source);
            if (edit.AbilityNumber is int slot && slot != source.AbilityNumber) copy.AbilityNumber = slot;
            if (edit.Offset is int index) copy.Data[index] = (byte)Math.Min(255, edit.ByteValue!.Value);
        }
        else throw new ArgumentException("Expert Pokemon action is empty or unavailable.");
        copy.Data.CopyTo(p.Data);
    }
    private static void SetAbility(PKM p, int value, PokemonExpertCatalog source)
    {
        if (value == source.Ability) return;
        if (!source.Abilities.Any(c => c.Id == value)) throw new ArgumentException("Manual ability is outside the source format directory.");
        p.Ability = value;
        if (p is PK5 fifth) fifth.HiddenAbility = fifth.PersonalInfo.HasHiddenAbility && fifth.Ability == fifth.PersonalInfo.AbilityH;
        if (p.Ability != value) throw new ArgumentException("This ability cannot be stored by the concrete format.");
    }
}

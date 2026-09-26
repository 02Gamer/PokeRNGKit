// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonRawEdit(int Box, int Slot, string Action, uint? Pid = null, uint? EncryptionConstant = null, FormArgumentEdit? FormArgument = null, EncounterEdit? Encounter = null, OriginEdit? Origin = null, EggEdit? Egg = null, ShinyEdit? Shiny = null, RelearnEdit? Relearn = null, RibbonEdit? Ribbons = null, MemoryEdit? Memory = null, CareEdit? Care = null, HistoryEdit? History = null);

internal static class PokemonRawEditing
{
    public static void Apply(SaveFile save, PokemonRawEdit edit)
    {
        var p = PokemonEditing.Read(save, edit.Box, edit.Slot);
        if (p.Species == 0 || !p.ChecksumValid || p.Format < 3)
            throw new ArgumentException("Pokemon slot must contain valid data.");
        if (edit.Box >= 0 && save.IsBoxSlotLocked(edit.Box, edit.Slot))
            throw new ArgumentException("Storage slot is locked.");
        switch (edit.Action)
        {
            case "history":
                PokemonHistory.Apply(p, edit.History ?? throw new ArgumentException("Pokemon history edit is missing."));
                break;
            case "care":
                PokemonCare.Apply(p, edit.Care ?? throw new ArgumentException("Pokemon care edit is missing."));
                break;
            case "memory":
                PokemonMemories.Apply(p, edit.Memory ?? throw new ArgumentException("Pokemon memory edit is missing."));
                break;
            case "ribbons":
                PokemonRibbons.Apply(p, edit.Ribbons ?? throw new ArgumentException("Pokemon ribbon edit is missing."));
                break;
            case "relearn":
                PokemonRelearn.Apply(p, edit.Relearn ?? throw new ArgumentException("Pokemon relearn edit is missing."));
                break;
            case "shiny":
                PokemonShiny.Apply(p, edit.Shiny ?? throw new ArgumentException("Pokemon shiny edit is missing."));
                break;
            case "egg":
                if (edit.Egg?.Action == "makeEgg" && edit.Box == -1 &&
                    !Enumerable.Range(0, save.PartyCount).Any(i => i != edit.Slot && save.GetPartySlotAtIndex(i) is { Species: not 0, IsEgg: false }))
                    throw new ArgumentException("Storage party must contain a non-egg Pokemon when adding an egg.");
                PokemonEgg.Apply(save, p, edit.Egg ?? throw new ArgumentException("Pokemon egg edit is missing."));
                break;
            case "origin":
                PokemonOrigin.Apply(save, p, edit.Origin ?? throw new ArgumentException("Origin edit is missing."));
                break;
            case "encounter":
                PokemonEncounter.Apply(p, edit.Encounter ?? throw new ArgumentException("Encounter edit is missing."));
                break;
            case "formArgument":
                PokemonFormArgument.Apply(p, edit.Box, edit.FormArgument ?? throw new ArgumentException("Pokemon form argument is missing."));
                break;
            case "values":
                if (edit.Pid is null && edit.EncryptionConstant is null)
                    throw new ArgumentException("Pokemon raw edit requires at least one value.");
                if (edit.EncryptionConstant is not null && p.Format < 6)
                    throw new ArgumentException("Pokemon encryption constant is unavailable in this format.");
                if (edit.Pid is uint pid) p.PID = pid;
                if (edit.EncryptionConstant is uint ec) p.EncryptionConstant = ec;
                break;
            case "rerollPid":
                var gender = p.GetSaneGender();
                p.SetPIDGender(gender);
                p.Gender = gender;
                break;
            case "rerollEc" when p.Format >= 6:
                p.SetRandomEC();
                break;
            default:
                throw new ArgumentException("Pokemon raw operation is unavailable.");
        }
        if (edit.Action == "values" && ((edit.Pid is uint requestedPid && p.PID != requestedPid) ||
            (edit.EncryptionConstant is uint requestedEc && p.EncryptionConstant != requestedEc)))
            throw new ArgumentException("Pokemon raw value cannot be represented by this format.");
        if (edit.Box == -1 && !(edit.Action == "shiny" && edit.Shiny?.Method == "sid") && edit.Action is not ("formArgument" or "encounter" or "origin" or "egg" or "relearn" or "ribbons" or "memory" or "care" or "history"))
        {
            var hp = p.Stat_HPCurrent;
            var status = p.Status_Condition;
            p.ResetPartyStats();
            p.Stat_HPCurrent = Math.Min(hp, p.Stat_HPMax);
            p.Status_Condition = status;
        }
        p.RefreshChecksum();
        if (edit.Box == -1) save.SetPartySlotAtIndex(p, edit.Slot, EntityImportSettings.None);
        else save.SetBoxSlotAtIndex(p, edit.Box, edit.Slot, EntityImportSettings.None);
    }
}

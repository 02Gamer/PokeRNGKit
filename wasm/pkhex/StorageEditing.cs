// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record StorageEdit(string Action, PokemonPosition Source, PokemonPosition? Target);

internal static class StorageEditing
{
    internal static PokemonPosition Target(SaveFile save, PokemonPosition position)
    {
        if (position.Box != -1)
        {
            PokemonEditing.Read(save, position.Box, position.Slot);
            return position;
        }
        if (!save.HasParty || (uint)position.Slot >= 6 || (uint)save.PartyCount > 6)
            throw new ArgumentException("Storage party position is invalid.");
        // SlotInfoParty.WriteTo appends when an empty party position is selected.
        return position with { Slot = Math.Min(position.Slot, save.PartyCount) };
    }

    internal static void Writable(SaveFile save, PokemonPosition position)
    {
        // SlotInfoBox.CanWriteTo uses the same upstream lock flag.
        if (position.Box >= 0 && save.IsBoxSlotLocked(position.Box, position.Slot))
            throw new ArgumentException("Storage slot is locked.");
    }

    public static PokemonPosition[] Apply(SaveFile save, StorageEdit edit)
    {
        if (edit.Action is not ("move" or "swap" or "copy" or "delete"))
            throw new ArgumentException("Storage operation is invalid.");
        if (edit.Source.Box == -1 && (uint)edit.Source.Slot >= 6)
            throw new ArgumentException("Storage party position is invalid.");
        var source = PokemonEditing.Read(save, edit.Source.Box, edit.Source.Slot);
        if (edit.Action != "delete" && (source.Species == 0 || !source.ChecksumValid))
            throw new ArgumentException("Storage source must contain valid Pokemon data.");
        if (edit.Action != "copy") Writable(save, edit.Source);
        var changes = new Dictionary<PokemonPosition, PKM>();
        if (edit.Action == "delete")
        {
            changes[edit.Source] = save.BlankPKM;
        }
        else
        {
            if (edit.Target is null) throw new ArgumentException("Storage target is missing.");
            var target = Target(save, edit.Target);
            if (target == edit.Source)
                throw new ArgumentException("Storage target must be a different slot.");
            var destination = target.Box == -1 && target.Slot == save.PartyCount ? save.BlankPKM :
                PokemonEditing.Read(save, target.Box, target.Slot);
            Writable(save, target);
            if (edit.Action == "move" && destination.Species != 0)
                throw new ArgumentException("Storage move requires an empty target. Use swap instead.");
            if (edit.Action == "swap" && destination.Species != 0 && !destination.ChecksumValid)
                throw new ArgumentException("Storage target contains invalid Pokemon data.");
            changes[target] = source;
            if (edit.Action != "copy")
                changes[edit.Source] = edit.Action == "swap" ? destination : save.BlankPKM;
        }
        var partyChanges = changes.Where(pair => pair.Key.Box == -1).ToArray();
        PKM[]? party = null;
        if (partyChanges.Length != 0)
        {
            if (!save.HasParty || (uint)save.PartyCount > 6)
                throw new ArgumentException("Storage party is invalid.");
            var slots = Enumerable.Range(0, 6).Select(i => i < save.PartyCount ? save.GetPartySlotAtIndex(i) : save.BlankPKM).ToArray();
            foreach (var (position, pokemon) in partyChanges) slots[position.Slot] = pokemon;
            party = slots.Where(p => p.Species != 0).ToArray();
            // SlotInfoParty rejects an egg placement that leaves no non-egg member.
            // Evaluate the whole atomic swap, so merely reordering a valid party works.
            if (partyChanges.Any(pair => pair.Value.IsEgg) && party.All(p => p.IsEgg))
                throw new ArgumentException("Storage party must contain a non-egg Pokemon when adding an egg.");
        }
        foreach (var (position, pokemon) in changes.Where(pair => pair.Key.Box >= 0))
            save.SetBoxSlotAtIndex(pokemon, position.Box, position.Slot, EntityImportSettings.None);
        if (party is not null)
            for (var i = 0; i < 6; i++)
                save.SetPartySlotAtIndex(i < party.Length ? party[i] : save.BlankPKM, i, EntityImportSettings.None);
        return changes.Keys.Where(p => p.Box >= 0).Concat(party is null ? [] :
            Enumerable.Range(0, 6).Select(i => new PokemonPosition(-1, i))).ToArray();
    }

    public static byte[] StoredData(SaveFile save, PokemonPosition position)
    {
        var pokemon = position.Box == -1 ? save.GetPartySlotAtIndex(position.Slot) :
            PokemonEditing.Read(save, position.Box, position.Slot);
        return pokemon.Data[..(position.Box == -1 ? pokemon.SIZE_PARTY : pokemon.SIZE_STORED)].ToArray();
    }
}

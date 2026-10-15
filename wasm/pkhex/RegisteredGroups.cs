// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;

namespace PokeRNGKit.SaveEditor;

public sealed record RegisteredGroupPosition([property: JsonRequired] int Group, [property: JsonRequired] int Slot);
public sealed record RegisteredGroupSlot(int Slot, PokemonEntry? Pokemon, string? Legality);
public sealed record RegisteredGroupEntry(int Index, string Name, string Storage, RegisteredGroupSlot[] Slots);
public sealed record RegisteredGroupCatalog(int InitialGroup, RegisteredGroupEntry[] Groups);
public sealed record RegisteredGroupAnalysis(RegisteredGroupPosition Position, PokemonLegalityReport Report);

internal static class RegisteredGroups
{
    // This is a separate read-only position namespace. Never treat a registered
    // member as a normal box slot, including when opening its entity details.
    internal const int ReadOnlyBox = -2;

    public static bool Supports(SaveFile save) => save is SAV_STADIUM;

    public static RegisteredGroupCatalog Read(SaveFile save)
    {
        var groups = Groups(save);
        int first = Array.FindIndex(groups, group => group.Slots.Any(p => p.Species != 0));
        return new(first < 0 ? 0 : first, groups.Select((group, index) => new RegisteredGroupEntry(
            index, group.GroupName, group.Type.ToString(), group.Slots.Select((pokemon, slot) =>
                ReadSlot(save, pokemon, group.Type, slot)).ToArray())).ToArray());
    }

    private static RegisteredGroupSlot ReadSlot(SaveFile save, PKM pokemon, StorageSlotType storage, int slot)
    {
        if (pokemon.Species == 0) return new(slot, null, null);
        var detached = pokemon.Clone();
        var analysis = new LegalityAnalysis(detached, save.Personal, storage);
        return new(slot, PokemonReader.Read(detached, ReadOnlyBox, slot), !analysis.Parsed ? "unparsed" : analysis.Valid ? "valid" : "invalid");
    }

    public static PKM Member(SaveFile save, RegisteredGroupPosition position)
    {
        var groups = Groups(save);
        if ((uint)position.Group >= groups.Length || (uint)position.Slot >= groups[position.Group].Slots.Length)
            throw new ArgumentException("Invalid registered team position.");
        return groups[position.Group].Slots[position.Slot].Clone();
    }
    internal static (PKM Entity,StorageSlotType Storage) HoverMember(SaveFile save,RegisteredGroupPosition position)
    {
        var groups=Groups(save);
        if((uint)position.Group>=groups.Length||(uint)position.Slot>=groups[position.Group].Slots.Length)throw new ArgumentException("Invalid registered team position.");
        return(groups[position.Group].Slots[position.Slot].Clone(),groups[position.Group].Type);
    }

    public static PokemonLegalityReport Analyze(SaveFile save, RegisteredGroupPosition position)
    {
        var groups = Groups(save);
        if ((uint)position.Group >= groups.Length || (uint)position.Slot >= groups[position.Group].Slots.Length)
            throw new ArgumentException("Invalid registered team position.");
        var group = groups[position.Group];
        var pokemon = group.Slots[position.Slot].Clone();
        if (pokemon.Species == 0) throw new ArgumentException("Registered team slot is empty.");
        return PokemonLegality.Report(new LegalityAnalysis(pokemon, save.Personal, group.Type), new(ReadOnlyBox, position.Slot));
    }

    private static SlotGroup[] Groups(SaveFile save) => save is SAV_STADIUM stadium
        ? stadium.GetRegisteredTeams()
        : throw new ArgumentException("Registered team viewing is not supported for this save.");
}

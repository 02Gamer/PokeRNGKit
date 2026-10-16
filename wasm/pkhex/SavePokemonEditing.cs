// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record SavePokemonCapability(bool CanEdit, string Editor, bool CanRaw, bool CanImport, bool CanStorage,bool HaX=false);
internal sealed record GbSavePokemonEdit(int Box, int Slot, GbPokemonEdit? Basic = null, GbSpecialEdit? Special = null);

internal static class SavePokemonEditing
{
    internal static bool Supports(SaveFile save) => (save.HasBox || save.HasParty) && StandalonePokemon.CanEdit(save.BlankPKM);
    internal static SavePokemonCapability Read(SaveFile save, bool valid)
    {
        bool supported=Supports(save), editable=supported&&valid&&save.State.Exportable;
        return new(editable,!supported?"none":save.BlankPKM is GBPKM?"gb":"standard",editable&&save.Generation>=3,editable,editable,PokemonEditorMode.HaX);
    }
    internal static void Require(SaveFile save, bool gb = false)
    {
        if(!Supports(save)||!save.State.Exportable||!SaveChecksums.Valid(save)||(gb && save.BlankPKM is not GBPKM))
            throw new ArgumentException("Pokemon editing requires supported exportable storage with valid checksums.");
    }
}

public static partial class SaveService
{
    internal static byte[] EditGbPokemon(byte[] input,string json)
    {
        if(json is null||json.Length>32768)throw new ArgumentException("GB Pokemon request is too large.");
        var save=Open(input);SavePokemonEditing.Require(save,true);
        var request=JsonSerializer.Deserialize(json,SaveJsonContext.Default.GbSavePokemonEdit)??throw new ArgumentException("Missing GB Pokemon edit.");
        if((request.Basic is null)==(request.Special is null))throw new ArgumentException("GB Pokemon edit requires exactly one operation.");
        if(PokemonEditing.Read(save,request.Box,request.Slot) is not GBPKM p || !p.Valid || p.Species==0 || !p.ChecksumValid)
            throw new ArgumentException("GB Pokemon slot must contain valid data.");
        StorageEditing.Writable(save,new(request.Box,request.Slot));
        if(request.Basic is { } basic)StandaloneGb.Apply(p,basic);
        else
        {
            if(request.Special!.Egg?.Action=="makeEgg" && request.Box==-1 && !Enumerable.Range(0,save.PartyCount).Any(i=>i!=request.Slot&&save.GetPartySlotAtIndex(i) is {Species:not 0,IsEgg:false}))
                throw new ArgumentException("Storage party must contain a non-egg Pokemon when adding an egg.");
            StandaloneGbSpecial.Apply(p,request.Special,request.Box==-1);
        }
        if(request.Box==-1)save.SetPartySlotAtIndex(p,request.Slot,EntityImportSettings.None);
        else PokemonSlotWriter.Box(save,p,request.Box,request.Slot);
        var position=new PokemonPosition(request.Box,request.Slot);var expected=StorageEditing.StoredData(save,position);int partyCount=save.PartyCount;
        byte[] output=save.Write().ToArray();var reopened=OpenDerived(output);
        if(output.Length!=input.Length||reopened.GetType()!=save.GetType()||!SaveChecksums.Valid(reopened)||reopened.PartyCount!=partyCount||!StorageEditing.StoredData(reopened,position).SequenceEqual(expected))
            throw new InvalidOperationException("GB Pokemon save export verification failed.");
        return output;
    }
}
public static partial class Program
{
    [JSExport]public static byte[] EditGbPokemon(byte[] input,string json)=>SaveService.EditGbPokemon(input,json);
}

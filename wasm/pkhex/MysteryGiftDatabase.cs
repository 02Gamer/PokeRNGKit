// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Core.Searching;
namespace PokeRNGKit.SaveEditor;

internal sealed record MysteryGiftDatabaseOptions(bool FilterUnavailableSpecies=true,int GridRows=9);
internal sealed record MysteryGiftDatabaseQuery(int Species=-1,int HeldItem=-1,int[]? Moves=null,
    bool? Egg=null,bool? Shiny=null,int Generation=0,int Comparison=0,string Instructions="");

// SAV_MysteryGiftDB: keep owned templates separate from Core's global event library.
internal sealed class MysteryGiftDatabase
{
    private readonly SaveFile save;
    private readonly MysteryGift[] raw;
    internal int GridRows {get;}
    internal ushort[] Species=>raw.Select(gift=>gift.Species).Distinct().ToArray();
    internal MysteryGift[] Results {get;private set;}=[];
    internal MysteryGiftDatabase(SaveFile source,IEnumerable<MysteryGift>? gifts=null,MysteryGiftDatabaseOptions? options=null)
    {
        save=PokemonDatabase.Copy(source);options??=new();GridRows=Math.Clamp(options.GridRows,5,20);
        IEnumerable<MysteryGift> values=gifts??EncounterEvent.GetAllEvents();
        if(options.FilterUnavailableSpecies && EntityPresenceFilters.GetFilterGift<MysteryGift>(save.Context,save.Generation) is {} filter)
            values=values.Where(filter);
        raw=values.Select(Copy).ToArray();
        if(raw.Length>100000)throw new ArgumentException("Mystery gift library exceeds 100000 entries.");
        foreach(var gift in raw)gift.GiftUsed=false;
        Results=raw.Select(Copy).ToArray();
    }
    internal static MysteryGift Copy(MysteryGift gift)
    {
        if(gift is not DataMysteryGift data)throw new ArgumentException("Unsupported mystery gift template type.");
        // WA9.Clone in the pinned Core returns WC9. Explicit constructors preserve types.
        Memory<byte> bytes=data.Data.ToArray();
        return gift switch {
            PGT=>new PGT(bytes),PCD=>new PCD(bytes),PGF=>new PGF(bytes),
            WC6=>new WC6(bytes),WC7=>new WC7(bytes),WR7=>new WR7(bytes),WB7=>new WB7(bytes),
            WC8=>new WC8(bytes),WA8=>new WA8(bytes),WB8=>new WB8(bytes),WC9=>new WC9(bytes),WA9=>new WA9(bytes),
            _=>throw new ArgumentException("Unsupported mystery gift data type.")
        };
    }
    internal MysteryGift[] Search(MysteryGiftDatabaseQuery query)
    {
        Results=[];
        if(query is null || query.Species is <-1 or >65535 || query.HeldItem is <-1 or >65535
            || query.Moves is {Length:>4} || (query.Moves??[]).Any(move=>move is <-1 or >65535)
            || query.Comparison is <0 or >3 || query.Generation is <0 or >Latest.Generation+1
            || query.Instructions is null || query.Instructions.Length>32767)
            throw new ArgumentException("Invalid mystery gift filters.");
        IEnumerable<MysteryGift> values=raw;
        values=query.Comparison switch {
            1=>values.Where(gift=>gift.Generation>=query.Generation),
            2=>values.Where(gift=>gift.Generation==query.Generation),
            3=>values.Where(gift=>gift.Generation<=query.Generation),_=>values
        };
        if(query.Species!=-1)values=values.Where(gift=>gift.Species==query.Species);
        if(query.HeldItem!=-1)values=values.Where(gift=>gift.HeldItem==query.HeldItem);
        foreach(int move in query.Moves??[])if(move!=-1)values=values.Where(gift=>gift.HasMove((ushort)move));
        if(query.Egg is {} egg)values=values.Where(gift=>gift.IsEgg==egg);
        if(query.Shiny is {} shiny)values=values.Where(gift=>gift.IsShiny==shiny);
        if(query.Instructions.Length!=0 && !StringInstructionSet.HasEmptyLine(query.Instructions)) {
            var filters=StringInstruction.GetFilters(query.Instructions);EntityBatchEditor.ScreenStrings(filters);
            values=values.Where(gift=>BatchEditingUtil.IsFilterMatch(filters,gift));
        }
        return Results=values.Select(Copy).ToArray();
    }
    internal PKM Generate(int id,bool convertToSave)
    {
        var gift=At(id);var entity=gift.ConvertToPKM(save,EncounterCriteria.Unrestricted);
        if(!convertToSave)return entity;
        var converted=EntityConverter.ConvertToType(entity,save.PKMType,out var result)
            ??throw new ArgumentException(result.GetDisplayString(entity,save.PKMType));
        save.AdaptToSaveFile(converted);converted.RefreshChecksum();return converted;
    }
    internal PokemonFile ExportGift(int id)
    {
        var gift=At(id) as DataMysteryGift??throw new ArgumentException("Mystery gift has no exportable data.");
        return new(PathUtil.CleanFileName(gift.FileName),Convert.ToBase64String(gift.Write()));
    }
    internal PokemonFile[] ExportAll()=>Results.Select((gift,id)=>gift is DataMysteryGift?ExportGift(id):null).OfType<PokemonFile>().ToArray();
    private MysteryGift At(int id)=>(uint)id<Results.Length?Copy(Results[id]):throw new ArgumentException("Invalid mystery gift result id.");
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Core.Searching;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonDatabaseOptions(bool FilterUnavailableSpecies = true,
    DatabaseSortMode Sort = DatabaseSortMode.None, int GridRows = 9);
internal sealed record PokemonDatabaseQuery(PokemonSearchQuery Filters, bool Current = true,
    bool Files = true, bool Backups = true, bool? Legal = null,
    CloneDetectionMethod Clones = CloneDetectionMethod.None, EntityContext? Context = null, SearchComparison? Comparison = null);
internal sealed record PokemonDatabaseRow(int Id, string Source, string Identity, SlotCache Entry, string? FileId = null);

// Source SAV_Database.LoadEntitiesFromFolder and SearchDatabase. Caller explicitly
// chooses local sources; no filesystem scan, automatic backup access, or uploads.
internal sealed class PokemonDatabase
{
    private readonly SaveFile current;
    private readonly PKM[] baselines;
    internal IReadOnlyList<PokemonDatabaseRow> Rows { get; }
    internal int GridRows { get; }
    internal PokemonDatabaseCatalog Catalog(int id=-1)=>new(PokemonSearchCatalogReader.Read(current,id<0?current.BlankPKM:Row(id).Entry.Entity),
        Enum.GetValues<EntityContext>().Where(c=>c==EntityContext.None || c.IsValid && c.ToString().StartsWith("Gen",StringComparison.Ordinal)).Select(c=>new PokemonDatabaseContext((int)c,c==EntityContext.None?"any":c.ToString())).ToArray(),
        (int)current.Context,current.Generation>=8?1:3,current.HasBox?current.BoxCount:0);

    internal PokemonDatabase(SaveFile source, IReadOnlyList<SlotCache> selected, PokemonDatabaseOptions options, IReadOnlyList<string>? fileIds = null)
    {
        if (!Enum.IsDefined(options.Sort)) throw new ArgumentException("Invalid database sort mode.");
        if (fileIds is not null && fileIds.Count != selected.Count) throw new ArgumentException("Incomplete database ownership.");
        current = Copy(source);
        GridRows = Math.Clamp(options.GridRows, 5, 20);
        var slots = selected.Select(s => new SlotCache(s.Source, s.Entity.Clone(), s.SAV)).ToList();
        var owners = new Dictionary<SlotCache,string>(ReferenceEqualityComparer.Instance);
        if(fileIds is not null)for(int i=0;i<slots.Count;i++)owners.Add(slots[i],fileIds[i]);
        SlotInfoLoader.AddFromSaveFile(current, slots);
        slots.RemoveAll(s => !s.IsDataValid());
        if (options.FilterUnavailableSpecies)
        {
            var filter = EntityPresenceFilters.GetFilterEntity(current.Context);
            if (filter is not null) slots.RemoveAll(s => !filter(s.Entity));
        }
        if (options.Sort == DatabaseSortMode.SlotIdentity) slots.Sort();
        else if (options.Sort == DatabaseSortMode.SpeciesForm) slots.Sort((a,b) => a.CompareToSpeciesForm(b));
        // BDSP's HP at 0x8A is inside SIZE_STORED. Keep the actual original slot
        // before source display normalization, or an untouched slot looks stale.
        baselines=slots.Select(s=>s.Entity.Clone()).ToArray();
        // Source forces party data only after filtering and the initial sort.
        foreach (var slot in slots) slot.Entity.ForcePartyData();
        Rows = slots.Select((s,i) => new PokemonDatabaseRow(i,
            ReferenceEquals(s.SAV,current) ? "current" : s.Source is SlotInfoFileSingle ? "file" : "backup",
            s.Identify(),s,owners.GetValueOrDefault(s))).ToArray();
    }
    internal PokemonDatabaseRow[] Search(PokemonDatabaseQuery query)
    {
        if (query.Filters is null || !Enum.IsDefined(query.Clones)) throw new ArgumentException("Invalid database filters.");
        if(query.Context is {} context && (!Enum.IsDefined(context) || context != EntityContext.None && !context.IsValid) || query.Comparison is {} comparison && !Enum.IsDefined(comparison))throw new ArgumentException("Invalid database format comparison.");
        var settings = PokemonSearch.Settings(query.Filters,current,query.Context,query.Comparison);
        settings.SearchLegal = query.Legal;
        settings.SearchClones = query.Clones;
        var selected = Rows.Where(r => r.Source switch
        {
            "current" => query.Current, "file" => query.Files, "backup" => query.Backups, _ => false,
        }).ToArray();
        var positions = selected.ToDictionary(r => r.Entry,r => r,ReferenceEqualityComparer.Instance);
        return settings.Search(selected.Select(r=>r.Entry)).Select(s => positions[s]).ToArray();
    }
    internal PokemonDatabaseRow Row(int id) => (uint)id < Rows.Count ? Rows[id] : throw new ArgumentException("Invalid database result id.");
    internal SaveFile DeleteCurrent(SaveFile source, int id)
    {
        var row=Row(id);
        if(row.Source != "current" || row.Entry.Source is not SlotInfoBox box) throw new ArgumentException("Only current box entries can be deleted from a save.");
        var copy=Copy(source);
        var position=new PokemonPosition(box.Box,box.Slot);
        var existing=PokemonEditing.Read(copy,box.Box,box.Slot);
        if(!existing.EqualsStored(baselines[id]))throw new ArgumentException("Database entry has changed. Reload the database.");
        StorageEditing.Apply(copy,new("delete",position,null));
        return copy;
    }
    internal (SaveFile Save, int Count, string Message) Import(SaveFile source, int[] ids, int box, bool clear, bool overwrite, EntityImportSettings settings)
    {
        if(ids is null || ids.Length>Rows.Count || ids.Distinct().Count()!=ids.Length)throw new ArgumentException("Invalid database import selection.");
        var entities=ids.Select(id=>Row(id).Entry.Entity.Clone()).ToArray();
        if(!source.HasBox || (uint)box>=source.BoxCount)throw new ArgumentException("Invalid database import box.");
        var copy=Copy(source);
        int count=copy.LoadBoxes(entities,out string message,box,clear,overwrite,settings);
        return(copy,count,message);
    }
    internal static SaveFile Copy(SaveFile source)
    {
        // Gen1/2/3 CloneInternal serializes the source before creating a copy.
        // Keep pending edits in their own blocks while restoring its original raw
        // buffer even if serialization throws; only the returned clone is written.
        var original=source.Data.ToArray();
        try{return source.Clone();}
        finally{original.CopyTo(source.Data);}
    }
}

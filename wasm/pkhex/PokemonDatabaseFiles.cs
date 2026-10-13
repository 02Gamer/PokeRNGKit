// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonDatabaseFile(string Id, string Name, byte[] Data, bool EntityFile, long Modified = 0);
internal sealed record PokemonDatabaseFileResult(string Id, string Name, string Kind, int Count, string? Error);
internal sealed record PokemonDatabaseLoaded(SlotCache[] Slots, PokemonDatabaseFileResult[] Files, string[] FileIds);

internal static class PokemonDatabaseFiles
{
    private static readonly HashSet<string> Extensions = new(EntityFileExtension.GetExtensionsAll().Select(e => "." + e), StringComparer.OrdinalIgnoreCase);
    internal static PokemonDatabaseLoaded Load(SaveFile destination, IReadOnlyList<PokemonDatabaseFile> files)
    {
        Validate(files);
        var slots = new List<SlotCache>();
        var results = new List<PokemonDatabaseFileResult>();
        var fileIds = new List<string>();
        foreach (var file in files)
        {
            int before = slots.Count;
            string kind = file.EntityFile ? "file" : "backup";
            string? error = null;
            // Only display/use the chosen relative name. No filesystem IO occurs.
            string name = file.Name.Replace('\\','/');
            try
            {
                Read(destination,file,name,slots);
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or IndexOutOfRangeException)
            {
                slots.RemoveRange(before,slots.Count-before);
                error = "unrecognized";
            }
            results.Add(new(file.Id,name,kind,slots.Count-before,error));
            fileIds.AddRange(Enumerable.Repeat(file.Id,slots.Count-before));
        }
        return new(slots.ToArray(),results.ToArray(),fileIds.ToArray());
    }
    internal static void Validate(IReadOnlyList<PokemonDatabaseFile> files)
    {
        if(files is null || files.Any(f=>f is null))throw new ArgumentException("Missing database files.");
        if (files.Count > 1024 || files.Sum(f => (long)(f.Data?.Length ?? 0)) > 128L * 1024 * 1024)
            throw new ArgumentException("Database input exceeds the browser limit.");
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var file in files)
        {
            if (string.IsNullOrEmpty(file.Id) || file.Id.Length > 128 || !ids.Add(file.Id) ||
                string.IsNullOrEmpty(file.Name) || file.Name.Length > 4096 || file.Data is null || file.Data.Length is 0 or > 64 * 1024 * 1024)
                throw new ArgumentException("Invalid database source file.");
        }
    }
    private static void Read(SaveFile destination,PokemonDatabaseFile file,string name,List<SlotCache> slots)
    {
                if (file.EntityFile)
                {
                    var extension = Path.GetExtension(name);
                    if (!Extensions.Contains(extension) || !EntityDetection.IsSizePlausible(file.Data.Length) ||
                        !PokemonFiles.TryRead(file.Data, extension, destination, out var entity) || entity.Species == 0)
                        throw new ArgumentException("Unrecognized entity file.");
                    slots.Add(new SlotCache(new SlotInfoFileSingle(name), entity));
                }
                else if (SaveUtil.TryGetSaveFile(file.Data.ToArray(), out var save))
                {
                    save.Metadata.SetExtraInfo(name);
                    SlotInfoLoader.AddFromSaveFile(save,slots);
                }
                else if (FileUtil.TryGetMemoryCard(file.Data.ToArray(), out var card))
                {
                    if (card.GetMemoryCardState() == MemoryCardSaveStatus.Invalid) throw new ArgumentException("Invalid memory card.");
                    foreach (var game in new[] { SaveFileType.Colosseum, SaveFileType.XD, SaveFileType.RSBox })
                    {
                        bool present = game switch { SaveFileType.Colosseum => card.HasCOLO, SaveFileType.XD => card.HasXD, _ => card.HasRSBOX };
                        if (!present) continue;
                        card.SelectSaveGame(game);
                        if (!SaveUtil.TryGetSaveFile(card,out var selected)) continue;
                        selected.Metadata.SetExtraInfo(name);
                        SlotInfoLoader.AddFromSaveFile(selected,slots);
                    }
                }
                else throw new ArgumentException("Unrecognized save file.");
    }
    internal static PokemonFile Export(PokemonDatabaseRow row)
    {
        var entity = row.Entry.Entity.Clone();entity.ForcePartyData();
        var bytes = new byte[entity.SIZE_PARTY];entity.WriteDecryptedDataParty(bytes);
        return new(PathUtil.CleanFileName(entity.FileName),System.Convert.ToBase64String(bytes));
    }
    internal static PKM Convert(PokemonDatabaseRow row, SaveFile destination)
    {
        var source = row.Entry.Entity.Clone();
        var entity = EntityConverter.ConvertToType(source,destination.PKMType,out var result)
            ?? throw new ArgumentException($"Unsupported database conversion: {result}.");
        destination.AdaptToSaveFile(entity);entity.RefreshChecksum();
        return entity;
    }
}

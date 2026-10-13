// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonEncounterConfirmation(string Token,string SourceHash,string OutputHash);
internal sealed record PokemonEncounterTicket(PokemonEncounterConfirmation Confirmation,int Id,PokemonEntry Pokemon);

// Preparation converts a template exactly once. Confirmation returns those frozen
// entity bytes for the existing full editor; it never invokes encounter RNG again.
internal sealed class PokemonEncounterSession
{
    private readonly SaveFile source;
    private readonly string sourceHash;
    internal string SourceHash=>sourceHash;
    internal PokemonEncounterDatabase Database {get;}
    private PokemonEncounterConfirmation? confirmation;
    private PokemonFile? frozen;
    private static long sequence;
    internal PokemonEncounterSession(byte[] input,PKM prepared,EncounterCriteria? criteria=null,
        IReadOnlyList<ITrainerInfo>? trainers=null,PokemonEncounterDatabaseOptions? options=null)
    {
        if(input is null || input.Length is 0 or >32*1024*1024)throw new ArgumentException("Invalid encounter save size.");
        var owned=input.ToArray();sourceHash=Br4Editing.Hash(owned);source=SaveService.OpenDatabaseSave(owned);
        Database=new(source,prepared,criteria,trainers,options);
    }
    internal IEncounterInfo[] Search(byte[] input,PokemonEncounterDatabaseQuery query)
    {
        Reset();AssertSource(input);return Database.Search(query);
    }
    internal PokemonEncounterTicket Prepare(byte[] input,int id)
    {
        Reset();AssertSource(input);
        var entity=Database.Generate(id);entity.ForcePartyData();
        byte[] bytes;
        if(entity is GBPKML gb)bytes=StandaloneGb.Write(gb);
        else {bytes=new byte[entity.SIZE_PARTY];entity.WriteDecryptedDataParty(bytes);}
        var file=new PokemonFile(PathUtil.CleanFileName(entity.FileName),Convert.ToBase64String(bytes));
        var ticket=new PokemonEncounterConfirmation("encounter:"+Interlocked.Increment(ref sequence),sourceHash,Br4Editing.Hash(bytes));
        var preview=new PokemonEncounterTicket(ticket,id,PokemonReader.Read(entity,-2,id));
        frozen=file;confirmation=ticket;return preview;
    }
    internal void SetCriteria(byte[] input,EncounterCriteria value){Reset();AssertSource(input);Database.SetCriteria(value);}
    internal PokemonFile Commit(byte[] input,PokemonEncounterConfirmation ticket)
    {
        try {
            AssertSource(input);
            if(ticket is null || confirmation!=ticket || frozen is null)throw new ArgumentException("Encounter preview is missing or expired.");
            if(Br4Editing.Hash(Convert.FromBase64String(frozen.Data))!=ticket.OutputHash)throw new InvalidOperationException("Encounter frozen bytes have changed.");
            return frozen with{};
        }finally{Reset();}
    }
    internal void Discard(string token){if(confirmation?.Token==token)Reset();}
    internal void Reset(){confirmation=null;frozen=null;}
    internal void AssertSource(byte[] input)
    {
        if(input is null || Br4Editing.Hash(input)!=sourceHash || source is SAV4BR br && SaveService.OpenDatabaseSave(input) is SAV4BR selected && selected.CurrentSlot!=br.CurrentSlot)
            throw new ArgumentException("Encounter save context has changed. Reload the encounter database.");
    }
}

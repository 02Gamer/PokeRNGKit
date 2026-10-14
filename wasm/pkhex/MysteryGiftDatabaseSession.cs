// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal sealed record MysteryGiftDatabaseConfirmation(string Token,string SourceHash,string OutputHash);
internal sealed record MysteryGiftDatabaseTicket(MysteryGiftDatabaseConfirmation Confirmation,int Id,bool ConvertToSave,PokemonEntry Pokemon);
internal sealed class MysteryGiftDatabaseSession
{
    private readonly string sourceHash;
    internal string SourceHash=>sourceHash;
    private readonly SaveFile source;
    private MysteryGiftDatabaseConfirmation? confirmation;
    private PokemonFile? frozen;
    private static long sequence;
    internal MysteryGiftDatabase Database {get;}
    internal MysteryGiftDatabaseSession(byte[] input,IEnumerable<MysteryGift>? gifts=null,MysteryGiftDatabaseOptions? options=null)
    {
        if(input is null || input.Length is 0 or >32*1024*1024)throw new ArgumentException("Invalid mystery gift save size.");
        var owned=input.ToArray();sourceHash=Br4Editing.Hash(owned);source=SaveService.OpenDatabaseSave(owned);
        Database=new(source,gifts,options);
    }
    internal MysteryGift[] Search(byte[] input,MysteryGiftDatabaseQuery query){Reset();AssertSource(input);return Database.Search(query);}
    internal MysteryGiftDatabaseTicket Prepare(byte[] input,int id,bool convertToSave)
    {
        Reset();AssertSource(input);var entity=Database.Generate(id,convertToSave);entity.ForcePartyData();
        byte[] bytes;
        if(entity is GBPKML gb)bytes=StandaloneGb.Write(gb);
        else {bytes=new byte[entity.SIZE_PARTY];entity.WriteDecryptedDataParty(bytes);}
        frozen=new(PathUtil.CleanFileName(entity.FileName),Convert.ToBase64String(bytes));
        confirmation=new("mystery-gift:"+Interlocked.Increment(ref sequence),sourceHash,Br4Editing.Hash(bytes));
        return new(confirmation,id,convertToSave,PokemonReader.Read(entity,-2,id));
    }
    internal PokemonFile Commit(byte[] input,MysteryGiftDatabaseConfirmation ticket)
    {
        try {
            AssertSource(input);
            if(ticket is null || ticket!=confirmation || frozen is null)throw new ArgumentException("Mystery gift preview is missing or expired.");
            if(Br4Editing.Hash(Convert.FromBase64String(frozen.Data))!=ticket.OutputHash)throw new InvalidOperationException("Frozen gift entity has changed.");
            return frozen with{};
        }finally{Reset();}
    }
    internal void Discard(string token){if(confirmation?.Token==token)Reset();}
    internal void Reset(){confirmation=null;frozen=null;}
    internal void AssertSource(byte[] input)
    {
        if(input is null || Br4Editing.Hash(input)!=sourceHash || source is SAV4BR br && SaveService.OpenDatabaseSave(input) is SAV4BR selected && selected.CurrentSlot!=br.CurrentSlot)
            throw new ArgumentException("Mystery gift save context has changed. Reload the database.");
    }
}

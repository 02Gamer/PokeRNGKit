// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

// Keep numeric name/PP tables dense. Selection directories are a separate concern.
internal sealed record PokemonChoiceCatalog(HashSet<int> Species,HashSet<int> Items,HashSet<int> Moves,HashSet<int> Relearn)
{
    private static readonly GameDataSource Source=new(GameInfo.GetStrings("en"));
    private static HashSet<int> Ids(IEnumerable<ComboItem> values)=>values.Select(v=>v.Value).ToHashSet();
    internal static PokemonChoiceCatalog Read(SaveFile save)
    {
        var source=new FilteredGameDataSource(save,Source,PokemonEditorMode.HaX);
        return new(Ids(source.Species),Ids(source.Items),Ids(source.Moves),Ids(source.Relearn));
    }
    internal static PokemonChoiceCatalog Read(PKM p,SaveFile? save=null)
    {
        if((save??PokemonEditorContext.Save) is{} context)return Read(context);
        // Standalone files have a storage context, not a destination save. Use
        // the latest format table; Version describes origin, including transfers.
        IPersonalTable? personal=p.Context switch
        {
            EntityContext.Gen7b=>PersonalTable.GG,EntityContext.Gen8=>PersonalTable.SWSH,
            EntityContext.Gen8a=>PersonalTable.LA,EntityContext.Gen9=>PersonalTable.SV,
            EntityContext.Gen9a=>PersonalTable.ZA,_=>null,
        };
        bool hax=PokemonEditorMode.HaX;
        var species=Source.SpeciesDataSource.Where(s=>s.Value<=p.MaxSpeciesID&&(hax||personal is null||personal.IsSpeciesInGame((ushort)s.Value)));
        var items=p.Format==1?Enumerable.Empty<ComboItem>():Source.GetItemDataSource(p.Version,p.Context,HeldItems(p.Context),hax).Where(i=>i.Value<=p.MaxItemID);
        var moves=MovesFor(p.Context,p.MaxMoveID,hax);
        return new(Ids(species),Ids(items),moves,moves.ToHashSet());
    }
    private static ReadOnlySpan<ushort> HeldItems(EntityContext context)=>context switch
    {
        EntityContext.Gen1=>[],EntityContext.Gen2=>ItemStorage2.GetAllHeld(),
        EntityContext.Gen3=>ItemStorage3RS.GetAllHeld(),EntityContext.Gen4=>ItemStorage4Pt.GetAllHeld(),
        EntityContext.Gen5=>ItemStorage5.GetAllHeld(),EntityContext.Gen6=>ItemStorage6AO.GetAllHeld(),
        EntityContext.Gen7=>ItemStorage7USUM.GetAllHeld(),EntityContext.Gen7b=>[],
        EntityContext.Gen8=>ItemStorage8SWSH.GetAllHeld(),EntityContext.Gen8a=>[],
        EntityContext.Gen8b=>ItemStorage8BDSP.GetAllHeld(),EntityContext.Gen9=>ItemStorage9SV.GetAllHeld(),
        EntityContext.Gen9a=>ItemStorage9ZA.GetAllHeld(),_=>throw new ArgumentException("Unsupported entity item directory."),
    };
    private static HashSet<int> MovesFor(EntityContext context,int max,bool hax)
    {
        var source=hax?Source.HaXMoveDataSource:Source.LegalMoveDataSource;
        var dummy=MoveInfo.GetDummiedMovesHashSet(context).ToArray();
        return Ids(source.Where(m=>m.Value<=max&&(hax||
            (context==EntityContext.Gen7b?LetsGoMoves.Contains(m.Value):
                context==EntityContext.Gen8||dummy.Length==0||!MoveInfo.IsDummiedMove(dummy,(ushort)m.Value)))));
    }
    // PKHeX.Core/Moves/MoveInfo7b.cs AllowedMoves (26.08.26) is internal.
    // Keep this exact ID list covered against FilteredGameDataSource on SAV7b.
    private static readonly HashSet<int> LetsGoMoves=[..Enumerable.Range(0,165),
        182,188,200,224,227,231,242,243,247,252,257,261,263,269,270,276,280,281,339,347,
        355,364,369,389,394,398,399,403,404,405,406,417,420,430,438,446,453,483,492,499,
        503,504,525,529,583,585,603,605,606,607,729,730,731,733,734,735,736,737,738,739,
        740,742];
    internal static int ItemMaximum(PKM p,SaveFile? save=null)=>(save??PokemonEditorContext.Save)?.MaxItemID??p.MaxItemID;
    internal static void ValidateChanges(PKM p,int species,int? item,ushort[] moves,SaveFile? save=null)
    {
        var directory=Read(p,save);
        if(species!=p.Species&&!directory.Species.Contains(species))
            throw new ArgumentException("Species is outside the editor directory.");
        if(item is{} held&&held!=p.HeldItem&&!directory.Items.Contains(held))
            throw new ArgumentException("Held item is outside the editor directory.");
        if(moves is not{Length:4})throw new ArgumentException("Four move IDs are required.");
        var before=p.Moves;
        for(int i=0;i<4;i++)if(moves[i]!=before[i]&&!directory.Moves.Contains(moves[i]))
            throw new ArgumentException("Move is outside the editor directory.");
    }
    internal static void ValidateRelearn(PKM p,int[] moves,SaveFile? save=null)
    {
        if(moves is not{Length:4})throw new ArgumentException("Four relearn IDs are required.");
        var directory=Read(p,save);var before=p.RelearnMoves;
        for(int i=0;i<4;i++)if(moves[i]!=before[i]&&!directory.Relearn.Contains(moves[i]))
            throw new ArgumentException("Relearn move is outside the editor directory.");
    }
}

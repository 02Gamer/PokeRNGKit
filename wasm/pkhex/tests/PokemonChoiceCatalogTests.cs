// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class PokemonChoiceCatalogTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid directory change was accepted.");}
    private static void Mode(bool hax){SaveProgramSettingsRuntime.Reset();var s=SaveProgramSettingsCodec.Defaults();s.Startup.ForceHaXOnLaunch=hax;SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(s,SaveProgramSettingsJson.Default.SaveProgramSettings));}
    private static int[] Ids(IEnumerable<ComboItem> items)=>items.Select(i=>i.Value).Distinct().Order().ToArray();
    internal static void Run()
    {
        PokemonEditorContext.Clear();
        try
        {
            GameVersion[] versions=[GameVersion.RD,GameVersion.C,GameVersion.E,GameVersion.D,GameVersion.Pt,GameVersion.HG,GameVersion.B,GameVersion.B2,GameVersion.X,GameVersion.OR,GameVersion.SN,GameVersion.US,GameVersion.GP,GameVersion.SW,GameVersion.BD,GameVersion.PLA,GameVersion.SL,GameVersion.ZA];
            foreach(var version in versions)foreach(bool hax in new[]{false,true})
            {
                Mode(hax);var save=BlankSaveFile.Get(version,"TEST");byte[] before=save.Data.ToArray();
                var expected=new FilteredGameDataSource(save,new GameDataSource(GameInfo.GetStrings("en")),hax);
                var actual=PokemonChoiceCatalog.Read(save);
                Check(actual.Species.Order().SequenceEqual(Ids(expected.Species)),"Core species directory "+version);
                Check(actual.Items.Order().SequenceEqual(Ids(expected.Items)),"Core item directory "+version);
                if(expected.Items.Count!=actual.Items.Count)Console.WriteLine($"PASS {version}: repeated Core item IDs map to one numeric choice");
                Check(actual.Moves.Order().SequenceEqual(Ids(expected.Moves)),"Core move directory "+version);
                Check(actual.Relearn.Order().SequenceEqual(Ids(expected.Relearn)),"Core relearn directory "+version);
                var attributes=PokemonReader.Attributes(save);var moves=PokemonReader.MoveChoices(save);
                Check(attributes.Items.Length==attributes.ItemSelectable!.Length,"Dense item flags");
                Check(attributes.ItemSelectable.Select((v,i)=>(v,i)).Where(e=>e.v).Select(e=>e.i).SequenceEqual(Ids(expected.Items)),"Item flags retain IDs");
                Check(attributes.Species.All(s=>s.Selectable==actual.Species.Contains(s.Id)),"Species flags retain IDs");
                Check(moves.Select((v,i)=>(v,i)).Where(e=>e.v.Selectable==true).Select(e=>e.i).SequenceEqual(Ids(expected.Moves)),"Move flags retain IDs");
                Check(moves.Select((v,i)=>(v,i)).Where(e=>e.v.RelearnSelectable==true).Select(e=>e.i).SequenceEqual(Ids(expected.Relearn)),"Relearn flags retain IDs");
                Check(before.SequenceEqual(save.Data.ToArray()),"Catalog reads preserve save bytes");
                // An unbound entity uses the latest storage-format context. These
                // games are exactly those format endpoints (not earlier revisions).
                if(version is GameVersion.RD or GameVersion.C or GameVersion.E or GameVersion.HG or GameVersion.B2 or GameVersion.OR or GameVersion.US or GameVersion.GP or GameVersion.SW or GameVersion.BD or GameVersion.PLA or GameVersion.SL or GameVersion.ZA)
                {
                    var p=save.BlankPKM;var standalone=PokemonChoiceCatalog.Read(p);
                    Check(standalone.Species.SetEquals(actual.Species),"Standalone species context "+version);
                    Check(standalone.Items.SetEquals(actual.Items.Where(i=>i<=p.MaxItemID)),"Standalone item context "+version);
                    Check(standalone.Moves.SetEquals(actual.Moves),"Standalone move context "+version);
                    Check(standalone.Relearn.SetEquals(actual.Relearn),"Standalone relearn context "+version);
                }
                Console.WriteLine($"PASS directories {version}/HaX={hax}: Core oracle, dense IDs, separate relearn and original");
            }
            Mode(false);var sm=BlankSaveFile.Get(GameVersion.SN,"TEST");var p7=sm.BlankPKM;
            int extra=PokemonChoiceCatalog.Read(sm).Relearn.Except(PokemonChoiceCatalog.Read(sm).Moves).First();
            var list=PokemonReader.MoveChoices(sm);
            Check(list.Length==p7.MaxMoveID+1,"SM lookup retains full entity IDs including unavailable current values");
            Check(list[extra].Selectable==false&&list[extra].RelearnSelectable==true,"SM retains USUM relearn-only IDs");
            PokemonRelearn.Apply(p7,new([extra,0,0,0]),sm);Check(p7.RelearnMove1==extra,"SM stores USUM relearn value");
            var pb=new PB7{Species=25,Language=2,Nickname="TEST",OriginalTrainerName="OWNER"};pb.CurrentLevel=20;pb.RefreshChecksum();
            var normal=PokemonChoiceCatalog.Read(pb);
            int blocked=Enumerable.Range(1,pb.MaxMoveID).First(id=>!normal.Moves.Contains(id));
            Reject(()=>PokemonChoiceCatalog.ValidateChanges(pb,pb.Species,null,[(ushort)blocked,0,0,0]));
            pb.Move1=(ushort)blocked;
            PokemonChoiceCatalog.ValidateChanges(pb,pb.Species,null,pb.Moves);
            pb.Move1=0;Mode(true);PokemonChoiceCatalog.ValidateChanges(pb,pb.Species,null,[(ushort)blocked,0,0,0]);
            var gp=BlankSaveFile.Get(GameVersion.GP,"TEST");
            var held=new PB7{Species=25,Language=2,Nickname="TEST",OriginalTrainerName="OWNER"};held.CurrentLevel=20;held.RefreshChecksum();
            var basic=new PokemonEdit(0,0,held.Nickname,20,held.CurrentFriendship,held.OriginalTrainerName,held.TID16,held.SID16,[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0],[0,0,0,0],HeldItem:gp.MaxItemID);
            Reject(()=>PokemonEditing.Apply(held.Clone(),basic,false,id=>throw new Exception("Unexpected identity edit")));
            PokemonEditing.Apply(held,basic,false,id=>throw new Exception("Unexpected identity edit"),gp);
            Check(held.HeldItem==gp.MaxItemID&&held.HeldItem>held.MaxItemID,"Save-bound PB7 uses the save's larger HaX directory");
            var reloaded=StandalonePokemon.Open(StandalonePokemon.Serialize(held,true,false),"buffer.pb7",useFileFormat:true).Entity;
            Check(reloaded.HeldItem==held.HeldItem,"PB7 stores the complete save-bound held-item value");
            var gb=new PK2{Species=25,Nickname="TEST",OriginalTrainerName="OWNER"};gb.CurrentLevel=20;
            // The string catalog may end below the byte limit, even in HaX.
            // A loaded unknown ID remains intact; it is not a new menu choice.
            gb.HeldItem=gb.MaxItemID;
            StandaloneGb.Apply(gb,new(25,gb.Nickname,gb.OriginalTrainerName,1,20,[0,0,0,0],[0,0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],HeldItem:gb.MaxItemID));
            var gbReload=StandalonePokemon.Open(StandalonePokemon.Serialize(gb,true,false),"buffer.pk2",useFileFormat:true).Entity;
            Check(gbReload.HeldItem==gb.MaxItemID,"GB HaX preserves an unchanged raw byte-held-item boundary");
            Console.WriteLine("PASS separate SM relearn, normal rejection, current anomaly preservation and HaX expansion");
        }
        finally{PokemonEditorContext.Clear();SaveProgramSettingsRuntime.Reset();}
    }
}

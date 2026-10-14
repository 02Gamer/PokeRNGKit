// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Core.Searching;
using PokeRNGKit.SaveEditor;
internal static class MysteryGiftDatabaseTests
{
    internal static void Run()
    {
        var global=EncounterEvent.GetAllEvents().ToArray();
        var original=global.Cast<DataMysteryGift>().Select(gift=>gift.Data.ToArray()).ToArray();
        foreach(var gift in global) {
            var copy=MysteryGiftDatabase.Copy(gift);
            Check(copy.GetType()==gift.GetType(),"Every source gift keeps exact runtime type");
            Check(((DataMysteryGift)copy).Data.SequenceEqual(((DataMysteryGift)gift).Data),"All template bytes preserved");
        }
        var za=new WA9();Check(MysteryGiftDatabase.Copy(za) is WA9,"Z-A type survives pinned Clone defect");
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"}) {
            byte[] input=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"),before=input.ToArray();
            var save=SaveService.OpenDatabaseSave(input.ToArray());
            foreach(bool available in new[]{false,true}) {
                var db=new MysteryGiftDatabase(save,options:new(available));
                var presence=EntityPresenceFilters.GetFilterGift<MysteryGift>(save.Context,save.Generation);
                var expected=global.Where(gift=>!available || presence is null || presence(gift)).ToArray();
                Check(db.GridRows==9 && db.Results.Select(Key).SequenceEqual(expected.Select(Key)),"Full source sequence/presence/default grid");
                foreach(int comparison in Enumerable.Range(0,4))foreach(int generation in new[]{0,4,7,9,10}) {
                    var oracle=expected.Where(gift=>comparison switch{1=>gift.Generation>=generation,2=>gift.Generation==generation,3=>gift.Generation<=generation,_=>true});
                    Check(db.Search(new(Generation:generation,Comparison:comparison)).Select(Key).SequenceEqual(oracle.Select(Key)),"All source generation comparisons");
                }
                foreach(var sample in expected.Take(8)) {
                    var moves=new[]{(int)sample.Moves.Move1,-1};
                    var oracle=expected.Where(gift=>gift.Species==sample.Species && gift.HeldItem==sample.HeldItem && gift.HasMove((ushort)moves[0]) && gift.IsEgg==sample.IsEgg && gift.IsShiny==sample.IsShiny);
                    Check(db.Search(new(sample.Species,sample.HeldItem,moves,sample.IsEgg,sample.IsShiny)).Select(Key).SequenceEqual(oracle.Select(Key)),"Combined species/item/move/egg/shiny filters");
                }
                Check(db.Search(new(Instructions:"=Species=25\n\n")).Length==expected.Length,"Empty-line instructions ignored by source");
                Check(db.Search(new(Instructions:"=Species=25")).All(gift=>gift.Species==25),"Source property filter execution");
                db.Search(new());var exported=db.ExportAll();
                Check(exported.Length==expected.Length,"Complete gift export without silently dropping duplicate names");
                for(int i=0;i<exported.Length;i++) {
                    var copy=(DataMysteryGift)MysteryGiftDatabase.Copy(expected[i]);copy.GiftUsed=false;
                    Check(Convert.FromBase64String(exported[i].Data).AsSpan().SequenceEqual(copy.Write()),"Export exact owned source gift bytes");
                }
                Throws(()=>db.Search(new(Moves:[1,2,3,4,5])));Throws(()=>db.Search(new(Comparison:4)));Throws(()=>db.Generate(-1,true));
                Console.WriteLine($"PASS {fixture} mystery gift database presence={available}: source sequence, all comparisons, combined filters, instructions and full export");
            }
            Check(input.SequenceEqual(before),"Save source unchanged");
        }
        for(int i=0;i<global.Length;i++)Check(((DataMysteryGift)global[i]).Data.SequenceEqual(original[i]),"Global Core event library unchanged");
        Session();
    }
    private static void Session()
    {
        var input=File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav");
        var session=new MysteryGiftDatabaseSession(input,options:new(false));
        session.Search(input,new(Generation:6,Comparison:2));
        Check(session.Database.Results.Length>0,"Gen6 fixture has gifts");
        var native=session.Prepare(input,0,false);var result=session.Commit(input,native.Confirmation);
        Check(Br4Editing.Hash(Convert.FromBase64String(result.Data))==native.Confirmation.OutputHash,"Confirmed native entity is exactly frozen bytes");
        Throws(()=>session.Commit(input,native.Confirmation));
        var converted=session.Prepare(input,0,true);var convertedFile=session.Commit(input,converted.Confirmation);
        Check(convertedFile.FileName.EndsWith(".pk6",StringComparison.OrdinalIgnoreCase),"Prepared editor entity converted to current save format");
        var stale=session.Prepare(input,0,true);session.Search(input,new());Throws(()=>session.Commit(input,stale.Confirmation));
        session.Search(input,new(Generation:6,Comparison:2));var cancelled=session.Prepare(input,0,false);session.Discard(cancelled.Confirmation.Token);Throws(()=>session.Commit(input,cancelled.Confirmation));
        var failed=session.Prepare(input,0,false);Throws(()=>session.Prepare(input,-1,false));Throws(()=>session.Commit(input,failed.Confirmation));
        var changed=session.Prepare(input,0,false);var other=input.ToArray();other[0]^=1;Throws(()=>session.Commit(other,changed.Confirmation));Throws(()=>session.Commit(input,changed.Confirmation));
        Console.WriteLine("PASS mystery gift session: native/current format, frozen bytes, one-time/source/search/cancel/failed-preview invalidation");
    }
    private static string Key(MysteryGift gift)=>$"{gift.GetType().Name}:{gift.CardID}:{gift.Species}:{gift.Form}:{gift.Generation}:{gift.HeldItem}:{gift.Moves}";
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Throws(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Expected rejected mystery gift operation.");}
}

// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonDatabaseEditingTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"})
        {
            var save=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"))!;
            var valid=save.BlankPKM;valid.Species=25;valid.CurrentLevel=5;valid.Valid=true;
            save.SetBoxSlotAtIndex(valid,0,0,EntityImportSettings.None);
            var original=save.Data.ToArray();
            var db=new PokemonDatabase(save,[],new(FilterUnavailableSpecies:false));
            Check(save.Data.SequenceEqual(original),"Database read does not serialize dirty source");
            var row=db.Rows.First(r=>r.Source=="current" && r.Entry.Source is SlotInfoBox {Box:0,Slot:0});
            if(fixture=="BD") Check(save.GetBoxSlotAtIndex(0,0).Stat_HPCurrent==0 && row.Entry.Entity.Stat_HPCurrent>0,"BDSP display HP normalization keeps original slot and does not falsely reject deletion");
            var deleted=db.DeleteCurrent(save,row.Id);
            Check(save.Data.SequenceEqual(original),"Delete preparation does not serialize dirty source");
            var oracle=OracleCopy(save);oracle.SetBoxSlotAtIndex(oracle.BlankPKM,0,0,EntityImportSettings.None);
            Check(deleted.Write().Span.SequenceEqual(oracle.Write().Span),"Delete exact complete source blank/write");
            var changed=OracleCopy(save);var other=valid.Clone();other.Species=1;other.Valid=true;changed.SetBoxSlotAtIndex(other,0,0,EntityImportSettings.None);
            Reject(()=>db.DeleteCurrent(changed,row.Id));
            foreach(bool clear in new[]{false,true})foreach(bool overwrite in new[]{false,true})
            {
                var result=db.Import(save,[row.Id],1,clear,overwrite,EntityImportSettings.None);
                Check(save.Data.SequenceEqual(original),"Import preparation does not serialize dirty source");
                var expected=OracleCopy(save);int count=expected.LoadBoxes([row.Entry.Entity.Clone()],out _,1,clear,overwrite,EntityImportSettings.None);
                Check(result.Count==count && result.Save.Write().Span.SequenceEqual(expected.Write().Span),"Database bulk import source options/whole-file bytes");
            }
            foreach(var rejected in db.Rows.Where(r=>r.Entry.Source is not SlotInfoBox))Reject(()=>db.DeleteCurrent(save,rejected.Id));
            Reject(()=>db.Import(save,[row.Id,row.Id],0,false,false,EntityImportSettings.None));
            Reject(()=>db.Import(save,[row.Id],save.BoxCount,false,false,EntityImportSettings.None));
            Check(save.Data.SequenceEqual(original),"Delete/import/rejections preserve complete original save");
            Console.WriteLine($"PASS database editing {fixture}: current box deletion, changed/party rejection, all source import options/full output and immutable original");
        }
    }
    private static SaveFile OracleCopy(SaveFile save)
    {
        var snapshot=save.Data.ToArray();
        var copy=save.Clone();snapshot.CopyTo(save.Data);return copy;
    }
    private static void Check(bool v,string message){if(!v)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid database write accepted");}
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class SaveFolderListTests
{
    internal static void Run()
    {
        var input=new List<SaveFolderFile>();int sequence=0;
        foreach(string version in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"}){
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            input.Add(new("file"+sequence,version+".sav","selected",data,1735736400000+sequence*1000,Backup:true));sequence++;
        }
        input.Add(input[0] with{Id="excluded",Name="backup"});
        input.Add(input[0] with{Id="remembered",Name="main.bak",Remembered=true});
        input.Add(input[0] with{Id="bad",Name="unknown.bin",Data=[1,2,3]});
        var before=input.Select(f=>f.Data.ToArray()).ToArray();var list=new SaveFolderList(input);
        Check(list.Errors.Single().Id=="bad"&&list.Rows.Length==15,"Complete recognition and per-file errors");
        Check(!list.Read(new()).Any(row=>row.Id=="excluded")&&list.Read(new()).Any(row=>row.Id=="remembered"),"Source recent backup exclusion and remembered exception");
        foreach(var row in list.Rows){
            var file=input.Single(f=>f.Id==row.Id);var save=SaveService.OpenDatabaseSave(file.Data.ToArray());save.Metadata.SetExtraInfo(file.Name);if(save.Generation<=3)SaveLanguage.TryRevise(save);var source=new SavePreview(save,file.Folder,file.Name);
            Check(row.Ot==source.OT&&row.Generation==source.G&&row.Game==source.Game&&row.Played==source.Played&&row.Tid==source.TID&&row.Sid==source.SID&&row.Name==source.Name,"All source SavePreview fields preserve Core formats");
            foreach(var entry in new[]{("zh-Hans",row.GameName.Zh),("en",row.GameName.En),("ja",row.GameName.Ja)}){
                var games=new GameDataSource(GameInfo.GetStrings(entry.Item1)).VersionDataSource;
                var direct=games.FirstOrDefault(game=>game.Value==(int)save.Version);
                var expected=direct?.Text??string.Join(" / ",games.Where(game=>save.Version.Contains((GameVersion)game.Value)&&((GameVersion)game.Value).IsValidSavedVersion()).Select(game=>game.Text));
                Check(entry.Item2==expected&&entry.Item2.Length>0,"Every game/group name preserves Core three-language sources");
            }
            Check(row.FileTime==DateTimeOffset.FromUnixTimeMilliseconds(file.Modified).UtcDateTime.ToString("yyyy.MM.dd:hh:mm:ss",CultureInfo.InvariantCulture),"Exact UTC 12-hour source timestamp");
            var opened=list.Open(row.Id);opened.Data[0]^=1;Check(list.Open(row.Id).Data.SequenceEqual(file.Data),"Opened copies cannot mutate retained source");
        }
        var originalCulture=CultureInfo.CurrentCulture;
        foreach(string culture in new[]{"zh-CN","en-US","ja-JP"})foreach(bool backup in new[]{false,true})foreach(int column in Enumerable.Range(0,9))foreach(bool reverse in new[]{false,true}){
            CultureInfo.CurrentCulture=CultureInfo.GetCultureInfo(culture);
            var expected=list.Rows.Where(r=>backup?r.Backup:r.Recent).ToList();
            expected.Sort((a,b)=>(reverse?-1:1)*(column switch{1=>Comparer<int>.Default.Compare(a.Generation,b.Generation),2=>Comparer<GameVersion>.Default.Compare(a.Game,b.Game),_=>Comparer<string>.Default.Compare(SaveFolderList.Cell(a,column),SaveFolderList.Cell(b,column))}));
            var actual=list.Read(new(backup,Sort:column,Descending:reverse,Culture:culture));
            Check(actual.Select(r=>r.Id).SequenceEqual(expected.Select(r=>r.Id)),"Every source column uses its actual comparer and sorting order");
            var text=SaveFolderList.Cell(expected[0],column).ToUpper(CultureInfo.CurrentCulture);
            var filtered=list.Read(new(backup,column,text,column,reverse,culture));
            Check(filtered.Select(r=>r.Id).SequenceEqual(expected.Where(r=>SaveFolderList.Cell(r,column).Contains(text,StringComparison.CurrentCultureIgnoreCase)).Select(r=>r.Id)),"Single-column culture-aware contains after sorting");
        }
        CultureInfo.CurrentCulture=originalCulture;
        Check(list.Read(new(Text:"never matches")).Length==list.Read(new()).Length,"Any column ignores filter text");
        Reject(()=>new SaveFolderList([input[0],input[0]]));Reject(()=>list.Read(new(Column:9)));Reject(()=>list.Read(new(Culture:"bad")));Reject(()=>list.Open("bad"));
        var sourceSave=SaveService.OpenDatabaseSave(input[0].Data.ToArray());sourceSave.Metadata.SetExtraInfo("main");SaveLanguage.TryRevise(sourceSave);var canonical=sourceSave.Metadata.GetBackupFileName("");
        var cleanup=new SaveFolderList([input[0] with{Id="old",Name="main [old].bak"},input[0] with{Id="same",Name=canonical},input[0] with{Id="invalid",Name="invalid",Data=[0]}]);
        var plan=cleanup.PlanCleanup(true);Check(plan.Any(p=>p.Id=="old"&&p.Action=="remove")&&plan.Any(p=>p.Id=="invalid"&&p.Action=="remove"),"Canonical collision and unrecognized cleanup plan match source without deleting data");
        var renamed=new SaveFolderList([input[0] with{Id="only",Name="main [old].bak",Backup=true}]);
        Check(renamed.PlanCleanup(false).Single()==new SaveFolderCleanup("only","rename",canonical),"Canonical rename plan uses Core backup naming");
        var separate=new SaveFolderList([input[0] with{Id="a",Folder="one"},input[0] with{Id="b",Folder="two"}]);
        Check(separate.Read(new()).Length==2&&separate.PlanCleanup(false).Length==0,"Identical relative names in separate chosen folders keep distinct identities");
        for(int i=0;i<input.Count;i++)Check(input[i].Data.SequenceEqual(before[i]),"All read/filter/open/cleanup/rejection keep original bytes");
        Console.WriteLine("PASS save folder list: 13 formats, Core preview fields, both lists/all columns/three cultures, backup rules, copied open, non-destructive cleanup plan and source preservation");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid save folder input accepted");}
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record SaveFolderFile(string Id,string Name,string Folder,byte[] Data,long Modified,bool Recent=true,bool Backup=false,bool Remembered=false);
internal sealed record SaveFolderRow(string Id,string SourceHash,string Ot,int Generation,GameVersion Game,LocalizedText GameName,string Played,
    string FileTime,string Tid,string Sid,string Folder,string Name,bool Recent,bool Backup,string Format);
internal sealed record SaveFolderLoadError(string Id,string Name,string Error);
internal sealed record SaveFolderQuery(bool Backup=false,int Column=-1,string Text="",int Sort=-1,bool Descending=false,string Culture="en-US",string? FolderRoot=null);
internal sealed record SaveFolderCleanup(string Id,string Action,string Name);

// Source SAV_FolderList/SavePreview. Only explicit files enter this model; no
// host paths, directory scan, filesystem mutation, or automatic cleanup occurs.
internal sealed class SaveFolderList
{
    private readonly SaveLibraryScope? scope=SaveProgramSettingsRuntime.Current is {} settings?new(settings):null;
    private readonly Dictionary<string,SaveFolderFile> files=new(StringComparer.Ordinal);
    private readonly Dictionary<string,SaveFile> saves=new(StringComparer.Ordinal);
    internal SaveFolderRow[] Rows {get;}
    internal SaveFolderLoadError[] Errors {get;}
    internal static readonly string[] Columns=["OT","G","Game","Played","FileTime","TID","SID","Folder","Name"];
    internal SaveFolderList(IReadOnlyList<SaveFolderFile> input)
    {
        if(input is null||input.Count>1024||input.Any(f=>f is null)||input.Sum(f=>(long)(f.Data?.Length??0))>128L*1024*1024)throw new ArgumentException("Invalid save folder sources.");
        var rows=new List<SaveFolderRow>();var errors=new List<SaveFolderLoadError>();
        foreach(var file in input){
            if(string.IsNullOrEmpty(file.Id)||file.Id.Length>128||files.ContainsKey(file.Id)||string.IsNullOrEmpty(file.Name)||file.Name.Length>4096||file.Folder is null||file.Folder.Length>4096||file.Data is null||file.Data.Length is 0 or >32*1024*1024||file.Modified<0||file.Modified>253402300799999)
                throw new ArgumentException("Invalid save folder file.");
            var owned=file with{Data=file.Data.ToArray()};files.Add(owned.Id,owned);
            if(!TryRead(owned,out var save)){
                errors.Add(new(owned.Id,owned.Name,"unrecognized"));continue;
            }
            saves.Add(owned.Id,save!);
            var preview=new SavePreview(save,owned.Folder,owned.Name);
            rows.Add(new(owned.Id,Br4Editing.Hash(owned.Data),preview.OT,preview.G,preview.Game,GameName(save),preview.Played,
                DateTimeOffset.FromUnixTimeMilliseconds(owned.Modified).UtcDateTime.ToString("yyyy.MM.dd:hh:mm:ss",CultureInfo.InvariantCulture),
                preview.TID,preview.SID,preview.Folder,preview.Name,
                scope?.Recent(owned)??(owned.Recent&&(owned.Remembered||!SaveUtil.IsBackupFilePath(owned.Name))),scope?.Backup(owned)??owned.Backup,save.GetType().Name));
        }
        Rows=rows.OrderByDescending(row=>files[row.Id].Modified).ToArray();Errors=errors.ToArray();
    }
    private static LocalizedText GameName(SaveFile save)
    {
        string Name(string language){var strings=PKHeX.Core.GameInfo.GetStrings(language);
            var source=new PKHeX.Core.GameDataSource(strings).VersionDataSource;var direct=source.FirstOrDefault(v=>v.Value==(int)save.Version);
            return direct?.Text??string.Join(" / ",source.Where(v=>((PKHeX.Core.GameVersion)save.Version).Contains((PKHeX.Core.GameVersion)v.Value)&&((PKHeX.Core.GameVersion)v.Value).IsValidSavedVersion()).Select(v=>v.Text));}
        return new(Name("zh-Hans"),Name("en"),Name("ja"));
    }
    private static bool TryRead(SaveFolderFile file,out SaveFile? save)
    {
        save=null;
        try{
            if(!SaveUtil.IsSizeValid(file.Data.Length)||!SaveUtil.TryGetSaveFile(file.Data.ToArray(),out save,file.Name))return false;
            save.Metadata.SetExtraInfo(file.Name);if(save.Generation<=3)SaveLanguage.TryRevise(save);return true;
        }catch{save=null;return false;}
    }
    internal SaveFolderRow[] Read(SaveFolderQuery query)
    {
        if(query is null||query.Column is <-1 or >8||query.Sort is <-1 or >8||query.Text is null||query.Text.Length>32767||query.FolderRoot?.Length>32767||query.Culture is not("zh-CN" or "en-US" or "ja-JP"))throw new ArgumentException("Invalid save folder query.");
        var old=CultureInfo.CurrentCulture;
        try{
            CultureInfo.CurrentCulture=CultureInfo.GetCultureInfo(query.Culture);
            var selected=Rows.Where(row=>query.FolderRoot is {} root?SaveLibraryScope.Within(row.Folder,root):query.Backup?row.Backup:row.Recent).ToList();
            if(query.Sort>=0)selected.Sort((a,b)=>(query.Descending?-1:1)*Compare(a,b,query.Sort));
            if(query.Column>=0&&query.Text.Length!=0)selected.RemoveAll(row=>!Cell(row,query.Column).Contains(query.Text,StringComparison.CurrentCultureIgnoreCase));
            return selected.ToArray();
        }finally{CultureInfo.CurrentCulture=old;}
    }
    internal SaveFolderFile Open(string id)=>files.TryGetValue(id,out var file)&&saves.ContainsKey(id)?file with{Data=file.Data.ToArray()}:throw new ArgumentException("Unknown save folder entry.");
    internal SaveFolderCleanup[] PlanCleanup(bool deleteUnrecognized)
    {
        var result=new List<SaveFolderCleanup>();
        var names=files.Values.Select(file=>(file.Folder,file.Name.Replace('\\','/'))).ToHashSet();
        foreach(var file in files.Values.Where(file=>file.Backup||scope?.BackupRoot(file.Folder)==true)){
            // Desktop CleanBackups uses Directory.GetFiles without recursion.
            if(file.Name.IndexOfAny(['/', '\\'])>=0)continue;
            if(!saves.TryGetValue(file.Id,out var save)){if(deleteUnrecognized)result.Add(new(file.Id,"remove",file.Name));continue;}
            int index=file.Name.IndexOf(" [",StringComparison.OrdinalIgnoreCase);if(index<0)continue;
            var owned=PokemonDatabase.Copy(save);owned.Metadata.SetExtraInfo(file.Name[..index]);
            var name=owned.Metadata.GetBackupFileName(Path.GetDirectoryName(file.Name)??"").Replace('\\','/');
            if(name==file.Name)continue;
            result.Add(new(file.Id,names.Contains((file.Folder,name))?"remove":"rename",name));
            names.Add((file.Folder,name));names.Remove((file.Folder,file.Name.Replace('\\','/')));
        }
        return result.ToArray();
    }
    internal static string Cell(SaveFolderRow row,int column)=>column switch{
        0=>row.Ot,1=>row.Generation.ToString(CultureInfo.CurrentCulture),2=>row.Game.ToString(),3=>row.Played,
        4=>row.FileTime,5=>row.Tid,6=>row.Sid,7=>row.Folder,8=>row.Name,_=>throw new ArgumentException("Invalid save folder column.")};
    private static int Compare(SaveFolderRow a,SaveFolderRow b,int column)=>column switch{
        1=>Comparer<int>.Default.Compare(a.Generation,b.Generation),2=>Comparer<GameVersion>.Default.Compare(a.Game,b.Game),
        _=>Comparer<string>.Default.Compare(Cell(a,column),Cell(b,column))};
}

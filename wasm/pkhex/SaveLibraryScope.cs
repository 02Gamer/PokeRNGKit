// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed class SaveLibraryScope
{
    private readonly string backup;
    private readonly string[] extra;
    internal static readonly string[] ConsolePaths=SaveFinder.Get3DSBackupPaths("").Concat(SaveFinder.GetSwitchBackupPaths(""))
        .Select(Normalize).ToArray();
    internal SaveLibraryScope(SaveProgramSettings settings)
    {
        backup=Normalize(settings.LocalResources.BackupPath);
        extra=settings.Backup.OtherBackupPaths.Where(path=>!string.IsNullOrWhiteSpace(path)).Select(Normalize)
            .Where(path=>path!=backup).Distinct(StringComparer.Ordinal).ToArray();
    }
    internal static string Normalize(string path)
    {
        var value=path.Trim().Replace('\\','/').TrimEnd('/');
        return value.Length==0?"local":value;
    }
    internal static bool Within(string folder,string root)
    {
        var a=Normalize(folder);var b=Normalize(root);
        return a==b||a.StartsWith(b+"/",StringComparison.Ordinal);
    }
    internal static bool ConsoleFolder(string folder)
    {
        var value=Normalize(folder);
        foreach(var path in ConsolePaths) {
            if(Within(value,path))return true;
            var marker="/"+path;int at=0;
            while((at=value.IndexOf(marker,at,StringComparison.Ordinal))>=0) {
                if(at+marker.Length==value.Length||value[at+marker.Length]=='/')return true;
                at++;
            }
        }
        return false;
    }
    internal bool Recent(SaveFolderFile file)=>(file.Recent||extra.Any(path=>Within(file.Folder,path))||ConsoleFolder(file.Folder))
        &&(file.Remembered||!SaveUtil.IsBackupFilePath(file.Name));
    internal bool Backup(SaveFolderFile file)=>file.Backup||Within(file.Folder,backup);
    internal bool BackupRoot(string folder)=>Normalize(folder)==backup;
}

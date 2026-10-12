// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record FestaRequest([property:JsonRequired]string SourceHash,[property:JsonRequired]FestaAction[] Actions,[property:JsonRequired]int Selected,[property:JsonRequired]FestaFacilityState Facility);
public sealed record FestaConfirmation([property:JsonRequired]string Token,[property:JsonRequired]string SourceHash,[property:JsonRequired]string TargetHash);
public sealed record FestaAgencyFile(int Index,bool Encrypted,string Name,string Data);
public sealed record FestaTicket(string Token,string SourceHash,string TargetHash,FestaCatalog Before,FestaCatalog Result,int[] ChangedOffsets,FestaAgencyFile[] Files);
internal static class FestivalPlazaSession
{
    private static byte[]? output;private static FestaConfirmation? current;private static long revision;
    internal static void Reset(){output=null;current=null;}
    internal static FestaTicket Prepare(byte[] original,FestaRequest request)
    {
        Reset();string hash=Br4Editing.Hash(original);if(request.SourceHash!=hash)throw new ArgumentException("Festival Plaza preview is stale.");var source=SaveUtil.GetSaveFile(original.ToArray())??throw new ArgumentException("Festival Plaza save is unrecognized.");var before=FestivalPlazaEditing.Read(source,hash);var prepared=FestivalPlazaActions.Prepare(original,request.Actions,request.Selected,request.Facility);string target=Br4Editing.Hash(prepared);var after=SaveUtil.GetSaveFile(prepared.ToArray())??throw new InvalidOperationException("Festival Plaza prepared output is unrecognized.");var result=FestivalPlazaEditing.Read(after,target);var model=new FestivalPlazaActions(after);var files=result.Usum?Enumerable.Range(0,3).SelectMany(index=>new[]{false,true}.Select(encrypted=>new FestaAgencyFile(index,encrypted,$"Agency-{index+1}.{(encrypted?"ek7":"pk7")}",Convert.ToBase64String(model.ExportAgency(index,encrypted))))).ToArray():[];
        string token="festa:"+(++revision).ToString(CultureInfo.InvariantCulture);var ticket=new FestaTicket(token,hash,target,before,result,Enumerable.Range(0,original.Length).Where(i=>original[i]!=prepared[i]).ToArray(),files);output=prepared;current=new(token,hash,target);return ticket;
    }
    internal static byte[] Commit(byte[] original,FestaConfirmation confirmation)
    {
        if(current is null||output is null||confirmation!=current)throw new ArgumentException("Festival Plaza preview is missing or replaced.");if(Br4Editing.Hash(original)!=current.SourceHash)throw new ArgumentException("Festival Plaza preview is stale.");if(Br4Editing.Hash(output)!=current.TargetHash)throw new InvalidOperationException("Festival Plaza frozen output verification failed.");var copy=output.ToArray();Reset();return copy;
    }
    internal static void Discard(string token){if(current?.Token==token)Reset();}
}
public static partial class SaveService
{
    public static string ReadFestivalPlaza(byte[] data)=>JsonSerializer.Serialize(FestivalPlazaEditing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.FestaCatalog);
    public static string PreviewFestivalPlaza(byte[] data,string json)
    {
        FestivalPlazaSession.Reset();if(json.Length>4*1024*1024)throw new ArgumentException("Festival Plaza request is too large.");var request=JsonSerializer.Deserialize(json,SaveJsonContext.Default.FestaRequest)??throw new ArgumentException("Missing Festival Plaza request.");return JsonSerializer.Serialize(FestivalPlazaSession.Prepare(data,request),SaveJsonContext.Default.FestaTicket);
    }
    public static byte[] CommitFestivalPlaza(byte[] data,string json)
    {
        if(json.Length>4096)throw new ArgumentException("Festival Plaza confirmation is too large.");return FestivalPlazaSession.Commit(data,JsonSerializer.Deserialize(json,SaveJsonContext.Default.FestaConfirmation)??throw new ArgumentException("Missing Festival Plaza confirmation."));
    }
    public static void DiscardFestivalPlaza(string token)=>FestivalPlazaSession.Discard(token);
}

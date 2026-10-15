// SPDX-License-Identifier: GPL-3.0-or-later
// Source: Main.ClickShowdownImportPKM and PKMEditor.LoadShowdownSetDefault.
using System.Globalization;
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record BattleTemplateTarget([property:JsonRequired]string Kind,int Box=0,int Slot=0,string? FileName=null,bool InputEncrypted=false,bool UseFileFormat=false);
internal sealed record BattleTemplateImportRequest([property:JsonRequired]string SourceHash,[property:JsonRequired]BattleTemplateTarget Target,[property:JsonRequired]string Text);
public sealed record BattleTemplateImportConfirmation([property:JsonRequired]string Token,[property:JsonRequired]string SourceHash,[property:JsonRequired]string TargetHash,[property:JsonRequired]BattleTemplateTarget Target,bool AcceptIssues=false);
internal sealed record BattleTemplateImportTicket(string Token,string SourceHash,string TargetHash,BattleTemplateTarget Target,
    LocalizedText Before,LocalizedText Result,LocalizedText Parsed,LocalizedText[] Issues,int ChangedBytes,
    string BeforePid,string ResultPid,string BeforeEncryptionConstant,string ResultEncryptionConstant);
internal static class BattleTemplateImport
{
    internal const int MaximumTextLength=1024*1024;
    private static byte[]? frozen;
    private static BattleTemplateImportConfirmation? current;
    private static string? policy;
    private static string? context;
    private static bool needsAcknowledgement;
    private static long revision;
    internal static void Reset(){frozen=null;current=null;policy=null;context=null;needsAcknowledgement=false;}
    internal static void Discard(string token){if(current?.Token==token)Reset();}
    private static string Policy()=>JsonSerializer.Serialize(SaveProgramSettingsRuntime.Current??SaveProgramSettingsCodec.Defaults(),SaveProgramSettingsJson.Default.SaveProgramSettings);
    internal static string Context(SaveFile save)=>$"{save.GetType().Name}:{(int)save.Version}:{save.Language}:{(save is SAV4BR br?br.CurrentSlot:-1)}";
    internal static string FileName(BattleTemplateTarget target)=>target.FileName is {Length:>0 and <=1024} name?name:throw new ArgumentException("Missing battle template entity file name.");
    internal static ShowdownSet Parse(BattleTemplateImportRequest request,byte[] input)
    {
        if(request.Target is null || request.SourceHash!=Br4Editing.Hash(input) || request.Text is null || request.Text.Length is 0 or >MaximumTextLength)
            throw new ArgumentException("Battle template input or source is invalid.");
        if(request.Target.Kind=="save" && (request.Target.FileName is not null||request.Target.InputEncrypted||request.Target.UseFileFormat))
            throw new ArgumentException("Save template target cannot contain entity file options.");
        if(request.Target.Kind=="file" && (request.Target.Box!=0||request.Target.Slot!=0))
            throw new ArgumentException("Entity template target cannot contain storage positions.");
        // Deliberately use the local parser. BattleTemplateTeams.TryGetSets can fetch URLs.
        var set=ShowdownParsing.GetShowdownSets(request.Text).FirstOrDefault();
        if(set is null || set.Species==0)throw new ArgumentException("No recognizable Pokemon battle template.");
        return set;
    }
    internal static PKM Apply(PKM original,ShowdownSet set)
    {
        var result=original.Clone();result.ApplySetDetails(set);return result;
    }
    internal static byte[] Stored(SaveFile save,BattleTemplateTarget target)
    {
        var pk=PokemonEditing.Read(save,target.Box,target.Slot);
        // GB single-file containers include party-only fields even for a boxed
        // entity. Compare the complete list/header/names at the actual slot width.
        bool party=target.Box==-1;
        if(pk is PK1 g1){var bytes=new byte[PokeList1.GetListLength(1,g1.Japanese,party)];PokeList1.WriteToList(bytes,g1,isParty:party);return bytes;}
        if(pk is PK2 g2){var bytes=new byte[PokeList2.GetListLength(1,g2.Japanese,party)];PokeList2.WriteToList(bytes,g2,isParty:party);return bytes;}
        return StorageEditing.StoredData(save,new(target.Box,target.Slot));
    }
    internal static BattleTemplateImportTicket Freeze(byte[] input,BattleTemplateImportRequest request,ShowdownSet set,PKM original,PKM result,byte[] output,string saveContext)
    {
        var template=SaveProgramSettingsRuntime.Current?.BattleTemplate.Export??new BattleTemplateSettings().Export;
        LocalizedText Text(PKM pk)=>new(
            ShowdownParsing.GetShowdownText(pk,template.GetSettings(LanguageID.ChineseS,pk.Context)),
            ShowdownParsing.GetShowdownText(pk,template.GetSettings(LanguageID.English,pk.Context)),
            ShowdownParsing.GetShowdownText(pk,template.GetSettings(LanguageID.Japanese,pk.Context)));
        var parsed=new LocalizedText(set.GetText(template.GetSettings(LanguageID.ChineseS,set.Context)),set.GetText(template.GetSettings(LanguageID.English,set.Context)),set.GetText(template.GetSettings(LanguageID.Japanese,set.Context)));
        var issues=set.InvalidLines.Select(error=>new LocalizedText(error.Humanize(BattleTemplateParseErrorLocalization.Get("zh-Hans")),error.Humanize(BattleTemplateParseErrorLocalization.Get("en")),error.Humanize(BattleTemplateParseErrorLocalization.Get("ja")))).ToArray();
        var hash=Br4Editing.Hash(output);string token="battle-template:"+(++revision).ToString(CultureInfo.InvariantCulture);
        int changed=Math.Abs(input.Length-output.Length);for(int i=0;i<Math.Min(input.Length,output.Length);i++)if(input[i]!=output[i])changed++;
        var ticket=new BattleTemplateImportTicket(token,request.SourceHash,hash,request.Target,Text(original),Text(result),parsed,issues,changed,
            original.PID.ToString("X8"),result.PID.ToString("X8"),original.EncryptionConstant.ToString("X8"),result.EncryptionConstant.ToString("X8"));
        current=new(token,request.SourceHash,hash,request.Target);frozen=output.ToArray();policy=Policy();context=saveContext;needsAcknowledgement=issues.Length!=0;
        return ticket;
    }
    internal static byte[] Commit(byte[] input,BattleTemplateImportConfirmation confirmation,string saveContext)
    {
        if(current is null||frozen is null||(confirmation with{AcceptIssues=false})!=current)throw new ArgumentException("Battle template preview is missing or replaced.");
        if(Br4Editing.Hash(input)!=current.SourceHash||Policy()!=policy||saveContext!=context)throw new ArgumentException("Battle template preview is stale.");
        if(needsAcknowledgement&&!confirmation.AcceptIssues)throw new ArgumentException("Acknowledge battle template parse issues before applying.");
        if(Br4Editing.Hash(frozen)!=current.TargetHash)throw new InvalidOperationException("Frozen battle template output changed.");
        var output=frozen.ToArray();Reset();return output;
    }
}
public static partial class SaveService
{
    public static string PreviewBattleTemplateImport(byte[] input,string json)
    {
        BattleTemplateImport.Reset();
        if(json is null||json.Length>7*BattleTemplateImport.MaximumTextLength+4096)throw new ArgumentException("Battle template request is too large.");
        var request=JsonSerializer.Deserialize(json,BattleTemplateImportJson.Default.BattleTemplateImportRequest)??throw new ArgumentException("Missing battle template request.");
        var set=BattleTemplateImport.Parse(request,input);PKM original;PKM result;byte[] output;string context;
        if(request.Target.Kind=="file") {
            var file=StandalonePokemon.Open(input,BattleTemplateImport.FileName(request.Target),request.Target.InputEncrypted,request.Target.UseFileFormat);
            original=file.Entity;result=BattleTemplateImport.Apply(original,set);output=result is GBPKML gb?StandaloneGb.Write(gb):StandalonePokemon.Serialize(result,file.Party,false);context="file";
        }else if(request.Target.Kind=="save") {
            var save=Open(input);if(!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Battle template import requires an exportable save with valid checksums.");
            context=BattleTemplateImport.Context(save);original=PokemonEditing.Read(save,request.Target.Box,request.Target.Slot).Clone();
            StorageEditing.Writable(save,new(request.Target.Box,request.Target.Slot));result=BattleTemplateImport.Apply(original,set);
            if(request.Target.Box==-1)save.SetPartySlotAtIndex(result,request.Target.Slot,EntityImportSettings.None);
            else save.SetBoxSlotAtIndex(result,request.Target.Box,request.Target.Slot,EntityImportSettings.None);
            var expected=BattleTemplateImport.Stored(save,request.Target);int partyCount=save.PartyCount;
            output=save.Write().ToArray();var reopened=OpenDerived(output);
            if(output.Length!=input.Length||!SaveChecksums.Valid(reopened)||reopened.GetType()!=save.GetType()||reopened.PartyCount!=partyCount||!BattleTemplateImport.Stored(reopened,request.Target).SequenceEqual(expected))
                throw new InvalidOperationException($"Battle template save export verification failed: {save.GetType().Name}, length={output.Length==input.Length}, checksum={SaveChecksums.Valid(reopened)}, type={reopened.GetType()==save.GetType()}, party={reopened.PartyCount==partyCount}, stored={BattleTemplateImport.Stored(reopened,request.Target).SequenceEqual(expected)}, target={request.Target.Box}:{request.Target.Slot}.");
        }else throw new ArgumentException("Unknown battle template target.");
        return JsonSerializer.Serialize(BattleTemplateImport.Freeze(input,request,set,original,result,output,context),BattleTemplateImportJson.Default.BattleTemplateImportTicket);
    }
    public static byte[] CommitBattleTemplateImport(byte[] input,string json)
    {
        if(json is null||json.Length>4096)throw new ArgumentException("Battle template confirmation is too large.");
        var confirmation=JsonSerializer.Deserialize(json,BattleTemplateImportJson.Default.BattleTemplateImportConfirmation)??throw new ArgumentException("Missing battle template confirmation.");
        if(confirmation.Target is null)throw new ArgumentException("Missing battle template target.");
        return BattleTemplateImport.Commit(input,confirmation,confirmation.Target.Kind=="save"?BattleTemplateImport.Context(Open(input)):"file");
    }
}
public static partial class Program
{
    [JSExport]public static string PreviewBattleTemplateImport(byte[] input,string json)=>SaveService.PreviewBattleTemplateImport(input,json);
    [JSExport]public static byte[] CommitBattleTemplateImport(byte[] input,string json)=>SaveService.CommitBattleTemplateImport(input,json);
    [JSExport]public static void DiscardBattleTemplateImport(string token)=>BattleTemplateImport.Discard(token);
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(BattleTemplateImportRequest))]
[JsonSerializable(typeof(BattleTemplateImportTicket))]
[JsonSerializable(typeof(BattleTemplateImportConfirmation))]
internal partial class BattleTemplateImportJson:JsonSerializerContext{}

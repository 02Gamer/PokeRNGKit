// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record PokemonDraftStep([property:JsonRequired]string Kind, [property:JsonIgnore(Condition=JsonIgnoreCondition.WhenWritingDefault)]JsonElement Edit=default,string[]? Fields=null,PokemonVitalsEdit[]? Edits=null);
internal sealed record PokemonDraftSection([property:JsonRequired]string Section,[property:JsonRequired]PokemonDraftStep[] Steps);
internal sealed record PokemonDraftCapture([property:JsonRequired]string Scope,[property:JsonRequired]PokemonDraftSection[] Sections);
internal static class PokemonDraftPreparing
{
    private static readonly HashSet<string> BasicFields=["nickname","ot","level","friendship","tid","sid","trainerIds","ivs","evs","moves","movePp","movePpUps","nature","statAlignment","abilityIndex","heldItem","identity"];
    private static readonly HashSet<string> GbFields=["species","nickname","ot","tid","level","dvs","statExperience","moves","movePp","movePpUps","friendship","heldItem"];
    private static readonly HashSet<string> RawActions=["origin","trainerDetails","history","care","ribbons","memory","training","markings","encounter","formArgument","relearn","alphaMove","advancedStats","specialStatus","dimensions","legacyDetails","expert","values","egg"];
    internal static T Read<T>(JsonElement value,JsonTypeInfo<T> type) where T:class
    {
        if(value.ValueKind!=JsonValueKind.Object)throw new ArgumentException("Missing typed editor draft.");
        var names=type.Properties.Select(p=>p.Name).ToHashSet(StringComparer.Ordinal);var seen=new HashSet<string>(StringComparer.Ordinal);
        foreach(var property in value.EnumerateObject())if(property.Name is "box" or "slot"||!seen.Add(property.Name)||!names.Contains(property.Name))throw new ArgumentException("Unknown, duplicate or positioned editor field.");
        return value.Deserialize(type)??throw new ArgumentException("Missing typed editor draft.");
    }
    private static HashSet<string> Mask(PokemonDraftStep step,HashSet<string> allowed)
    {
        if(step.Fields is not{Length:>0 and <=32}||step.Fields.Any(f=>f is null||!allowed.Contains(f))||step.Fields.Distinct(StringComparer.Ordinal).Count()!=step.Fields.Length||step.Edits is not null)throw new ArgumentException("Invalid editor field mask.");
        foreach(string field in step.Fields)if(!step.Edit.TryGetProperty(field,out var value)||value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)throw new ArgumentException("Masked editor value is missing.");
        return step.Fields.ToHashSet(StringComparer.Ordinal);
    }
    internal static PKM Prepare(SaveFile save,PKM original,PokemonPosition source,PokemonDraftCapture capture,bool? editorParty=null)
        =>PrepareCore(save,original,new(source.Box==-1,source.Box,source.Slot),capture,editorParty);
    // Extra storage keeps its own identity. Only editing semantics enter this
    // helper; no extra record is resolved as a box/party position.
    internal static PKM PrepareExtra(SaveFile save,PKM original,SlotInfoMisc slot,PokemonDraftCapture capture,bool? editorParty=null)
        =>PrepareCore(save,original,new(slot.PartyFormat,slot.PartyFormat?-1:0,slot.Slot),capture,editorParty);
    internal static PKM PrepareFile(PKM original,PokemonDraftCapture capture,bool party)
    {
        var save=PokemonEditorContext.Save;
        int box=PokemonEditorContext.Source?.Box??(PokemonEditorContext.Extra?.PartyFormat==true?-1:0);
        int slot=PokemonEditorContext.Source?.Slot??PokemonEditorContext.Extra?.Slot??0;
        return PrepareCore(save,original,new(save is null?party:box==-1,save is null?(party?-1:0):box,slot),capture,party);
    }
    private sealed record DraftLocation(bool Party,int FormBoxHint,int Slot);
    private static PKM PrepareCore(SaveFile? save,PKM original,DraftLocation source,PokemonDraftCapture capture,bool? editorParty)
    {
        if(capture.Scope is not{Length:>0 and <=256}||capture.Sections is null||capture.Sections.Length>64||capture.Sections.Any(s=>s is null||s.Section is not{Length:>0 and <=64}||s.Steps is not{Length:>0 and <=32})||capture.Sections.Select(s=>s.Section).Distinct(StringComparer.Ordinal).Count()!=capture.Sections.Length)throw new ArgumentException("Invalid editor snapshot scope or sections.");
        var steps=capture.Sections.SelectMany(s=>s.Steps).ToArray();if(steps.Length>64)throw new ArgumentException("Editor snapshot exceeds operation limit.");
        if(!PokemonEditorMode.Readable(original)||!StandalonePokemon.CanEdit(original)||save is not null&&original.GetType()!=save.PKMType)throw new ArgumentException("Editor must contain a valid supported Pokemon.");
        if(steps.Count(s=>s?.Kind is "basic" or "gb")>1)throw new ArgumentException("Duplicate primary editor draft.");
        var p=original.Clone();var actions=new List<(int Order,int Index,Action Apply)>();var claims=new Dictionary<string,(int Index,string Value)>();var levels=new List<int>();var experiences=new List<uint>();
        void Claim(string key,int index,object? value){string text=value is null?"null":Convert.ToString(value,System.Globalization.CultureInfo.InvariantCulture)??"null";if(claims.TryGetValue(key,out var prior)&&prior.Index!=index&&prior.Value!=text)throw new ArgumentException("Conflicting editor fields: "+key);claims[key]=(index,text);}
        string Friendship()=>"currentFriendship";
        for(int i=0;i<steps.Length;i++)
        {
            var step=steps[i];int index=i;if(step is null)throw new ArgumentException("Missing editor operation.");
            switch(step.Kind)
            {
                case "basic":
                {
                    if(p is GBPKM)throw new ArgumentException("Standard editor is unavailable for GB entities.");var edit=Read(step.Edit,PokemonSetJson.Default.PokemonEdit);var fields=Mask(step,BasicFields);
                    if(fields.Contains("trainerIds")&&(fields.Contains("tid")||fields.Contains("sid")))throw new ArgumentException("Conflicting trainer ID representations.");
                    if(fields.Contains("level")){if(edit.Level is <1 or >100)throw new ArgumentException("Invalid editor level.");levels.Add(edit.Level);}
                    foreach(var field in fields.Where(f=>f!="level"))Claim(field=="friendship"?Friendship():field=="abilityIndex"?"ability":field,index,step.Edit.GetProperty(field).GetRawText());
                    if(fields.Contains("identity"))
                    {
                        if(!PokemonEditorMode.HaX&&!PokemonModeRules.Read(p).ManualAbility)Claim("ability",index,"identity");
                        if(p.Format<=5&&(!PokemonEditorMode.HaX||edit.Identity is{} identity&&(identity.Species!=p.Species||identity.Gender!=p.Gender)))Claim("pid",index,"identity");
                    }
                    if(fields.Contains("nature")&&p.Format<=4)Claim("pid",index,"nature");
                    actions.Add((30,index,()=>{
                        if(fields.Contains("trainerIds")&&original.TrainerIDDisplayFormat!=p.TrainerIDDisplayFormat)throw new ArgumentException("Apply the origin version before editing its trainer ID format.");
                        var merged=Rebase(p,edit,fields,source);PokemonEditing.Apply(p,merged,source.Party,identity=>{if(save is not null)PokemonIdentity.Apply(save,p,identity,source.FormBoxHint);else PokemonIdentity.Apply(p,identity,source.FormBoxHint);},save);
                    }));break;
                }
                case "gb":
                {
                    if(p is not GBPKM gb)throw new ArgumentException("GB editor requires a GB entity.");var edit=Read(step.Edit,PokemonSetJson.Default.GbPokemonEdit);var fields=Mask(step,GbFields);
                    if(fields.Contains("level")){if(edit.Level is <1 or >100)throw new ArgumentException("Invalid GB editor level.");levels.Add(edit.Level);}
                    foreach(var field in fields.Where(f=>f!="level"))Claim(field=="friendship"?Friendship():field=="dvs"?"ivs":field,index,step.Edit.GetProperty(field).GetRawText());
                    actions.Add((30,index,()=>StandaloneGb.Apply(gb,Rebase(gb,edit,fields),save)));break;
                }
                case "vitals":
                {
                    if(step.Edit.ValueKind!=JsonValueKind.Undefined||step.Fields is not null||step.Edits is not{Length:>0 and <=5}||step.Edits.Any(v=>v is null)||step.Edits.Select(v=>v.Action).Distinct().Count()!=step.Edits.Length)throw new ArgumentException("Invalid vital draft.");
                    if(step.Edits.Count(v=>v.Action is "partyStats" or "resetPartyStats")>1)throw new ArgumentException("Conflicting manual and calculated party stats.");
                    foreach(var edit in step.Edits)
                    {
                        if(edit.Action is not("experience" or "level" or "hiddenPower" or "status" or "partyStats" or "resetPartyStats"))throw new ArgumentException("Editor preparation does not execute vital commands.");
                        if(edit.Action=="level"){if(edit.Level is not int l||l is <0 or >999)throw new ArgumentException("Invalid editor level.");levels.Add(Math.Clamp(l,1,100));}
                        else if(edit.Action=="experience"){if(edit.Experience is not uint exp)throw new ArgumentException("Missing editor experience.");experiences.Add(exp);}
                        else Claim(edit.Action=="hiddenPower"?"ivs":edit.Action is "partyStats" or "resetPartyStats"?"partyStats":"status",index,edit.Action+JsonSerializer.Serialize(edit,PokemonSetJson.Default.PokemonVitalsEdit));
                        actions.Add((edit.Action is "partyStats" or "resetPartyStats"?90:edit.Action=="level"?60:edit.Action=="experience"?61:50,index,()=>PokemonVitals.Apply(p,edit,editorParty??source.Party,save)));
                    }break;
                }
                case "gbSpecial":
                {
                    if(p is not GBPKM gb||step.Fields is not null||step.Edits is not null)throw new ArgumentException("Invalid GB special draft.");var edit=Read(step.Edit,PokemonSetJson.Default.GbSpecialEdit);
                    if(edit.Action=="fields"&&edit.Fields is not null){foreach(var property in step.Edit.GetProperty("fields").EnumerateObject())if(property.Value.ValueKind!=JsonValueKind.Null)Claim(property.Name=="pokerusStrain"||property.Name=="pokerusDays"?"virus."+property.Name:"gb."+property.Name,index,property.Value.GetRawText());}
                    else if(edit.Action=="egg"&&edit.Egg is{Action:"cycles",Cycles:not null})Claim("care.originalFriendship",index,edit.Egg.Cycles.Value);
                    else throw new ArgumentException("Editor preparation does not execute GB commands.");
                    actions.Add((40,index,()=>StandaloneGbSpecial.Apply(gb,edit,source.Party)));break;
                }
                case "raw":
                {
                    if(p is GBPKM||step.Fields is not null||step.Edits is not null)throw new ArgumentException("Invalid raw editor draft.");var edit=Read(step.Edit,PokemonSetJson.Default.PokemonRawEdit);
                    foreach(var property in step.Edit.EnumerateObject())
                    {
                        if(property.Name=="action"||property.Value.ValueKind==JsonValueKind.Null)continue;
                        bool allowed=edit.Action=="values"?property.Name is "pid" or "encryptionConstant" or "homeTracker":property.Name==edit.Action;
                        if(!allowed)throw new ArgumentException("Unexpected field for this editor action.");
                    }
                    if(!RawActions.Contains(edit.Action)||edit.Action=="egg"&&edit.Egg?.Action!="cycles"||edit.Expert is{Action:not "values"}||edit.Dimensions is{Action:not "values"}||edit.AdvancedStats is{Action:not "values"}||edit.SpecialStatus is{Action:not "values"}||edit.TrainerDetails is{Action:not "values"}||edit.Ribbons is{Mode:not(null or "values")})throw new ArgumentException("Editor preparation only accepts field values.");
                    if(edit.TrainerDetails?.Handler is{} trainerHandler)Claim("handler",index,trainerHandler);
                    if(edit.History?.Handler is{} historyHandler)Claim("handler",index,historyHandler);
                    if(edit.Action=="care"&&edit.Care is{} care)foreach(var v in care.Values)Claim("care."+v.Key,index,v.Value);
                    else if(edit.Action=="egg")Claim("care.originalFriendship",index,edit.Egg?.Cycles);
                    else if(edit.Action=="values"){if(edit.Pid is{} pid)Claim("pid",index,pid);if(edit.EncryptionConstant is{} ec)Claim("ec",index,ec);if(edit.HomeTracker is{} h)Claim("home",index,h);}
                    else if(edit.Action=="expert"&&(edit.Expert?.Ability is not null||edit.Expert?.AbilityNumber is not null))Claim("ability",index,step.Edit.GetRawText());
                    else Claim("raw."+edit.Action,index,step.Edit.GetRawText());
                    int order=edit.Action=="origin"?0:edit.Action=="trainerDetails"?10:edit.Action=="history"?20:edit.Action=="values"?70:40;
                    actions.Add((order,index,()=>PokemonRawEditing.Apply(p,edit,source.Party,()=>{
                        if(edit.Action=="origin"){var origin=edit.Origin??throw new ArgumentException("Origin draft missing.");if(save is not null)PokemonOrigin.Apply(save,p,origin);else PokemonOrigin.Apply(p,origin);}
                        else if(edit.Action=="trainerDetails")PokemonTrainerDetails.Apply(p,edit.TrainerDetails??throw new ArgumentException("Trainer draft missing."),save);
                        else if(edit.Action=="egg")PokemonEgg.Apply(save,p,edit.Egg??throw new ArgumentException("Egg draft missing."));
                        else throw new ArgumentException("Unexpected contextual editor action.");
                    },save?.MaxAbilityID,save)));break;
                }
                default:throw new ArgumentException("Unknown editor operation.");
            }
        }
        if(levels.Distinct().Count()>1||experiences.Distinct().Count()>1)throw new ArgumentException("Conflicting editor level or experience fields.");
        foreach(var action in actions.Where(a=>a.Order<30).OrderBy(a=>a.Order).ThenBy(a=>a.Index))action.Apply();
        if(claims.TryGetValue("currentFriendship",out var friendship)){string key=p.IsEgg||p.CurrentHandler==0?"care.originalFriendship":"care.handlingFriendship";if(claims.TryGetValue(key,out var care)&&care.Value!=friendship.Value)throw new ArgumentException("Conflicting friendship drafts.");}
        foreach(var action in actions.Where(a=>a.Order>=30).OrderBy(a=>a.Order).ThenBy(a=>a.Index))action.Apply();
        if(levels.Count!=0&&p.CurrentLevel!=levels[0])throw new ArgumentException("Editor level conflicts with the prepared experience.");
        PokemonEditorFinalizing.Apply(p);return p;
    }
    private static PokemonEdit Rebase(PKM p,PokemonEdit e,HashSet<string> f,DraftLocation source)=>e with{
        Box=source.FormBoxHint,Slot=source.Slot,Nickname=f.Contains("nickname")?e.Nickname:p.Nickname,Ot=f.Contains("ot")?e.Ot:p.OriginalTrainerName,
        Level=f.Contains("level")?e.Level:p.CurrentLevel,Friendship=f.Contains("friendship")?e.Friendship:p.IsEgg?p.OriginalTrainerFriendship:p.CurrentFriendship,
        Tid=f.Contains("tid")?e.Tid:p.TID16,Sid=f.Contains("sid")?e.Sid:p.SID16,TrainerIds=f.Contains("trainerIds")?e.TrainerIds:null,
        Ivs=f.Contains("ivs")?e.Ivs:[p.IV_HP,p.IV_ATK,p.IV_DEF,p.IV_SPA,p.IV_SPD,p.IV_SPE],Evs=f.Contains("evs")?e.Evs:[p.EV_HP,p.EV_ATK,p.EV_DEF,p.EV_SPA,p.EV_SPD,p.EV_SPE],
        Moves=f.Contains("moves")?e.Moves:[p.Move1,p.Move2,p.Move3,p.Move4],MovePp=f.Contains("movePp")?e.MovePp:[p.Move1_PP,p.Move2_PP,p.Move3_PP,p.Move4_PP],MovePpUps=f.Contains("movePpUps")?e.MovePpUps:[p.Move1_PPUps,p.Move2_PPUps,p.Move3_PPUps,p.Move4_PPUps],
        Nature=f.Contains("nature")?e.Nature:null,StatAlignment=f.Contains("statAlignment")?e.StatAlignment:null,AbilityIndex=f.Contains("abilityIndex")?e.AbilityIndex:null,HeldItem=f.Contains("heldItem")?e.HeldItem:null,Identity=f.Contains("identity")?e.Identity:null,
    };
    private static GbPokemonEdit Rebase(GBPKM p,GbPokemonEdit e,HashSet<string> f)=>e with{
        Species=f.Contains("species")?e.Species:p.Species,Nickname=f.Contains("nickname")?e.Nickname:p.Nickname,Ot=f.Contains("ot")?e.Ot:p.OriginalTrainerName,Tid=f.Contains("tid")?e.Tid:p.TID16,Level=f.Contains("level")?e.Level:p.CurrentLevel,
        Dvs=f.Contains("dvs")?e.Dvs:[p.IV_ATK,p.IV_DEF,p.IV_SPE,p.IV_SPC],StatExperience=f.Contains("statExperience")?e.StatExperience:[p.EV_HP,p.EV_ATK,p.EV_DEF,p.EV_SPE,p.EV_SPC],
        Moves=f.Contains("moves")?e.Moves:[p.Move1,p.Move2,p.Move3,p.Move4],MovePp=f.Contains("movePp")?e.MovePp:[p.Move1_PP,p.Move2_PP,p.Move3_PP,p.Move4_PP],MovePpUps=f.Contains("movePpUps")?e.MovePpUps:[p.Move1_PPUps,p.Move2_PPUps,p.Move3_PPUps,p.Move4_PPUps],Friendship=f.Contains("friendship")?e.Friendship:null,HeldItem=f.Contains("heldItem")?e.HeldItem:null,
    };
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase,UnmappedMemberHandling=JsonUnmappedMemberHandling.Disallow)]
[JsonSerializable(typeof(PokemonSetRequest))]
[JsonSerializable(typeof(PokemonSetConfirmation))]
[JsonSerializable(typeof(PokemonSetTicket))]
[JsonSerializable(typeof(PokemonDraftCapture))]
[JsonSerializable(typeof(PokemonEdit))]
[JsonSerializable(typeof(PokemonRawEdit))]
[JsonSerializable(typeof(GbPokemonEdit))]
[JsonSerializable(typeof(GbSpecialEdit))]
[JsonSerializable(typeof(PokemonVitalsEdit))]
internal partial class PokemonSetJson:JsonSerializerContext;

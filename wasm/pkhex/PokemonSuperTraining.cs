// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record SuperTrainingRow(int Index, bool Distribution, bool Flag, bool StoredFlag, bool Enabled, LocalizedText Name);
public sealed record SuperTrainingBag(int Index, LocalizedText Name);
public sealed record SuperTrainingDraft(bool[] Regular, bool[] Distribution, bool Unlocked, bool Complete, int? Bag, int? Hits);
public sealed record SuperTrainingCatalog(string SourceHash, string Format, bool HasBag, SuperTrainingRow[] Rows, SuperTrainingBag[] Bags, SuperTrainingDraft Draft, SuperTrainingDraft Stored, string Raw);
public sealed record SuperTrainingEvent([property: JsonRequired] string Kind, int Index = 0, int Value = 0);
public sealed record SuperTrainingEdit([property: JsonRequired] SuperTrainingEvent[] Events);

internal static class PokemonSuperTraining
{
    private static ISuperTrainRegimen Validate(PKM p) {
        if (p is not (PK6 or PK7) || p is not ISuperTrainRegimen r || p.Species == 0 || p.Species > p.MaxSpeciesID || !p.Valid || !p.ChecksumValid) throw new ArgumentException("Super training requires valid PK6 or PK7 data.");
        return r;
    }
    private static SuperTrainingDraft Load(PKM p) {
        var r = Validate(p); bool unlocked = r.SecretSuperTrainingUnlocked;
        var regular = Enumerable.Range(0,30).Select(r.GetRegimenState).ToArray();
        if (p is PK6 && !unlocked) Array.Fill(regular, false, 18, 12);
        int bagCount = GameInfo.GetStrings("en").trainingbags.Length;
        return new(regular, Enumerable.Range(0,6).Select(r.GetRegimenStateDistribution).ToArray(), unlocked, r.SuperTrainSupremelyTrained && (p is not PK6 || unlocked), p is PK6 b ? b.TrainingBag < bagCount ? b.TrainingBag : 0 : null, p is PK6 h ? h.TrainingBagHits : null);
    }
    internal static SuperTrainingCatalog Read(PKM source, string hash) {
        var copy = source.Clone(); var draft = Load(copy); bool hasBag = copy is PK6;var r=Validate(copy);
        var stored=new SuperTrainingDraft(Enumerable.Range(0,30).Select(r.GetRegimenState).ToArray(),Enumerable.Range(0,6).Select(r.GetRegimenStateDistribution).ToArray(),r.SecretSuperTrainingUnlocked,r.SuperTrainSupremelyTrained,copy is PK6 b?b.TrainingBag:null,copy is PK6 h?h.TrainingBagHits:null);
        var rows = new SuperTrainingRow[36];
        for (int i=0;i<30;i++) rows[i] = new(i,false,draft.Regular[i],stored.Regular[i],!hasBag || i<18 || draft.Unlocked,SuperTrainingNames.Get("SuperTrainingEditor.CHK_" + SuperTrainRegimenExtensions.GetRegimenName(i)));
        for (int i=0;i<6;i++) rows[30+i] = new(i,true,draft.Distribution[i],stored.Distribution[i],true,SuperTrainingNames.Get("SuperTrainingEditor.CHK_" + SuperTrainRegimenExtensions.GetRegimenNameDistribution(i)));
        var zh=GameInfo.GetStrings("zh-Hans");var en=GameInfo.GetStrings("en");var ja=GameInfo.GetStrings("ja");
        var bags = hasBag ? Enumerable.Range(0,en.trainingbags.Length).Select(i=>new SuperTrainingBag(i,new(i==0?zh.Species[0]:zh.trainingbags[i],i==0?en.Species[0]:en.trainingbags[i],i==0?ja.Species[0]:ja.trainingbags[i]))).ToArray() : [];
        return new(hash,copy.GetType().Name,hasBag,rows,bags,draft,stored,Raw(copy));
    }
    internal static SuperTrainingDraft ApplyEvents(PKM source, SuperTrainingEdit edit) {
        var draft=Load(source); if(edit is null || edit.Events is null || edit.Events.Length>512) throw new ArgumentException("Invalid super training events.");
        bool hasBag=source is PK6;
        foreach(var e in edit.Events) {
            if(e is null)throw new ArgumentException("Missing super training event.");
            bool flag=e.Value==1;
            switch(e.Kind) {
                case "regular": if((uint)e.Index>=30 || e.Value is not(0 or 1) || hasBag && e.Index>=18 && !draft.Unlocked)throw new ArgumentException("Invalid regular training edit.");draft.Regular[e.Index]=flag;break;
                case "distribution": if((uint)e.Index>=6 || e.Value is not(0 or 1))throw new ArgumentException("Invalid distribution training edit.");draft.Distribution[e.Index]=flag;break;
                case "unlocked": if(!hasBag || e.Value is not(0 or 1))throw new ArgumentException("Hidden training state cannot be edited.");draft=draft with{Unlocked=flag,Complete=draft.Complete&&flag};if(!flag)Array.Fill(draft.Regular,false,18,12);break;
                case "complete": if(!hasBag || !draft.Unlocked || e.Value is not(0 or 1))throw new ArgumentException("Training completion is disabled.");draft=draft with{Complete=flag};break;
                case "bag": if(!hasBag || (uint)e.Value>=GameInfo.GetStrings("en").trainingbags.Length)throw new ArgumentException("Invalid training bag.");draft=draft with{Bag=e.Value};break;
                case "hits": if(!hasBag || (uint)e.Value>255)throw new ArgumentException("Invalid bag hits.");draft=draft with{Hits=e.Value};break;
                case "all": if(draft.Unlocked)Array.Fill(draft.Distribution,true);if(hasBag)draft=draft with{Unlocked=true,Complete=true};Array.Fill(draft.Regular,true);break;
                case "none": draft=draft with{Unlocked=false,Complete=false};Array.Fill(draft.Regular,false);Array.Fill(draft.Distribution,false);break;
                default:throw new ArgumentException("Unknown super training event.");
            }
        }
        return draft;
    }
    internal static PKM Prepare(PKM source, SuperTrainingEdit edit) {
        Validate(source);var draft=ApplyEvents(source,edit);var copy=source.Clone();var r=(ISuperTrainRegimen)copy;
        for(int i=0;i<30;i++)r.SetRegimenState(i,draft.Regular[i]);
        // Source setters intentionally normalize the distribution high byte; show it in preview.
        for(int i=0;i<6;i++)r.SetRegimenStateDistribution(i,draft.Distribution[i]);
        if(copy is PK6 p){p.SecretSuperTrainingUnlocked=draft.Unlocked;p.SuperTrainSupremelyTrained=draft.Complete;p.TrainingBag=(byte)draft.Bag!.Value;p.TrainingBagHits=(byte)draft.Hits!.Value;}
        else{r.SecretSuperTrainingUnlocked &= draft.Unlocked;r.SuperTrainSupremelyTrained &= draft.Complete;}
        copy.RefreshChecksum();return copy;
    }
    internal static string Raw(PKM p) => Convert.ToHexString(p.Data.Slice(0x2C,4))+Convert.ToHexString(p.Data.Slice(0x3A,2))+Convert.ToHexString(p.Data.Slice(0x72,1))+(p is PK6?Convert.ToHexString(p.Data.Slice(0x16,2)):"");
}

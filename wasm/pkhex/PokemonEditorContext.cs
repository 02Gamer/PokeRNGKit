// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

// Each independent editor owns its Worker. The save supplies directories and
// trainer context only; entity operations never write this snapshot.
internal static class PokemonEditorContext
{
    internal static SaveFile? Save {get;private set;}
    internal static PokemonPosition? Source {get;private set;}
    internal static ExtraSlotKey? Extra {get;private set;}
    private static string bindingHash="";
    internal static string Fingerprint=>Save is{} save?$"{bindingHash}:{save.GetType().Name}:{(int)save.Version}:{save.Language}:{(save is SAV4BR br?br.CurrentSlot:-1)}:{Source?.Box}:{Source?.Slot}:{Extra?.Type}:{Extra?.Slot}:{Extra?.PartyFormat}":"";
    internal static void Clear(){Save=null;Source=null;Extra=null;bindingHash="";}
    internal static void Configure(byte[] input,string json)
    {
        Clear();
        if(json is null||json.Length>4096)throw new ArgumentException("Invalid editor source.");
        using var doc=JsonDocument.Parse(json);PokemonSetSession.Unique(doc.RootElement);
        var save=SaveService.OpenDatabaseSave(input);
        if(doc.RootElement.ValueKind==JsonValueKind.Object&&doc.RootElement.TryGetProperty("extra",out var extra))
            BindExtra(save,ExtraSlots.Decode(extra.GetRawText()),json,Br4Editing.Hash(input));
        else Bind(save,ReadPosition(json),Br4Editing.Hash(input));
    }
    internal static PokemonPosition ReadPosition(string json)
    {
        if(json is null||json.Length>4096)throw new ArgumentException("Invalid editor source.");
        using var document=JsonDocument.Parse(json);var root=document.RootElement;PokemonSetSession.Unique(root);
        if(root.ValueKind!=JsonValueKind.Object||root.EnumerateObject().Count()!=2||!root.TryGetProperty("box",out var box)||!root.TryGetProperty("slot",out var slot)||box.ValueKind!=JsonValueKind.Number||slot.ValueKind!=JsonValueKind.Number||!box.TryGetInt32(out int b)||!slot.TryGetInt32(out int s))throw new ArgumentException("Missing editor source.");
        return new(b,s);
    }
    internal static void Bind(SaveFile save,PokemonPosition position,string? sourceHash=null)
    {
        Clear();SavePokemonEditing.Require(save);
        if(position.Box==-1){if(!save.HasParty||(uint)position.Slot>=6)throw new ArgumentException("Invalid editor source.");}
        else if(!save.HasBox||(uint)position.Box>=save.BoxCount||(uint)position.Slot>=save.BoxSlotCount)throw new ArgumentException("Invalid editor source.");
        Save=CloneSave(save);Source=position;
        bindingHash=sourceHash??Br4Editing.Hash(CloneSave(save).Write().ToArray());
    }
    internal static SaveFile CloneSave(SaveFile save)
    {
        var copy=save.Clone();
        // FR/LG's selected personal table is runtime context, not save bytes.
        if(save is SAV3FRLG source&&copy is SAV3FRLG target)target.ResetPersonal(source.Version);
        return copy;
    }
    internal static void BindExtra(SaveFile save,ExtraSlotKey key,string? json=null,string? sourceHash=null)
    {
        Clear();SavePokemonEditing.Require(save);
        if(json is not null)JsonSerializer.Deserialize(json,ExtraSlotJson.Default.ExtraSlotSource);
        ExtraSlots.Resolve(save,key);Save=CloneSave(save);Extra=key;
        bindingHash=sourceHash??Br4Editing.Hash(CloneSave(save).Write().ToArray());
    }
    internal static PKM Validate(PKM p)
    {
        if(Save is not{} save)return p;
        if(p.GetType()!=save.PKMType)throw new ArgumentException("Editor format conflicts with the save.");
        if(p is SK2 stadium&&save.BlankPKM is SK2 layout)
        {
            if(!stadium.IsPossible(layout.Japanese))throw new ArgumentException("Stadium editor encoding conflicts with the save.");
            p=new SK2(p.Data.ToArray(),layout.Japanese);
        }
        if(p is GBPKM gb&&save.BlankPKM is GBPKM blank&&(gb.Japanese!=blank.Japanese||gb.Korean!=blank.Korean))throw new ArgumentException("GB editor encoding conflicts with the save.");
        return p;
    }
    internal static OriginCatalog Origin(PKM p,int? version=null,int? ball=null)=>Save is{} save?PokemonOrigin.Catalog(save,p,version,ball):PokemonOrigin.Catalog(p,version,ball);
    internal static void Identity(PKM p,PokemonIdentityEdit edit,bool party)
    {if(Save is{} save)PokemonIdentity.Apply(save,p,edit,Source?.Box??(Extra?.PartyFormat==true?-1:0));else PokemonIdentity.Apply(p,edit,party?-1:0);}
    internal static StandaloneEggCatalog Egg(PKM p)
    {
        if(Save is not{} save)return StandaloneEgg.Read(p);
        return new(Origin(p).Games.Where(g=>g.Id==(int)save.Version).ToArray(),new((int)save.Version,save.OT,save.TID16,save.SID16),save.MaxStringLengthTrainer);
    }
}
public static partial class Program
{
    [JSExport]public static void ConfigurePokemonEditorContext(byte[] input,string json)=>PokemonEditorContext.Configure(input,json);
    [JSExport]public static void ClearPokemonEditorContext()=>PokemonEditorContext.Clear();
}

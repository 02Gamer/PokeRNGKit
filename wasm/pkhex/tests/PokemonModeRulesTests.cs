// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class PokemonModeRulesTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Hidden mode action accepted.");}
    private static void Mode(bool hax){SaveProgramSettingsRuntime.Reset();var s=SaveProgramSettingsCodec.Defaults();s.Startup.ForceHaXOnLaunch=hax;SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(s,SaveProgramSettingsJson.Default.SaveProgramSettings));}
    private static PKM Seed(PKM p){p.Species=25;p.Language=2;p.Version=p.Context.GetSingleGameVersion();p.Nickname="TEST";p.OriginalTrainerName="OWNER";p.CurrentLevel=20;p.RefreshChecksum();return p;}
    private static PokemonEdit Basic(PKM p)=>new(0,0,p.Nickname,p.CurrentLevel,p.CurrentFriendship,p.OriginalTrainerName,p.TID16,p.SID16,[p.IV_HP,p.IV_ATK,p.IV_DEF,p.IV_SPA,p.IV_SPD,p.IV_SPE],[p.EV_HP,p.EV_ATK,p.EV_DEF,p.EV_SPA,p.EV_SPD,p.EV_SPE],p.Moves,[p.Move1_PP,p.Move2_PP,p.Move3_PP,p.Move4_PP]);
    internal static void Run()
    {
        try
        {
            foreach(PKM layout in new PKM[]{new PK1(),new PK2(),new SK2(),new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new RK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()})foreach(bool hax in new[]{false,true})
            {
                Mode(hax);var p=Seed(layout.Clone());var before=p.Data.ToArray();var rules=PokemonModeRules.Read(p);
                bool manual=p is PA9||hax&&p.Format>3;
                Check(rules.ManualAbility==manual&&rules.AbilityNumber==(manual&&p.Format>=6),"WinForms manual-ability modes and PA9 normal exception");
                Check(rules.HeldItem==(p.Format>=2&&(hax||p is not(PB7 or PA8))),"Storage-format held item visibility");
                Check(rules.OriginRegion==(p is IRegionOrigin&&(hax||p is not PB7)),"Concrete original-region visibility");
                if(p.Format>=3)
                {
                    var catalog=PokemonIdentityTools.Read(p);
                    Check((catalog.Abilities.Length>0)==manual&&(catalog.AbilityNumber is not null)==rules.AbilityNumber,"Editor catalog consumes mode rules");
                    if(manual){var copy=p.Clone();int id=catalog.Abilities.First(c=>c.Id!=p.Ability).Id;PokemonIdentityTools.Apply(copy,new(Ability:id));Check(copy.Ability==id,"Allowed manual ability stored");}
                    else Reject(()=>PokemonIdentityTools.Apply(p.Clone(),new(Ability:p.Ability==1?2:1)));
                    Check((PokemonTrainerDetails.Read(p).OriginRegion is not null)==rules.OriginRegion,"Trainer editor consumes visibility");
                }
                Check(p.Data.SequenceEqual(before),"Mode/catalog reads preserve source bytes");
                if(hax)Check(PokemonHints.Read(p) is null,"HaX hides automatic hints while explicit analysis remains separate");
                else
                {
                    var analysis=new LegalityAnalysis(p.Clone(),StorageSlotType.None);var hints=PokemonHints.Read(p)!;
                    Check(hints.Parsed==analysis.Parsed&&hints.Valid==(analysis.Parsed&&analysis.Valid),"Automatic status follows Core analysis");
                    if(analysis.Parsed)Check(hints.Moves.SequenceEqual(Enumerable.Range(0,4).Select(i=>analysis.Info.Moves[i].Valid)),"All current-move warning states follow Core");
                }
                Console.WriteLine($"PASS mode rules {p.GetType().Name}/HaX={hax}: actual catalogs, visibility, manual write, automatic hints and original");
            }
            foreach(PKM layout in new PKM[]{new PB7(),new PA8()})
            {
                var p=Seed(layout);Mode(false);Reject(()=>PokemonEditing.Apply(p.Clone(),Basic(p) with{HeldItem=1},false,id=>PokemonIdentity.Apply(p,id,0)));
                Mode(true);var copy=p.Clone();PokemonEditing.Apply(copy,Basic(p) with{HeldItem=1},false,id=>PokemonIdentity.Apply(copy,id,0));Check(copy.HeldItem==1,"HaX hidden item bytes remain editable");
            }
            foreach(string name in new[]{"E","D","HG","X","SN"})Bag(name);
            Mode(true);var hg=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/HG.sav"));InventoryBatch.Apply(hg,new(-1,"apricornFill"));Check(ApricornInventory.Read((SAV4HGSS)hg).All(v=>v.Count==99),"Global bag mode does not inject unrelated fields into apricorn commands");
            Draft();Context();
        }
        finally{PokemonEditorContext.Clear();SaveProgramSettingsRuntime.Reset();}
    }
    private static void Bag(string name)
    {
        Mode(false);var save=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/"+name+".sav"));var bag=save.Inventory;var pouch=bag.Pouches[0];int id=pouch.GetAllItems()[0];
        pouch.RemoveAll();pouch.Items[0].Index=id;pouch.Items[0].Count=1;bag.CopyTo(save);var input=save.Write().ToArray();var before=input.ToArray();int count=bag.GetMaxCount(pouch.Type,id)+1;
        var edit=new BagEdit(0,0,id,count);string json=JsonSerializer.Serialize(edit,SaveJsonContext.Default.BagEdit);
        Reject(()=>SaveService.EditInventory(input,json));Mode(true);
        var read=InventoryReader.Read(save);Check(read.HaX&&read.Pouches[0].Items[0].MaxCount==bag.MaxQuantityHaX,"Global HaX metadata and quantity limits");
        var expected=SaveService.OpenDatabaseSave(input.ToArray());var expectedBag=expected.Inventory;expectedBag.Pouches[0].Items[0].Count=count;expectedBag.CopyTo(expected);
        var output=SaveService.EditInventory(input,json);
        Check(output.SequenceEqual(expected.Write().ToArray())&&SaveChecksums.Valid(SaveService.OpenPreparedOutput(output)),"Implicit global HaX write matches independent complete-file oracle");
        Check(input.SequenceEqual(before),"Global bag mode preserves caller input");
        Console.WriteLine($"PASS global bag {name}: no local advanced flag, source quantity, exact whole-file oracle and original");
    }
    private static void Context()
    {
        Mode(false);var sm=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/SN.sav"));var p=Seed(new PK7());
        PokemonEditorContext.Bind(sm,new(0,0));var bytes=StandalonePokemon.Serialize(p.Clone(),true,false);var before=bytes.ToArray();
        var report=StandalonePokemon.Inspect(bytes,"editor.pk7",useFileFormat:true);var directory=PokemonChoiceCatalog.Read(p,sm);
        Check(report.MoveChoices.Select((c,i)=>(c,i)).Where(v=>v.c.Selectable==true).Select(v=>v.i).ToHashSet().SetEquals(directory.Moves),"Bound SM standalone move flags use the actual save directory");
        Check(report.MoveChoices.Select((c,i)=>(c,i)).Where(v=>v.c.RelearnSelectable==true).Select(v=>v.i).ToHashSet().SetEquals(directory.Relearn),"Bound SM relearn remains separate");
        Check(bytes.SequenceEqual(before),"Bound catalog and automatic analysis preserve file");PokemonEditorContext.Clear();
        Mode(true);var gp=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/GP.sav"));var pb=Seed(new PB7());PokemonEditorContext.Bind(gp,new(0,0));
        var file=StandalonePokemon.Serialize(pb.Clone(),true,false);var output=StandalonePokemon.Edit(file,"editor.pb7",Basic(pb) with{HeldItem=1057},useFileFormat:true);
        Check(StandalonePokemon.Open(output,"editor.pb7",useFileFormat:true).Entity.HeldItem==1057,"Bound PB7 basic file editing uses save maximum 1057, not independent 959");
        Console.WriteLine("PASS bound standalone context: actual SM move/relearn filters, PB7 HaX item 1057, file preservation");
    }
    private static void Draft()
    {
        Mode(true);PokemonEditorContext.Clear();var save=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav"));var p=Seed(new PK6());p.Ability=2;p.AbilityNumber=7;p.RefreshChecksum();var before=p.Data.ToArray();
        using var basic=JsonDocument.Parse("{\"identity\":{\"species\":26,\"form\":0,\"gender\":0,\"useSpeciesName\":false}}");
        using var expert=JsonDocument.Parse("{\"action\":\"expert\",\"expert\":{\"action\":\"values\",\"ability\":1}}");
        var capture=new PokemonDraftCapture("mode-merge",[new("basic",[new("basic",basic.RootElement,Fields:["identity"])]),new("expert",[new("raw",expert.RootElement)])]);
        var prepared=PokemonDraftPreparing.Prepare(save,p,new(0,0),capture,true);
        Check(prepared.Species==26&&prepared.Ability==1&&prepared.AbilityNumber==7,"HaX identity and explicit manual ability prepare together without coercing the stored number");
        Check(p.Data.SequenceEqual(before),"Merged draft preparation preserves the editor source");
        Mode(false);var pa=Seed(new PA9());pa.Ability=1;pa.AbilityNumber=7;pa.RefreshChecksum();var target=PokemonIdentity.Choices(pa).First(c=>c.Selectable!=false&&c.Id!=0&&c.Id!=pa.Species&&c.Forms.Length>0);
        PokemonEditing.Apply(pa,Basic(pa) with{Identity=new(target.Id,0,target.Forms[0].Genders[0],false)},false,id=>PokemonIdentity.Apply(pa,id,0));
        Check(pa.Ability==1&&pa.AbilityNumber==7,"PA9 normal manual-ability exception survives species changes");
        Console.WriteLine("PASS mode drafts: HaX identity/manual merge, source preservation and PA9 normal manual-ability retention");
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Text.Json.Nodes;
using System.IO.Compression;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class SaveProgramSettingsTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid program settings accepted");}catch(ArgumentException){}catch(JsonException){}}
    internal static void Run()
    {
        var defaults=SaveProgramSettingsCodec.Defaults();
        string json=JsonSerializer.Serialize(defaults,SaveProgramSettingsJson.Default.SaveProgramSettings);
        var tree=JsonNode.Parse(json)!.AsObject();
        var reportLimits=JsonNode.Parse(json)!;
        reportLimits["report"]!["extraProperties"]=JsonSerializer.SerializeToNode(Enumerable.Repeat("Species",257).ToArray());
        Reject(()=>SaveProgramSettingsCodec.Decode(reportLimits.ToJsonString()));
        var namer=new ExportNamer();EntityFileNamer.AvailableNamers.Add(namer);
        try {
            var naming=SaveProgramSettingsCodec.Defaults();naming.SlotExport.DefaultBoxExportNamer=namer.Name;
            SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(naming,SaveProgramSettingsJson.Default.SaveProgramSettings));
            var save=new SAV3E(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"));
            var original=save.Write().ToArray();
            var archive=BoxArchive.Export(save,new(0,false,0,0,0,0));
            using var stream=new MemoryStream(archive);using var zip=new ZipArchive(stream,ZipArchiveMode.Read);
            Check(zip.Entries.Count>0&&zip.Entries.All(entry=>entry.Name.StartsWith("Configured")),"Selected source namer is used by actual box ZIP export");
            Check(save.Write().ToArray().SequenceEqual(original),"Namer export preserves save bytes");
        }finally{SaveProgramSettingsRuntime.Reset();EntityFileNamer.AvailableNamers.Remove(namer);}
        reportLimits=JsonNode.Parse(json)!;
        reportLimits["report"]!["hiddenProperties"]=JsonSerializer.SerializeToNode(new[]{new string('x',129)});
        Reject(()=>SaveProgramSettingsCodec.Decode(reportLimits.ToJsonString()));
        Check(tree.Count==22,"Complete source settings page count");
        var catalog=SaveSettingsCatalogBuilder.Read(defaults);
        Check(catalog.Groups.Length==22&&catalog.Groups.All(group=>group.Fields.Length>0),"Every source page has an editable directory");
        Check(catalog.Groups.Single(group=>group.Id=="legality").Fields.Any(field=>field.Path=="legality.nickname.nickname9a.nicknamedTrade"),"Catalog expands all nested legality leaves");
        Check(catalog.Groups.Single(group=>group.Id=="slotExport").Fields.Count(field=>field.Path.StartsWith("slotExport.boxExport."))==6,"Complete nested box export directory");
        Check(catalog.Groups.SelectMany(group=>group.Fields).Single(field=>field.Path=="entityDb.resultsGridRowCount") is {Minimum:5,Maximum:20},"Verified source clamp in directory");
        var blankChoices=catalog.Groups.Single(group=>group.Id=="startup").Fields.Single(field=>field.Path=="startup.defaultSaveVersion").Choices;
        Check(blankChoices.All(choice=>(GameVersion)choice.Value is not (0 or GameVersion.GO or GameVersion.CP)),"Default blank save list applies source exclusions");
        Check(catalog.Groups.Single(group=>group.Id=="sprite").Fields.Single(field=>field.Path=="sprite.spritePreference").EnumType=="SpriteBuilderPreference","Browser enum aliases use source localization type");
        Check(defaults.EntityDb.ResultsGridRowCount==9&&defaults.Sprite.ShowTeraOpacityStripe==0xAF&&defaults.Hover.PreviewCursorShift==new BrowserPoint(16,8),"Source defaults across Core and browser models");
        var copy=SaveProgramSettingsCodec.Decode(json);
        copy.BattleTemplate.Hover.StatsCustom.Names[0]="changed";
        copy.Report.ExtraProperties.Add("Species");
        Check(defaults.BattleTemplate.Hover.StatsCustom.Names[0]=="H"&&StatDisplayConfig.HABCDS.Names[0]=="H"&&defaults.Report.ExtraProperties.Count==0,"Nested static defaults and caller lists remain independent");
        foreach(string group in tree.Select(p=>p.Key).ToArray()){
            var missing=JsonNode.Parse(json)!.AsObject();missing.Remove(group);
            Reject(()=>SaveProgramSettingsCodec.Decode(missing.ToJsonString()));
            missing=JsonNode.Parse(json)!.AsObject();missing[group]=null;
            Reject(()=>SaveProgramSettingsCodec.Decode(missing.ToJsonString()));
        }
        var invalid=JsonNode.Parse(json)!.AsObject();invalid["slotExport"]!["boxExport"]!["scope"]=255;
        Reject(()=>SaveProgramSettingsCodec.Decode(invalid.ToJsonString()));
        invalid=JsonNode.Parse(json)!.AsObject();invalid["draw"]!["markBlue"]="not-a-color";
        Reject(()=>SaveProgramSettingsCodec.Decode(invalid.ToJsonString()));
        invalid=JsonNode.Parse(json)!.AsObject();invalid["startup"]!["defaultSaveVersion"]=254;
        Reject(()=>SaveProgramSettingsCodec.Decode(invalid.ToJsonString()));
        var normalized=JsonNode.Parse(json)!.AsObject();normalized["startup"]!["recentlyLoadedMaxCount"]=0;
        normalized["entityDb"]!["resultsGridRowCount"]=100;normalized["startup"]!["language"]="zh";
        var result=SaveProgramSettingsCodec.Decode(normalized.ToJsonString());
        Check(result.Startup.RecentlyLoadedMaxCount==1&&result.EntityDb.ResultsGridRowCount==20&&result.Startup.Language=="zh-Hans","Source setter normalization retained");
        normalized["draw"]!["markBlue"]="Red";
        Check(SaveProgramSettingsCodec.Decode(normalized.ToJsonString()).Draw.MarkBlue=="#ff0000","Named source colors normalize to RGB");
        using(SaveCoreSettingsRuntime.Begin(result.Core()))Check(ParseSettings.AllowGen1Tradeback,"Full settings feed actual Core request scope");
        var bundle=JsonSerializer.Deserialize(SaveService.ReadProgramSettings(),SaveSettingsBundleJson.Default.SaveSettingsBundle)!;
        Check(bundle.ApiVersion==SaveService.ApiVersion&&bundle.Catalog.Groups.Length==22,"Public directory and defaults bundle");
        Check(SaveService.ValidateProgramSettings(bundle.Json)==bundle.Json,"Public canonical validation is read-only");
        var policy=SaveProgramSettingsCodec.Decode(bundle.Json);policy.Legality.Tradeback.AllowGen1Tradeback=false;
        string policyJson=JsonSerializer.Serialize(policy,SaveProgramSettingsJson.Default.SaveProgramSettings);
        var old=ParseSettings.Settings;
        bool oldShiny=PKHeX.Drawing.PokeSprite.SpriteName.AllowShinySprite;
        try {
            SaveProgramSettingsRuntime.Configure(policyJson);
            Check(!ParseSettings.AllowGen1Tradeback,"Program request uses supplied policy");
            Check(PKHeX.Drawing.PokeSprite.SpriteName.AllowShinySprite,"Source shiny sprite preference reaches actual resource naming");
            var emerald=new SAV3E(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"));
            var pokemon=new PK3 {Species=25,PID=0,TID16=0,SID16=0,Version=GameVersion.E,Language=2,CurrentLevel=25};
            pokemon.RefreshChecksum();emerald.SetBoxSlotAtIndex(pokemon,0,0,EntityImportSettings.None);
            byte[] shinySave=emerald.Write().ToArray();
            var report=JsonSerializer.Deserialize(SaveService.Inspect(shinySave),SaveJsonContext.Default.SaveReport)!;
            Check(report.Pokemon.First(entry=>entry.Box==0&&entry.Slot==0).Sprite.EndsWith('s'),"Actual report resource reflects shiny preference");
            SaveProgramSettingsRuntime.Clear();
            Check(ReferenceEquals(ParseSettings.Settings,old),"Program cleanup restores prior Core state");
            Check(PKHeX.Drawing.PokeSprite.SpriteName.AllowShinySprite==oldShiny,"Program cleanup restores prior sprite preference");
            SaveProgramSettingsRuntime.Configure(policyJson);SaveProgramSettingsRuntime.Clear();
            Reject(()=>SaveProgramSettingsRuntime.Configure(bundle.Json));
            Check(ReferenceEquals(ParseSettings.Settings,old),"Policy switch rejection preserves baseline");
        }finally{SaveProgramSettingsRuntime.Reset();}
        foreach(var (preference,mode) in new[]{(BrowserSpritePreference.ForceArtwork,"a"),(BrowserSpritePreference.ForceMugshots,"c"),(BrowserSpritePreference.ForceSprites,"b")}) {
            var selection=SaveProgramSettingsCodec.Defaults();selection.Sprite.SpritePreference=preference;
            try {
                SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(selection,SaveProgramSettingsJson.Default.SaveProgramSettings));
                PokeRNGKit.SaveEditor.Program.ConfigureSpriteMode("b");
                var standalone=new PK4 {Species=25,Version=GameVersion.D,Language=2};
                Check(PokemonReader.Read(standalone,0,0).Sprite.StartsWith(mode+"_"),"Forced preference applies without a save read: "+mode);
                standalone.RefreshChecksum();
                var entityBytes=new byte[standalone.SIZE_STORED];standalone.WriteDecryptedDataStored(entityBytes);
                var entityReport=StandalonePokemon.Inspect(entityBytes,"mode.pk4");
                Check(entityReport.SpriteMode==mode&&entityReport.Pokemon.Sprite.StartsWith(mode+"_"),"Standalone report retains selected builder for Worker recreation: "+mode);
                var save=new SAV3E(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"));
                var report=JsonSerializer.Deserialize(SaveService.Inspect(save.Write().ToArray()),SaveJsonContext.Default.SaveReport)!;
                Check(report.SpriteMode==mode&&report.Pokemon.Where(entry=>!entry.Egg).All(entry=>entry.Sprite.StartsWith(mode+"_")),"Forced mode reaches actual read report: "+mode);
                var egg=new PK3 {Species=25,PID=0,TID16=0,SID16=0,Version=GameVersion.E,Language=2,IsEgg=true};
                var original=egg.Data.ToArray();
                var view=PokemonReader.Read(egg,0,0);
                Check(view.Sprite.StartsWith(mode+"_")&&view.EggOverlay==(mode=="a"?"a_egg":"b_egg")&&view.EggAsItem,"Egg retains species image and source item layer: "+mode);
                Check(original.SequenceEqual(egg.Data.ToArray()),"Sprite reads preserve egg bytes");
                Check(view.ShinyOverlay=="rare_icon_alt","Old context uses the source star marker");
                egg.HeldItem=1;view=PokemonReader.Read(egg,0,0);
                Check(!view.EggAsItem&&view.EggOverlay is not null,"Held item changes egg to transparent-species overlay");
                Check(view.ItemOverlay==(mode=="a"?"aitem_1":"bitem_1"),"Held item resource follows the source builder mode");
                egg.HeldItem=328;Check(PokemonReader.Read(egg,0,0).ItemOverlay==(mode=="a"?"aitem_tm":"bitem_tm"),"TM uses source builder's own lump icon");
                var tr=new PK8 {Species=25,Version=GameVersion.SW,Language=2,HeldItem=1130};
                Check(PokemonReader.Read(tr,0,0).ItemOverlay=="bitem_tr","TR uses source lump icon in all modes");
                var square=new PK8 {Species=25,Version=GameVersion.SW,Language=2,PID=0,TID16=0,SID16=0};
                Check(PokemonReader.Read(square,0,0).ShinyOverlay=="rare_icon_alt_2","Source differentiated context uses square marker");
                var manaphy=new PK4 {Species=490,Version=GameVersion.D,Language=2,IsEgg=true};
                view=PokemonReader.Read(manaphy,0,0);
                Check(view.EggOverlay==(mode=="a"?"a_490_e":"b_490_e"),"Manaphy uses distinct source egg resource");
            }finally{SaveProgramSettingsRuntime.Reset();}
        }
        var fullEgg=SaveProgramSettingsCodec.Defaults();fullEgg.Sprite.ShowEggSpriteAsHeldItem=false;
        try {
            SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(fullEgg,SaveProgramSettingsJson.Default.SaveProgramSettings));
            SaveSpriteView.Select(new SAV3E(false));
            var egg=new PK3 {Species=25,Version=GameVersion.E,Language=2,IsEgg=true};
            Check(PokemonReader.Read(egg,0,0) is {EggOverlay:"b_egg",EggAsItem:false},"Explicit full egg preference uses transparent species");
            foreach(var (save,mode) in new (SaveFile,string)[]{(new SAV8LA(),"c"),(new SAV9SV(),"a"),(new SAV3E(false),"b")}) {
                SaveSpriteView.Select(save);Check(SaveSpriteView.Mode==mode,"Source suggested sprite mode: "+save.GetType().Name);
            }
        }finally{SaveProgramSettingsRuntime.Reset();SaveSpriteView.Configure("b");}
        var layers=SaveProgramSettingsCodec.Defaults();layers.Sprite.SpritePreference=BrowserSpritePreference.ForceSprites;layers.Sprite.ShowExperiencePercent=true;
        try {
            SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(layers,SaveProgramSettingsJson.Default.SaveProgramSettings));
            var deoxys=new PK3 {Species=386,Version=GameVersion.R,Language=2};
            var prior=deoxys.Data.ToArray();
            foreach(var (save,form) in new (SaveFile,byte)[]{(new SAV3RS(false),0),(new SAV3E(false),3),(new SAV3FRLG(false){Version=GameVersion.FR},1),(new SAV3FRLG(false){Version=GameVersion.LG},2)}) {
                SaveSpriteView.Select(save);
                var expected="b"+PKHeX.Drawing.PokeSprite.SpriteName.GetResourceStringSprite(386,form,deoxys.Gender,0,EntityContext.Gen3,deoxys.IsShiny);
                Check(PokemonReader.Read(deoxys,0,0).Sprite==expected,"Gen3 Deoxys uses current save rather than origin: "+save.Version);
            }
            var ambiguous=new SAV3FRLG(false);ambiguous.ResetPersonal(GameVersion.LG);ambiguous.Version=GameVersion.FRLG;
            SaveSpriteView.Select(ambiguous);
            Check(PokemonReader.Read(deoxys,0,0).Sprite=="b"+PKHeX.Drawing.PokeSprite.SpriteName.GetResourceStringSprite(386,2,deoxys.Gender,0,EntityContext.Gen3,deoxys.IsShiny),"Ambiguous FRLG uses selected personal table");
            Check(prior.SequenceEqual(deoxys.Data.ToArray()),"Form display preserves original entity");
            var arceus=new PK4 {Species=493,Language=2,Version=GameVersion.D};
            foreach(byte form in new byte[]{8,9,10,17}) {
                arceus.Form=form;
                byte display=form>9?(byte)(form-1):form==9?byte.MaxValue:form;
                Check(PokemonReader.Read(arceus,0,0).Sprite=="b"+PKHeX.Drawing.PokeSprite.SpriteName.GetResourceStringSprite(493,display,arceus.Gender,0,EntityContext.Gen4,arceus.IsShiny),"Gen4 Arceus realigns Curse type: "+form);
            }
            var tera=new PK9 {Species=25,Language=2,Version=GameVersion.SL,CurrentLevel=25,TeraTypeOriginal=MoveType.Fire,TeraTypeOverride=(MoveType)19};
            Check(PokemonReader.Read(tera,0,0).TeraLayer is null,"Standalone previews do not add storage backgrounds");
            Check(PokemonReader.Read(tera,0,0,true).TeraLayer is {Color:"#E62829",Mode:1,Thickness:4,Opacity:0xAF},"Storage uses effective Tera type and source defaults");
            tera.TeraTypeOverride=(MoveType)99;
            Check(PokemonReader.Read(tera,0,0,true).TeraLayer is {Color:"#FFFFE0"},"Stellar uses source LightYellow");
            Check(PokemonReader.Read(new PK8 {Species=25},0,0,true).TeraLayer is null,"Non-Tera formats do not add backgrounds");
            tera.CurrentLevel=100;
            Check(PokemonReader.Read(tera,0,0,true).ExperienceLine is {Color:"#00FF00",Width:68},"Level 100 paints entire final row Lime");
            Check(PokemonReader.Read(tera,0,0).ExperienceLine is null,"Standalone does not paint storage experience");
            tera.CurrentLevel=25;tera.MetLevel=25;
            Check(PokemonReader.Read(tera,0,0,true).ExperienceLine is {Color:"#FFFF00",Width:68},"Exact encounter level paints Yellow");
            tera.MetLevel=24;
            Check(PokemonReader.Read(tera,0,0,true).ExperienceLine is {Color:"#FF8C00",Width:68},"Changed level at exact EXP boundary paints DarkOrange");
            var start=tera.EXP;tera.CurrentLevel=26;var next=tera.EXP;tera.EXP=start+(next-start)/2;
            Check(PokemonReader.Read(tera,0,0,true).ExperienceLine is {Color:"#1E90FF",Width:>=33 and <=34},"Partial EXP paints source percentage in DodgerBlue");
            foreach(var mode in new[]{BrowserSpriteBackground.None,BrowserSpriteBackground.BottomStripe,BrowserSpriteBackground.TopStripe,BrowserSpriteBackground.FullBackground}) {
                layers.Sprite.ShowTeraType=mode;layers.Sprite.ShowTeraThicknessStripe=-1;
                SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(layers,SaveProgramSettingsJson.Default.SaveProgramSettings));
                var view=PokemonReader.Read(tera,0,0,true);
                Check(mode==BrowserSpriteBackground.None?view.TeraLayer is null:view.TeraLayer is {Thickness:56}&&view.TeraLayer.Mode==(int)mode,"Background mode and negative source thickness clamp: "+mode);
            }
        }finally{SaveProgramSettingsRuntime.Reset();SaveSpriteView.Configure("b");}
        var special=SaveProgramSettingsCodec.Defaults();
        try {
            SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(special,SaveProgramSettingsJson.Default.SaveProgramSettings));
            foreach(string mode in new[]{"a","b","c"}) {
                SaveSpriteView.Configure(mode);
                var totem=new PK7 {Species=20,Form=2,Version=GameVersion.US,Language=2};
                var original=totem.Data.ToArray();var view=PokemonReader.Read(totem,0,0);
                Check(view.Form==2&&view.Sprite==mode+PKHeX.Drawing.PokeSprite.SpriteName.GetResourceStringSprite(20,1,totem.Gender,0,EntityContext.Gen7,totem.IsShiny)&&view.SpecialEffects is {TotemGlow:true,Marker:null},"Totem displays base form and foreground glow without changing stored form: "+mode);
                Check(original.SequenceEqual(totem.Data.ToArray()),"Totem display preserves data");
                var max=new PK8 {Species=25,Version=GameVersion.SW,Language=2,CanGigantamax=true};
                Check(PokemonReader.Read(max,0,0).SpecialEffects is {Marker:"dyna",TotemGlow:false},"Source Gigantamax marker: "+mode);
                var alpha=new PA8 {Species=25,Version=GameVersion.PLA,Language=2,IsAlpha=true};
                Check(PokemonReader.Read(alpha,0,0).SpecialEffects is {Marker:"alpha_alt"},"Source Alpha marker: "+mode);
                var shadow=new CK3 {Species=249,Version=GameVersion.C,Language=2,ShadowID=1,Purification=0};
                Check(shadow.IsShadow,"Native shadow fixture represents a shadow Pokemon");
                original=shadow.Data.ToArray();view=PokemonReader.Read(shadow,0,0);
                Check(view.Sprite=="b_249x"&&view.SpecialEffects is {Marker:null,ShadowGlowSource:not null}&&view.SpecialEffects.ShadowGlowSource.StartsWith(mode+"_249"),"Shadow Lugia uses dedicated sprite but generates glow from ordinary species: "+mode);
                Check(original.SequenceEqual(shadow.Data.ToArray()),"Shadow display preserves data");
                shadow.Species=25;shadow.IsEgg=true;shadow.HeldItem=1;view=PokemonReader.Read(shadow,0,0);
                Check(!view.EggAsItem&&view.SpecialEffects is {ShadowEggAsItem:true},"Shadow glow builds its item-free egg separately from the actual held-item sprite");
                Check(PokemonReader.Read(new PK8 {Species=25},0,0).SpecialEffects is null,"Ordinary entity has no special layer");
            }
        }finally{SaveProgramSettingsRuntime.Reset();SaveSpriteView.Configure("b");}
        var keep=SaveProgramSettingsCodec.Defaults();keep.Sprite.SpritePreference=BrowserSpritePreference.DoNotChange;
        try {
            SaveSpriteView.Configure("a");
            SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(keep,SaveProgramSettingsJson.Default.SaveProgramSettings));
            SaveSpriteView.Select(new SAV3E(false));Check(SaveSpriteView.Mode=="a","Restored mode is kept rather than inferred from current game");
        }finally{SaveProgramSettingsRuntime.Reset();SaveSpriteView.Configure("b");}
        SaveArtworkTests.Run();
        SaveSlotArtworkTests.Run();
        LegalityDisplayTests.Run();
        Console.WriteLine("PASS all 22 settings models: source defaults, independent nested copies, complete shape, enums/colors, source normalization and Core scope; browser acceptance separate");
    }
    private sealed class ExportNamer:IFileNamer<PKM>
    {
        public string Name=>"Configured source namer";
        public string GetName(PKM entity)=>"Configured";
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonTrainerDetailsTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid trainer details accepted"); }
    private static PKM[] Entities() => [new PK3(), new CK3(), new XK3(), new PK4(), new BK4(), new PK5(), new PK6(), new PK7(), new PB7(), new PK8(), new PB8(), new PA8(), new PK9(), new PA9()];
    private static PKM Seed(PKM p)
    {
        p.Species=25;p.Language=2;p.Nickname="Pikachu";p.IsNicknamed=true;p.OriginalTrainerName="OWNER";p.OriginalTrainerGender=0;
        p.CurrentLevel=25;p.MetLevel=5;p.PID=12345;p.EncryptionConstant=54321;p.SetIVs(new[]{31,30,29,28,27,26});
        p.Version=p.Context.GetSingleGameVersion();p.Move1=85;p.Move1_PP=3;
        if(p.Format>=6){p.HandlingTrainerName="OTHER";p.HandlingTrainerGender=1;p.CurrentHandler=1;p.HandlingTrainerFriendship=45;}
        if(p is IRegionOrigin r){r.Country=49;r.Region=2;r.ConsoleRegion=2;}
        if(p is IHandlerLanguage h)h.HandlingTrainerLanguage=2;
        if(p is IObedienceLevel o)o.ObedienceLevel=25;
        p.ResetPartyStats();p.Stat_HPCurrent=Math.Max(1,p.Stat_HPMax/2);p.Status_Condition=8;p.RefreshChecksum();return p;
    }
    private static IEnumerable<PokemonTrainerDetailsEdit> Changes(PKM p)
    {
        yield return new(Language:1,OriginalGender:1);
        if(p.Format>=6){yield return new(HandlingName:"NEW",HandlingGender:0,Handler:0);yield return new(HandlingName:"",HandlingGender:0,Handler:0);}
        if(p is IHandlerLanguage){yield return new(HandlingLanguage:0);yield return new(HandlingLanguage:1);}
        if(p is IRegionOrigin)yield return new(Country:1,Region:0,ConsoleRegion:1);
        if(p is IBattleVersion)yield return new(BattleVersion:0);
        if(p is IObedienceLevel){foreach(int value in new[]{0,100,255,256,999})yield return new(ObedienceLevel:value);yield return new("suggestObedience");}
    }
    private static void Oracle(PKM p, PokemonTrainerDetailsEdit e)
    {
        if(e.Language is int l){string nickname=p.Nickname,ot=p.OriginalTrainerName,ht=p.HandlingTrainerName;p.Language=l;if(p.Nickname!=nickname)p.Nickname=nickname;if(p.OriginalTrainerName!=ot)p.OriginalTrainerName=ot;if(p.HandlingTrainerName!=ht)p.HandlingTrainerName=ht;}
        if(e.OriginalGender is int g)p.OriginalTrainerGender=(byte)g;
        if(e.HandlingName is string n)p.HandlingTrainerName=n;
        if(e.HandlingGender is int h)p.HandlingTrainerGender=(byte)h;
        if(e.Handler is int c)p.CurrentHandler=(byte)c;
        if(e.HandlingLanguage is int hl)((IHandlerLanguage)p).HandlingTrainerLanguage=(byte)hl;
        if(e.Country is int country)((IRegionOrigin)p).Country=(byte)country;
        if(e.Region is int region)((IRegionOrigin)p).Region=(byte)region;
        if(e.ConsoleRegion is int console)((IRegionOrigin)p).ConsoleRegion=(byte)console;
        if(e.BattleVersion is int v)((IBattleVersion)p).BattleVersion=(GameVersion)v;
        if(e.ObedienceLevel is int o)((IObedienceLevel)p).ObedienceLevel=unchecked((byte)o);
        if(e.Action=="suggestObedience")((IObedienceLevel)p).ObedienceLevel=((IObedienceLevel)p).GetSuggestedObedienceLevel(p,(byte)Math.Clamp((int)p.MetLevel,0,100));
    }
    internal static void Run()
    {
        foreach(var entity in Entities())foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true})
        {
            var seed=Seed(entity.Clone());byte[] input=StandalonePokemon.Serialize(seed,party,encrypted),original=input.ToArray();string name="entity."+seed.Extension;
            var p=StandalonePokemon.Open(input,name,encrypted,true).Entity;bool actualParty=input.Length==p.SIZE_PARTY;
            var request=new StandalonePokemonRequest(name,InputEncrypted:encrypted,UseFileFormat:true,ReadKind:"trainerDetails");
            var json=PokeRNGKit.SaveEditor.Program.ReadStandalonePokemonAdvanced(input,JsonSerializer.Serialize(request,StandalonePokemonJson.Default.StandalonePokemonRequest));
            var read=JsonSerializer.Deserialize(json,StandalonePokemonJson.Default.StandaloneAdvancedData)!.TrainerDetails!;
            var directory=new GameDataSource(GameInfo.GetStrings("en"));
            Check(read.Languages.Select(c=>c.Id).SequenceEqual(directory.LanguageDataSource(p.Format,p.Context).Select(c=>c.Value)),"Languages match the source generation/context directory");
            Check(read.Languages.All(c=>c.Name.Zh.Length>0&&c.Name.En.Length>0&&c.Name.Ja.Length>0),"Three localized language directories");
            Check((read.OriginRegion is not null)==(p is IRegionOrigin)&&(read.ObedienceLevel is not null)==(p is IObedienceLevel),"Concrete storage capabilities");
            foreach(var edit in Changes(p))
            {
                byte[] output=PokeRNGKit.SaveEditor.Program.EditStandalonePokemonRaw(input,JsonSerializer.Serialize(request with{Raw=new(0,0,"trainerDetails",TrainerDetails:edit)},StandalonePokemonJson.Default.StandalonePokemonRequest));
                var expected=p.Clone();Oracle(expected,edit);if(expected is PB7)PokemonEditing.RefreshDerived(expected,p,true);expected.RefreshChecksum();
                Check(output.AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected,actualParty,false)),"Standalone complete serialized source oracle: "+p.GetType().Name+"/"+JsonSerializer.Serialize(edit));
                Check(StandalonePokemon.Open(output,name,useFileFormat:true).Entity.ChecksumValid,"Edited checksum");
            }
            Reject(()=>PokemonTrainerDetails.Apply(p,new(Language:999)));
            if(p.Format<6)Reject(()=>PokemonTrainerDetails.Apply(p,new(HandlingName:"NEW")));
            else {Reject(()=>PokemonTrainerDetails.Apply(p,new(HandlingName:new string('X',read.MaxNameLength+1))));Reject(()=>PokemonTrainerDetails.Apply(p,new(HandlingName:"",Handler:1)));}
            if(p is not IRegionOrigin)Reject(()=>PokemonTrainerDetails.Apply(p,new(Country:1)));
            else Reject(()=>PokemonTrainerDetails.Apply(p,new(Country:1,Region:255)));
            Reject(()=>PokemonTrainerDetails.Apply(p,new(OriginalGender:2)));
            Reject(()=>PokemonTrainerDetails.Apply(p,new(ObedienceLevel:1000)));
            Reject(()=>PokemonTrainerDetails.Apply(p,new("suggestObedience",Language:1)));
            var untouched=p.Data.ToArray();Reject(()=>PokemonTrainerDetails.Apply(p,new(Language:1,OriginalGender:9)));Check(p.Data.SequenceEqual(untouched),"Atomic rejection");
            Check(input.AsSpan().SequenceEqual(original),"Original entity remains immutable");
            Console.WriteLine($"PASS trainer details {p.GetType().Name}/{party}/{encrypted}: source directories, complete output, fields, bounds and immutable input");
        }
        foreach(var candidate in new PKM[]{new PK3(),new PK6(),new PK9(),new PA9()})
        {
            var p=Seed(candidate);p.IsNicknamed=false;p.Nickname=SpeciesName.GetSpeciesNameGeneration(p.Species,p.Language,p.Format);string original=p.Nickname;
            PokemonTrainerDetails.Apply(p,new(Language:3));Check(p.Nickname==original,"Existing source species name is preserved when the target encoding supports it");
            if(p.Format>=6){p.Nickname="BAD";p.IsNicknamed=false;PokemonTrainerDetails.Apply(p,new(Language:2));Check(p.Nickname==SpeciesName.GetSpeciesNameGeneration(p.Species,2,p.Format),"Non-nicknamed malformed name refreshes through Core species directory");}
        }
        foreach(SaveFile save in new SaveFile[]{SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!,new SAV8SWSH(SwshBlockFixtureTests.Create(GameVersion.SW,2)),new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL,2))})
        foreach(int box in new[]{-1,0})
        {
            var seed=save.Clone();var p=Seed(seed.BlankPKM);seed.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);seed.PartyData=[p];
            byte[] input=seed.Write().ToArray(),original=input.ToArray();var query=new PokemonPosition(box,0);
            string queryJson=JsonSerializer.Serialize(query,SaveJsonContext.Default.PokemonPosition);
            SaveDetectionContext.Clear();bool recognized=SaveUtil.GetSaveFile(input.ToArray()) is not null;
            var catalog=recognized?JsonSerializer.Deserialize(SaveService.ReadTrainerDetails(input,queryJson),SaveJsonContext.Default.PokemonTrainerDetailsCatalog)!:PokemonTrainerDetails.Read(PokemonEditing.Read(seed,box,0),seed);
            Check(catalog.Language==2,"Public save catalog at party and box");
            foreach(var edit in Changes(PokemonEditing.Read(seed,box,0)))
            {
                var raw=new PokemonRawEdit(box,0,"trainerDetails",TrainerDetails:edit);
                // Incomplete SCBlock fixtures intentionally fail production automatic detection.
                // Exercise their concrete save adapter; do not relax detection or pad a fake file.
                byte[] output;
                if(recognized)output=SaveService.EditPokemonRaw(input,JsonSerializer.Serialize(raw,SaveJsonContext.Default.PokemonRawEdit));
                else {var typed=seed.Clone();PokemonRawEditing.Apply(typed,raw);output=typed.Write().ToArray();}
                var expected=seed.Clone();var e=PokemonEditing.Read(expected,box,0);Oracle(e,edit);e.RefreshChecksum();if(box==-1)expected.SetPartySlotAtIndex(e,0,EntityImportSettings.None);else expected.SetBoxSlotAtIndex(e,0,0,EntityImportSettings.None);
                Check(output.AsSpan().SequenceEqual(expected.Write().Span),"Public complete save oracle / health and unrelated slots");
            }
            Check(input.AsSpan().SequenceEqual(original),"Original save input remains immutable");
            Console.WriteLine($"PASS trainer details {seed.GetType().Name}/box={box}/publicAutomatic={recognized}: save-context directory and complete file oracle");
        }
        Console.WriteLine("PASS trainer detail public save catalogs/edits and language nickname behavior; synthetic evidence is not owner acceptance");
    }
}

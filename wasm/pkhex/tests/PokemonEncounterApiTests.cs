// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonEncounterApiTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"}) {
            byte[] input=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"),original=input.ToArray();
            var save=SaveService.OpenDatabaseSave(input.ToArray());var version=Enum.Parse<GameVersion>(fixture);
            var view=JsonSerializer.Deserialize(SaveService.OpenPokemonEncounters(input,[],"{}"),PokemonEncounterJson.Default.PokemonEncounterView)!;
            Check(view.SourceHash==Br4Editing.Hash(input)&&view.Matches==0,"Open source binding and empty results");
            var catalog=JsonSerializer.Deserialize(SaveService.ReadPokemonEncounterCatalog(input),PokemonEncounterJson.Default.PokemonEncounterCatalog)!;
            var source=new FilteredGameDataSource(save,new GameDataSource(GameInfo.GetStrings("en")));
            Check(catalog.Prefixes.SequenceEqual(StringInstruction.Prefixes[1..].ToArray().Select(v=>v.ToString()))&&catalog.Formats.Select(v=>v.Name).SequenceEqual(PokemonSearchCatalogReader.Formats(save.BlankPKM).Select(v=>v.Name)),"Readonly instruction builder preserves source prefixes and complete format inventory");
            Check(catalog.Languages.Select(v=>v.Id).SequenceEqual(source.Source.LanguageDataSource(9,EntityContext.Gen9a).Select(v=>v.Value)),"Trainer source includes every Core language including Spanish Latin America");
            Check(catalog.Species.Select(s=>s.Id).SequenceEqual(source.Source.SpeciesDataSource.Where(s=>s.Value!=0).Select(s=>s.Value)),"Full source species candidates");
            Check(catalog.Moves.Select(s=>s.Id).SequenceEqual(source.Moves.Skip(1).Select(s=>s.Value)),"Save-filtered source move candidates");
            Check(catalog.Games.Select(s=>s.Id).SequenceEqual(source.Source.VersionDataSource.SkipLast(1).Select(s=>s.Value)),"Source original-version candidates");
            var query=new PokemonEncounterReadRequest(new(25,(int)version));
            var json=JsonSerializer.Serialize(query,PokemonEncounterJson.Default.PokemonEncounterReadRequest);
            view=JsonSerializer.Deserialize(SaveService.ReadPokemonEncounters(input,json),PokemonEncounterJson.Default.PokemonEncounterView)!;
            var direct=new PokemonEncounterDatabase(save,save.BlankPKM);var rows=direct.Search(query.Query!);
            foreach(var row in view.Rows){var encounter=rows[row.Id];Check(row.Sprite==PokemonEncounterRuntime.Sprite(encounter)&&row.Details.Zh.SequenceEqual(encounter.GetTextLines(language:"zh-Hans"))&&row.Details.En.SequenceEqual(encounter.GetTextLines(language:"en"))&&row.Details.Ja.SequenceEqual(encounter.GetTextLines(language:"ja")),"Source gender/context/egg sprite and three-language encounter summaries");}
            Check(view.Matches==rows.Length&&view.Rows.Select(r=>r.Species).SequenceEqual(rows.Take(54).Select(r=>r.Species)),"Public complete search count and source page order");
            for(int offset=0;offset<rows.Length;offset+=54) {
                var page=JsonSerializer.Deserialize(SaveService.ReadPokemonEncounters(input,$"{{\"offset\":{offset}}}"),PokemonEncounterJson.Default.PokemonEncounterView)!;
                Check(page.Rows.Select(r=>r.Id).SequenceEqual(Enumerable.Range(offset,Math.Min(54,rows.Length-offset))),"Paging keeps physical result IDs without regenerating search");
            }
            int candidate=Array.FindIndex(rows,e=>e.Species==25&&!e.IsEgg&&e.Generation>=3);
            if(candidate>=0) {
                var ticket=JsonSerializer.Deserialize(SaveService.PreviewPokemonEncounter(input,candidate),PokemonEncounterJson.Default.PokemonEncounterTicket)!;
                var file=JsonSerializer.Deserialize(SaveService.CommitPokemonEncounter(input,JsonSerializer.Serialize(ticket.Confirmation,PokemonEncounterJson.Default.PokemonEncounterConfirmation)),PokemonEncounterJson.Default.PokemonFile)!;
                Check(Br4Editing.Hash(Convert.FromBase64String(file.Data))==ticket.Confirmation.OutputHash,"Public confirmation returns frozen bytes");
                var opened=StandalonePokemon.Open(Convert.FromBase64String(file.Data),file.FileName,false,true);
                Check(opened.Entity.GetType()==save.PKMType&&opened.Entity.ChecksumValid,"Public prepared file loads in complete editor");
                ticket=JsonSerializer.Deserialize(SaveService.PreviewPokemonEncounter(input,candidate),PokemonEncounterJson.Default.PokemonEncounterTicket)!;
                var changed=input.ToArray();changed[^1]^=1;
                Reject(()=>SaveService.ReadPokemonEncounters(changed,"{}"));
                Reject(()=>SaveService.CommitPokemonEncounter(input,JsonSerializer.Serialize(ticket.Confirmation,PokemonEncounterJson.Default.PokemonEncounterConfirmation)));
                ticket=JsonSerializer.Deserialize(SaveService.PreviewPokemonEncounter(input,candidate),PokemonEncounterJson.Default.PokemonEncounterTicket)!;
                _=SaveService.SetPokemonEncounterCriteria(input,"{\"action\":\"reset\"}");
                Reject(()=>SaveService.CommitPokemonEncounter(input,JsonSerializer.Serialize(ticket.Confirmation,PokemonEncounterJson.Default.PokemonEncounterConfirmation)));
                _=SaveService.OpenPokemonEncounters(input,Convert.FromBase64String(file.Data),JsonSerializer.Serialize(new PokemonEncounterOpenRequest(FileName:file.FileName),PokemonEncounterJson.Default.PokemonEncounterOpenRequest));
                _=SaveService.ReadPokemonEncounterCatalog(input);
            }
            _=SaveService.SetPokemonEncounterCriteria(input,"{\"action\":\"editor\"}");
            Reject(()=>SaveService.SetPokemonEncounterCriteria(input,"{\"action\":\"unknown\"}"));
            Reject(()=>SaveService.ReadPokemonEncounters(input,"{\"offset\":-1}"));
            Reject(()=>SaveService.OpenPokemonEncounters(input,[],"{\"fileName\":\"empty.pk3\"}"));
            Reject(()=>SaveService.ReadPokemonEncounterCatalog(input));
            Check(input.SequenceEqual(original),"Public search/generation/failures preserve input");
            Console.WriteLine($"PASS encounter public API {fixture}: candidates, source search, full paging, frozen preview, complete editor handoff and failure cleanup");
        }
        var range=PokemonEncounterCriteria.From(EncounterCriteria.Unrestricted) with{Hp=sbyte.MinValue,Atk=sbyte.MaxValue,LevelMin=byte.MaxValue,LevelMax=0,Mutations=byte.MaxValue};
        Check(PokemonEncounterCriteria.From(range.ToCore())==range,"PropertyGrid full numeric widths are preserved");
        Reject(()=>(range with{Nature=255}).ToCore());
        foreach(bool japanese in new[]{false,true})foreach(int partition in new[]{0,1})foreach(int profile in Enumerable.Range(0,4)){
            byte[] input=Br4EditingTests.Fixture(japanese,partition),before=input.ToArray();SaveService.ConfigureBRProfile(profile);
            var view=JsonSerializer.Deserialize(SaveService.OpenPokemonEncounters(input,[],"{}"),PokemonEncounterJson.Default.PokemonEncounterView)!;
            _=SaveService.ReadPokemonEncounters(input,"{\"query\":{\"species\":25,\"version\":10}}");
            SaveService.ConfigureBRProfile((profile+1)%4);Reject(()=>SaveService.ReadPokemonEncounterCatalog(input));
            Check(input.SequenceEqual(before)&&view.SourceHash==Br4Editing.Hash(input),"BR region/partition/profile source binding and unchanged encrypted file");
        }
        SaveService.ResetBRProfile();PokemonEncounterRuntime.Reset();
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid encounter API input accepted");}
}

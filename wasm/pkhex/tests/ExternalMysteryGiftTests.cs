// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class ExternalMysteryGiftTests
{
    internal static void Run()
    {
        ExternalMysteryGifts.Reset();
        var samples=ExternalMysteryGifts.BuiltInEvents().OfType<DataMysteryGift>().GroupBy(gift=>gift.GetType()).Select(group=>MysteryGift.GetMysteryGift(group.First().Data.ToArray(),"."+group.First().Extension)!).ToArray();
        samples.OfType<WC6>().Single().OriginalTrainerName="LocalGift";
        var files=samples.Select(gift=>new PokemonFile("../../not-an-owner-path/"+gift.FileName,Convert.ToBase64String(gift.Data))).ToArray();
        var duplicate=files.Concat(files).Append(new PokemonFile("notes.txt","AQID")).ToArray();
        string json=JsonSerializer.Serialize(duplicate,MysteryGiftDatabaseJson.Default.PokemonFileArray);
        int builtIn=ExternalMysteryGifts.BuiltInEvents().Count();
        try {
            Program.ConfigureExternalMysteryGifts(json);
            // Core's HashSet currently uses object identity for these cards;
            // two distinct files with equal bytes remain two external entries.
            Check(EncounterEvent.GetAllEvents().Count()==builtIn+samples.Length*2,"Core globals preserve source duplicate-file semantics");
            Check(EncounterEvent.EGDB_G6.Length==2&&EncounterEvent.EGDB_G9A.Length==2,"Core generation routing");
            var before=EncounterEvent.EGDB_G6[0];
            Program.ConfigureExternalMysteryGifts(json);
            Check(ReferenceEquals(before,EncounterEvent.EGDB_G6[0]),"Same context retains prepared encounter identities");
            Reject(()=>Program.ConfigureExternalMysteryGifts("[]"));
            Check(ReferenceEquals(before,EncounterEvent.EGDB_G6[0]),"Changed context cannot replace frozen Worker data");
            var save=File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav");
            var trainer=SaveService.OpenDatabaseSave(save.ToArray());
            var entity=before.ConvertToPKM(trainer);
            Check(EncounterGenerator6.Instance.GetPossible(entity,[new EvoCriteria {Species=before.Species,Form=before.Form}],entity.Version,EncounterTypeGroup.Mystery).Any(enc=>ReferenceEquals(enc,before)),"Encounter search sees shared external template");
            Check(new LegalityAnalysis(entity).EncounterMatch is WC6 matched&&matched.OriginalTrainerName=="LocalGift","Legality analysis matches the custom external trainer");
            using var global=JsonDocument.Parse(SaveService.OpenMysteryGiftDatabase(save,"{\"options\":{\"filterUnavailableSpecies\":false}}"));
            Check(global.RootElement.GetProperty("matches").GetInt32()==builtIn+samples.Length*2,"Default gift window reads shared external tables");
            var explicitJson=JsonSerializer.Serialize(new MysteryGiftDatabaseOpen(new(false),files),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseOpen);
            using var explicitView=JsonDocument.Parse(SaveService.OpenMysteryGiftDatabase(save,explicitJson));
            Check(explicitView.RootElement.GetProperty("matches").GetInt32()==builtIn+samples.Length,"Explicit window files do not double shared external gifts");
        } finally {MysteryGiftDatabaseRuntime.Reset();ExternalMysteryGifts.Reset();}
        Check(EncounterEvent.GetAllEvents().Count()==builtIn,"Worker reset clears external arrays and retains built-ins");
        Reject(()=>Program.ConfigureExternalMysteryGifts("[{\"fileName\":\"bad.wc6\",\"data\":\"!\"}]"));
        Reject(()=>Program.ConfigureExternalMysteryGifts(JsonSerializer.Serialize(Enumerable.Repeat(files[0],1025).ToArray(),MysteryGiftDatabaseJson.Default.PokemonFileArray)));
        Program.ConfigureExternalMysteryGifts("[]");
        Check(EncounterEvent.EGDB_G6.Length==0,"Empty context after failed validation remains empty");
        ExternalMysteryGifts.Reset();
        Console.WriteLine("PASS external mystery gifts: Core global tables, generation routing, duplicate semantics, stable/frozen context, database parity, bounds and reset");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(FormatException){return;}throw new Exception("Invalid external gift context accepted");}
}

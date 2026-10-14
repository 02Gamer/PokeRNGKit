// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.IO.Compression;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class MysteryGiftDatabaseApiTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"}) {
            var input=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav");var before=input.ToArray();
            using var opened=JsonDocument.Parse(SaveService.OpenMysteryGiftDatabase(input,"{}"));var view=opened.RootElement;
            Check(view.GetProperty("sourceHash").GetString()==Br4Editing.Hash(input),"Public source hash");
            int matches=view.GetProperty("matches").GetInt32();
            Check(view.GetProperty("rows").GetArrayLength()==Math.Min(54,matches),"Initial six-column grid");
            var save=SaveService.OpenDatabaseSave(input.ToArray());
            using var catalog=JsonDocument.Parse(SaveService.ReadMysteryGiftDatabaseCatalog(input,[],""));
            var langs=new[]{"zh-Hans","en","ja"};var selected=new MysteryGiftDatabase(save).Species.ToHashSet();
            foreach(var pair in new[]{("species",0),("items",1),("moves",2)}) {
                var fields=catalog.RootElement.GetProperty(pair.Item1).EnumerateArray().ToArray();
                for(int language=0;language<langs.Length;language++) {
                    var source=new FilteredGameDataSource(save,new GameDataSource(GameInfo.GetStrings(langs[language])));
                    var expected=(pair.Item2 switch {0=>source.Species.Where(value=>selected.Contains((ushort)value.Value)),1=>source.Items, _=>source.Moves.Skip(1)}).ToArray();
                    Check(fields.Select(field=>field.GetProperty("id").GetInt32()).Order().SequenceEqual(expected.Select(value=>value.Value).Order()),$"{fixture}/{pair.Item1}/{langs[language]} exact source candidate IDs");
                    if(language==1)Check(fields.Select(field=>field.GetProperty("id").GetInt32()).SequenceEqual(expected.Select(value=>value.Value)),"Stable English source order");
                    string label=language==0?"zh":language==1?"en":"ja";
                    var named=fields.GroupBy(field=>field.GetProperty("id").GetInt32()).ToDictionary(group=>group.Key,group=>group.Select(field=>field.GetProperty("name").GetProperty(label).GetString()).ToArray());
                    var sourceNames=expected.GroupBy(value=>value.Value).ToDictionary(group=>group.Key,group=>group.Select(value=>value.Text).ToArray());
                    Check(named.All(pair=>pair.Value.SequenceEqual(sourceNames[pair.Key])),"Exact trilingual names grouped by candidate ID");
                }
            }
            for(int offset=0;offset<matches;offset+=54) {
                using var page=JsonDocument.Parse(SaveService.ReadMysteryGiftDatabase(input,$"{{\"offset\":{offset}}}"));
                var rows=page.RootElement.GetProperty("rows").EnumerateArray().ToArray();
                Check(rows.Select(row=>row.GetProperty("id").GetInt32()).SequenceEqual(Enumerable.Range(offset,Math.Min(54,matches-offset))),"Pagination identity/order without regenerating");
                Check(rows.All(row=>row.GetProperty("details").GetArrayLength()>0 && row.GetProperty("sprite").GetString()!.StartsWith("b")),"Descriptions and exact source sprite keys");
            }
            Check(input.SequenceEqual(before),"Public operations preserve source");
            Console.WriteLine($"PASS {fixture} mystery gift public view: complete pages, trilingual catalogs, sprite/details and source preservation");
        }
        var x=File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav");
        SaveService.OpenMysteryGiftDatabase(x,"{\"options\":{\"filterUnavailableSpecies\":false}}");
        SaveService.ReadMysteryGiftDatabase(x,"{\"query\":{\"generation\":6,\"comparison\":2}}");
        using var preview=JsonDocument.Parse(SaveService.PreviewMysteryGiftDatabase(x,"{\"id\":0,\"convertToSave\":true}"));
        var token=preview.RootElement.GetProperty("confirmation").GetRawText();
        using var committed=JsonDocument.Parse(SaveService.CommitMysteryGiftDatabase(x,token));
        Check(Br4Editing.Hash(Convert.FromBase64String(committed.RootElement.GetProperty("data").GetString()!))==preview.RootElement.GetProperty("confirmation").GetProperty("outputHash").GetString(),"Public frozen confirmation exact bytes");
        Throws(()=>SaveService.CommitMysteryGiftDatabase(x,token));
        Throws(()=>SaveService.PreviewMysteryGiftDatabase(x,"{}"));
        Throws(()=>SaveService.OpenMysteryGiftDatabase(x,"{\"files\":[{\"fileName\":\"bad.wc9\",\"data\":\"AA==\"}]}"));
        Throws(()=>SaveService.ReadMysteryGiftDatabase(x,"{}"));
        var gift=EncounterEvent.MGDB_G9A.FirstOrDefault();
        if(gift is not null) {
            var file=new PokemonFile("custom.wa9",Convert.ToBase64String(gift.Data));
            var json=JsonSerializer.Serialize(new MysteryGiftDatabaseOpen(new(false),[file]),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseOpen);
            using var opened=JsonDocument.Parse(SaveService.OpenMysteryGiftDatabase(x,json));
            Check(opened.RootElement.GetProperty("matches").GetInt32()==EncounterEvent.GetAllEvents().Count()+1,"External Z-A file added without changing static Core library");
        }
        var duplicate=EncounterEvent.MGDB_G6.First(value=>value.IsEntity && !value.IsItem && value.Species!=0);
        var extra=new PokemonFile("duplicate.wc6",Convert.ToBase64String(duplicate.Data));
        SaveService.OpenMysteryGiftDatabase(x,JsonSerializer.Serialize(new MysteryGiftDatabaseOpen(new(false),[extra,extra]),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseOpen));
        using(var exported=JsonDocument.Parse(SaveService.ExportAllMysteryGiftDatabase(x)))
        using(var memory=new MemoryStream(SaveService.ExportMysteryGiftDatabaseArchive(x)))
        using(var archive=new ZipArchive(memory,ZipArchiveMode.Read)) {
            var files=exported.RootElement.EnumerateArray().ToArray();Check(archive.Entries.Count==files.Length,"ZIP retains every gift including duplicate source filenames");
            Check(archive.Entries.Select(entry=>entry.FullName).Distinct().Count()==files.Length,"Unique per-gift ZIP directory names");
            for(int i=0;i<files.Length;i++) {using var stream=archive.Entries[i].Open();using var bytes=new MemoryStream();stream.CopyTo(bytes);
                Check(bytes.ToArray().SequenceEqual(Convert.FromBase64String(files[i].GetProperty("data").GetString()!)),"Every unzipped gift matches exact Core export bytes");
            }
        }
        MysteryGiftDatabaseRuntime.Reset();Console.WriteLine("PASS mystery gift public frozen confirmation, required inputs, failed-open session reset, external gift ingestion and lossless duplicate-name ZIP");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Throws(Action action){try{action();}catch(Exception error)when(error is ArgumentException or JsonException or FormatException){return;}throw new Exception("Expected public mystery gift rejection.");}
}

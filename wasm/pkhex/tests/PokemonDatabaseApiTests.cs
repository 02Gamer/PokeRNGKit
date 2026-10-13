// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PKHeX.Core.Searching;
using PokeRNGKit.SaveEditor;
internal static class PokemonDatabaseApiTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"})
        {
            var save=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"))!;
            var p=save.BlankPKM;p.Species=25;p.Version=save.Version;p.CurrentLevel=5;p.ForcePartyData();p.Valid=true;
            var raw=new byte[p.SIZE_PARTY];p.WriteDecryptedDataParty(raw);
            byte[] input=save.Write().ToArray(),original=input.ToArray(),before=raw.ToArray();
            var files=new[]{new PokemonDatabaseDescriptor("file","entity."+p.Extension,0,raw.Length,true)};
            string sources=JsonSerializer.Serialize(new PokemonDatabaseOpenRequest(files,new(FilterUnavailableSpecies:false)),PokemonDatabaseJson.Default.PokemonDatabaseOpenRequest);
            var view=JsonSerializer.Deserialize(SaveService.OpenPokemonDatabase(input,raw,sources),PokemonDatabaseJson.Default.PokemonDatabaseView)!;
            var row=view.Rows.First(r=>r.FileId=="file");
            var catalog=JsonSerializer.Deserialize(SaveService.ReadPokemonDatabaseCatalog(input,row.Id),PokemonDatabaseJson.Default.PokemonDatabaseCatalog)!;
            var expectedCatalog=PokemonDatabaseFiles.Load(save,new[]{new PokemonDatabaseFile("file",files[0].Name,raw,true)}).Slots[0].Entity;
            Check(JsonSerializer.Serialize(catalog.Search,SaveJsonContext.Default.PokemonSearchCatalog)==JsonSerializer.Serialize(PokemonSearchCatalogReader.Read(save,expectedCatalog),SaveJsonContext.Default.PokemonSearchCatalog),"Selected database entity complete source search/property catalog");
            Check(catalog.Context==(int)save.Context && catalog.Comparison==(save.Generation>=8?1:3) && catalog.Boxes==save.BoxCount,"Source defaults and real box count");
            Check(catalog.Contexts.Select(c=>c.Id).SequenceEqual(Enum.GetValues<EntityContext>().Where(c=>c==EntityContext.None || c.IsValid && c.ToString().StartsWith("Gen",StringComparison.Ordinal)).Select(c=>(int)c)),"All source format candidates/order");
            Reject(()=>SaveService.ReadPokemonDatabaseCatalog(input,-2));
            var allQuery=new PokemonDatabaseQuery(new(),Context:EntityContext.None,Comparison:SearchComparison.None);
            var allRows=JsonSerializer.Deserialize(SaveService.ReadPokemonDatabase(input,JsonSerializer.Serialize(new PokemonDatabaseReadRequest(allQuery),PokemonDatabaseJson.Default.PokemonDatabaseReadRequest)),PokemonDatabaseJson.Default.PokemonDatabaseView)!;
            var archive=SaveService.ExportPokemonDatabaseArchive(input,JsonSerializer.Serialize(new PokemonDatabaseReadRequest(allQuery),PokemonDatabaseJson.Default.PokemonDatabaseReadRequest));
            using(var zip=new System.IO.Compression.ZipArchive(new MemoryStream(archive),System.IO.Compression.ZipArchiveMode.Read)) {
                Check(zip.Entries.Count==allRows.Matches,"Database archive includes all filtered rows");
                var entityEntry=zip.Entries.Single(entry=>entry.FullName.StartsWith($"{row.Id:000000}-",StringComparison.Ordinal));
                using var entityStream=entityEntry.Open();using var exported=new MemoryStream();entityStream.CopyTo(exported);
                var expectedFile=JsonSerializer.Deserialize(SaveService.ExportPokemonDatabaseEntity(input,row.Id),PokemonDatabaseJson.Default.PokemonFile)!;
                Check(exported.ToArray().SequenceEqual(Convert.FromBase64String(expectedFile.Data)),"Database ZIP preserves each own party representation");
            }
            var reportRequest=new PokemonDatabaseReportRequest(allQuery,new("zh-Hans"));
            var reportJson=JsonSerializer.Serialize(reportRequest,PokemonDatabaseJson.Default.PokemonDatabaseReportRequest);
            var dbReport=JsonSerializer.Deserialize(SaveService.ReadPokemonDatabaseReport(input,reportJson),SaveJsonContext.Default.PokemonReportData)!;
            var reportSource=new PokemonDatabaseSession(input,[new("file",files[0].Name,raw,true)],new(FilterUnavailableSpecies:false));
            int reportCount=reportSource.Database.Search(allQuery).Count(r=>r.Entry.Entity.Species-1u<r.Entry.Entity.MaxSpeciesID);
            Check(dbReport.Rows.Length==reportCount,$"Database report source species-range rule {fixture}: {dbReport.Rows.Length}/{reportCount}");
            string csv=SaveService.ExportPokemonDatabaseReport(input,reportJson),expectedCsv=PokemonReport.Csv(dbReport);
            Check(csv==expectedCsv,$"Database CSV {fixture} differs at {Enumerable.Range(0,Math.Min(csv.Length,expectedCsv.Length)).FirstOrDefault(i=>csv[i]!=expectedCsv[i],-1)}, lengths {csv.Length}/{expectedCsv.Length}");
            var queryImport=new PokemonDatabasePreviewRequest(files,new("import",Settings:EntityImportSettings.None,Query:new(new(),Current:false,Backups:false,Context:EntityContext.None,Comparison:SearchComparison.None)));
            var importTicket=JsonSerializer.Deserialize(SaveService.PreviewPokemonDatabase(input,raw,JsonSerializer.Serialize(queryImport,PokemonDatabaseJson.Default.PokemonDatabasePreviewRequest)),PokemonDatabaseJson.Default.PokemonDatabaseTicket)!;
            var importOracle=PokemonDatabase.Copy(SaveService.OpenDatabaseSave(input.ToArray()));
            var importRows=reportSource.Database.Search(queryImport.Edit.Query!).Select(r=>r.Entry.Entity.Clone()).ToArray();
            Check(importRows.Length==1,"Query selects the complete external file result set");
            int expectedImported=importOracle.LoadBoxes(importRows,out _,0,false,false,EntityImportSettings.None);
            Check(importTicket.Imported==expectedImported,$"Query import follows Core LoadBoxes eligibility {fixture}: {importTicket.Imported}/{expectedImported}");
            var importedDelta=JsonSerializer.Deserialize(SaveService.CommitPokemonDatabase(input,raw,JsonSerializer.Serialize(new PokemonDatabaseCommitRequest(files,importTicket.Confirmation),PokemonDatabaseJson.Default.PokemonDatabaseCommitRequest)),PokemonDatabaseJson.Default.PokemonDatabaseCommitDelta)!;
            byte[] expectedImport=importOracle.Write().ToArray();
            Check(importedDelta.Save.SequenceEqual(expectedImport),$"Query import whole Core output {fixture}, first difference {Enumerable.Range(0,Math.Min(importedDelta.Save.Length,expectedImport.Length)).FirstOrDefault(i=>importedDelta.Save[i]!=expectedImport[i],-1)}");
            string previewJson=JsonSerializer.Serialize(new PokemonDatabasePreviewRequest(files,new("delete",[row.Id])),PokemonDatabaseJson.Default.PokemonDatabasePreviewRequest);
            var ticket=JsonSerializer.Deserialize(SaveService.PreviewPokemonDatabase(input,raw,previewJson),PokemonDatabaseJson.Default.PokemonDatabaseTicket)!;
            string commitJson=JsonSerializer.Serialize(new PokemonDatabaseCommitRequest(files,ticket.Confirmation),PokemonDatabaseJson.Default.PokemonDatabaseCommitRequest);
            var delta=JsonSerializer.Deserialize(SaveService.CommitPokemonDatabase(input,raw,commitJson),PokemonDatabaseJson.Default.PokemonDatabaseCommitDelta)!;
            Check(delta.Removed.SequenceEqual(new[]{"file"})&&delta.Added.Length==0&&delta.Save.SequenceEqual(input),"Public delta excludes unchanged file buffers");
            Check(delta.FilesHash==PokemonDatabaseSession.HashFiles([]),"Public output file binding");
            var read=JsonSerializer.Serialize(new PokemonDatabaseReadRequest(new(new())),PokemonDatabaseJson.Default.PokemonDatabaseReadRequest);
            var stale=input.ToArray();stale[^1]^=1;Reject(()=>SaveService.ReadPokemonDatabase(stale,read));Reject(()=>SaveService.ExportPokemonDatabaseEntity(stale,row.Id));
            Check(input.SequenceEqual(original)&&raw.SequenceEqual(before),"Public all input buffers preserved");
            PokemonDatabaseRuntime.Reset();
        }
        foreach(bool japanese in new[]{false,true})foreach(int partition in new[]{0,1})foreach(int profile in Enumerable.Range(0,4))
        {
            byte[] input=Br4EditingTests.Fixture(japanese,partition),before=input.ToArray();
            SaveService.ConfigureBRProfile(profile);
            string json=JsonSerializer.Serialize(new PokemonDatabaseOpenRequest([],new(FilterUnavailableSpecies:false)),PokemonDatabaseJson.Default.PokemonDatabaseOpenRequest);
            _=SaveService.OpenPokemonDatabase(input,[],json);
            string read=JsonSerializer.Serialize(new PokemonDatabaseReadRequest(new(new())),PokemonDatabaseJson.Default.PokemonDatabaseReadRequest);
            _=SaveService.ReadPokemonDatabase(input,read);
            SaveService.ConfigureBRProfile((profile+1)%4);Reject(()=>SaveService.ReadPokemonDatabase(input,read));
            Check(input.SequenceEqual(before),"BR profile context read/rejection preserve encrypted input");
            PokemonDatabaseRuntime.Reset();SaveService.ResetBRProfile();
        }
        Console.WriteLine("PASS public database API: 13 save deltas/bindings/buffers and both BR regions/partitions/all four profiles/stale rejection");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid public database request accepted");}
}

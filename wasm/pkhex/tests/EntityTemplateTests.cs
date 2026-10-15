// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class EntityTemplateTests
{
    internal static void Run()
    {
        SaveProgramSettingsRuntime.Reset();
        foreach(var choice in EntityTemplate.Versions()) {
            var input=Array.Empty<byte>();var catalog=Read(input,new(choice.Id));
            var created=Create(input,new(choice.Id));var bytes=Convert.FromBase64String(created.Data);
            var save=BlankSaveFile.Get((GameVersion)choice.Id,(SaveFile?)null);var expected=save.BlankPKM;EntityTemplates.TemplateFields(expected,save);
            var actual=StandalonePokemon.Open(bytes,created.FileName,useFileFormat:true).Entity;
            // Some blank saves expose a version group (DP/XY/etc). The source
            // TemplateFields chooses a member of that group; align only that
            // independent random choice before comparing every serialized byte.
            Check(save.Version.Contains(actual.Version)||actual.Version==expected.Version,"Template version is outside its source version group");
            expected.Version=actual.Version;
            var wanted=expected is GBPKML gb?StandaloneGb.Write(gb):StandalonePokemon.Serialize(expected,false,false);
            Check(bytes.SequenceEqual(wanted)&&created.Version==choice.Id&&!created.UsedCustom&&catalog.Format==save.PKMType.Name&&created.SourceHash==Br4Editing.Hash(input),$"Default template {(GameVersion)choice.Id} differs: bytes={bytes.SequenceEqual(wanted)}, version={created.Version==choice.Id}, format={catalog.Format==save.PKMType.Name}, diffs={string.Join(',',Enumerable.Range(0,Math.Min(bytes.Length,wanted.Length)).Where(i=>bytes[i]!=wanted[i]).Take(20).Select(i=>i.ToString("X")+":"+bytes[i].ToString("X2")+"/"+wanted[i].ToString("X2")))}");
            Check(StandalonePokemon.Inspect(bytes,created.FileName,useFileFormat:true).CanEdit,"Template cannot open in entity editor");
            var p=StandalonePokemon.Open(bytes,created.FileName,useFileFormat:true).Entity;p.Species=25;p.CurrentLevel=25;
            var custom=p is GBPKML old?StandaloneGb.Write(old):StandalonePokemon.Serialize(p,false,false);
            var query=new EntityTemplateQuery(choice.Id,catalog.ExpectedFileName,Convert.ToBase64String(custom));
            var loaded=Create(input,query);
            Check(loaded.UsedCustom&&StandalonePokemon.Open(Convert.FromBase64String(loaded.Data),loaded.FileName,useFileFormat:true).Entity.Species==25,"Custom source template missing");
            Check(!Create(input,query with{TemplateName="wrong.pk3"}).UsedCustom,"Wrong source template name was loaded");
            Console.WriteLine($"PASS template {(GameVersion)choice.Id}: exact Core default fields, custom source name/load, wrong-name fallback and independent editable bytes");
        }
        foreach(var fixture in new[]{"E","D","X","SN","BD","GP","GE"}) {
            var input=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav");var before=input.ToArray();
            var catalog=Read(input,new((int)GameVersion.X));var created=Create(input,new((int)GameVersion.X));
            var source=SaveService.OpenDatabaseSave(input.ToArray());var save=BlankSaveFile.Get(GameVersion.X,source);var expected=save.BlankPKM;EntityTemplates.TemplateFields(expected,save);
            var actual=StandalonePokemon.Open(Convert.FromBase64String(created.Data),created.FileName,useFileFormat:true).Entity;Check(save.Version.Contains(actual.Version),"Source-context template version is outside its group");expected.Version=actual.Version;
            Check(Convert.FromBase64String(created.Data).SequenceEqual(StandalonePokemon.Serialize(expected,false,false))&&input.SequenceEqual(before)&&catalog.SourceHash==Br4Editing.Hash(before),"Current save language/template context differs or input changed");
        }
        var settings=SaveProgramSettingsCodec.Defaults();settings.Startup.DefaultSaveVersion=GameVersion.E;settings.LocalResources.TemplatePath=" custom\\nested/ ";
        SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
        try{var catalog=Read([],new());Check(catalog.Version==(int)GameVersion.E&&catalog.Directory=="custom/nested"&&catalog.ExpectedFileName=="nested.pk3","Saved template defaults/path not consumed");}
        finally{SaveProgramSettingsRuntime.Reset();}
        var sample=Read([],new((int)GameVersion.X));
        Check(Create([],new((int)GameVersion.X,sample.ExpectedFileName,Convert.ToBase64String(new byte[3]))).Fallback=="size","Implausible template size must fall back");
        Check(Create([],new((int)GameVersion.X,sample.ExpectedFileName,Convert.ToBase64String(new byte[232]))).Fallback=="unrecognized","Empty template must fall back");
        try{Create([],new((int)GameVersion.X,sample.ExpectedFileName,"bad-base64"));throw new Exception("Invalid base64 accepted");}catch(ArgumentException){}
        var realPath=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");
        if(!string.IsNullOrEmpty(realPath)) {
            var input=File.ReadAllBytes(realPath);var before=input.ToArray();var created=Create(input,new((int)GameVersion.E));
            Check(input.SequenceEqual(before)&&File.ReadAllBytes(realPath).SequenceEqual(before)&&created.SourceHash==Br4Editing.Hash(before),"Real save context was changed by template creation");
            Console.WriteLine("PASS real E.sav template context: source hash and complete input/original file preservation");
        }
        Console.WriteLine("PASS template settings, source contexts, malformed-size/empty fallback and invalid-data rejection");
    }
    private static EntityTemplateCatalog Read(byte[] input,EntityTemplateQuery query)=>JsonSerializer.Deserialize(SaveService.ReadEntityTemplateCatalog(input,JsonSerializer.Serialize(query,EntityTemplateJson.Default.EntityTemplateQuery)),EntityTemplateJson.Default.EntityTemplateCatalog)!;
    private static EntityTemplateCreated Create(byte[] input,EntityTemplateQuery query)=>JsonSerializer.Deserialize(SaveService.CreateEntityTemplate(input,JsonSerializer.Serialize(query,EntityTemplateJson.Default.EntityTemplateQuery)),EntityTemplateJson.Default.EntityTemplateCreated)!;
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
}

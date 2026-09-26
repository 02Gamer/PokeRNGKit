// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerGeographyTests
{
    private static void Require(bool value,string message) { if(!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile save) => new(save.OT,save.TID16,save.SID16,save.Money);
    private static byte[] Apply(byte[] data,TrainerEdit edit) => SaveService.Export(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.TrainerEdit));
    public static void Run()
    {
        foreach(var version in new[]{"X","OR","SN","US"})
        {
            var save=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            save.OT="A";
            var location=(IRegionOrigin)save; location.Country=1; location.Region=1; location.ConsoleRegion=0;
            var data=save.Write().ToArray(); var original=data.ToArray(); var basis=Original(save);
            var geo=TrainerEditing.Options(save).Geography!;
            Require(geo.Consoles.Select(c=>c.Id).SequenceEqual(new[]{0,1,2,4,5,6}),"Defined console catalog excludes unused 3");
            var upstream=Util.GetCountryRegionList("countries","zh-Hans");
            Require(geo.Countries.Select(c=>c.Id).SequenceEqual(upstream.Select(c=>c.Value)),"Country IDs and order match upstream");
            foreach(var country in geo.Countries.Where(c=>c.Id!=0))
            {
                var regions=geo.Regions.Single(r=>r.Country==country.Id).Choices;
                Require(regions.Select(c=>c.Id).SequenceEqual(Util.GetCountryRegionList($"sr_{country.Id:000}","zh-Hans").Select(c=>c.Value)),"Per-country region IDs/order");
                foreach(var language in new[]{"zh-Hans","en","ja"})
                {
                    var names=Util.GetCountryRegionList($"sr_{country.Id:000}",language).ToDictionary(c=>c.Value,c=>c.Text);
                    Require(regions.All(c => (language=="zh-Hans" ? c.Name.Zh : language=="en" ? c.Name.En : c.Name.Ja)==names[c.Id]),"Localized region names match upstream by ID");
                }
                var probe=save.Clone();
                TrainerEditing.Apply(probe,basis with {Country=country.Id,Region=regions[^1].Id});
                Require(((IRegionOrigin)probe).Country==country.Id && ((IRegionOrigin)probe).Region==regions[^1].Id,"Country catalog endpoints writable");
            }
            var cases=new List<TrainerEdit>();
            foreach(int country in new[]{1,18,49,77,136}.Where(id=>geo.Countries.Any(c=>c.Id==id)))
            {
                var regions=geo.Regions.Single(r=>r.Country==country).Choices;
                cases.Add(basis with {Country=country,Region=regions[0].Id});
                cases.Add(basis with {Country=country,Region=regions[^1].Id});
            }
            cases.AddRange(geo.Consoles.Select(c=>basis with {ConsoleRegion=c.Id}));
            cases.Add(basis with {Country=0,Region=255}); // Upstream does not clear region for country zero.
            foreach(var edit in cases)
            {
                var expected=SaveUtil.GetSaveFile(data.ToArray())!; var g=(IRegionOrigin)expected;
                if(edit.Country is int country) g.Country=(byte)country;
                if(edit.Region is int region) g.Region=(byte)region;
                if(edit.ConsoleRegion is int console) g.ConsoleRegion=(byte)console;
                var output=Apply(data,edit);
                Require(output.SequenceEqual(expected.Write().ToArray()),"Complete output matches direct Core geography setters");
                var after=SaveUtil.GetSaveFile(output.ToArray())!; var a=(IRegionOrigin)after;
                Require(after.ChecksumsValid && a.Country==g.Country && a.Region==g.Region && a.ConsoleRegion==g.ConsoleRegion,"Geography/checksum survives reread");
                Require(data.SequenceEqual(original),"Original input preserved");
            }
            foreach(var edit in new[]{basis with{Country=-1},basis with{Country=256},basis with{Country=255},basis with{Country=1,Region=255},basis with{Region=-1},basis with{Region=256},basis with{ConsoleRegion=3},basis with{ConsoleRegion=256}})
            {
                try { Apply(data,edit); throw new Exception("Invalid geography accepted"); }
                catch(ArgumentException) { Require(data.SequenceEqual(original),"Rejected request preserves input"); }
            }
            location.Country=255; location.Region=255; location.ConsoleRegion=255;
            var unusual=save.Write().ToArray(); var kept=SaveUtil.GetSaveFile(Apply(unusual,basis with{Money=1}))!;
            Require(((IRegionOrigin)kept).Country==255 && ((IRegionOrigin)kept).Region==255 && ((IRegionOrigin)kept).ConsoleRegion==255,"Unchanged abnormal geography retained");
            var consoleOnly=SaveUtil.GetSaveFile(Apply(unusual,basis with{ConsoleRegion=0}))!;
            Require(((IRegionOrigin)consoleOnly).Country==255 && ((IRegionOrigin)consoleOnly).Region==255,"Console edit preserves unmodified abnormal pair");
            Console.WriteLine($"PASS {version}: trainer country/region catalogs, console choices, full output, invalid requests and unchanged unusual values");
        }
        foreach(var version in new[]{"E","D","Pt","HG","B","B2","BD"})
        {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var save=SaveUtil.GetSaveFile(data.ToArray())!;
            Require(TrainerEditing.Options(save).Geography is null,"No region editor on unsupported formats");
            try { Apply(data,Original(save) with{Country=1}); throw new Exception("Unsupported geography accepted"); }
            catch(ArgumentException) { }
        }
        Console.WriteLine("PASS unsupported trainer geography rejection");
    }
}

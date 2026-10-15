// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonBallBrowserTests
{
    internal static void Run()
    {
        try
        {
            PKM[] samples = [new PK3 {Version=GameVersion.E}, new CK3 {Version=GameVersion.CXD}, new XK3 {Version=GameVersion.CXD},
                new PK4 {Version=GameVersion.D}, new BK4 {Version=GameVersion.D}, new PK5 {Version=GameVersion.B}, new PK6 {Version=GameVersion.X},
                new PK7 {Version=GameVersion.SN}, new PB7 {Version=GameVersion.GP}, new PK8 {Version=GameVersion.SW}, new PB8 {Version=GameVersion.BD},
                new PA8 {Version=GameVersion.PLA}, new PK9 {Version=GameVersion.SL}, new PA9 {Version=GameVersion.ZA}];
            foreach (var p in samples) {p.Species=25;p.Ball=4;p.Language=2;p.CurrentLevel=20;p.RefreshChecksum();}
            var legal = new PK6(File.ReadAllBytes("third_party/pkhex/legality-fixtures/legal-castform.pk6"));
            Check(new LegalityAnalysis(legal).Valid,"Upstream legal fixture must remain legal");
            foreach (bool legalFirst in new[]{true,false})
            {
                var settings=SaveProgramSettingsCodec.Defaults();settings.EntityEditor.ShowLegalBallsFirst=legalFirst;
                SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
                foreach (var p in samples.Append(legal)) Verify(p,legalFirst);
                var legalCatalog=PokemonBallBrowser.Read(legal);
                Check(legalCatalog.Choices.Any(c=>c.Legal)&&legalCatalog.Choices.Any(c=>!c.Legal),"Fixture must distinguish passing and non-passing ball choices");
                foreach(var p in samples)
                {
                    byte[] input=StandalonePokemon.Serialize(p,false,false),before=input.ToArray();
                    var request=new StandalonePokemonRequest("ball."+p.Extension,UseFileFormat:true,ReadKind:"origin",OriginBall:p.Ball);
                    var detail=JsonSerializer.Deserialize(Program.ReadStandalonePokemonAdvanced(input,JsonSerializer.Serialize(request,StandalonePokemonJson.Default.StandalonePokemonRequest)),StandalonePokemonJson.Default.StandaloneAdvancedData)!;
                    Check(detail.Origin?.BallBrowser?.Choices.Length==p.MaxBallID&&input.SequenceEqual(before),"Public independent file ball catalog and input preservation");
                    var ball=detail.Origin!.BallBrowser!.Choices.First(c=>c.StoredValue!=p.Ball).StoredValue;
                    var output=Program.EditStandalonePokemonRaw(input,JsonSerializer.Serialize(request with {Raw=new(0,0,"origin",Origin:new(Ball:ball))},StandalonePokemonJson.Default.StandalonePokemonRequest));
                    Check(StandalonePokemon.Open(output,request.FileName,useFileFormat:true).Entity.Ball==ball&&input.SequenceEqual(before),"Public ball selection/export/reopen and original preservation");
                }
                string? path=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");
                if(path is not null)
                {
                    byte[] input=File.ReadAllBytes(path),before=input.ToArray();var save=SaveUtil.GetSaveFile(input.ToArray())!;
                    for(int slot=0;slot<save.PartyCount;slot++)
                    {
                        var p=save.GetPartySlotAtIndex(slot);Verify(p,legalFirst);
                        string query=JsonSerializer.Serialize(new OriginQuery(-1,slot,Ball:p.Ball),SaveJsonContext.Default.OriginQuery);
                        var result=JsonSerializer.Deserialize(SaveService.ReadOrigin(input,query),SaveJsonContext.Default.OriginCatalog)!;
                        Check(result.BallBrowser!.Choices.SequenceEqual(PokemonBallBrowser.Read(p).Choices),"Real save public catalog matches Core-derived browser");
                    }
                    Check(input.SequenceEqual(before)&&File.ReadAllBytes(path).SequenceEqual(before),"Real save bytes and file preserved");
                }
                Console.WriteLine($"PASS ball browser legal-first={legalFirst}: 14 file formats, legal upstream fixture, full ID range, stable order, all three names, exact Core flags/color/setter readback, public file read/edit/reopen and real save preservation");
            }
            var target=samples[0];var bytesBefore=target.Data.ToArray();
            var split=new PK4 {Species=25,Version=GameVersion.HG,Ball=24};split.RefreshChecksum();
            var expectedSplit=split.Clone();expectedSplit.Version=GameVersion.D;expectedSplit.Ball=24;
            var preview=PokemonOrigin.Catalog(split,(int)GameVersion.D,24);
            Check(preview.BallBrowser!.CurrentBall==expectedSplit.Ball&&preview.BallBrowser.CurrentBall!=24&&split.Version==GameVersion.HG&&split.Ball==24,"Cross-version preview follows source split-ball setter without changing original");
            foreach(int invalid in new[]{-1,256})
            {
                try {PokemonOrigin.Catalog(target,ball:invalid);throw new Exception("Invalid preview ball accepted");}catch(ArgumentException){}
                Check(target.Data.SequenceEqual(bytesBefore),"Rejected preview changed source");
            }
            Console.WriteLine("PASS ball preview bounds: source byte/setter constraints and rejected query preservation");
        }
        finally {SaveProgramSettingsRuntime.Reset();}
    }

    private static void Verify(PKM p,bool legalFirst)
    {
        byte[] original=p.Data.ToArray();Span<Ball> balls=stackalloc Ball[BallApplicator.MaxBallSpanAlloc];
        int count=BallApplicator.GetLegalBalls(balls,p.Clone());var passing=balls[..count].ToArray().Select(b=>(int)b).ToHashSet();
        var actual=PokemonBallBrowser.Read(p);var expected=Enumerable.Range(1,p.MaxBallID);
        if(legalFirst)expected=expected.OrderByDescending(passing.Contains);
        Check(actual.LegalFirst==legalFirst&&actual.Choices.Select(c=>c.Id).SequenceEqual(expected),"Source complete ball ID order");
        foreach(var choice in actual.Choices)
        {
            Check(choice.Legal==passing.Contains(choice.Id),"Exact source ball check");
            var probe=p.Clone();probe.Ball=(byte)choice.Id;Check(choice.StoredValue==probe.Ball,"Source setter readback");
            foreach(var (lang,name) in new[]{("zh-Hans",choice.Name.Zh),("en",choice.Name.En),("ja",choice.Name.Ja)})
                Check(new GameDataSource(GameInfo.GetStrings(lang)).BallDataSource.First(c=>c.Value==choice.Id).Text==name,"Exact source localized name");
        }
        var poke=p.Clone();poke.Ball=4;var color=p.Clone();BallApplicator.ApplyBallLegalByColor(color);
        Check(actual.CurrentBall==p.Ball&&actual.PokeBall==poke.Ball&&actual.ColorBall==color.Ball,"Source current value, reset and color recommendation");
        Check(p.Data.SequenceEqual(original),"Catalog/color recommendation changed input");
    }
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
}

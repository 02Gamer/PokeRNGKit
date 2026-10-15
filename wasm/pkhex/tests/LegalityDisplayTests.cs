// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class LegalityDisplayTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"legal-shedinja.pk3.sav","illegal-shedinja.pk3.sav"}) {
            var input=File.ReadAllBytes(".tmp/pkhex-fixtures/"+fixture);var save=SaveUtil.GetSaveFile(input.ToArray())!;
            var entity=save.GetBoxSlotAtIndex(0,0);var original=entity.Data.ToArray();var reference=new LegalityAnalysis(entity.Clone(),save.Personal,StorageSlotType.Box);
            foreach(int flags in Enumerable.Range(0,16)) {
                var settings=SaveProgramSettingsCodec.Defaults();settings.Display.IgnoreLegalPopup=(flags&1)!=0;settings.Display.ExportLegalityAlwaysVerbose=(flags&2)!=0;
                settings.Display.ExportLegalityNeverClipboard=(flags&4)!=0;settings.Display.ExportLegalityVerboseProperties=(flags&8)!=0;
                try {
                    SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
                    var report=PokemonLegality.Analyze(save,new(0,0));
                    Check(report.HideReport==(settings.Display.IgnoreLegalPopup&&reference.Valid)&&report.AlwaysVerbose==settings.Display.ExportLegalityAlwaysVerbose&&report.CanCopy==!settings.Display.ExportLegalityNeverClipboard,"Source display flags for legal and illegal data");
                    foreach(string language in new[]{"zh-Hans","en","ja"}) {
                        var actual=language=="zh-Hans"?report.Clipboard?.Zh:language=="ja"?report.Clipboard?.Ja:report.Clipboard?.En;
                        var expected=report.CanCopy?reference.Report(language,true)+Environment.NewLine+Environment.NewLine+string.Join(Environment.NewLine,reference.EncounterOriginal.GetTextLines(settings.Display.ExportLegalityVerboseProperties,language)):null;
                        Check(actual==expected,"Source verbose report + original encounter clipboard in "+language);
                    }
                    Check(original.SequenceEqual(entity.Data.ToArray())&&input.SequenceEqual(File.ReadAllBytes(".tmp/pkhex-fixtures/"+fixture)),"Legality reporting preserves entity and fixture");
                }finally{SaveProgramSettingsRuntime.Reset();}
            }
        }
        Console.WriteLine("PASS legality display: all 16 setting combinations, both legality results, exact three-language clipboard and original bytes");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
}

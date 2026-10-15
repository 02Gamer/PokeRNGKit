// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonDisplayTests
{
    internal static void Run()
    {
        try {
            foreach(bool unicode in new[]{true,false}) {
                var settings=SaveProgramSettingsCodec.Defaults();settings.Display.Unicode=unicode;
                SaveProgramSettingsRuntime.Reset();
                SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
                foreach(int iv in new[]{0,16,21,31}) {
                    var pk=new PK9{Species=25,IV_HP=iv,IV_ATK=iv,IV_DEF=iv,IV_SPE=iv,IV_SPA=iv,IV_SPD=iv};
                    pk.RefreshChecksum();var before=pk.Data.ToArray();
                    if(PokemonDisplay.Potential(pk)!=pk.GetPotentialString(unicode)||PokemonReader.Read(pk,-1,0).Potential!=pk.GetPotentialString(unicode))throw new Exception("Potential differs from original Core");
                    if(!pk.Data.SequenceEqual(before))throw new Exception("Display read mutated Pokemon");
                }
                var entity=new PK9{Species=678};
                foreach(string language in new[]{"zh-Hans","en","ja"}) {
                    var strings=GameInfo.GetStrings(language);
                    var expected=FormConverter.GetFormList(678,strings.Types,strings.forms,unicode?GameInfo.GenderSymbolUnicode:GameInfo.GenderSymbolASCII,entity.Context);
                    if(!PokemonIdentity.Forms(entity,678,strings).SequenceEqual(expected))throw new Exception("Form symbols differ from source");
                }
                if(!PokemonIdentity.Genders(entity,678,0).SequenceEqual(new byte[]{0})||!PokemonIdentity.Genders(entity,678,1).SequenceEqual(new byte[]{1}))throw new Exception("Display preference changed gender validation");
                var forest=Misc5Forest.Forms(592);
                foreach(var (language,index) in new[]{("zh-Hans",0),("en",1),("ja",2)}) {
                    var strings=GameInfo.GetStrings(language);
                    var expected=FormConverter.GetFormList(592,strings.types,strings.forms,unicode?GameInfo.GenderSymbolUnicode:GameInfo.GenderSymbolASCII,EntityContext.Gen5);
                    if(!forest.Select(value=>index==0?value.Name.Zh:index==1?value.Name.En:value.Name.Ja).SequenceEqual(expected))throw new Exception("Forest form symbols differ from source");
                }
            }
            Console.WriteLine("PASS Pokemon display: original Core potential ratings, trilingual form symbols, unchanged gender semantics and original bytes in both Unicode modes");
        } finally {SaveProgramSettingsRuntime.Reset();}
    }
}

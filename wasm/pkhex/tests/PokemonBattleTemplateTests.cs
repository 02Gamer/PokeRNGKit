// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class PokemonBattleTemplateTests
{
    internal static void Run()
    {
        foreach(var fixture in new[]{"E","D","X","SN","BD","GP","GE"}) {
            var save=SaveService.OpenDatabaseSave(File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"));
            var pk=save.BlankPKM;pk.Species=25;pk.Nickname="Template";pk.CurrentLevel=25;pk.Move1=33;pk.IV_HP=31;pk.IV_ATK=1;pk.EV_HP=4;pk.EV_ATK=12;
            save.SetBoxSlotAtIndex(pk,0,EntityImportSettings.None);
            var data=save.Write().ToArray();var original=data.ToArray();
            var settings=SaveProgramSettingsCodec.Defaults();
            foreach(var style in new[]{BattleTemplateDisplayStyle.Showdown,BattleTemplateDisplayStyle.Brief,BattleTemplateDisplayStyle.Custom}) {
                settings.BattleTemplate.Export.TokenOrder=style;
                settings.BattleTemplate.Export.TokenOrderCustom=[BattleTemplateToken.FirstLine,BattleTemplateToken.Level,BattleTemplateToken.Moves];
                foreach(var language in new[]{LanguageID.None,LanguageID.English,LanguageID.Japanese}) {
                    settings.BattleTemplate.Export.Language=language;
                    SaveProgramSettingsRuntime.Reset();
                    SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
                    foreach(var q in new[]{new BattleTemplateQuery("single",0,0),new("box",0),new("allBoxes")}) {
                        var actual=JsonSerializer.Deserialize(SaveService.ReadBattleTemplate(data,JsonSerializer.Serialize(q,BattleTemplateJson.Default.BattleTemplateQuery)),BattleTemplateJson.Default.BattleTemplateReport)!;
                        var source=SaveService.OpenDatabaseSave(data.ToArray());
                        foreach(var l in new[]{(LanguageID.ChineseS,actual.Text.Zh),(LanguageID.English,actual.Text.En),(LanguageID.Japanese,actual.Text.Ja)}) {
                            var policy=settings.BattleTemplate.Export.GetSettings(l.Item1,source.Context);
                            var expected=q.Scope=="single"?ShowdownParsing.GetShowdownText(source.GetBoxSlotAtIndex(0),policy):ShowdownParsing.GetShowdownSets(q.Scope=="box"?source.GetBoxData(0):source.BoxData,Environment.NewLine+Environment.NewLine,policy);
                            Check(l.Item2==expected,"Complete source template differs");
                        }
                        Check(actual.ApiVersion==SaveService.ApiVersion&&actual.SourceHash==Br4Editing.Hash(data)&&data.SequenceEqual(original),"Template source binding/input changed");
                    }
                }
            }
            SaveProgramSettingsRuntime.Reset();
            foreach(var stat in new[]{StatDisplayStyle.Full,StatDisplayStyle.Raw,StatDisplayStyle.Raw00}) {
                var policy=SaveProgramSettingsCodec.Defaults();policy.BattleTemplate.Export.StyleStatIVs=stat;policy.BattleTemplate.Export.StyleStatEVs=stat;
                policy.BattleTemplate.Export.StyleStatOther=stat;policy.BattleTemplate.Export.StyleStatSPs=stat;
                policy.BattleTemplate.Export.StyleMove=MoveDisplayStyle.Directional;policy.BattleTemplate.Export.IncludeChampionsStatPoints=true;
                SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(policy,SaveProgramSettingsJson.Default.SaveProgramSettings));
                var source=SaveService.OpenDatabaseSave(data.ToArray());var sourcePk=source.GetBoxSlotAtIndex(0);
                var actual=PokemonBattleTemplate.Read(source,data,new("single",0,0));
                var expected=ShowdownParsing.GetShowdownText(sourcePk,policy.BattleTemplate.Export.GetSettings(LanguageID.English,source.Context));
                Check(actual.Text.En==expected&&data.SequenceEqual(original),"Stat/move/Champions export policy differs from Core");
            }
            SaveProgramSettingsRuntime.Reset();
            var partySave=SaveService.OpenDatabaseSave(data.ToArray());
            if(partySave.HasParty) {
                partySave.PartyData=[pk];
                var partyData=partySave.Write().ToArray();var before=partyData.ToArray();
                var actual=PokemonBattleTemplate.Read(SaveService.OpenDatabaseSave(partyData.ToArray()),partyData,new("party"));
                var expected=ShowdownParsing.GetShowdownSets(SaveService.OpenDatabaseSave(partyData.ToArray()).PartyData,Environment.NewLine+Environment.NewLine,new BattleTemplateSettings().Export.GetSettings(LanguageID.English,partySave.Context));
                Check(actual.Text.En==expected&&partyData.SequenceEqual(before),"Party export differs or changes input");
            }
            pk.RefreshChecksum();var entityData=new byte[pk.SIZE_STORED];pk.WriteDecryptedDataStored(entityData);var entityBefore=entityData.ToArray();
            var standalone=PokemonBattleTemplate.Standalone(entityData,JsonSerializer.Serialize(new StandalonePokemonRequest("test."+pk.Extension,UseFileFormat:true),StandalonePokemonJson.Default.StandalonePokemonRequest));
            Check(standalone.Count==1&&standalone.Text.En==ShowdownParsing.GetShowdownText(StandalonePokemon.Open(entityData,"test."+pk.Extension,useFileFormat:true).Entity,new BattleTemplateSettings().Export.GetSettings(LanguageID.English,pk.Context))&&entityData.SequenceEqual(entityBefore),"Standalone export differs or changes input");
            foreach(var json in new[]{"{}","{\"scope\":\"box\",\"box\":-1}","{\"scope\":\"single\",\"box\":0}","{\"scope\":\"allBoxes\",\"slot\":0}"}) {
                try { SaveService.ReadBattleTemplate(data,json);throw new Exception("Bad scope accepted"); }
                catch(ArgumentException){}catch(JsonException){}
            }
            Console.WriteLine($"PASS battle template {fixture}: complete three-language Core text, single/box/all-box scopes, orders/language override, source hash and original bytes");
        }
        var path=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");
        if(!string.IsNullOrEmpty(path)) {
            var data=File.ReadAllBytes(path);var before=data.ToArray();
            var policy=SaveProgramSettingsCodec.Defaults();policy.BattleTemplate.Export.Language=LanguageID.None;
            SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(policy,SaveProgramSettingsJson.Default.SaveProgramSettings));
            try {
                foreach(var query in new[]{new BattleTemplateQuery("party"),new("box",0),new("allBoxes")}) {
                    var save=SaveService.OpenDatabaseSave(data.ToArray());
                    var result=PokemonBattleTemplate.Read(save,data,query);
                    var entities=query.Scope=="party"?save.PartyData:query.Scope=="box"?save.GetBoxData(0):save.BoxData;
                    foreach(var pair in new[]{(LanguageID.ChineseS,result.Text.Zh),(LanguageID.English,result.Text.En),(LanguageID.Japanese,result.Text.Ja)}) {
                        var expected=ShowdownParsing.GetShowdownSets(entities,Environment.NewLine+Environment.NewLine,policy.BattleTemplate.Export.GetSettings(pair.Item1,save.Context));
                        Check(pair.Item2==expected,"Real save full template differs from Core");
                    }
                    Check(result.Count==entities.Count(p=>p.Species!=0)&&result.SourceHash==Br4Editing.Hash(before)&&data.SequenceEqual(before),"Real save count/source/input changed");
                }
                Check(File.ReadAllBytes(path).SequenceEqual(before),"Real save file changed");
                Console.WriteLine("PASS real E.sav battle templates: party/box/all-box counts, complete three-language text, Core parity, source hash and file preservation");
            }finally{SaveProgramSettingsRuntime.Reset();}
        }
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
}

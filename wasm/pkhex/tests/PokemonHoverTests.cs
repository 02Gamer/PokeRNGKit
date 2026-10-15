// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonHoverTests
{
    internal static void Run()
    {
        foreach(var fixture in new[]{"E","D","X","SN","BD","GP","GE"}) {
            var bytes=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav");var original=bytes.ToArray();
            var save=SaveService.OpenDatabaseSave(bytes.ToArray());
            var pk=save.BlankPKM;
            pk.Species=25;pk.CurrentLevel=25;pk.Nickname="Hover";pk.Move1=33;pk.Move3=45;
            save.SetBoxSlotAtIndex(pk,0,EntityImportSettings.None);bytes=save.Write().ToArray();original=bytes.ToArray();
            var settings=SaveProgramSettingsCodec.Defaults();
            string policy=JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings);
            SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(policy);
            try {
                var hover=Read(bytes);var stored=SaveService.OpenDatabaseSave(bytes.ToArray());var pokemon=stored.GetBoxSlotAtIndex(0);
                var analysis=new LegalityAnalysis(pokemon.Clone(),stored.Personal,StorageSlotType.Box);
                Check(hover.Box==0&&hover.Slot==0&&hover.SourceHash==Br4Editing.Hash(bytes),"Hover binds position and complete source bytes");
                foreach(var language in new[]{("zh-Hans",LanguageID.ChineseS,hover.Text.Zh),("en",LanguageID.English,hover.Text.En),("ja",LanguageID.Japanese,hover.Text.Ja)}) {
                    var template=settings.BattleTemplate.Hover.GetSettings(language.Item2,pokemon.Context);
                    var order=template.Order.Contains(BattleTemplateToken.FirstLine)?template.Order.ToArray():new[]{BattleTemplateToken.FirstLine}.Concat(template.Order.ToArray()).ToArray();
                    var expected=ShowdownParsing.GetLocalizedPreviewText(pokemon,template with{Order=order});
                    Check(language.Item3.Tooltip.StartsWith(expected,StringComparison.Ordinal),"Tooltip uses exact localized Core battle template");
                    Check(language.Item3.Moves.Length==pokemon.Moves.Count(move=>move!=0),"All occupied move slots are represented");
                    Check(language.Item3.Moves.Select(move=>move.Valid).SequenceEqual(analysis.Info.Moves.Where((_,index)=>pokemon.GetMove(index)!=0).Select(move=>move.Valid)),"Move validity follows Core");
                    Check(language.Item3.Title.Length!=0,"Localized header present");
                }
                Check(bytes.SequenceEqual(original),"Hover preserves all source bytes");
            } finally {SaveProgramSettingsRuntime.Reset();}
            settings.Hover.HoverSlotShowText=false;settings.Hover.HoverSlotShowEncounter=false;settings.Hover.HoverSlotShowLegalityHint=false;settings.Hover.PreviewShowPaste=false;
            SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
            try {
                var hidden=Read(bytes);
                foreach(var text in new[]{hidden.Text.Zh,hidden.Text.En,hidden.Text.Ja})Check(text.Tooltip==""&&text.Before==""&&text.After==""&&text.Hint=="","Disabled sections emit no display content");
                Reject(()=>SaveService.ReadPokemonHover(bytes,"{}"));
                Reject(()=>SaveService.ReadPokemonHover(bytes,"{\"box\":-2,\"slot\":0}"));
                Reject(()=>SaveService.ReadPokemonHover(bytes,"{\"box\":0,\"slot\":9999}"));
                Reject(()=>SaveService.ReadPokemonHover(bytes,new string(' ',1025)));
            } finally {SaveProgramSettingsRuntime.Reset();}
            Console.WriteLine($"PASS {fixture} hover: trilingual Core templates, complete move validity, source hash, disabled sections, bounds and original bytes");
        }
        var partySave=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"));
        var partyPokemon=partySave.BlankPKM;partyPokemon.Species=25;partyPokemon.CurrentLevel=25;partyPokemon.Move1=33;
        partySave.SetPartySlotAtIndex(partyPokemon,0,EntityImportSettings.None);
        var party=partySave.Write().ToArray();var before=party.ToArray();
        var result=SaveService.ReadPokemonHover(party,"{\"box\":-1,\"slot\":0}");
        Check(JsonSerializer.Deserialize(result,PokemonHoverJson.Default.PokemonHoverReport)!.Box==-1&&party.SequenceEqual(before),"Party hover preserves source bytes");
    }
    private static PokemonHoverReport Read(byte[] bytes)=>JsonSerializer.Deserialize(SaveService.ReadPokemonHover(bytes,"{\"box\":0,\"slot\":0}"),PokemonHoverJson.Default.PokemonHoverReport)!;
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid hover request accepted");}
}

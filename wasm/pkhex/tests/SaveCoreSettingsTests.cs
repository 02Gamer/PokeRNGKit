// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
using System.Text.Json.Nodes;
using PokeRNGKit.SaveEditor;

internal static class SaveCoreSettingsTests
{
    private static void Check(bool value,string message) { if (!value) throw new Exception(message); }
    internal static void Run()
    {
        var input=SaveCoreSettings.Defaults();
        string json=JsonSerializer.Serialize(input,SaveCoreSettingsJson.Default.SaveCoreSettings);
        Check(SaveCoreSettingsRuntime.Decode(json).Legality.Nickname.Nickname9a is not null,"Complete nested JSON roundtrip");
        var node=JsonNode.Parse(json)!.AsObject();node["unknown"]=true;
        Reject(()=>SaveCoreSettingsRuntime.Decode(node.ToJsonString()));
        node=JsonNode.Parse(json)!.AsObject();node["legality"]!["nickname"]!.AsObject().Remove("nickname9a");
        Reject(()=>SaveCoreSettingsRuntime.Decode(node.ToJsonString()));
        string converter=JsonNode.Parse(json)!["converter"]!.ToJsonString();
        Reject(()=>SaveCoreSettingsRuntime.Decode(json.Replace("\"converter\":", "\"converter\":"+converter+",\"converter\":")));
        input.Legality.Tradeback.AllowGen1Tradeback=false;
        input.Legality.WordFilter.CheckWordFilter=false;
        input.SlotWrite.SetUpdateDex=false;input.SlotWrite.SetUpdatePKM=false;input.SlotWrite.SetUpdateRecords=false;
        input.Import.ApplyMarkings=false;input.Import.ApplyStatAlignment=false;
        input.Converter.RetainMetDateTransfer45=true;
        try {
            SaveCoreSettingsRuntime.Apply(input);
            Check(!ParseSettings.AllowGen1Tradeback&&!ParseSettings.Settings.WordFilter.CheckWordFilter,"Nested legality settings reach Core");
            Check(SaveFile.SetUpdateSettings==EntityImportSettings.None,"Slot writes reach actual Core defaults");
            Check(!CommonEdits.ShowdownSetIVMarkings&&!CommonEdits.ShowdownSetBehaviorNature&&EntityConverter.RetainMetDateTransfer45,"Import and converter globals follow source apply");
            input.Legality.Tradeback.AllowGen1Tradeback=true;
            Check(!ParseSettings.AllowGen1Tradeback,"Caller cannot mutate live nested settings");
            SaveCoreSettingsRuntime.Apply(SaveCoreSettings.Defaults());
            Check(ParseSettings.AllowGen1Tradeback&&SaveFile.SetUpdateSettings==EntityImportSettings.All&&!EntityConverter.RetainMetDateTransfer45,"Fresh settings restore defaults");
            var before=ParseSettings.Settings;
            var invalid=SaveCoreSettings.Defaults(); invalid.Legality.Nickname.Nickname9a=null!;
            Reject(()=>SaveCoreSettingsRuntime.Apply(invalid));
            Check(ReferenceEquals(ParseSettings.Settings,before),"Null nested input rejects before modifying live settings");
            invalid=SaveCoreSettings.Defaults();invalid.Legality.FramePattern.RNGFrameNotFound3=(Severity)127;
            Reject(()=>SaveCoreSettingsRuntime.Apply(invalid));
            Check(ReferenceEquals(ParseSettings.Settings,before),"Invalid nested enum preserves old globals");
            var savedVersion=SaveLanguage.OverrideVersionGen2;
            SaveLanguage.OverrideVersionGen2=GameVersion.GS;
            SaveFile.SetUpdateDex=EntityImportOption.UseDefault;
            var scoped=SaveCoreSettings.Defaults();scoped.SaveLanguage.OverrideGen2.Version=GameVersion.GD;
            scoped.Legality.Tradeback.AllowGen1Tradeback=false;
            var scope=SaveCoreSettingsRuntime.Begin(scoped);
            try {
                Check(SaveLanguage.OverrideVersionGen2==GameVersion.GD&&!ParseSettings.AllowGen1Tradeback,"Request scope applies settings");
                using(var nested=SaveCoreSettingsRuntime.Begin(SaveCoreSettings.Defaults()))
                    Check(ParseSettings.AllowGen1Tradeback,"Nested scope can use independent settings");
                Check(!ParseSettings.AllowGen1Tradeback,"Nested disposal restores outer settings");
            } finally {scope.Dispose();scope.Dispose();}
            Check(SaveLanguage.OverrideVersionGen2==GameVersion.GS&&SaveFile.SetUpdateSettings.UpdatePokeDex==EntityImportOption.UseDefault&&ReferenceEquals(ParseSettings.Settings,before),"Disposal restores grouped fallback, exact import option and old object identity");
            SaveLanguage.OverrideVersionGen2=savedVersion;
            byte[] source=File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"), original=source.ToArray();
            foreach(int mask in Enumerable.Range(0,8)) {
                var settings=SaveCoreSettings.Defaults();
                settings.SlotWrite.SetUpdatePKM=(mask&1)!=0;
                settings.SlotWrite.SetUpdateDex=(mask&2)!=0;
                settings.SlotWrite.SetUpdateRecords=(mask&4)!=0;
                var actual=new SAV3E(source.ToArray());var oracle=new SAV3E(source.ToArray());
                var entity=new PK3 { Species=133, Version=GameVersion.E, Language=2, OriginalTrainerName="OTHER", TID16=7, SID16=8, CurrentLevel=25 };
                entity.RefreshChecksum();
                using(SaveCoreSettingsRuntime.Begin(settings)) actual.SetBoxSlotAtIndex(entity.Clone(),0,0);
                var options=new EntityImportSettings(settings.SlotWrite.SetUpdatePKM?EntityImportOption.Enable:EntityImportOption.Disable,
                    settings.SlotWrite.SetUpdateDex?EntityImportOption.Enable:EntityImportOption.Disable,
                    settings.SlotWrite.SetUpdateRecords?EntityImportOption.Enable:EntityImportOption.Disable);
                oracle.SetBoxSlotAtIndex(entity.Clone(),0,0,options);
                Check(actual.Write().Span.SequenceEqual(oracle.Write().Span),"Actual default slot import matches explicit source flags: "+mask);
                Check(source.SequenceEqual(original),"Settings and slot import preserve original file");
            }
        } finally { SaveCoreSettingsRuntime.Apply(SaveCoreSettings.Defaults()); }
        Console.WriteLine("PASS Core settings apply: nested ownership, slot/import/converter effects and default restoration; internal only");
    }
    private static void Reject(Action action) {try {action();throw new Exception("Invalid settings accepted");}catch(ArgumentException){}}
}

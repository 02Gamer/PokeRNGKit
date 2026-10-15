// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class SaveSlotArtworkTests
{
    internal static void Run()
    {
        var settings=SaveProgramSettingsCodec.Defaults();settings.Sprite.ShowEncounterColorPKM=BrowserSpriteBackground.FullBackground;settings.Sprite.ShowExperiencePercent=true;
        try {
            SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
            var save=new SAV3E(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"));
            for(int i=0;i<6;i++) {
                var flags=(StorageSlotSource)((int)StorageSlotSource.BattleTeam1<<i)|(StorageSlotSource)((int)StorageSlotSource.Party1<<i)|StorageSlotSource.Locked|StorageSlotSource.Starter;
                Check(SaveSlotArtwork.Markers(flags).SequenceEqual(new[]{"team","locked","party"+(i+1),"starter"}),"All six Core party/team flags keep source ordering");
            }
            Check(SaveSlotArtwork.Markers(StorageSlotSource.Party1|StorageSlotSource.Party6).SequenceEqual(new[]{"party1"}),"Source first set party bit wins");
            var swsh=new SAV8SWSH();swsh.TeamIndexes.TeamSlots[0]=0;swsh.TeamIndexes.SetIsTeamLocked(0,true);
            Check(SaveSlotArtwork.Markers(swsh,0,0).SequenceEqual(new[]{"team","locked"}),"Real SWSH locked team slot supplies markers");
            Check(SaveSlotArtwork.EmptyMarkers(swsh).Any(v=>v.Box==0&&v.Slot==0&&v.Markers.SequenceEqual(new[]{"team","locked"})),"Empty protected slot still has source artwork");
            var member=new PK8 {Species=25,Language=2,Version=GameVersion.SW};member.RefreshChecksum();swsh.SetBoxSlotAtIndex(member,0,0,EntityImportSettings.None);
            Check(!SaveSlotArtwork.EmptyMarkers(swsh).Any(v=>v.Box==0&&v.Slot==0),"Occupied marker is not duplicated as empty");
            var memberBefore=member.Data.ToArray();
            var memberView=PokemonReader.Read(member,0,0,true,swsh);
            Check(memberView.SlotMarkers!.SequenceEqual(new[]{"team","locked"})&&memberView.ExperienceBeforeMarkers,"Actual entity view carries markers and legality EXP ordering");
            Check(memberBefore.SequenceEqual(member.Data.ToArray()),"Marker reading preserves member data");
            Check(SaveSlotArtwork.Markers(swsh,0,30).Length==0,"Source slot<30 limit is preserved");
            var letsgo=new SAV7b(File.ReadAllBytes(".tmp/pkhex-fixtures/GP.sav"));
            letsgo.Blocks.Storage.StarterIndex=0;
            for(int box=0;box<letsgo.BoxCount;box++)for(int slot=0;slot<letsgo.BoxSlotCount;slot++) {
                var expected=SaveSlotArtwork.Markers(letsgo.GetBoxSlotFlags(box,slot));
                Check(SaveSlotArtwork.Markers(letsgo,box,slot).SequenceEqual(expected),"LGPE linked party/starter flags follow physical slot");
            }
            Check(SaveSlotArtwork.Markers(letsgo,0,0).Contains("starter"),"LGPE starter is marked");
            foreach(var (box,slot) in new[]{(-1,0),(0,0)}) {
                var p=PokemonEditing.Read(save,box,slot);var before=p.Data.ToArray();
                var source=new LegalityAnalysis(p.Clone(),save.Personal,box==-1?StorageSlotType.Party:StorageSlotType.Box);
                var view=PokemonReader.Read(p,box,slot,true,save);
                Check(view.Valid==p.ChecksumValid&&view.LegalityParsed==source.Parsed&&view.LegalityValid==source.Valid,"Checksum and source legality remain independent");
                Check(view.LegalityIndicator==(source.Valid?null:"warn"),"Source invalid slot marker");
                int color=unchecked(source.EncounterOriginal.GetType().Name.GetHashCode()*0x43FD43FD);
                Check(view.EncounterLayer is {Mode:2,Opacity:63}&&view.EncounterLayer.Color==$"#{color&0xFFFFFF:X6}","PKM background uses original legality encounter");
                Check(before.SequenceEqual(p.Data.ToArray()),"Legality artwork analyzes a clone");
            }
            var original=save.Write().ToArray();var report=JsonSerializer.Deserialize(SaveService.Inspect(original),SaveJsonContext.Default.SaveReport)!;
            Check(report.Pokemon.All(p=>p.LegalityParsed is not null&&p.LegalityValid is not null)&&report.SpriteFilter is {Alpha.Length:256},"Public save report carries legality and filter profile");
            Check(original.SequenceEqual(save.Write().ToArray()),"Slot display does not change the save");
            foreach(float opacity in new[]{0.4f,0.7f,0f,1f,-1f,2f,float.MaxValue}) {
                settings.Sprite.FilterMismatchOpacity=opacity;settings.Display.FlagIllegal=false;
                SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
                var profile=SaveSlotArtwork.Filter()!;
                Check(profile.Alpha.SequenceEqual(Enumerable.Range(0,256).Select(alpha=>opacity is <=0.01f or >1f?alpha:(int)unchecked((byte)(alpha*(double)opacity)))),"Source opacity skip range and runtime byte cast profile: "+opacity);
                var view=PokemonReader.Read(save.GetBoxSlotAtIndex(0,0),0,0,true,save);
                Check(view.LegalityValid is null&&view.LegalityIndicator is null&&view.EncounterLayer is null,"Disabling flagging disables source legality overlays");
                Check(!view.ExperienceBeforeMarkers,"No legality flag paints EXP after markers");
            }
            var eggEncounter=new EncounterStatic7(GameVersion.US){Species=25,Level=1,EggLocation=1};
            var leveled=new PK7 {Species=25,Language=2,Version=GameVersion.US,CurrentLevel=1,MetLevel=50};
            Check(SaveSpriteView.ExperienceBar(leveled,true,eggEncounter) is {Color:"#FFFF00"},"Legality EXP uses egg encounter level rather than stored met level");
            settings.Display.FlagIllegal=true;settings.Startup.ForceHaXOnLaunch=true;
            SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
            Check(PokemonReader.Read(save.GetBoxSlotAtIndex(0,0),0,0,true,save).LegalityIndicator is null,"Source advanced mode suppresses illegal-slot flagging");
        }finally{SaveProgramSettingsRuntime.Reset();SaveSpriteView.Configure("b");}
        Console.WriteLine("PASS slot legality artwork: source personal/party context, independent checksum, clone preservation, PKM color, egg EXP and runtime filter alpha");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
}

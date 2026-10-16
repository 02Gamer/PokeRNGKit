// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class SaveSlotAccessTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    internal static void Layout(SaveFile save)
    {
        byte[] before=save.Data.ToArray();var info=SaveSlotAccess.Read(save);
        Check(info.HasBox==save.HasBox&&info.HasParty==new SlotInfoParty(0).CanWriteTo(save),"Actual storage presence / party write predicate");
        var blocked=info.Blocked.ToHashSet();Check(blocked.Count==info.Blocked.Length,"Unique blocked slots");
        if(save.HasBox)for(int b=0;b<save.BoxCount;b++)for(int s=0;s<save.BoxSlotCount;s++)
            Check(blocked.Contains(new(b,s))==!new SlotInfoBox(b,s,save).CanWriteTo(save),"Every physical slot matches Core CanWriteTo");
        Check(before.SequenceEqual(save.Data.ToArray()),"Access read preserves save bytes");
    }
    internal static void Run()
    {
        foreach(string name in new[]{"E","D","B","X","SN","GP","BD"})
        {
            byte[] input=File.ReadAllBytes(".tmp/pkhex-fixtures/"+name+".sav"),before=input.ToArray();var save=SaveService.OpenDatabaseSave(input);Layout(save);
            using var json=JsonDocument.Parse(Program.Inspect(input));var metadata=json.RootElement.GetProperty("slotAccess");
            var expected=SaveSlotAccess.Read(save);
            Check(metadata.GetProperty("hasBox").GetBoolean()==expected.HasBox&&metadata.GetProperty("hasParty").GetBoolean()==expected.HasParty,"Public metadata includes storage shape");
            Check(metadata.GetProperty("blocked").GetArrayLength()==expected.Blocked.Length,"Public metadata preserves lock list");
            Check(input.SequenceEqual(before),"Public inspect preserves original input");
        }
        var swsh=new SAV8SWSH();swsh.TeamIndexes.TeamSlots[0]=0;swsh.TeamIndexes.SetIsTeamLocked(0,true);Layout(swsh);
        Check(SaveSlotAccess.Read(swsh).Blocked.Contains(new(0,0)),"Real empty SWSH battle team lock is present without artwork settings");
        var member=new PK8{Species=25,Version=GameVersion.SW};member.RefreshChecksum();swsh.SetBoxSlotAtIndex(member,0,0,EntityImportSettings.None);Layout(swsh);
        Check(SaveSlotAccess.Read(swsh).Blocked.Contains(new(0,0)),"Occupied protected slot retains the same permission");
        swsh.TeamIndexes.SetIsTeamLocked(0,false);Check(!SaveSlotAccess.Read(swsh).Blocked.Contains(new(0,0)),"Unlocked team refresh clears stale lock");
        var letsgo=new SAV7b(File.ReadAllBytes(".tmp/pkhex-fixtures/GP.sav"));letsgo.Blocks.Storage.StarterIndex=0;Layout(letsgo);
        Check(!SaveSlotAccess.Read(letsgo).HasParty,"LGPE's linked party is not a separate writable party");
        Console.WriteLine("PASS slot access: public seven-format metadata, every physical position, empty/occupied locks, unlock refresh, LGPE party model and input preservation");
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class HomeTrackerTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid HOME edit accepted");}
    internal static void Run()
    {
        foreach(PKM source in new PKM[]{new PK8 {Version=GameVersion.SW},new PB8 {Version=GameVersion.BD},new PA8 {Version=GameVersion.PLA},new PK9 {Version=GameVersion.SL},new PA9 {Version=GameVersion.ZA}}) {
            source.Species=25;source.Language=2;source.PID=12345;source.CurrentLevel=25;source.Nickname="TEST";source.OriginalTrainerName="TEST";
            source.ResetPartyStats();source.Stat_HPCurrent=1;source.Status_Condition=8;source.RefreshChecksum();
            foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true}) {
                var input=new byte[party?source.SIZE_PARTY:source.SIZE_STORED];
                if(party){if(encrypted)source.WriteEncryptedDataParty(input);else source.WriteDecryptedDataParty(input);}
                else{if(encrypted)source.WriteEncryptedDataStored(input);else source.WriteDecryptedDataStored(input);}
                var original=input.ToArray();var filename="tracker."+source.Extension;
                foreach(var text in new[]{"", "0x12-xyA","0000000000000001","FEDCBA9876543210","FFFFFFFFFFFFFFFF"}) {
                    var edit=new PokemonRawEdit(0,0,"values",HomeTracker:text);
                    var output=StandalonePokemon.EditRaw(input,filename,edit,encrypted,true);
                    var actual=StandalonePokemon.Open(output,filename,false,true).Entity;
                    var expected=source.Clone();((IHomeTrack)expected).Tracker=Util.GetHexValue64(text);expected.RefreshChecksum();
                    var bytes=new byte[party?expected.SIZE_PARTY:expected.SIZE_STORED];
                    if(party)expected.WriteDecryptedDataParty(bytes);else expected.WriteDecryptedDataStored(bytes);
                    Check(output.SequenceEqual(bytes),source.GetType().Name+": exact tracker-only output including party values");
                    Check(actual.ChecksumValid&&((IHomeTrack)actual).Tracker==Util.GetHexValue64(text),"Full uint64 reopens exactly");
                    var report=StandalonePokemon.Inspect(output,filename,false,true);
                    Check(report.Pokemon.HomeTracker==Util.GetHexValue64(text).ToString("X16"),"Report carries a lossless padded hex string");
                    Check(input.SequenceEqual(original),"Original entity input unchanged");
                }
                Reject(()=>StandalonePokemon.EditRaw(input,filename,new(0,0,"values",HomeTracker:new string('1',17)),encrypted,true));
                Reject(()=>StandalonePokemon.EditRaw(input,filename,new(0,0,"rerollPid",HomeTracker:"1"),encrypted,true));
            }
        }
        foreach(PKM old in new PKM[]{new PK3 {Version=GameVersion.E},new PK7 {Version=GameVersion.SN}}) {
            old.Species=25;old.Language=2;old.RefreshChecksum();
            Reject(()=>PokemonRawEditing.Apply(old,new(0,0,"values",HomeTracker:"1"),false));
            Check(PokemonReader.Read(old,0,0).HomeTracker is null,"Unsupported formats have no HOME field");
        }
        var save=SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav"))!;
        var sourceSave=save.Write().ToArray();
        var saveReport=JsonSerializer.Deserialize(SaveService.Inspect(sourceSave),SaveJsonContext.Default.SaveReport)!;
        Check(saveReport.GameName is not null&&saveReport.GameName.Zh==GameInfo.GetStrings("zh-Hans").gamelist[(int)save.Version]
            &&saveReport.GameName.En==GameInfo.GetStrings("en").gamelist[(int)save.Version]
            &&saveReport.GameName.Ja==GameInfo.GetStrings("ja").gamelist[(int)save.Version],"Save title game names use active-language Core data");
        foreach(int box in new[]{0,-1}) {
            var edit=new PokemonRawEdit(box,0,"values",HomeTracker:"FFFFFFFFFFFFFFFF");
            var output=SaveService.EditPokemonRaw(sourceSave,JsonSerializer.Serialize(edit,SaveJsonContext.Default.PokemonRawEdit));
            var actual=SaveUtil.GetSaveFile(output)!;var expected=SaveUtil.GetSaveFile(sourceSave.ToArray())!;
            var entity=PokemonEditing.Read(expected,box,0);((IHomeTrack)entity).Tracker=ulong.MaxValue;entity.RefreshChecksum();
            if(box<0)expected.SetPartySlotAtIndex(entity,0,EntityImportSettings.None);else expected.SetBoxSlotAtIndex(entity,box,0,EntityImportSettings.None);
            Check(actual.ChecksumsValid&&output.SequenceEqual(expected.Write().ToArray()),"Actual full save export changes exactly the selected tracker");
            Check(save.Write().ToArray().SequenceEqual(sourceSave),"Source save preserved");
        }
        Console.WriteLine("PASS HOME tracker: five formats, box/party, plain/encrypted, uint64/empty/filtering, unsupported rejection and exact entity/full-save preservation");
    }
}

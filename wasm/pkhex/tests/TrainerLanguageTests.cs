// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerLanguageTests
{
    private static void Require(bool value,string message) { if(!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile save) => new(save.OT,save.TID16,save.SID16,save.Money);
    private static byte[] Apply(byte[] data,TrainerEdit edit) => SaveService.Export(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.TrainerEdit));
    private static Span<byte> NameBytes(SaveFile save) => save switch {
        SAV6 s => s.Status.OriginalTrainerTrash, SAV7 s => s.MyStatus.OriginalTrainerTrash,
        SAV8BS s => s.MyStatus.OriginalTrainerTrash, _ => throw new Exception("Missing name fixture"),
    };
    public static void Run()
    {
        foreach(var version in new[]{"X","OR","SN","US","BD"})
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            save.Language=2; save.OT="A"; NameBytes(save)[6]=0x55;
            var data=save.Write().ToArray(); var original=data.ToArray();
            var catalog=TrainerEditing.Options(save).Languages;
            int[] ids=save.Generation==6 ? [1,2,3,4,5,7,8] : [1,2,3,4,5,7,8,9,10];
            Require(catalog.Select(x=>x.Id).SequenceEqual(ids),"Generation-specific language list/order");
            foreach(var choice in catalog)
            {
                Require(choice.Name.Zh==GameInfo.GetStrings("zh-Hans").languageNames[choice.Id] &&
                    choice.Name.En==GameInfo.GetStrings("en").languageNames[choice.Id] &&
                    choice.Name.Ja==GameInfo.GetStrings("ja").languageNames[choice.Id],"Core-localized language names");
                foreach(bool rename in new[]{false,true})
                {
                    string name=rename ? choice.Id switch {1=>"サトシ",8=>"지우",9 or 10=>"小智",_=>"LANG"} : "A";
                    var expected=SaveUtil.GetSaveFile(data.ToArray())!;
                    expected.Language=choice.Id;
                    if(rename) expected.OT=name;
                    var output=Apply(data,Original(save) with {Language=choice.Id,Ot=name});
                    Require(output.SequenceEqual(expected.Write().ToArray()),$"{version}/{choice.Id}: full language/name output");
                    var after=SaveUtil.GetSaveFile(output.ToArray())!;
                    Require(after.ChecksumsValid && after.Language==choice.Id && after.OT==name,"Language and Unicode name survive reread");
                    Require(data.SequenceEqual(original),"Original save preserved");
                    if(!rename) Require(NameBytes(after).SequenceEqual(NameBytes(save)),"Unchanged name padding survives language change");
                }
            }
            foreach(int language in new[]{-1,0,6,11,255}.Concat(save.Generation==6 ? new[]{9,10} : []))
            {
                try { Apply(data,Original(save) with {Language=language}); throw new Exception("Invalid language accepted"); }
                catch(ArgumentException) { Require(data.SequenceEqual(original),"Rejected language preserves source"); }
            }
            save.Language=0; var unusual=save.Write().ToArray();
            var kept=SaveUtil.GetSaveFile(Apply(unusual,Original(save)))!;
            Require(kept.Language==0,"Unchanged unlisted language retained");
            Console.WriteLine($"PASS {version}: all languages, localized catalog, Unicode rename, full output, padding, original and invalid requests");
        }
        foreach(var version in new[]{"E","D","Pt","HG","B","B2"})
        {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var save=SaveUtil.GetSaveFile(data.ToArray())!;
            Require(TrainerEditing.Options(save).Languages.Length==0,"Older trainer UI has no language editor");
            try { Apply(data,Original(save) with {Language=2}); throw new Exception("Unsupported format accepted language edit"); }
            catch(ArgumentException) { }
        }
        var swsh=new SAV8SWSH();
        // Blank blocks have None types: initialize the scalar used by the real setter.
        swsh.Blocks.GetBlock(SaveBlockAccessor8SWSH.KGameLanguage).ChangeStoredType(SCTypeCode.UInt32);
        swsh.Language=2; swsh.OT="A";
        foreach(var choice in TrainerEditing.Options(swsh).Languages)
        {
            var expected=(SAV8SWSH)swsh.Clone(); expected.Language=choice.Id;
            TrainerEditing.Apply(swsh,Original(swsh) with {Language=choice.Id});
            Require(swsh.MyStatus.Data.SequenceEqual(expected.MyStatus.Data),"SWSH status bytes match Core language setter");
            Require(swsh.GetValue<uint>(SaveBlockAccessor8SWSH.KGameLanguage)==(uint)(choice.Id>=6 ? choice.Id-1 : choice.Id),"SWSH runtime-language ID mapping");
        }
        swsh.SetValue(SaveBlockAccessor8SWSH.KGameLanguage,777u);
        TrainerEditing.Apply(swsh,Original(swsh) with {Language=swsh.Language});
        Require(swsh.GetValue<uint>(SaveBlockAccessor8SWSH.KGameLanguage)==777,"Unchanged language does not normalize unrelated runtime state");
        Console.WriteLine("PASS legacy language rejection and SWSH Core-created status/runtime language synchronization");
    }
}

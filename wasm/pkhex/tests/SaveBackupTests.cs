// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class SaveBackupTests
{
    internal static void Run()
    {
        var input=File.ReadAllBytes(".tmp/pkhex-fixtures/legal-shedinja.pk3.sav");
        var original=input.ToArray();
        var reference=SaveUtil.GetSaveFile(input.ToArray())!;
        foreach(var name in new[]{"E.sav","main","savedata 123.bin","name?.sav"}) {
            reference.Metadata.SetExtraInfo(name);
            var expected=reference.Metadata.GetBackupFileName("");
            Check(SaveService.ReadSaveBackupName(input,name)==expected,"Exact Core backup name");
            Check(SaveService.ReadSaveBackupName(input,expected)==expected,"No duplicate backup suffix");
        }
        foreach(var name in new[]{""," ","../E.sav","C:\\E.sav","a\0b",new string('a',4097)}) {
            bool rejected=false;try{SaveService.ReadSaveBackupName(input,name);}catch(ArgumentException){rejected=true;}
            Check(rejected,"Invalid file name rejected");
        }
        Check(input.SequenceEqual(original),"Naming preserves all original bytes");
        Console.WriteLine("PASS source backup naming, suffix deduplication, input boundaries and original bytes");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
}

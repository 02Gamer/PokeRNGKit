// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Hall7EditingTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Hall7 edit accepted");}catch(ArgumentException){}}
    private static SAV7 Open(byte[] bytes)=>(SAV7)SaveUtil.GetSaveFile(bytes.ToArray())!;
    private static Hall7Catalog Read(byte[] bytes)=>JsonSerializer.Deserialize(SaveService.ReadHall7(bytes),SaveJsonContext.Default.Hall7Catalog)!;
    private static string Json(Hall7Edit e)=>JsonSerializer.Serialize(e,SaveJsonContext.Default.Hall7Edit);
    private static byte[] Compare(byte[] bytes,Hall7Edit e,Action<SAV7> oracle)
    {
        var original=bytes.ToArray();var expected=Open(bytes);oracle(expected);var p=JsonSerializer.Deserialize(SaveService.PreviewHall7(bytes,Json(e)),SaveJsonContext.Default.Hall7Preview)!;
        var output=SaveService.EditHall7(bytes,Json(p.Request));Check(output.SequenceEqual(expected.Write().ToArray()),"Hall7 independent complete-file source parity");Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,bytes.Length).Where(i=>bytes[i]!=output[i])),"Hall7 exact changed addresses");Check(p.Request.TargetHash==Br4Editing.Hash(output)&&p.Result.SourceHash==p.Request.TargetHash,"Hall7 frozen full target");Check(bytes.SequenceEqual(original),"Hall7 immutable original");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Hall7 exact export");return output;
    }
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.SN,GameVersion.MN,GameVersion.US,GameVersion.UM})
        {
            bool uu=version is GameVersion.US or GameVersion.UM;var s=Open(File.ReadAllBytes(uu?".tmp/pkhex-fixtures/US.sav":".tmp/pkhex-fixtures/SN.sav"));s.Version=version;int address=uu?0x283C:0x25C4;
            for(int i=0;i<12;i++)BinaryPrimitives.WriteUInt16LittleEndian(s.Data.Slice(address+i*2),(ushort)(25+i));for(int i=0;i<1000;i++)s.EventWork.SetWork(i,(ushort)(30000+i));s.EventWork.SetEventFlag(5,true);if(uu)((SAV7USUM)s).Misc.StarterEncryptionConstant=0x12345678;var bytes=s.Write().ToArray();var original=bytes.ToArray();var c=Read(bytes);
            var independent=new FilteredGameDataSource(s,new GameDataSource(GameInfo.GetStrings("en"))).Species;Check(c.CanEdit&&c.Members.Length==12&&c.Species.Select(v=>v.Id).SequenceEqual(independent.Select(v=>v.Value)),"Hall7 complete source species order and twelve slots");Check(c.Members.Select(v=>v.Species).SequenceEqual(Enumerable.Range(25,12))&&c.Members[0].Name.Zh=="皮卡丘"&&c.Members[0].Sprite=="b_25","Hall7 actual addresses and localized species artwork");Check(uu?c.Ec=="12345678":c.Ec is null,"Hall7 source hides starter EC for SM");
            foreach(var choice in c.Species){Check(choice.Name.Zh==GameInfo.GetStrings("zh-Hans").specieslist[choice.Id]&&choice.Name.En==GameInfo.GetStrings("en").specieslist[choice.Id]&&choice.Name.Ja==GameInfo.GetStrings("ja").specieslist[choice.Id],"Hall7 all three-language species names");}
            // Pack the full candidate list into twelve independent raw addresses per request.
            foreach(var group in c.Species.Chunk(12)){var rows=group.Select((v,i)=>new Hall7Value(i,v.Id)).ToArray();Compare(bytes,new("patch",c.SourceHash,rows),copy=>{foreach(var row in rows)BinaryPrimitives.WriteUInt16LittleEndian(copy.Data.Slice(address+row.Index*2),(ushort)row.Species);});}
            foreach(int index in Enumerable.Range(0,12))foreach(int species in new[]{0,1,255,256,c.Species.Max(v=>v.Id)})if(c.Species.Any(v=>v.Id==species))Compare(bytes,new("patch",c.SourceHash,[new(index,species)]),copy=>BinaryPrimitives.WriteUInt16LittleEndian(copy.Data.Slice(address+index*2),(ushort)species));
            var old=Open(bytes);BinaryPrimitives.WriteUInt16LittleEndian(old.Data.Slice(address+6),65535);var unusual=old.Write().ToArray();var unknown=Read(unusual);Check(!unknown.Members[3].Known&&unknown.Members[3].Species==65535&&unknown.Members[3].Sprite=="","Hall7 unknown old species stays visible without invented artwork");Compare(unusual,new("patch",unknown.SourceHash,[new(4,1)]),copy=>copy.EventWork.Fame.SetEntry(4,1));Compare(unusual,new("resave",unknown.SourceHash),copy=>copy.EventWork.Fame.SetEntry(3,0));Compare(bytes,new("resave",c.SourceHash),_=>{});
            if(uu){foreach(string text in new[]{"","0","FFFFFFFF","12345678","aBcD0123","0xFF","g1-z2","--------"})Compare(bytes,new("patch",c.SourceHash,Ec:text),copy=>{uint parsed=0;foreach(char ch in text){int digit=ch is >= '0' and <= '9'?ch-'0':ch is >= 'A' and <= 'F'?ch-'A'+10:ch is >= 'a' and <= 'f'?ch-'a'+10:-1;if(digit>=0)parsed=(parsed<<4)|(uint)digit;}BinaryPrimitives.WriteUInt32LittleEndian(copy.Data.Slice(0x4548),parsed);});Reject(()=>SaveService.PreviewHall7(bytes,Json(new("patch",c.SourceHash,Ec:"123456789"))));Compare(unusual,new("patch",unknown.SourceHash,Ec:"FFFFFFFF"),copy=>((SAV7USUM)copy).Misc.StarterEncryptionConstant=uint.MaxValue);}else Reject(()=>SaveService.PreviewHall7(bytes,Json(new("patch",c.SourceHash,Ec:""))));
            foreach(var e in new Hall7Edit[]{new("patch",c.SourceHash),new("patch",c.SourceHash,[]),new("patch",c.SourceHash,[new(-1,1)]),new("patch",c.SourceHash,[new(12,1)]),new("patch",c.SourceHash,[new(0,65535)]),new("patch",c.SourceHash,[new(0,0),new(0,1)]),new("resave",c.SourceHash,[new(0,1)]),new("resave",c.SourceHash,Ec:"0"),new("patch","bad",[new(0,1)])})Reject(()=>SaveService.PreviewHall7(bytes,Json(e)));
            Reject(()=>SaveService.EditHall7(bytes,Json(new("patch",c.SourceHash,[new(0,1)]))));Reject(()=>SaveService.EditHall7(bytes,Json(new("patch",c.SourceHash,[new(0,1)],TargetHash:new string('0',64)))));var corrupt=bytes.ToArray();corrupt[address]^=1;Check(!Read(corrupt).CanEdit,"Hall7 invalid CRC read-only");Reject(()=>SaveService.PreviewHall7(corrupt,Json(new("resave",Read(corrupt).SourceHash))));Check(bytes.SequenceEqual(original),"Hall7 all reads/rejections preserve source");Console.WriteLine($"PASS {version}: all twelve physical addresses/full source species candidates and three languages, base artwork, unknown preservation/source reset, eight-character EC parser/USUM-only address, exact frozen whole-file oracles, original/export and atomic rejections");
        }
        // Source trainer game markers can cross titles without converting the physical save layout.
        foreach(var file in new[]{"SN","US"})foreach(var marker in new[]{GameVersion.SN,GameVersion.MN,GameVersion.US,GameVersion.UM}){
            var marked=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{file}.sav"));marked.Version=marker;var bytes=marked.Write().ToArray();var expected=new FilteredGameDataSource(marked,new GameDataSource(GameInfo.GetStrings("en"))).Species;var c=Read(bytes);Check(c.Species.Select(v=>v.Id).SequenceEqual(expected.Select(v=>v.Value)),"Hall7 choices cache retains source physical layout across game markers");Check((c.Ec is not null)==(file=="US"),"Hall7 EC capability follows actual layout, not game marker");Compare(bytes,new("resave",c.SourceHash),copy=>{var ids=expected.Select(v=>v.Value).ToHashSet();for(int i=0;i<12;i++)if(!ids.Contains(copy.EventWork.Fame.GetEntry(i)))copy.EventWork.Fame.SetEntry(i,0);});
        }
        Reject(()=>SaveService.ReadHall7(File.ReadAllBytes(".tmp/pkhex-fixtures/OR.sav")));
    }
}

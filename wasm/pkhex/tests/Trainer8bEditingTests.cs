// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Trainer8bEditingTests
{
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static SAV8BS Open(byte[] bytes)=>(SAV8BS)SaveUtil.GetSaveFile(bytes.ToArray())!;
    private static Tr8bCatalog Read(byte[] bytes)=>JsonSerializer.Deserialize(SaveService.ReadTrainer8b(bytes),SaveJsonContext.Default.Tr8bCatalog)!;
    private static string Json(Tr8bEdit e)=>JsonSerializer.Serialize(e,SaveJsonContext.Default.Tr8bEdit);
    private static void Reject(Action a){try{a();throw new Exception("Invalid Trainer8b edit accepted");}catch(ArgumentException){}}
    private static byte[] Compare(byte[] data,Tr8bEdit edit,Action<SAV8BS> expectedChange)
    {
        var original=data.ToArray();var expected=Open(data);expectedChange(expected);var p=JsonSerializer.Deserialize(SaveService.PreviewTrainer8b(data,Json(edit)),SaveJsonContext.Default.Tr8bPreview)!;var output=SaveService.EditTrainer8b(data,Json(p.Request));Check(output.SequenceEqual(expected.Write().ToArray()),"Trainer8b entire-file parity "+edit.Action);Check(data.SequenceEqual(original),"Trainer8b original immutable");Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i])),"Trainer8b exact changed offsets");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Trainer8b working export exact");return output;
    }
    private static void I32(SAV8BS s,int offset,int n)=>BinaryPrimitives.WriteInt32LittleEndian(s.Data[offset..],n);
    public static void Run()
    {
        var fixture=File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav");foreach(var version in new[]{GameVersion.BD,GameVersion.SP})foreach(var layout in new[]{(Revision:Gem8Version.V1_0,Length:0xE9828),(Revision:Gem8Version.V1_1,Length:0xEDC20),(Revision:Gem8Version.V1_2,Length:0xEED8C),(Revision:Gem8Version.V1_3,Length:0xEF0A4)})
        {
            var raw=fixture[..layout.Length];BinaryPrimitives.WriteInt32LittleEndian(raw,(int)layout.Revision);var s=new SAV8BS(raw){Version=version,OT="OLD",TID16=12345,SID16=54321,RivalName="RIVAL",Language=9,PlayedMinutes=12,PlayedSeconds=34};s.System.TimestampStart=new DateTime(2020,1,2,3,4,5,DateTimeKind.Utc).AddTicks(1234567);s.System.TimestampLatest=new DateTime(2021,2,3,4,5,6,DateTimeKind.Utc).AddTicks(7654321);if(s.HasFirstSaveFileExpansion){for(int i=0;i<12;i++){var r=s.RecordAdd.GetRecord(i);r.OT=i==2?"OTHER":i==3?" ":"OLD";r.ID32=i==1?1:s.ID32;r.Language=9;r.Gender=1;r.BodyType=99;}s.RecordAdd.Data.Slice(0x240).Fill(0xA7);}
            var data=s.Write().ToArray();var c=Read(data);Check(c.CanEdit&&c.Fields.Length==50&&c.Ids.Id32==s.ID32,"Trainer8b full source catalog");
            Compare(data,new("patch",c.SourceHash,[new("name","NEW")]),e=>{StringConverter8.SetString(e.Data.Slice(0x79BB4,26),"NEW",12,StringConverterOption.ClearZero);if(e.HasFirstSaveFileExpansion)for(int i=0;i<12;i++)if(i is not(1 or 2 or 3))StringConverter8.SetString(e.Data.Slice(0xE9828+i*48,26),"NEW",12,StringConverterOption.ClearZero);});
            Compare(data,new("patch",c.SourceHash,[new("rival","友")]),e=>StringConverter8.SetString(e.Data.Slice(0x55F4,26),"友",12,StringConverterOption.ClearZero));
            Compare(data,new("patch",c.SourceHash,[new("name","OLD")]),_=>{});
            Compare(data,new("position",c.SourceHash,[new("x",""),new("rotation","invalid")],UiLanguage:"en"),_=>{});
            Compare(data,new("trash",c.SourceHash,NameTarget:"rival",Trash:new("text",Text:"友")),e=>{byte[] encoded=new byte[26];int n=StringConverter8.SetString(encoded,"友",12,StringConverterOption.ClearZero);encoded.AsSpan(0,n).CopyTo(e.Data.Slice(0x55F4,26));});
            Compare(data,new("ids",c.SourceHash,[new("tid","123456"),new("sid","1234")]),e=>{uint expected=1234*1000000u+123456;BinaryPrimitives.WriteUInt32LittleEndian(e.Data[(0x79BB4+0x1C)..],expected);if(e.HasFirstSaveFileExpansion)for(int i=0;i<12;i++)if(i is not(1 or 2 or 3)){StringConverter8.SetString(e.Data.Slice(0xE9828+i*48,26),"OLD",12,StringConverterOption.ClearZero);BinaryPrimitives.WriteUInt32LittleEndian(e.Data[(0xE9828+i*48+0x28)..],expected);}});
            Compare(data,new("patch",c.SourceHash,[new("started","2030-05-06T07:08:09+08:00"),new("saved","2031-06-07T08:09:10Z")]),e=>{BinaryPrimitives.WriteInt64LittleEndian(e.Data[(0x95DAC+4)..],new DateTime(2030,5,5,23,8,9,DateTimeKind.Utc).AddTicks(1234567).ToFileTimeUtc());BinaryPrimitives.WriteInt64LittleEndian(e.Data[(0x95DAC+16)..],new DateTime(2031,6,7,8,9,10,DateTimeKind.Utc).AddTicks(7654321).ToFileTimeUtc());});
            Compare(data,new("position",c.SourceHash,[new("map","999"),new("x","12"),new("y","34.75"),new("z","56.5"),new("rotation","78.125")],UiLanguage:"en"),e=>{BinaryPrimitives.WriteInt16LittleEndian(e.Data[0x5634..],999);I32(e,0x79BB4+0x40,12);I32(e,0x79BB4+0x44,34);BinaryPrimitives.WriteSingleLittleEndian(e.Data[(0x79BB4+0x48)..],56.5f);BinaryPrimitives.WriteSingleLittleEndian(e.Data[(0x79BB4+0x4C)..],78.125f);});
            var zero=Open(data);zero.ID32=0;if(zero.HasFirstSaveFileExpansion)for(int i=0;i<12;i++){zero.RecordAdd.GetRecord(i).OT="OLD";zero.RecordAdd.GetRecord(i).ID32=0;}var zeroBytes=zero.Write().ToArray();Compare(zeroBytes,new("resave",Read(zeroBytes).SourceHash),e=>{BinaryPrimitives.WriteUInt16LittleEndian(e.Data[(0x79BB4+0x1E)..],1);if(e.HasFirstSaveFileExpansion)for(int i=0;i<12;i++){StringConverter8.SetString(e.Data.Slice(0xE9828+i*48,26),"OLD",12,StringConverterOption.ClearZero);BinaryPrimitives.WriteUInt32LittleEndian(e.Data[(0xE9828+i*48+0x28)..],65536);}});
            Compare(data,new("patch",c.SourceHash,[new("money","9999999"),new("minutes","99"),new("seconds","60"),new("badge7","1")]),e=>{BinaryPrimitives.WriteUInt32LittleEndian(e.Data[(0x79BB4+0x20)..],999999);e.PlayedMinutes=39;e.PlayedSeconds=0;I32(e,0x4654+131*4,1);});
            var general=Open(data);TrainerEditing.Apply(general,new("NEW",general.TID16,general.SID16,general.Money));var specialized=Compare(data,new("patch",c.SourceHash,[new("name","NEW")]),e=>{StringConverter8.SetString(e.Data.Slice(0x79BB4,26),"NEW",12,StringConverterOption.ClearZero);if(e.HasFirstSaveFileExpansion)for(int i=0;i<12;i++)if(i is not(1 or 2 or 3))StringConverter8.SetString(e.Data.Slice(0xE9828+i*48,26),"NEW",12,StringConverterOption.ClearZero);});Check(general.Write().Span.SequenceEqual(specialized),"Trainer8b generic entry updates matching ranking records");var generalZero=Open(zeroBytes);TrainerEditing.Apply(generalZero,new(generalZero.OT,0,0,generalZero.Money));Check(generalZero.SID16==1&&(!generalZero.HasFirstSaveFileExpansion||generalZero.RecordAdd.GetRecords().All(r=>r.ID32==65536)),"Trainer8b generic entry zero-ID repair and linked ranking");
            Reject(()=>SaveService.EditTrainer8b(data,Json(new("patch",c.SourceHash,[new("name","NO")]))));Reject(()=>SaveService.PreviewTrainer8b(data,Json(new("patch",c.SourceHash,[new("bp","10000")]))));Reject(()=>SaveService.PreviewTrainer8b(data,Json(new("patch",c.SourceHash,[new("started","1999-01-01T00:00:00Z")]))));Reject(()=>SaveService.PreviewTrainer8b(data,Json(new("resave",new string('0',64)))));
            Console.WriteLine($"PASS Trainer8b {version}/{layout.Revision}: full field catalog, names and matching/nonmatching extra OT records, zero ID repair, UTC offset/subsecond preservation, source coordinates/truncation, money/time/badge effects, frozen original/export rejection");
        }
    }
}

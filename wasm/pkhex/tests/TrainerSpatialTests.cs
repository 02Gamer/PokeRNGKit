// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerSpatialTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile s) => new(s.OT,s.TID16,s.SID16,s.Money);
    private static byte[] Apply(byte[] data, TrainerEdit edit) => SaveService.Export(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.TrainerEdit));
    private static TrainerSpatialEdit Edit(string key, string value) => key switch
    {
        "map" => new(Map:value), "x" => new(X:value), "z" => new(Z:value), "y" => new(Y:value), "rotation" => new(Rotation:value),
        "scaleX" => new(ScaleX:value), "scaleZ" => new(ScaleZ:value), "scaleY" => new(ScaleY:value), _ => throw new Exception(),
    };
    private static void Direct(SaveFile save, string key, string value)
    {
        decimal v = decimal.Parse(value,CultureInfo.InvariantCulture);
        if(save is SAV6 s6)
        {
            var p=s6.Situation;
            switch(key) { case "map": p.M=(int)v; break; case "x": p.X=(float)(v*18); break; case "z": p.Z=(float)(v*18); break; case "y": p.Y=(float)(v*18); break; case "rotation": p.R=(int)v; break; }
        }
        else if(save is SAV7 s7)
        {
            var p=s7.Situation;
            switch(key) { case "map": p.M=(int)v; break; case "x": p.X=(float)(v*60); break; case "z": p.Z=(float)(v*60); break; case "y": p.Y=(float)(v*60); break; case "rotation": double a=(double)v*Math.PI/360; p.RX=0; p.RZ=(float)Math.Sin(a); p.RY=0; p.RW=(float)Math.Cos(a); break; }
            p.UpdateOverworldCoordinates();
        }
        else if(save is SAV8BS bs)
        {
            var p=bs.MyStatus;
            switch(key) { case "map": bs.ZoneID=(short)v; break; case "x": p.X=(int)v; break; case "z": p.Height=(float)v; break; case "y": p.Y=(int)v; break; case "rotation": p.Rotation=(float)v; break; }
        }
        else if(save is SAV8SWSH sw)
        {
            var p=sw.Coordinates;
            switch(key) { case "map": p.M=(ulong)v; break; case "x": p.X=(float)v; break; case "z": p.Z=(float)v; break; case "y": p.Y=(float)v; break; case "scaleX": p.SX=(float)v; break; case "scaleZ": p.SZ=(float)v; break; case "scaleY": p.SY=(float)v; break; case "rotation": double a=(double)v*Math.PI/360; p.RX=0; p.RZ=(float)Math.Sin(a); p.RY=0; p.RW=(float)Math.Cos(a); break; }
        }
    }
    private static void Prepare(SaveFile save)
    {
        save.OT="A";
        foreach(var key in new[]{"map","x","z","y","rotation"}) Direct(save,key,key=="map"?"123":key=="rotation"?"3":"12");
        if(save is SAV6 s6) { s6.Situation.Data.Slice(0xF4,4).Fill(0xA5); s6.Situation.Data.Slice(0x104,12).Fill(0x5A); }
        if(save is SAV7 s7) { s7.Situation.RX=0.123f; s7.Situation.RY=0.456f; s7.Overworld.Data.Slice(8,28).Fill(0xA5); }
        if(save is SAV8SWSH sw) { sw.Coordinates.RX=0.123f; sw.Coordinates.RY=0.456f; sw.Coordinates.SX=sw.Coordinates.SZ=sw.Coordinates.SY=1; }
    }
    private static void Reject(SaveFile save, TrainerSpatialEdit edit)
    {
        var before=TrainerSpatialPosition.Snapshot(save);
        try { TrainerSpatialPosition.Apply(save,edit); throw new Exception("Invalid spatial edit accepted"); }
        catch(ArgumentException) { Require(TrainerSpatialPosition.Snapshot(save)==before,"Invalid request rejected before writes"); }
    }
    public static void Run()
    {
        foreach(var version in new[]{"X","OR","SN","US","BD"})
        {
            var save=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!; Prepare(save);
            var data=save.Write().ToArray();var original=data.ToArray();var basis=Original(save);
            using(var report=JsonDocument.Parse(SaveService.Inspect(data))) Require(report.RootElement.GetProperty("trainer").GetProperty("spatialPosition").GetArrayLength()==5,"Spatial fields in report");
            foreach(var field in TrainerSpatialPosition.Read(save))
            {
                var values=new List<string>{field.Min,field.Max,"0"};
                if(field.Places>0) { values.Add("1.23456"); if(field.Min.StartsWith('-'))values.Add("-1.23456"); }
                if(field.Key=="rotation" && save is SAV7) values.AddRange(["360","720","-720"]);
                foreach(var value in values)
                {
                    var expected=SaveUtil.GetSaveFile(data.ToArray())!; Direct(expected,field.Key,value);
                    var output=Apply(data,basis with{SpatialPosition=Edit(field.Key,value)});
                    Require(output.SequenceEqual(expected.Write().ToArray()),"Full output matches only changed Core setter and required mirrors");
                    var after=SaveUtil.GetSaveFile(output.ToArray())!;
                    Require(after.ChecksumsValid && TrainerSpatialPosition.Snapshot(after)==TrainerSpatialPosition.Snapshot(expected),"Raw position bits and mirrors round trip");
                    Require(data.SequenceEqual(original),"Source preserved");
                }
                Require(Apply(data,basis with{SpatialPosition=Edit(field.Key,field.Value)}).SequenceEqual(data),"Unchanged field does not normalize divergent mirrors or rotation");
                foreach(var invalid in new[]{"", "NaN", "Infinity", "1e2", " 1", "+1", "1.", "1,2", "0."+new string('0',field.Places)+"1", (decimal.Parse(field.Max,CultureInfo.InvariantCulture)+1).ToString(CultureInfo.InvariantCulture), (decimal.Parse(field.Min,CultureInfo.InvariantCulture)-1).ToString(CultureInfo.InvariantCulture)}) Reject(save,Edit(field.Key,invalid));
            }
            Reject(save,new(Map:"456",ScaleX:"1"));
            foreach(int bits in new[]{unchecked((int)0x7FC12345),unchecked((int)0xFF800000),unchecked((int)0x7F800000),unchecked((int)0x80000000),0x7F7FFFFF})
            {
                string key=save is SAV8BS?"z":"x"; float raw=BitConverter.Int32BitsToSingle(bits);
                if(save is SAV6 s6)s6.Situation.X=raw;else if(save is SAV7 s7)s7.Situation.X=raw;else ((SAV8BS)save).MyStatus.Height=raw;
                var bytes=save.Write().ToArray();var field=TrainerSpatialPosition.Read(save).Single(f=>f.Key==key);
                using var report=JsonDocument.Parse(SaveService.Inspect(bytes));
                Require(Apply(bytes,basis with{SpatialPosition=Edit(key,field.Value)}).SequenceEqual(bytes),"Nonfinite, signed-zero or out-of-range original preserved by same-value request");
                var expected=SaveUtil.GetSaveFile(bytes.ToArray())!;expected.Money=1;
                Require(Apply(bytes,basis with{Money=1}).SequenceEqual(expected.Write().ToArray()),"Raw float bits preserved by unrelated edit");
                expected=SaveUtil.GetSaveFile(bytes.ToArray())!;Direct(expected,key,"2");
                Require(Apply(bytes,basis with{SpatialPosition=Edit(key,"2")}).SequenceEqual(expected.Write().ToArray()),"Explicit float repair changes only relevant field and linked coordinates");
            }
            Console.WriteLine($"PASS {version}: spatial limits, scaling, mirrors, rotation, truncation, float bit preservation, full output and original");
        }
        SwordShield();
        foreach(var version in new[]{"E","D","B"}) Reject(SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!,new(Map:"1"));
    }
    private static void SwordShield()
    {
        var save=new SAV8SWSH();Prepare(save);var original=save.Coordinates.Data.ToArray();
        foreach(var field in TrainerSpatialPosition.Read(save))
        {
            var values=new List<string>{field.Min,field.Max,"0"};
            if(field.Key=="map")values.AddRange(["9007199254740993","18446744073709551614"]);else values.Add("-1.234567");
            foreach(var value in values)
            {
                original.CopyTo(save.Coordinates.Data);var expected=new SAV8SWSH();original.CopyTo(expected.Coordinates.Data);Direct(expected,field.Key,value);
                TrainerSpatialPosition.Apply(save,Edit(field.Key,value));
                Require(save.Coordinates.Data.SequenceEqual(expected.Coordinates.Data),"SWSH exact ulong map, float/scale/rotation and unrelated coordinate bytes");
            }
            original.CopyTo(save.Coordinates.Data); TrainerSpatialPosition.Apply(save,Edit(field.Key,field.Value));
            Require(save.Coordinates.Data.SequenceEqual(original),"SWSH same value preserves all bits including quaternion tilt");
        }
        Reject(save,new(Map:"18446744073709551616")); Reject(save,new(Map:"-1")); Reject(save,new(Map:"9007199254740993.0")); Reject(save,new(Rotation:"1.0000001"));
        save.Coordinates.X=BitConverter.Int32BitsToSingle(unchecked((int)0x7FC12345));var before=save.Coordinates.Data.ToArray();
        TrainerSpatialPosition.Apply(save,new(X:"NaN"));Require(save.Coordinates.Data.SequenceEqual(before),"SWSH NaN payload unchanged");
        Console.WriteLine("PASS SWSH Core objects: ulong map boundaries, exact IDs beyond JS safe integers, all spatial fields and original bytes; no real-save serialization fixture");
    }
}

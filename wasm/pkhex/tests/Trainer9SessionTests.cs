// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Trainer9SessionTests
{
    internal static void Run()
    {
        foreach(var version in new[]{GameVersion.SL,GameVersion.VL})foreach(int revision in new[]{0,1,2})
        {
            var seed=new SAV9SV(SvBlockFixtureTests.Create(version,revision));seed.EnrollmentDate.Timestamp=new DateTime(2020,1,2);seed.LastSaved.Timestamp=new DateTime(2020,1,3,4,5,6);var original=seed.Write().ToArray();var copy=original.ToArray();var catalog=Trainer9Editing.Read(seed,Br4Editing.Hash(original));var request=new Trainer9Request(catalog.SourceHash,"TRAINER",123456,1,2,version.ToString(),"123","456",revision>=2?"789":"0","1","2","3",catalog.Enrollment,catalog.Saved,false,[],revision>=2?1u:null,revision>=2?2u:null,revision>=2?1:null,[]);var ticket=Trainer9Session.Prepare(new SAV9SV(original.ToArray()),original,JsonSerializer.Deserialize(JsonSerializer.Serialize(request,SaveJsonContext.Default.Trainer9Request),SaveJsonContext.Default.Trainer9Request)!);var confirm=new Trainer9Confirmation(ticket.Token,ticket.SourceHash,ticket.TargetHash);var output=SaveService.CommitTrainer9(original,JsonSerializer.Serialize(confirm,SaveJsonContext.Default.Trainer9Confirmation));Check(output.AsSpan().SequenceEqual(Trainer9Actions.Prepare(new SAV9SV(original.ToArray()),original,request))&&Br4Editing.Hash(output)==ticket.TargetHash,"Frozen public exact output/hash");Reject(()=>Trainer9Session.Commit(original,confirm));var old=Trainer9Session.Prepare(new SAV9SV(original.ToArray()),original,request);var fresh=Trainer9Session.Prepare(new SAV9SV(original.ToArray()),original,request);Trainer9Session.Discard(old.Token);Reject(()=>Trainer9Session.Commit(original,new(old.Token,old.SourceHash,old.TargetHash)));var stale=original.ToArray();stale[0]^=1;Reject(()=>Trainer9Session.Commit(stale,new(fresh.Token,fresh.SourceHash,fresh.TargetHash)));Trainer9Session.Commit(original,new(fresh.Token,fresh.SourceHash,fresh.TargetHash));var invalid=Trainer9Session.Prepare(new SAV9SV(original.ToArray()),original,request);Reject(()=>SaveService.PreviewTrainer9(original,"{}"));Reject(()=>Trainer9Session.Commit(original,new(invalid.Token,invalid.SourceHash,invalid.TargetHash)));Check(original.AsSpan().SequenceEqual(copy),"Original immutable");Console.WriteLine($"PASS Trainer9 frozen {version}/{revision}: typed required JSON/exact file; public recognition not accepted, one-time/stale/replaced/targeted discard/failed preview and original; synthetic fixture only");
        }
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Trainer9 session accepted");}catch(ArgumentException){}catch(JsonException){}}
}

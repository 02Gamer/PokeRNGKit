// SPDX-License-Identifier: GPL-3.0-or-later
using PokeRNGKit.SaveEditor;
internal static class SaveFolderSessionTests
{
    internal static void Run()
    {
        Check(SaveFolderSession.Hash([new("a","a","selected",[1,2,3],123,Backup:true)])=="01D619198D317788D5C09E7C2CE3497E4C63183971A95135C351308ACDBAF81E","Independent UTF8 length-prefixed hash vector shared with browser");
        byte[] original=File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        SaveFolderFile[] files=[new("old","main [old].bak","backup",original,123,Backup:true),new("invalid","unknown.bin","backup",[0],124,Backup:true)];
        string hash=SaveFolderSession.Hash(files);var session=new SaveFolderSession(files);
        var ticket=session.Prepare(files,new("cleanup",DeleteUnrecognized:true));
        Check(ticket.Changes.Length==2&&ticket.Changes.Any(c=>c.Action=="rename"),"Cleanup previews every remove/rename with fixed identity");
        ticket.Changes[0]=new("invalid","remove","tampered");
        var output=session.Commit(files,ticket.Confirmation);
        Check(output.Length==1&&output[0].Id=="old"&&output[0].Name!="tampered"&&SaveFolderSession.Hash(output)==ticket.Confirmation.OutputHash,"Mutable display changes cannot alter frozen confirmation output");
        output[0].Data[0]^=1;Check(session.Open(files,"old").Data.SequenceEqual(original),"Committed files are independent copies");
        Reject(()=>session.Commit(files,ticket.Confirmation));
        ticket=session.Prepare(files,new("remove","old"));session.Discard("other");session.Commit(files,ticket.Confirmation);
        ticket=session.Prepare(files,new("remove","old"));session.Discard(ticket.Confirmation.Token);Reject(()=>session.Commit(files,ticket.Confirmation));
        ticket=session.Prepare(files,new("remove","old"));Reject(()=>session.Prepare(files,new("remove","missing")));Reject(()=>session.Commit(files,ticket.Confirmation));
        var first=session.Prepare(files,new("remove","old"));var second=session.Prepare(files,new("remove","invalid"));Reject(()=>session.Commit(files,first.Confirmation));Reject(()=>session.Commit(files,second.Confirmation));
        foreach(var changed in new[]{files.Reverse().ToArray(),new[]{files[0] with{Name="different"},files[1]},new[]{files[0] with{Folder="other"},files[1]},new[]{files[0] with{Backup=false},files[1]},new[]{files[0] with{Recent=false},files[1]},new[]{files[0] with{Remembered=true},files[1]},new[]{files[0] with{Modified=125},files[1]},new[]{files[0] with{Data=[1,2]},files[1]}}){
            ticket=session.Prepare(files,new("remove","old"));Reject(()=>session.Commit(changed,ticket.Confirmation));Reject(()=>session.Commit(files,ticket.Confirmation));
        }
        Check(SaveFolderSession.Hash(files)==hash,"All previews/confirmations/failures keep owner inputs");
        Console.WriteLine("PASS save folder frozen session: removal/cleanup, every metadata/content/order binding, mutable display isolation, independent commit, one-time/replaced/stale/failed/cancel lifecycle and original protection");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid save folder session request accepted");}
}

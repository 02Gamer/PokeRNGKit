// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonEditorContextTests
{
    private static void Check(bool value,string text){if(!value)throw new Exception(text);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid editor context accepted");}
    internal static void Typed(SaveFile save,PKM p,byte[] input)
    {
        byte[] before=input.ToArray();PokemonEditorContext.Bind(save,new(0,0));
        try{
            var bytes=StandalonePokemon.Serialize(p.Clone(),true,false);var file="buffer."+p.Extension;
            Check(StandalonePokemon.Open(bytes,file,useFileFormat:true).Entity.GetType()==save.PKMType,"Context binds exact supported entity type");
            var view=StandalonePokemon.Inspect(bytes,file,useFileFormat:true);
            Check(view.MoveChoices.Length==save.MaxMoveID+1&&view.AttributeChoices.Items.Length==save.BlankPKM.MaxItemID+1,"Save-bound directories keep source input limits");
            if(p is GBPKM gb)Check(view.Pokemon.GbLanguage==gb.GuessedLanguage(),"GB region and name interpretation preserved");
            var wrong=save.PKMType==typeof(PK3)?(PKM)new PK4{Species=25}:new PK3{Species=25};wrong.RefreshChecksum();
            Reject(()=>StandalonePokemon.Open(StandalonePokemon.Serialize(wrong,true,false),"wrong."+wrong.Extension,useFileFormat:true));
        }finally{PokemonEditorContext.Clear();}
        Check(input.SequenceEqual(before),"Typed editor context never mutates original save bytes");
    }
    internal static void Run()
    {
        PokemonEditorContext.Clear();
        foreach(string fixture in new[]{"E","D","B","X","SN","GP","BD"})
        {
            byte[] input=File.ReadAllBytes(".tmp/pkhex-fixtures/"+fixture+".sav");var save=SaveService.OpenDatabaseSave(input);
            if(!PokemonReader.Read(save).Any(p=>p.Box>=0&&p.Valid))
            {
                var seed=save.BlankPKM;seed.Species=25;seed.Language=2;seed.Nickname="TEST";seed.OriginalTrainerName="OWNER";seed.Version=save.Version;seed.CurrentLevel=20;seed.Move1=85;seed.Move1_PP=5;seed.RefreshChecksum();save.SetBoxSlotAtIndex(seed,0,0,EntityImportSettings.None);input=save.Write().ToArray();save=SaveService.OpenDatabaseSave(input);
            }
            byte[] before=input.ToArray();var entry=PokemonReader.Read(save).First(p=>p.Box>=0&&p.Valid);var position=new PokemonPosition(entry.Box,entry.Slot);
            string json=JsonSerializer.Serialize(position,SaveJsonContext.Default.PokemonPosition);
            var file=JsonSerializer.Deserialize(PokeRNGKit.SaveEditor.Program.ReadPokemonEditorFile(input,json),SaveJsonContext.Default.PokemonFile)!;
            PokemonEditorContext.Configure(input,json);
            try
            {
                byte[] bytes=Convert.FromBase64String(file.Data),original=bytes.ToArray();var opened=StandalonePokemon.Open(bytes,file.FileName,useFileFormat:true).Entity;
                var edit=new PokemonEdit(0,0,"BUFFER",opened.CurrentLevel,opened.CurrentFriendship,opened.OriginalTrainerName,opened.TID16,opened.SID16,[opened.IV_HP,opened.IV_ATK,opened.IV_DEF,opened.IV_SPA,opened.IV_SPD,opened.IV_SPE],[opened.EV_HP,opened.EV_ATK,opened.EV_DEF,opened.EV_SPA,opened.EV_SPD,opened.EV_SPE],[opened.Move1,opened.Move2,opened.Move3,opened.Move4],[opened.Move1_PP,opened.Move2_PP,opened.Move3_PP,opened.Move4_PP]);
                var edited=StandalonePokemon.Edit(bytes,file.FileName,edit,useFileFormat:true);var result=StandalonePokemon.Open(edited,file.FileName,useFileFormat:true).Entity;
                Check(result.Nickname=="BUFFER"&&input.SequenceEqual(before)&&bytes.SequenceEqual(original),"Buffer edits preserve save and source entity input");
                Check(PokemonEditorContext.Origin(result).Games.Select(g=>g.Id).SequenceEqual(PokemonOrigin.Catalog(save,result,null,null).Games.Select(g=>g.Id)),"Buffer origin uses current save directory");
                var request=new PokemonSetRequest(Br4Editing.Hash(input),"buffer",position,new(entry.Box,entry.Slot),new("buffer",[]),new(file.FileName,Convert.ToBase64String(edited)));
                string payload=JsonSerializer.Serialize(request,PokemonSetJson.Default.PokemonSetRequest);
                var ticket=JsonSerializer.Deserialize(PokeRNGKit.SaveEditor.Program.PreviewPokemonSet(input,payload),PokemonSetJson.Default.PokemonSetTicket)!;
                var confirmation=new PokemonSetConfirmation(ticket.Token,ticket.SourceHash,ticket.TargetHash,true);
                var output=PokeRNGKit.SaveEditor.Program.CommitPokemonSet(input,JsonSerializer.Serialize(confirmation,PokemonSetJson.Default.PokemonSetConfirmation));
                Check(Br4Editing.Hash(output)==ticket.TargetHash&&SaveService.OpenPreparedOutput(output).GetBoxSlotAtIndex(position.Box,position.Slot).Nickname=="BUFFER","Public Set RPC consumes independent entity buffer and returns frozen output");
                Reject(()=>PokeRNGKit.SaveEditor.Program.CommitPokemonSet(input,JsonSerializer.Serialize(confirmation,PokemonSetJson.Default.PokemonSetConfirmation)));
            }finally{PokemonEditorContext.Clear();}
            Check(input.SequenceEqual(before),"Context and public Set preserve original caller save");Console.WriteLine("PASS save-bound editor "+fixture+": readonly save directories, independent entity mutation, public read/preview/confirm, frozen bytes and input protection");
        }
        foreach(string bad in new[]{"{}","null","{\"box\":0}","{\"box\":0,\"slot\":0,\"slot\":1}","{\"box\":0,\"slot\":0,\"extra\":1}"})Reject(()=>PokemonEditorContext.ReadPosition(bad));
        Console.WriteLine("PASS editor context: complete position required, unknown/duplicate fields rejected and context cleared");
    }
}

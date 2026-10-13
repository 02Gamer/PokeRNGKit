// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonTextTrashTests
{
    internal static void Run()
    {
        foreach (PKM source in new PKM[] {new PK1(),new PK1(true),new PK2(),new PK2(true),new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()}) {
            source.Species=25;source.Language=source is GBPKM g&&g.Japanese?1:2;
            string sample=source is GBPKM gb&&gb.Japanese?"ア":"A";
            source.Nickname=sample;source.OriginalTrainerName=sample;source.RefreshChecksum();
            foreach(string field in new[]{"nickname","originalTrainer","handlingTrainer"}) {
                var raw=PokemonTextTrash.Buffer(source,field); int width=raw.Length; if(width==0)continue;
                raw.Fill(0xA5);source.RefreshChecksum();
                var initialized=source.Clone();SetName(initialized,field,sample+sample);
                byte[] expected=PokemonTextTrash.Buffer(initialized,field).ToArray();
                byte[] temporary=new byte[expected.Length];int written=initialized.SetString(temporary,sample,1,StringConverterOption.None);temporary.AsSpan(0,written).CopyTo(expected);
                var events=new[]{new TextTrashEvent("text",sample)};
                var draft=PokemonTextTrash.Apply(source,field,sample+sample,events);
                Check(Convert.FromHexString(draft.Hex).AsSpan().SequenceEqual(expected)&&draft.Text==sample,"Source text-prefix full raw oracle");
                var prepared=PokemonTextTrash.Prepare(source,field,sample+sample,events);
                PokemonTextTrash.Buffer(initialized,field).Clear();expected.CopyTo(PokemonTextTrash.Buffer(initialized,field));initialized.RefreshChecksum();
                Check(prepared.Data.SequenceEqual(initialized.Data)&&prepared.NicknameTrash.SequenceEqual(initialized.NicknameTrash)&&prepared.OriginalTrainerTrash.SequenceEqual(initialized.OriginalTrainerTrash)&&prepared.HandlingTrainerTrash.SequenceEqual(initialized.HandlingTrainerTrash),"Complete entity output oracle");
                var clear=PokemonTextTrash.Apply(source,field,sample+sample,[new("text",sample),new("clear")]);Array.Clear(expected,written,expected.Length-written);Check(Convert.FromHexString(clear.Hex).AsSpan().SequenceEqual(expected),"Clear from encoded terminator boundary");
                Reject(()=>PokemonTextTrash.Apply(source,field,sample,[new("byte",Index:-1,Value:0)]));Reject(()=>PokemonTextTrash.Apply(source,field,sample,[new("byte",Index:width,Value:0)]));Reject(()=>PokemonTextTrash.Apply(source,field,sample,[new("byte",Value:256)]));
                Reject(()=>PokemonTextTrash.Apply(source,field,sample,[new("text",new string(sample[0],draft.MaxLength+1))]));Reject(()=>PokemonTextTrash.Apply(source,field,sample,[new("unknown")]));
                Expanded(source,field,sample);
            }
            // The test deliberately seeds raw buffers; clone checks prove production methods never edit their argument.
            source.Nickname=sample;source.RefreshChecksum();byte[] beforeData=source.Data.ToArray(),beforeNick=source.NicknameTrash.ToArray(),beforeOt=source.OriginalTrainerTrash.ToArray();PokemonTextTrash.Read(source,"nickname");Check(source.Data.SequenceEqual(beforeData)&&source.NicknameTrash.SequenceEqual(beforeNick)&&source.OriginalTrainerTrash.SequenceEqual(beforeOt),"Read is immutable");
            Console.WriteLine($"PASS Text draft {source.GetType().Name}: source text/clear prefix and complete entity oracle, physical bounds, invalid events and immutable reads; full file/UI not integrated");
        }
    }
    private static void Expanded(PKM source,string field,string sample) {
        var initialized=source.Clone();SetName(initialized,field,sample);byte[] opened=PokemonTextTrash.Buffer(initialized,field).ToArray();
        for(int i=0;i<opened.Length;i++)foreach(int value in new[]{0,255,opened[i]}) {
            byte[] expected=opened.ToArray();string text=sample;if(expected[i]!=value){expected[i]=(byte)value;text=initialized.GetString(expected);}
            var actual=PokemonTextTrash.Apply(source,field,sample,[new("byte",Index:i,Value:value)]);
            Check(actual.Hex==Convert.ToHexString(expected)&&actual.Text==text,"Every physical byte/source ValueChanged and no-op");
        }
        var same=PokemonTextTrash.Apply(source,field,sample,[new("text",sample)]);Check(same.Hex==Convert.ToHexString(opened),"Same text does not fire TextChanged");
        foreach(int character in PokemonTextTrash.Characters(source.Context)) {
            string text=sample+(char)character;byte[] expected=opened.ToArray(),temporary=new byte[opened.Length];int count=initialized.SetString(temporary,text,text.Length,StringConverterOption.None);temporary.AsSpan(0,count).CopyTo(expected);
            var actual=PokemonTextTrash.Apply(source,field,sample,[new("character",Value:character)]);Check(actual.Text==text&&actual.Hex==Convert.ToHexString(expected),"Every source special character prefix");
        }
        foreach(var choice in GameInfo.LanguageDataSource(source.Generation,source.Context))foreach(int generation in new[]{0,source.Generation,100}) {
            string layerText=SpeciesName.GetSpeciesNameGeneration(25,choice.Value,(byte)generation);if(layerText.Length==0)layerText=GameInfo.GetStrings("en").specieslist[25];
            byte[] temporary=new byte[opened.Length],currentBytes=new byte[opened.Length];int length,current;
            try{length=initialized.SetString(temporary,layerText,layerText.Length,StringConverterOption.None);current=initialized.SetString(currentBytes,sample,sample.Length,StringConverterOption.None);}catch(ArgumentException){continue;}
            var operation=new TextTrashEvent("layer",Species:25,Language:choice.Value,Generation:generation);
            if(length<=current||length>opened.Length){Reject(()=>PokemonTextTrash.Apply(source,field,sample,[operation]));continue;}
            byte[] expected=opened.ToArray();string text=sample;for(int i=current;i<length;i++)if(expected[i]!=temporary[i]){expected[i]=temporary[i];text=initialized.GetString(expected);}
            var actual=PokemonTextTrash.Apply(source,field,sample,[operation]);Check(actual.Hex==Convert.ToHexString(expected)&&actual.Text==text,"Source species layer/gen/initial converter and per-byte events");
        }
        Reject(()=>PokemonTextTrash.Apply(source,field,sample,[new("layer",Species:25,Language:2,Generation:101)]));
        Reject(()=>PokemonTextTrash.Apply(source,field,sample,Enumerable.Repeat(new TextTrashEvent("text",sample),513).ToArray()));
        Reject(()=>PokemonTextTrash.Apply(source,field,sample,[new("character",Value:0)]));
    }
    private static void SetName(PKM entity,string field,string text){switch(field){case "nickname":entity.Nickname=text;break;case "originalTrainer":entity.OriginalTrainerName=text;break;default:entity.HandlingTrainerName=text;break;}}
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid name edit accepted");}
}

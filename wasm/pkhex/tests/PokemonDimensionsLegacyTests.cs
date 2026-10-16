// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Globalization;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonDimensionsLegacyTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid size/legacy edit accepted");}
    private static PKM Seed(PKM p)
    {
        p.Species=25;p.Language=2;p.Nickname="PARTNER";p.OriginalTrainerName="OWNER";p.Version=p.Context.GetSingleGameVersion();p.CurrentLevel=25;p.PID=12345;p.EncryptionConstant=54321;p.SetIVs(new[]{31,30,29,28,27,26});p.Move1=85;p.Move1_PP=3;
        if(p is IScaledSize s){s.HeightScalar=120;s.WeightScalar=130;}if(p is IScaledSize3 scale)scale.Scale=p is PA8?(byte)120:(byte)22;
        if(p is IScaledSizeValue absolute){absolute.HeightAbsolute=1.2345f;absolute.WeightAbsolute=6.789f;}
        if(p is ICombatPower cp)cp.Stat_CP=4321;
        if(p is G4PKM fourth){fourth.Version=GameVersion.HG;fourth.ShinyLeaf=0xC1;fourth.WalkingMood=-12;}
        if(p is RK4 ranch){ranch.Data[0x88..].Fill(0xA7);ranch.OwnershipType=RanchOwnershipType.Trainer;}
        p.ResetPartyStats();p.Stat_HPCurrent=Math.Max(1,p.Stat_HPMax/2);p.Status_Condition=8;p.RefreshChecksum();return p;
    }
    private static void SizeOracle(PKM p,PokemonDimensionsEdit edit)
    {
        var size=(IScaledSize)p;bool height=false,weight=false;
        if(edit.Action=="reset"){if(p is IScaledSizeValue reset){reset.ResetHeight();reset.ResetWeight();}if(p is ICombatPower cp)cp.ResetCP();return;}
        if(edit.HeightScalar is int h&&h!=size.HeightScalar){size.HeightScalar=(byte)h;height=true;if(p is PA8 pa)pa.Scale=(byte)h;}
        if(edit.WeightScalar is int w&&w!=size.WeightScalar){size.WeightScalar=(byte)w;weight=true;}
        if(edit.Scale is int sc&&sc!=((IScaledSize3)p).Scale){((IScaledSize3)p).Scale=(byte)sc;if(p is PA8 pa){pa.HeightScalar=(byte)sc;height=true;}}
        if(p is IScaledSizeValue absolute)
        {
            if(edit.Auto){if(height||edit.HeightAbsolute is not null)absolute.ResetHeight();if(height||weight||edit.WeightAbsolute is not null)absolute.ResetWeight();}
            else {if(float.TryParse(edit.HeightAbsolute,NumberStyles.Float|NumberStyles.AllowThousands,CultureInfo.InvariantCulture,out var parsedHeight))absolute.HeightAbsolute=parsedHeight;if(float.TryParse(edit.WeightAbsolute,NumberStyles.Float|NumberStyles.AllowThousands,CultureInfo.InvariantCulture,out var parsedWeight))absolute.WeightAbsolute=parsedWeight;}
        }
        if(edit.Cp is int power)((ICombatPower)p).Stat_CP=Math.Min(power,65535);
    }
    private static PokemonDimensionsEdit[] Sizes(PKM p)
    {
        var edits=new List<PokemonDimensionsEdit>{new(HeightScalar:0),new(HeightScalar:255),new(WeightScalar:0),new(WeightScalar:255)};
        if(p is IScaledSize3)edits.AddRange([new(Scale:0),new(Scale:255)]);
        if(p is IScaledSizeValue){edits.AddRange([new(HeightScalar:200,Auto:true),new(WeightScalar:200,Auto:true),new(HeightAbsolute:"0",WeightAbsolute:"-1.5"),new(HeightAbsolute:"NaN",WeightAbsolute:"Infinity"),new(HeightAbsolute:"1e50",WeightAbsolute:"1,234.5"),new(HeightAbsolute:"",WeightAbsolute:"invalid"),new(HeightAbsolute:"bad",Auto:true)]);}
        if(p is ICombatPower)edits.AddRange([new(Cp:0),new(Cp:65535),new(Cp:65536),new(Cp:99999)]);
        if(p is IScaledSizeValue or ICombatPower)edits.Add(new("reset"));
        return edits.ToArray();
    }
    internal static void Run()
    {
        foreach(var model in new PKM[]{new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()})
        {
            var seed=Seed(model);
            for(int scalar=0;scalar<256;scalar++)
            {
                var actual=seed.Clone();PokemonDimensions.Apply(actual,new(HeightScalar:scalar));var read=PokemonDimensions.Read(actual)!;
                Check(read.HeightRating==PokeSizeUtil.GetSizeRating((byte)scalar).ToString(),"Every source height class");
                if(actual is IScaledSize3){PokemonDimensions.Apply(actual,new(Scale:scalar));read=PokemonDimensions.Read(actual)!;Check(read.ScaleRating==(actual is PK9?PokeSizeDetailedUtil.GetSizeRating((byte)scalar).ToString():PokeSizeUtil.GetSizeRating((byte)scalar).ToString()),"Every source scale class, PK9 detailed / PA9 ordinary");}
            }
            foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true})
            {
                byte[] input=StandalonePokemon.Serialize(seed,party,encrypted),before=input.ToArray();string name="entity."+seed.Extension;var request=new StandalonePokemonRequest(name,InputEncrypted:encrypted,UseFileFormat:true);var opened=StandalonePokemon.Open(input,name,encrypted,true).Entity;bool actualParty=input.Length==opened.SIZE_PARTY;
                Check(StandalonePokemon.Inspect(input,name,encrypted,true).Pokemon.Dimensions is not null,"Public size metadata");
                foreach(var edit in Sizes(opened))Compare(input,request,opened,new(0,0,"dimensions",Dimensions:edit),p=>SizeOracle(p,edit),actualParty);
                foreach(var action in new[]{"randomHeight","randomWeight","randomScale"}.Where(a=>a!="randomScale"||opened is IScaledSize3))
                {
                    byte[] output=PokeRNGKit.SaveEditor.Program.EditStandalonePokemonRaw(input,JsonSerializer.Serialize(request with{Raw=new(0,0,"dimensions",Dimensions:new(action))},StandalonePokemonJson.Default.StandalonePokemonRequest));
                    var actual=StandalonePokemon.Open(output,name,useFileFormat:true).Entity;var dimensions=PokemonDimensions.Read(actual)!;var edit=action switch{"randomHeight"=>new PokemonDimensionsEdit(HeightScalar:dimensions.HeightScalar),"randomWeight"=>new(WeightScalar:dimensions.WeightScalar),_=>new(Scale:dimensions.Scale)};
                    var expected=opened.Clone();SizeOracle(expected,edit);Finish(expected,opened);Check(output.AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected,actualParty,false)),"Random source scalar complete output and no unrelated changes");
                }
                Check(input.AsSpan().SequenceEqual(before),"Size source immutable");
            }
            foreach(var edit in new[]{new PokemonDimensionsEdit(HeightScalar:-1),new(WeightScalar:256),new(Cp:100000),new("reset",HeightScalar:0),new("randomHeight",HeightScalar:0),new("bad")})Reject(()=>PokemonDimensions.Apply(seed,edit));
            if(seed is not IScaledSizeValue){Reject(()=>PokemonDimensions.Apply(seed,new(HeightAbsolute:"1")));Reject(()=>PokemonDimensions.Apply(seed,new(HeightScalar:1,Auto:true)));}
            if(seed is PA8)Reject(()=>PokemonDimensions.Apply(seed,new(HeightScalar:1,Scale:2)));
            Console.WriteLine($"PASS dimensions {seed.GetType().Name}: all 256 classes, four layouts/public complete outputs, auto/manual floats/CP, random actions, bounds and original");
        }
        foreach(var model in new PKM[]{new PK4(),new BK4(),new RK4(),new PK5{Version=GameVersion.D},new PK6{Version=GameVersion.D}})
        {
            var seed=Seed(model);seed.Version=GameVersion.HG;seed.RefreshChecksum();
            foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true})
            {
                byte[] input=StandalonePokemon.Serialize(seed,party,encrypted),before=input.ToArray();string name="entity."+seed.Extension;var request=new StandalonePokemonRequest(name,InputEncrypted:encrypted,UseFileFormat:true);var opened=StandalonePokemon.Open(input,name,encrypted,true).Entity;bool actualParty=input.Length==opened.SIZE_PARTY;
                var read=StandalonePokemon.Inspect(input,name,encrypted,true).Pokemon.LegacyDetails!;Check(read.GroundTile is not null,"Gen4 origin ground source catalog");
                foreach(var choice in read.GroundTiles)Compare(input,request,opened,new(0,0,"legacyDetails",LegacyDetails:new(GroundTile:choice.Id)),p=>((IGroundTile)p).GroundTile=(GroundTileType)choice.Id,actualParty);
                if(opened is G4PKM)
                {
                    for(int flags=0;flags<64;flags++)
                    {
                        var edit=new PokemonLegacyEdit(LeafFlags:flags);if((flags&32)!=0&&(flags&31)!=31){Reject(()=>PokemonLegacyDetails.Apply(opened,edit));continue;}
                        Compare(input,request,opened,new(0,0,"legacyDetails",LegacyDetails:edit),p=>((G4PKM)p).ShinyLeaf=(((G4PKM)p).ShinyLeaf&~63)|flags,actualParty);
                    }
                    foreach(int mood in new[]{-127,0,127})Compare(input,request,opened,new(0,0,"legacyDetails",LegacyDetails:new(WalkingMood:mood)),p=>((G4PKM)p).WalkingMood=(sbyte)mood,actualParty);
                }
                Check(input.AsSpan().SequenceEqual(before),"Legacy source immutable");
            }
            Reject(()=>PokemonLegacyDetails.Apply(seed,new(GroundTile:999)));
            if(seed is G4PKM fourth){fourth.WalkingMood=-128;fourth.ShinyLeaf=0xE0;PokemonLegacyDetails.Apply(fourth,new(LeafFlags:33));Check(fourth.ShinyLeaf==0xE1&&fourth.WalkingMood==-128,"Existing anomalous crown/high bits/mood preserved");Reject(()=>PokemonLegacyDetails.Apply(fourth,new(LeafFlags:34)));Reject(()=>PokemonLegacyDetails.Apply(fourth,new(WalkingMood:128)));}
            Console.WriteLine($"PASS legacy {seed.GetType().Name}: source ground directory, all leaf flags / crown conditions, mood bounds, four layouts, complete output and original");
        }
        var mismatch=(PA8)Seed(new PA8());mismatch.Scale=10;PokemonDimensions.Apply(mismatch,new(WeightScalar:0));Check(mismatch.HeightScalar==120&&mismatch.Scale==10,"Unchanged PLA mismatch retained");
        foreach(var sample in new PKM[]{Seed(new PB7()),Seed(new PA8())})
        {
            var absolute=(IScaledSizeValue)sample;absolute.HeightAbsolute=BitConverter.Int32BitsToSingle(0x7FC01234);absolute.WeightAbsolute=BitConverter.Int32BitsToSingle(unchecked((int)0x80000000));sample.RefreshChecksum();
            var before=sample.Data.ToArray();var view=PokemonDimensions.Read(sample)!;Check(view.HeightAbsolute=="NaN"&&sample.Data.SequenceEqual(before),"Metadata reads never recalculate source floats");
            PokemonDimensions.Apply(sample,new(WeightScalar:0));Check(BitConverter.SingleToInt32Bits(absolute.HeightAbsolute)==0x7FC01234&&BitConverter.SingleToInt32Bits(absolute.WeightAbsolute)==unchecked((int)0x80000000),"Unchanged NaN payload and negative zero retained in manual mode");
        }
        foreach(PKM p in new PKM[]{new PK3(),new PK6()})Check(PokemonDimensions.Read(p)is null,"Unsupported size metadata omitted");
        var nonOrigin=Seed(new PK6());nonOrigin.Version=GameVersion.X;Check(PokemonLegacyDetails.Read(nonOrigin)is null,"Non-Gen4 origin tile hidden");Reject(()=>PokemonLegacyDetails.Apply(nonOrigin,new(GroundTile:0)));
        var ranch=Seed(new RK4());ranch.RefreshChecksum();Check(PokemonEncounter.Read(ranch).CanDates,"RK4 uses G4PKM date storage");var bytes=StandalonePokemon.Serialize(ranch,false,false);var dateRequest=new StandalonePokemonRequest("dated.rk4",UseFileFormat:true);
        Compare(bytes,dateRequest,ranch,new(0,0,"encounter",Encounter:new(MetDate:"2024-02-29",EggDate:"2020-01-01")),p=>{p.MetDate=new DateOnly(2024,2,29);p.EggMetDate=new DateOnly(2020,1,1);},false);
        SaveOutputs();
    }
    private static void SaveOutputs()
    {
        var saves=new List<SaveFile>{SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav"))!,SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/B.sav"))!,SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav"))!,SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/GP.sav"))!,SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav"))!,new SAV8SWSH(SwshBlockFixtureTests.Create(GameVersion.SW,2)),new SAV8LA(LegendsPokedexTests.Fixture(0)),new SAV8LA(LegendsPokedexTests.Fixture(1)),new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL,2)),new SAV9ZA(ZaBlockFixtureTests.Create(2))};
        foreach(var template in saves)foreach(int logical in new[]{-1,0})
        {
            var seed=template.Clone();var entity=Seed(seed.BlankPKM);if(entity is IGroundTile)entity.Version=GameVersion.HG;entity.RefreshChecksum();seed.SetBoxSlotAtIndex(entity,0,0,EntityImportSettings.None);
            if(seed is SAV7b){var header=new SAV7b(seed.Write().ToArray());System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(header.Blocks.Storage.Data,0);seed=new SAV7b(header.Data.ToArray());Check(seed.PartyCount==1,"LGPE linked team fixture");}else seed.PartyData=[entity];
            int box=seed is SAV7b?0:logical;byte[] input=seed.Write().ToArray(),before=input.ToArray();bool recognized=SaveUtil.GetSaveFile(input.ToArray())is not null;SaveDetectionContext.Clear();
            var source=PokemonEditing.Read(seed,box,0);var edits=new List<(PokemonRawEdit Edit,Action<PKM> Oracle)>();
            if(PokemonDimensions.Read(source)is not null)foreach(var size in Sizes(source))edits.Add((new(box,0,"dimensions",Dimensions:size),p=>SizeOracle(p,size)));
            if(PokemonLegacyDetails.Read(source)is {} legacy)
            {
                if(legacy.GroundTile is not null){int tile=legacy.GroundTiles.Last().Id;edits.Add((new(box,0,"legacyDetails",LegacyDetails:new(GroundTile:tile)),p=>((IGroundTile)p).GroundTile=(GroundTileType)tile));}
                if(source is G4PKM)edits.Add((new(box,0,"legacyDetails",LegacyDetails:new(LeafFlags:63,WalkingMood:127)),p=>{var fourth=(G4PKM)p;fourth.ShinyLeaf=(fourth.ShinyLeaf&~63)|63;fourth.WalkingMood=127;}));
            }
            foreach(var (edit,oracle) in edits)
            {
                byte[] output;if(recognized)output=SaveService.EditPokemonRaw(input,JsonSerializer.Serialize(edit,SaveJsonContext.Default.PokemonRawEdit));else{var typed=seed.Clone();PokemonRawEditing.Apply(typed,edit);output=typed.Write().ToArray();}
                var expected=seed.Clone();var changed=PokemonEditing.Read(expected,box,0);oracle(changed);Finish(changed,source);if(box==-1)expected.SetPartySlotAtIndex(changed,0,EntityImportSettings.None);else expected.SetBoxSlotAtIndex(changed,box,0,EntityImportSettings.None);
                Check(output.AsSpan().SequenceEqual(expected.Write().Span),"Complete save oracle / linked team and unrelated slots: "+seed.GetType().Name+"/"+edit.Action);
            }
            Check(input.AsSpan().SequenceEqual(before),"Original save immutable");Console.WriteLine($"PASS dimensions/legacy save {seed.GetType().Name}/box={box}/team={logical}/publicAutomatic={recognized}: full-file output; synthetic evidence is not owner acceptance");
        }
    }
    private static void Finish(PKM expected,PKM original){if(expected is PB7)PokemonEditing.RefreshDerived(expected,original,true);expected.RefreshChecksum();}
    private static void Compare(byte[] input,StandalonePokemonRequest request,PKM source,PokemonRawEdit edit,Action<PKM> oracle,bool party)
    {
        byte[] output=PokeRNGKit.SaveEditor.Program.EditStandalonePokemonRaw(input,JsonSerializer.Serialize(request with{Raw=edit},StandalonePokemonJson.Default.StandalonePokemonRequest));var expected=source.Clone();oracle(expected);Finish(expected,source);
        Check(output.AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected,party,false)),"Complete serialized oracle: "+source.GetType().Name+"/"+edit.Action);
        Check(StandalonePokemon.Open(output,request.FileName,useFileFormat:true).Entity.ChecksumValid,"Output checksum");
    }
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonSpecialStatusTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid special status accepted"); }
    private static PKM[] Entities() => [new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new RK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()];
    private static PKM Seed(PKM p)
    {
        p.Species=25;p.Language=2;p.Nickname="TEST";p.OriginalTrainerName="OWNER";p.Version=p.Context.GetSingleGameVersion();
        p.PID=12345;p.EncryptionConstant=54321;p.CurrentLevel=25;p.SetIVs(new[]{31,30,29,28,27,26});p.Move1=85;p.Move1_PP=3;
        p.PokerusStrain=5;p.PokerusDays=2;if(p is PK5 fifth){fifth.NSparkle=true;fifth.PokeStarFame=99;}
        if(p is RK4 ranch){ranch.Data[0x88..].Fill(0xA7);ranch.OwnershipType=RanchOwnershipType.Trainer;}
        p.ResetPartyStats();p.Stat_HPCurrent=Math.Max(1,p.Stat_HPMax/2);p.Status_Condition=8;p.RefreshChecksum();return p;
    }
    private static void Oracle(PKM p,PokemonSpecialStatusEdit edit)
    {
        int strain=p.PokerusStrain,days=p.PokerusDays;
        if(edit.Action=="values")
        {
            if(edit.Strain is int s){strain=s;if(edit.Days is null&&s!=p.PokerusStrain)days=Math.Min(days,Pokerus.GetMaxDuration(s));}
            if(edit.Days is int d)days=d;
            if(edit.NSparkle is bool n)((PK5)p).NSparkle=n;
            if(edit.PokeStarFame is int f)((PK5)p).PokeStarFame=(byte)f;
        }
        else if(edit.Action=="infected"&&edit.Value!=p.IsPokerusInfected){if(edit.Value==false){strain=0;days=0;}else if(strain==0){strain=1;days=1;}}
        else if(edit.Action=="cured"&&edit.Value!=p.IsPokerusCured){if(edit.Value==true){strain=Math.Max(1,strain);days=0;}else if(p.IsPokerusInfected)days=1;else strain=0;}
        if(days!=p.PokerusDays)p.PokerusDays=days;if(strain!=p.PokerusStrain)p.PokerusStrain=strain;
    }
    private static PokemonSpecialStatusEdit[] Edits(PKM p)
    {
        var edits=new List<PokemonSpecialStatusEdit>{new(Strain:0,Days:0),new(Strain:0,Days:1),new(Strain:15,Days:4),new(Strain:4),new("infected",Value:false),new("infected",Value:true),new("cured",Value:true),new("cured",Value:false)};
        if(p is PK5)edits.AddRange([new(NSparkle:false),new(PokeStarFame:0),new(PokeStarFame:250),new(PokeStarFame:251),new(NSparkle:false,PokeStarFame:255)]);
        return edits.ToArray();
    }
    internal static void Run()
    {
        foreach(var entity in Entities())
        {
            var seed=Seed(entity);
            for(int strain=0;strain<16;strain++)
            {
                Check(PokemonSpecialStatus.Read(seed)!.Virus!.Durations[strain]==Pokerus.GetMaxDuration(strain),"Core duration catalog");
                for(int days=0;days<=Pokerus.GetMaxDuration(strain);days++)
                {
                    var actual=seed.Clone();var expected=seed.Clone();expected.PokerusDays=days;expected.PokerusStrain=strain;
                    PokemonSpecialStatus.Apply(actual,new(Strain:strain,Days:days));Check(actual.Data.SequenceEqual(expected.Data),"Every strain/duration, no party/stat/PP/name changes");
                }
                Reject(()=>PokemonSpecialStatus.Apply(seed,new(Strain:strain,Days:Pokerus.GetMaxDuration(strain)+1)));
            }
            foreach(var pair in new[]{(0,0),(1,1),(4,0),(0,1),(15,15)})
            foreach(var edit in new[]{new PokemonSpecialStatusEdit("infected",Value:false),new("infected",Value:true),new("cured",Value:false),new("cured",Value:true)})
            {
                var actual=seed.Clone();actual.PokerusStrain=pair.Item1;actual.PokerusDays=pair.Item2;var expected=actual.Clone();Oracle(expected,edit);PokemonSpecialStatus.Apply(actual,edit);Check(actual.Data.SequenceEqual(expected.Data),"Source checkbox transition table including cured and unusual states");
            }
            foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true})
            {
                byte[] input=StandalonePokemon.Serialize(seed,party,encrypted),original=input.ToArray();string name="entity."+seed.Extension;
                var request=new StandalonePokemonRequest(name,InputEncrypted:encrypted,UseFileFormat:true);var opened=StandalonePokemon.Open(input,name,encrypted,true).Entity;
                bool actualParty=input.Length==opened.SIZE_PARTY;
                var read=StandalonePokemon.Inspect(input,name,encrypted,true).Pokemon.SpecialStatus!;
                Check(read.Virus is {Strain:5,Days:2,Infected:true,Cured:false}&&(read.NSparkle is not null)==(seed is PK5),"Public metadata/storage capability");
                using(var document=JsonDocument.Parse(JsonSerializer.Serialize(StandalonePokemon.Inspect(input,name,encrypted,true),StandalonePokemonJson.Default.StandalonePokemonReport)))
                {
                    var payload=document.RootElement.GetProperty("pokemon").GetProperty("specialStatus");
                    Check(payload.GetProperty("virus").GetProperty("strain").GetInt32()==5,"Worker-facing metadata names");
                    if(seed is PK5)Check(payload.GetProperty("nSparkle").GetBoolean()&&payload.GetProperty("pokeStarFame").GetInt32()==99,"Camel-case acronym and fame metadata");
                }
                foreach(var edit in Edits(opened))
                {
                    byte[] output=PokeRNGKit.SaveEditor.Program.EditStandalonePokemonRaw(input,JsonSerializer.Serialize(request with{Raw=new(0,0,"specialStatus",SpecialStatus:edit)},StandalonePokemonJson.Default.StandalonePokemonRequest));
                    var expected=opened.Clone();Oracle(expected,edit);if(expected is PB7)PokemonEditing.RefreshDerived(expected,opened,true);expected.RefreshChecksum();
                    Check(output.AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected,actualParty,false)),"Complete public file oracle "+seed.GetType().Name+"/"+edit);
                    Check(StandalonePokemon.Open(output,name,useFileFormat:true).Entity.ChecksumValid,"Edited checksum");
                }
                foreach(var raw in new[]{new PokemonRawEdit(0,0,"specialStatus"),new(0,0,"values",SpecialStatus:new(Strain:1)),new(0,0,"specialStatus",SpecialStatus:new(Strain:16)),new(0,0,"specialStatus",SpecialStatus:new(Days:-1)),new(0,0,"specialStatus",SpecialStatus:new("infected",Days:0,Value:true)),new(0,0,"specialStatus",SpecialStatus:new("invalid",Value:true))})
                    Reject(()=>PokeRNGKit.SaveEditor.Program.EditStandalonePokemonRaw(input,JsonSerializer.Serialize(request with{Raw=raw},StandalonePokemonJson.Default.StandalonePokemonRequest)));
                Check(input.AsSpan().SequenceEqual(original),"Original independent input preserved");
            }
            if(seed is not PK5){Reject(()=>PokemonSpecialStatus.Apply(seed,new(NSparkle:true)));Reject(()=>PokemonSpecialStatus.Apply(seed,new(PokeStarFame:0)));}
            Reject(()=>PokemonSpecialStatus.Apply(seed,new(PokeStarFame:256)));
            var before=seed.Data.ToArray();Reject(()=>PokemonSpecialStatus.Apply(seed,new(Strain:16,NSparkle:false)));Check(seed.Data.SequenceEqual(before),"Rejected edit is atomic");
            Console.WriteLine($"PASS special status {seed.GetType().Name}: all strain/duration pairs, checkbox states, four file layouts, complete public output, flags, bounds and immutable input");
        }
        foreach(var entity in new PKM[]{new CK3(),new XK3(),new PK5()})
        {
            var p=Seed(entity);p.PokerusStrain=15;p.PokerusDays=15;
            if(p is PK5 fifth){PokemonSpecialStatus.Apply(p,new(PokeStarFame:255));Check(p.PokerusStrain==15&&p.PokerusDays==15&&fifth.IsPokeStar,"Unchanged anomalous virus state and computed fame indicator");}
            var original=p.Data.ToArray();PokemonSpecialStatus.Apply(p,new("infected",Value:true));Check(p.Data.SequenceEqual(original),"Same checkbox state preserves abnormal bytes");
            PokemonSpecialStatus.Apply(p,new(Strain:4));Check(p.PokerusDays==1,"Strain-only action clamps with source duration");
            if(p is CK3 or XK3){int offset=p is CK3?0xD0:0x15;p.Data[offset]=0;PokemonSpecialStatus.Apply(p,new(Strain:6));Check(p.Data[offset]==0,"Unchanged zero-day encoding is not normalized to FF");}
        }
        var flags=(PK5)Seed(new PK5());flags.Data[0x42]=0xFF;PokemonSpecialStatus.Apply(flags,new(NSparkle:false));Check(flags.Data[0x42]==0xFD,"N flag leaves every neighboring bit intact");
        foreach(PKM p in new PKM[]{new PK1(),new PK2(),new SK2()})Check(PokemonSpecialStatus.Read(p)is null,"GB adapter remains independent");
        foreach(SaveFile original in new SaveFile[]{SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!,SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/B.sav"))!,new SAV8SWSH(SwshBlockFixtureTests.Create(GameVersion.SW,2)),new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL,2))})
        foreach(int box in new[]{-1,0})
        {
            var seed=original.Clone();var p=Seed(seed.BlankPKM);seed.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);seed.PartyData=[p];byte[] input=seed.Write().ToArray(),before=input.ToArray();
            SaveDetectionContext.Clear();bool recognized=SaveUtil.GetSaveFile(input.ToArray())is not null;
            foreach(var edit in Edits(PokemonEditing.Read(seed,box,0)))
            {
                var raw=new PokemonRawEdit(box,0,"specialStatus",SpecialStatus:edit);byte[] output;
                if(recognized)output=SaveService.EditPokemonRaw(input,JsonSerializer.Serialize(raw,SaveJsonContext.Default.PokemonRawEdit));
                else{var typed=seed.Clone();PokemonRawEditing.Apply(typed,raw);output=typed.Write().ToArray();}
                var expected=seed.Clone();var entity=PokemonEditing.Read(expected,box,0);Oracle(entity,edit);entity.RefreshChecksum();if(box==-1)expected.SetPartySlotAtIndex(entity,0,EntityImportSettings.None);else expected.SetBoxSlotAtIndex(entity,0,0,EntityImportSettings.None);
                Check(output.AsSpan().SequenceEqual(expected.Write().Span),"Save complete-file source oracle");
            }
            Check(input.AsSpan().SequenceEqual(before),"Source save remains immutable");Console.WriteLine($"PASS special status {seed.GetType().Name}/box={box}/publicAutomatic={recognized}: full-file oracle; synthetic engineering evidence is not owner acceptance");
        }
        foreach(bool platinum in new[]{false,true})
        {
            var data=new byte[platinum?SaveUtil.SIZE_G4RANCH_PLAT:SaveUtil.SIZE_G4RANCH];
            foreach(var (offset,value) in new[]{(0x24,0x100),(0x2C,0x200),(0x34,0x300),(0x3C,0x308)})System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(data.AsSpan(offset),value);
            var seed=new SAV4Ranch(data);seed.SetBoxSlotAtIndex(Seed(new RK4()),0,0,EntityImportSettings.None);byte[] input=seed.Write().ToArray(),before=input.ToArray();
            var choice=new SaveDetectionChoice(SaveFileType.Ranch,SaveDetection.Versions(SaveFileType.Ranch).FirstOrDefault(),LanguageID.English,"Default","ranch.bin");SaveDetectionContext.Configure(input,choice);
            try
            {
                foreach(var edit in Edits(seed.GetBoxSlotAtIndex(0,0)))
                {
                    var output=SaveService.EditPokemonRaw(input,JsonSerializer.Serialize(new PokemonRawEdit(0,0,"specialStatus",SpecialStatus:edit),SaveJsonContext.Default.PokemonRawEdit));
                    var expected=SaveDetection.Open(input,choice).Save;var entity=expected.GetBoxSlotAtIndex(0,0);Oracle(entity,edit);entity.RefreshChecksum();expected.SetBoxSlotAtIndex(entity,0,0,EntityImportSettings.None);
                    Check(output.AsSpan().SequenceEqual(expected.Write().Span),"Both Ranch revisions: public manually recognized complete file / SHA1 and all extra bytes");
                }
                Check(input.AsSpan().SequenceEqual(before),"Original Ranch source preserved");
            }
            finally{SaveDetectionContext.Clear();}
            Console.WriteLine($"PASS special status Ranch/platinum={platinum}: public manual recognition, complete file oracle and immutable source; synthetic fixture is not owner acceptance");
        }
    }
}

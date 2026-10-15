// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class StadiumRanchEntityTests
{
    internal static void Run()
    {
        foreach(bool japanese in new[]{false,true})foreach(bool rental in new[]{false,true})Sk2(japanese,rental);
        Rk4();
        Stadium();Ranch(false);Ranch(true);
    }
    private static string Json(StandalonePokemonRequest request)=>JsonSerializer.Serialize(request,StandalonePokemonJson.Default.StandalonePokemonRequest);
    private static void Sk2(bool jp,bool rental)
    {
        var p=new SK2(jp){Species=25,Nickname=jp?"ピカチュウ":"PIKACHU",OriginalTrainerName=jp?"サトシ":"OWNER",TID16=12345,CurrentFriendship=70,IsRental=rental};
        p.CurrentLevel=20;p.Move1=1;p.Move1_PP=30;p.HeldMailID=0xA7;p.Data[0x1E]|=0xB0;p.Data[0x23]=0xC3;
        var input=StandalonePokemon.Serialize(p,false,false);var before=input.ToArray();
        var report=StandalonePokemon.Inspect(input,"owned.sk2",useFileFormat:true);
        Check(report.CanEdit&&report.Format=="SK2"&&report.Generation==2&&report.Pokemon.GbRental==rental&&report.Gb is not null,"SK2 public editor/fields/rental capability");
        var read=(SK2)StandalonePokemon.Open(input,"owned.sk2",useFileFormat:true).Entity;
        var basic=new GbPokemonEdit(25,read.Nickname,read.OriginalTrainerName,54321,21,[12,13,14,15],[1,2,3,4,5],[1,0,0,0],[25,0,0,0],[0,0,0,0],100,0);
        var request=new StandalonePokemonRequest("owned.sk2",UseFileFormat:true,Gb:basic);
        var expected=(SK2)read.Clone();StandaloneGb.Apply(expected,basic);
        var output=Program.EditStandalonePokemonGb(input,Json(request));
        Check(output.SequenceEqual(StandalonePokemon.Serialize(expected,false,false)),"SK2 complete source output");
        var result=(SK2)StandalonePokemon.Open(output,"owned.sk2",useFileFormat:true).Entity;
        Check(result.TID16==54321&&result.CurrentLevel==21&&result.DV16==expected.DV16&&result.IsRental==rental&&result.HeldMailID==0xA7&&result.Data[0x23]==0xC3,"SK2 packed and reserved bytes preserved");
        var fields=new GbSpecialEdit("fields",new(MetLevel:40,MetLocation:1,MetTimeOfDay:3,TrainerGender:1,PokerusStrain:3,PokerusDays:3));
        expected=(SK2)read.Clone();StandaloneGbSpecial.Apply(expected,fields);
        Check(Program.EditStandalonePokemonGb(input,Json(request with{Gb=null,GbSpecial=fields})).SequenceEqual(StandalonePokemon.Serialize(expected,false,false)),"SK2 source special fields and packed bounds");
        foreach(bool encrypted in new[]{false,true})
        {
            var exported=Program.ExportStandalonePokemon(output,Json(request with{Gb=null,Encrypted=encrypted,Party=true}));
            Check(StandalonePokemon.Inspect(exported,"owned.sk2",encrypted,true).Pokemon.Level==21,"SK2 public export/reopen");
        }
        if(rental)Reject(()=>Program.EditStandalonePokemonGb(input,Json(request with{Gb=basic with{Ot="OTHER"}})));
        Reject(()=>Program.EditStandalonePokemonGb(input,Json(request with{Gb=basic with{Dvs=[16,0,0,0]}})));
        Check(input.SequenceEqual(before),"SK2 original changed");
        Console.WriteLine($"PASS SK2 Japanese={jp}/rental={rental}: public basic/special/export, complete output, reserved bits, rental OT and immutable source");
    }
    private static RK4 Entity()
    {
        var p=new RK4{Species=25,Language=2,Nickname="PARTNER",OriginalTrainerName="OWNER",Version=GameVersion.D,TID16=12345,SID16=54321,OriginalTrainerFriendship=70};
        p.CurrentLevel=20;p.Move1=1;p.Move1_PP=p.GetMovePP(1,0);
        p.Data[0x88..].Fill(0xA7);p.OwnershipType=RanchOwnershipType.Trainer;p.RefreshChecksum();return p;
    }
    private static PokemonEdit Basic(PKM p,int box=0)=>new(box,0,p.Nickname,21,p.CurrentFriendship,p.OriginalTrainerName,p.TID16,p.SID16,
        [p.IV_HP,p.IV_ATK,p.IV_DEF,p.IV_SPA,p.IV_SPD,p.IV_SPE],[p.EV_HP,p.EV_ATK,p.EV_DEF,p.EV_SPA,p.EV_SPD,p.EV_SPE],p.Moves,[p.Move1_PP,p.Move2_PP,p.Move3_PP,p.Move4_PP],[p.Move1_PPUps,p.Move2_PPUps,p.Move3_PPUps,p.Move4_PPUps]);
    private static void Rk4()
    {
        var p=Entity();var input=StandalonePokemon.Serialize(p,false,false);var before=input.ToArray();var extra=p.Data[0x88..].ToArray();
        var report=StandalonePokemon.Inspect(input,"owned.rk4",useFileFormat:true);Check(report.Format=="RK4"&&report.CanEdit,"RK4 editor capability");
        var request=new StandalonePokemonRequest("owned.rk4",UseFileFormat:true,Edit:Basic(p));
        var output=Program.EditStandalonePokemon(input,Json(request));var result=StandalonePokemon.Open(output,"owned.rk4",useFileFormat:true).Entity;
        Check(result.CurrentLevel==21&&result.ChecksumValid&&result.Data[0x88..].SequenceEqual(extra),"RK4 level/checksum and all 28 Ranch bytes preserved");
        foreach(bool encrypted in new[]{false,true})foreach(bool party in new[]{false,true})
        {
            var exported=Program.ExportStandalonePokemon(output,Json(request with{Edit=null,Encrypted=encrypted,Party=party}));
            Check(StandalonePokemon.Open(exported,"owned.rk4",encrypted,true).Entity.Data.SequenceEqual(result.Data),"RK4 encrypted/plain source width and readback");
        }
        var raw=new PokemonRawEdit(0,0,"values",Pid:p.PID^1u);var edited=Program.EditStandalonePokemonRaw(input,Json(request with{Edit=null,Raw=raw}));
        Check(StandalonePokemon.Open(edited,"owned.rk4",useFileFormat:true).Entity.Data[0x88..].SequenceEqual(extra)&&input.SequenceEqual(before),"RK4 raw edit retains metadata and source");
        Console.WriteLine("PASS RK4: public basic/raw, four output layouts, checksums, all Ranch metadata bytes and original preservation");
    }
    private static void Stadium()
    {
        foreach(bool jp in new[]{false,true})
        {
            var seed=new SAV2Stadium(new byte[SaveUtil.SIZE_G2STAD],jp);var p=new SK2(jp){Species=25,Nickname=jp?"ピカチュウ":"PIKACHU",OriginalTrainerName=jp?"サトシ":"OWNER"};p.CurrentLevel=20;p.Move1=1;p.Move1_PP=30;
            // Blank memory has no region footer; real Stadium saves identify the
            // Japanese/overseas layout using box 1's P3v0 marker.
            int boxSize=jp?0x730:0x4D8;
            for(int box=0;box<seed.BoxCount;box++)BinaryPrimitives.WriteUInt32LittleEndian(seed.Data[(seed.GetBoxOffset(box)-0x20+boxSize-6)..],0x30763350);
            seed.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);var input=seed.Write().ToArray();
            var choice=new SaveDetectionChoice(SaveFileType.Stadium2,SaveDetection.Versions(SaveFileType.Stadium2).FirstOrDefault(),jp?LanguageID.Japanese:LanguageID.English,"Default","stadium.sav");SaveDetectionContext.Configure(input,choice);
            try
            {
                using var report=JsonDocument.Parse(SaveService.Inspect(input));Check(report.RootElement.GetProperty("pokemonEditing").GetProperty("editor").GetString()=="gb","SK2 save exposes GB editor");
                var opened=(SAV2Stadium)SaveDetection.Open(input,choice).Save;
                Check(opened.Japanese==jp&&SaveChecksums.Valid(opened),"Stadium2 region and checksums");
                var original=(SK2)opened.GetBoxSlotAtIndex(0,0);
                var edit=new GbPokemonEdit(25,original.Nickname,original.OriginalTrainerName,1,21,[12,13,14,15],[1,2,3,4,5],[1,0,0,0],[25,0,0,0],[0,0,0,0],100,0);
                var request=new GbSavePokemonEdit(0,0,Basic:edit);var output=SaveService.EditGbPokemon(input,JsonSerializer.Serialize(request,SaveJsonContext.Default.GbSavePokemonEdit));
                var actual=(SK2)SaveDetection.Open(output,choice).Save.GetBoxSlotAtIndex(0,0);Check(actual.CurrentLevel==21&&actual.TID16==1&&actual.Nickname==original.Nickname,"Stadium2 save write/reopen");
                var oracle=SaveDetection.Open(input,choice).Save;var expected=(SK2)oracle.GetBoxSlotAtIndex(0,0);StandaloneGb.Apply(expected,edit);oracle.SetBoxSlotAtIndex(expected,0,0,EntityImportSettings.None);
                Check(output.SequenceEqual(oracle.Write().ToArray()),"Stadium2 complete save output");
            }finally{SaveDetectionContext.Clear();}
            Console.WriteLine($"PASS Stadium2 Japanese={jp}: public capability, shared GB edit, names and complete save output");
        }
    }
    private static void Ranch(bool platinum)
    {
        var data=new byte[platinum?SaveUtil.SIZE_G4RANCH_PLAT:SaveUtil.SIZE_G4RANCH];
        foreach(var (offset,value) in new[]{(0x24,0x100),(0x2C,0x200),(0x34,0x300),(0x3C,0x308)})BinaryPrimitives.WriteInt32BigEndian(data.AsSpan(offset),value);
        var seed=new SAV4Ranch(data);var p=Entity();seed.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);var input=seed.Write().ToArray();var before=input.ToArray();
        var choice=new SaveDetectionChoice(SaveFileType.Ranch,SaveDetection.Versions(SaveFileType.Ranch).FirstOrDefault(),LanguageID.English,"Default","ranch.bin");SaveDetectionContext.Configure(input,choice);
        try
        {
            using var report=JsonDocument.Parse(SaveService.Inspect(input));Check(report.RootElement.GetProperty("pokemonEditing").GetProperty("canEdit").GetBoolean(),"Ranch basic capability");
            var source=SaveDetection.Open(input,choice).Save;var edit=Basic(source.GetBoxSlotAtIndex(0,0));
            var oracle=SaveDetection.Open(input,choice).Save;PokemonEditing.Apply(oracle,edit);
            var output=SaveService.EditPokemon(input,JsonSerializer.Serialize(edit,SaveJsonContext.Default.PokemonEdit));Check(output.SequenceEqual(oracle.Write().ToArray()),"Ranch complete output including SHA1/container metadata");
            var reopened=SaveDetection.Open(output,choice).Save;Check(SaveChecksums.Valid(reopened)&&reopened.GetBoxSlotAtIndex(0,0).CurrentLevel==21&&input.SequenceEqual(before),"Ranch reopen and original");
        }finally{SaveDetectionContext.Clear();}
        Console.WriteLine($"PASS Ranch platinum={platinum}: public basic editor, complete output, metadata, SHA1 and original");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid entity edit accepted");}catch(ArgumentException){}}
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class SavePokemonEditingTests
{
    private static SaveDetectionChoice? manual;
    internal static void Run()
    {
        foreach(string format in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"})
            Standard(File.ReadAllBytes($".tmp/pkhex-fixtures/{format}.sav"));
        Standard(WithFlags(new SAV8SWSH(SwshBlockFixtureTests.Create(GameVersion.SW,0)).AllBlocks,SaveBlockAccessor8SWSH.KSecretBoxUnlocked),recognition:Choice(SaveFileType.SWSH));
        Standard(Modern(new SAV8LA(WithFlags(new SAV8LA(LegendsPokedexTests.Fixture(0)).AllBlocks,SaveBlockAccessor8LA.KUnlockedSecretBox01,SaveBlockAccessor8LA.KUnlockedSecretBox02,SaveBlockAccessor8LA.KUnlockedSecretBox03))),recognition:Choice(SaveFileType.LA));
        Standard(Modern(new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL,0))),recognition:Choice(SaveFileType.SV));
        Standard(Trainer9aEditingTests.Create(0),recognition:Choice(SaveFileType.ZA));
        foreach(var (kind,data) in new[]{(SaveFileType.Bulk3,new byte[SaveUtil.SIZE_G4BANK]),(SaveFileType.Bulk4,new byte[SaveUtil.SIZE_G4BANK])})
            Standard(data,recognition:new(kind,SaveDetection.Versions(kind).FirstOrDefault(),LanguageID.English,"Default","manual.sav"));
        foreach(var size in new[]{SaveUtil.SIZE_G7BANK_1,SaveUtil.SIZE_G7BANK_2})
        {
            var data=new byte[size];System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(0x15C),(ushort)(size==SaveUtil.SIZE_G7BANK_1?BankRevision.Gen6:BankRevision.Gen7));
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(0x15E),100);
            Standard(data,recognition:new(SaveFileType.Bulk7,GameVersion.Any,LanguageID.English,"Default","bank.bin"));
        }
        var boxData=new byte[SaveUtil.SIZE_G3BOX];for(int i=0;i<46;i++)System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(boxData.AsSpan((i+1)*0x2000+4),(uint)(i%23));
        Standard(new SAV3RSBox(boxData).Write().ToArray(),recognition:new(SaveFileType.RSBox,SaveDetection.Versions(SaveFileType.RSBox).FirstOrDefault(),LanguageID.English,"Default","box.sav"));
        foreach(int profile in new[]{0,3})
        {
            SaveService.ConfigureBRProfile(profile);
            try {Standard(Br4EditingTests.Fixture(false,0),profile);}finally{SaveService.ResetBRProfile();}
        }
        foreach(var language in new[]{LanguageID.English,LanguageID.Japanese,LanguageID.Korean})
        foreach(var version in new[]{GameVersion.RD,GameVersion.YW,GameVersion.GD,GameVersion.C})
            if(language!=LanguageID.Korean||version!=GameVersion.C)
            Gb(language,version);
        var unavailable=new SAV2(LanguageID.Korean,GameVersion.C).Write().ToArray();
        Reject(()=>SaveDetectionContext.Configure(unavailable,new(SaveFileType.GSC,GameVersion.C,LanguageID.Korean,"Default","bad.sav")));
        var detection=JsonSerializer.Deserialize(SaveService.ReadSaveDetectionCatalog(),SaveDetectionJson.Default.SaveDetectionCatalog)!;
        Check(detection.Types.Single(t=>t.Id==SaveFileType.GSC).Unsupported.SequenceEqual(new[]{new SaveDetectionUnsupported(GameVersion.C,LanguageID.Korean)}),"Public unsupported region pair metadata");
        Gb(LanguageID.English,GameVersion.RD,SaveFileType.Stadium1);
        Gb(LanguageID.Japanese,GameVersion.RD,SaveFileType.Stadium1J);
        var unsupported=new SAV2Stadium(new byte[SaveUtil.SIZE_G2STAD]);
        Check(SavePokemonEditing.Read(unsupported,true) is {CanEdit:true,Editor:"gb"},"Stadium2 exposes its adapted GB editor");
        string? real=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");
        if(real is not null){byte[] input=File.ReadAllBytes(real);Standard(input);Check(File.ReadAllBytes(real).SequenceEqual(input),"Real source file changed");}
        Console.WriteLine("PASS save Pokemon capability: old trainer/inventory gates preserved; standard/GB/public/raw/import/storage/export and input preservation");
    }
    private static SaveDetectionChoice Choice(SaveFileType kind)=>new(kind,SaveDetection.Versions(kind).FirstOrDefault(),LanguageID.English,"Default","manual.sav");
    private static byte[] Modern(SaveFile save)
    {
        var date=new DateTime(2020,1,1);
        if(save is SAV8LA la)la.LastSaved.Timestamp=date;
        if(save is SAV9SV sv)sv.LastSaved.Timestamp=date;
        if(save is SAV9ZA za)za.LastSaved.Timestamp=date;
        return save.Write().ToArray();
    }
    private static byte[] WithFlags(IReadOnlyList<SCBlock> source,params uint[] keys)
    {
        var blocks=source.Select(b=>b.Clone()).ToList();
        foreach(uint key in keys)if(!blocks.Any(b=>b.Key==key))blocks.Add(SwshBlockFixtureTests.Typed(key,[],SCTypeCode.Bool1));
        blocks.Sort((a,b)=>a.Key.CompareTo(b.Key));return SwishCrypto.Encrypt(blocks);
    }
    private static SaveFile Open(byte[] input,int profile=-1)
    {
        var save=manual is null?SaveService.OpenDatabaseSave(input):SaveDetection.Open(input,manual).Save;
        if(save is SAV4BR br&&profile>=0)br.CurrentSlot=profile;
        return save;
    }
    private static PokemonEdit Edit(PKM p,int box,int level)=>new(box,0,p.Nickname, (byte)level,p.IsEgg?p.OriginalTrainerFriendship:p.CurrentFriendship,p.OriginalTrainerName,p.TID16,p.SID16,
        [p.IV_HP,p.IV_ATK,p.IV_DEF,p.IV_SPA,p.IV_SPD,p.IV_SPE],[p.EV_HP,p.EV_ATK,p.EV_DEF,p.EV_SPA,p.EV_SPD,p.EV_SPE],p.Moves,[p.Move1_PP,p.Move2_PP,p.Move3_PP,p.Move4_PP], [p.Move1_PPUps,p.Move2_PPUps,p.Move3_PPUps,p.Move4_PPUps]);
    private static void Standard(byte[] original,int profile=-1,SaveDetectionChoice? recognition=null)
    {
        SaveDetectionContext.Clear();manual=recognition;if(manual is not null)SaveDetectionContext.Configure(original,manual);var save=Open(original,profile);
        if(save is SAV8LA la)la.LastSaved.Timestamp=new DateTime(2020,1,1);
        if(save is SAV9SV sv)sv.LastSaved.Timestamp=new DateTime(2020,1,1);
        if(save is SAV9ZA za)za.LastSaved.Timestamp=new DateTime(2020,1,1);
        var p=save.BlankPKM;
        p.Species=25;p.Language=2;p.OriginalTrainerName="TEST";p.Nickname="TEST";p.CurrentLevel=20;p.RefreshChecksum();
        if(save.HasBox)save.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);
        if(save.HasParty)save.PartyData=[p.Clone(),p.Clone()];
        byte[] input=save.Write().ToArray(),before=input.ToArray();if(manual is not null)SaveDetectionContext.Configure(input,manual);save=Open(input,profile);
        using(var report=JsonDocument.Parse(SaveService.Inspect(input)))
        {
            var cap=report.RootElement.GetProperty("pokemonEditing");
            Check(cap.GetProperty("canEdit").GetBoolean()&&cap.GetProperty("canRaw").GetBoolean()&&cap.GetProperty("editor").GetString()=="standard","Public standard editing capability: "+save.GetType().Name);
            Check(report.RootElement.GetProperty("canEdit").GetBoolean()==SaveService.CanEdit(save),"Legacy gate was expanded");
        }
        foreach(int box in new[]{0,-1}.Where(box=>box<0?save.HasParty:save.HasBox))
        {
            var target=PokemonEditing.Read(save,box,0);var edit=Edit(target,box,21);
            var expected=Open(input,profile);PokemonEditing.Apply(expected,edit);byte[] expectedBytes=expected.Write().ToArray();
            byte[] output=SaveService.EditPokemon(input,JsonSerializer.Serialize(edit,SaveJsonContext.Default.PokemonEdit));
            Check(output.SequenceEqual(expectedBytes),"Complete standard output parity: "+save.GetType().Name);
            var reopened=Open(output,profile);Check(SaveChecksums.Valid(reopened)&&PokemonEditing.Read(reopened,box,0).CurrentLevel==21,"Standard edit/checksum/reopen");
            var raw=new PokemonRawEdit(box,0,"values",Pid:target.PID^1u);expected=Open(input,profile);PokemonRawEditing.Apply(expected,raw);
            Check(SaveService.EditPokemonRaw(input,JsonSerializer.Serialize(raw,SaveJsonContext.Default.PokemonRawEdit)).SequenceEqual(expected.Write().ToArray()),"Complete raw output parity");
            if(manual is not null)SaveDetectionContext.Configure(output,manual);
            Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Exact edited working export");
            if(manual is not null)SaveDetectionContext.Configure(input,manual);
        }
        Check(!SavePokemonEditing.Read(save,false).CanEdit,"Invalid checksums enable Pokemon writes");
        if(!SaveService.CanEdit(save))Reject(()=>SaveService.EditInventory(input,"{}"));
        Check(input.SequenceEqual(before),"Standard input changed");
        if(save is SAV7b)
        {
            var target=(PB7)save.GetBoxSlotAtIndex(0,0);var changed=target.Clone();changed.CurrentLevel=21;changed.ResetCP();
            var edit=Edit(target,0,21);var actual=(PB7)Open(SaveService.EditPokemon(input,JsonSerializer.Serialize(edit,SaveJsonContext.Default.PokemonEdit))).GetBoxSlotAtIndex(0,0);
            Check(actual.Stat_CP==changed.Stat_CP,"LGPE level edit did not refresh source CP");
        }
        Console.WriteLine($"PASS {save.GetType().Name}/{save.Version}/profile={profile}: public capability, basic/raw, full output, party/box and source preservation");
        manual=null;SaveDetectionContext.Clear();
    }
    private static void Gb(LanguageID language,GameVersion version,SaveFileType? stadium=null)
    {
        SaveFile save=stadium is SaveFileType.Stadium1?new SAV1Stadium(new byte[SaveUtil.SIZE_G1STAD]):stadium is SaveFileType.Stadium1J?new SAV1StadiumJ(new byte[SaveUtil.SIZE_G1STADJ]):version is GameVersion.RD or GameVersion.YW?new SAV1(language,version):new SAV2(language,version);
        var p=(GBPKML)save.BlankPKM;bool jp=p.Japanese;
        p.Species=25;p.Nickname=jp?"ア":"A";p.OriginalTrainerName=jp?"イ":"B";p.CurrentLevel=20;p.Move1=1;p.Move1_PP=p.GetMovePP(1,0);
        if(save.HasParty)save.PartyData=[p,p.Clone()];Set(save,p,0);
        if(save is SAV1 first){first.Data[first.Japanese?0x29B9:0x29C3]=0x99;first.Data[first.Japanese?0x2712:0x271C]=0;}
        byte[] input=save.Write().ToArray(),before=input.ToArray();
        var kind=stadium??(save is SAV1?SaveFileType.RBY:SaveFileType.GSC);
        var choice=new SaveDetectionChoice(kind,stadium is null?version:SaveDetection.Versions(kind).FirstOrDefault(),language,"Default","gb.sav");SaveDetectionContext.Configure(input,choice);
        try
        {
            save=Open(input);
            using(var report=JsonDocument.Parse(SaveService.Inspect(input)))
            {
                Check(report.RootElement.GetProperty("pokemonEditing").GetProperty("editor").GetString()=="gb"&&report.RootElement.GetProperty("pokemonEditing").GetProperty("canEdit").GetBoolean(),"GB public capability");
                Check(report.RootElement.GetProperty("gbInfo").GetProperty("languages").GetArrayLength()>0,"Shared GB source choices");
            }
            foreach(int box in new[]{0,-1}.Where(b=>b==0||save.HasParty))
            {
                p=(GBPKML)PokemonEditing.Read(save,box,0);
                var edit=new GbPokemonEdit(25,p.Nickname,p.OriginalTrainerName,12345,21,[12,13,14,15],[1,2,3,4,5],[1,0,0,0],[20,0,0,0],[0,0,0,0],p is PK2?100:null,p is PK2?0:null);
                var request=new GbSavePokemonEdit(box,0,Basic:edit);var expected=Open(input);var copy=(GBPKML)PokemonEditing.Read(expected,box,0);StandaloneGb.Apply(copy,edit);Set(expected,copy,box);
                byte[] output=SaveService.EditGbPokemon(input,JsonSerializer.Serialize(request,SaveJsonContext.Default.GbSavePokemonEdit));
                Check(output.SequenceEqual(expected.Write().ToArray()),"GB complete output including lists/names/checksums");
                var reopened=SaveDetection.Open(output,choice).Save;Check(PokemonEditing.Read(reopened,box,0).CurrentLevel==21&&SaveChecksums.Valid(reopened),"GB public edit reopen");
                var special=p is PK1?new GbSpecialEdit("fields",Fields:new(CatchRate:123)):new GbSpecialEdit("fields",Fields:new(MetLevel:30));
                expected=Open(input);copy=(GBPKML)PokemonEditing.Read(expected,box,0);StandaloneGbSpecial.Apply(copy,special);Set(expected,copy,box);
                Check(SaveService.EditGbPokemon(input,JsonSerializer.Serialize(new GbSavePokemonEdit(box,0,Special:special),SaveJsonContext.Default.GbSavePokemonEdit)).SequenceEqual(expected.Write().ToArray()),"GB special complete output");
                var file=new PokemonImport(box,0,"owner."+p.Extension,Convert.ToBase64String(StandaloneGb.Write(p)));
                _=SaveService.ImportPokemon(input,JsonSerializer.Serialize(file,SaveJsonContext.Default.PokemonImport));
                Reject(()=>SaveService.EditGbPokemon(input,JsonSerializer.Serialize(request with {Basic=edit with{Dvs=[16,0,0,0]}},SaveJsonContext.Default.GbSavePokemonEdit)));
            }
            var storage=new StorageEdit("copy",new(0,0),new(0,1));var oracle=Open(input);StorageEditing.Apply(oracle,storage);
            Check(SaveService.EditStorage(input,JsonSerializer.Serialize(storage,SaveJsonContext.Default.StorageEdit)).SequenceEqual(oracle.Write().ToArray()),"GB copy preserves names/list metadata");
            if(save is SAV2)
            {
                var only=Open(input);only.PartyData=[p];byte[] one=only.Write().ToArray();SaveDetectionContext.Configure(one,choice);
                Reject(()=>SaveService.EditGbPokemon(one,JsonSerializer.Serialize(new GbSavePokemonEdit(-1,0,Special:new("egg",Egg:new("makeEgg"),Language:jp?1:p.Korean?8:2)),SaveJsonContext.Default.GbSavePokemonEdit)));
            }
            Check(input.SequenceEqual(before),"GB input changed");
            Console.WriteLine($"PASS GB {version}/{language}: basic/special, bounds, egg party invariant, import/copy, actual slot width/names and full output parity");
        }
        finally{SaveDetectionContext.Clear();}
    }
    private static void Set(SaveFile save,PKM p,int box){if(box==-1)save.SetPartySlotAtIndex(p,0,EntityImportSettings.None);else if(save is SAV1StadiumJ)
        {var pk=(PK1)p;pk.Stat_LevelBox=pk.CurrentLevel;var dest=save.Data.Slice(save.GetBoxSlotOffset(box,0),45);pk.Data[..33].CopyTo(dest);pk.NicknameTrash.CopyTo(dest[33..]);pk.OriginalTrainerTrash.CopyTo(dest[39..]);}
        else save.SetBoxSlotAtIndex(p,box,0,EntityImportSettings.None);}
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid save Pokemon edit accepted");}catch(ArgumentException){}}
}

// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonAdvancedStatsTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid advanced statistic request accepted"); }
    private static PKM[] Entities() => [new PB7 { Version = GameVersion.GP }, new PK8 { Version = GameVersion.SW }, new PB8 { Version = GameVersion.BD }, new PA8 { Version = GameVersion.PLA }, new PK9 { Version = GameVersion.SL }, new PA9 { Version = GameVersion.ZA }];
    private static PKM Seed(PKM p)
    {
        p.Species=25;p.Language=2;p.Nickname="TEST";p.OriginalTrainerName="OWNER";p.CurrentLevel=25;p.MetLevel=5;p.PID=12345;p.EncryptionConstant=54321;
        p.SetIVs(new[]{0,19,20,25,26,31});p.Move1=85;p.Move1_PP=3;
        if(p is IAwakened av){av.AV_HP=1;av.AV_ATK=2;av.AV_DEF=3;av.AV_SPE=4;av.AV_SPA=5;av.AV_SPD=6;}
        if(p is IGanbaru gv){gv.GV_HP=1;gv.GV_ATK=2;gv.GV_DEF=3;gv.GV_SPE=4;gv.GV_SPA=5;gv.GV_SPD=6;}
        if(p is ITeraType t){t.TeraTypeOriginal=MoveType.Fire;t.TeraTypeOverride=(MoveType)TeraTypeUtil.OverrideNone;}
        p.ResetPartyStats();p.Stat_HPCurrent=Math.Max(1,p.Stat_HPMax/2);p.Status_Condition=8;p.RefreshChecksum();return p;
    }
    private static byte[] Edit(byte[] input, PKM p, PokemonAdvancedStatsEdit edit, bool encrypted)
    {
        var request=new StandalonePokemonRequest("entity."+p.Extension,InputEncrypted:encrypted,UseFileFormat:true,Raw:new(0,0,"advancedStats",AdvancedStats:edit));
        return PokeRNGKit.SaveEditor.Program.EditStandalonePokemonRaw(input,JsonSerializer.Serialize(request,StandalonePokemonJson.Default.StandalonePokemonRequest));
    }
    private static IEnumerable<PokemonAdvancedStatsEdit> Changes(PKM p)
    {
        if(p is IAwakened){yield return new("values",Awakening:[0,200,1,199,20,30]);foreach(string a in new[]{"avSuggested","avMinimum","avMax","avClear","avRandom"})yield return new(a);for(int i=0;i<6;i++){yield return new("avToggle",Index:i);yield return new("avZero",Index:i);}}
        if(p is IGanbaru){yield return new("values",Ganbaru:[10,9,8,7,6,5]);foreach(string a in new[]{"gvSuggested","gvMax","gvClear"})yield return new(a);for(int i=0;i<6;i++){yield return new("gvToggle",Index:i);yield return new("gvZero",Index:i);}}
        if(p is IDynamaxLevel){foreach(int d in new[]{0,10})yield return new("values",DynamaxLevel:d);yield return new("dynamaxToggle");}
        if(p is IGigantamax)foreach(bool value in new[]{false,true})yield return new("values",Gigantamax:value);
        if(p is IAlpha)foreach(bool value in new[]{false,true})yield return new("values",Alpha:value);
        if(p is INoble)foreach(bool value in new[]{false,true})yield return new("values",Noble:value);
        if(p is ITeraType){foreach(int type in Enumerable.Range(0,18).Concat(new[]{19,99})){yield return new("values",TeraOriginal:type);yield return new("values",TeraOverride:type);}foreach(string a in new[]{"teraToggle","teraPrimary","teraSecondary","teraReset"})yield return new(a);}
    }
    private static void Oracle(PKM p, PokemonAdvancedStatsEdit e, PokemonAdvancedStatsInfo actual)
    {
        if(e.Awakening is {} av){var a=(IAwakened)p;a.AV_HP=(byte)av[0];a.AV_ATK=(byte)av[1];a.AV_DEF=(byte)av[2];a.AV_SPA=(byte)av[3];a.AV_SPD=(byte)av[4];a.AV_SPE=(byte)av[5];}
        if(e.Ganbaru is {} gv){var g=(IGanbaru)p;g.GV_HP=(byte)gv[0];g.GV_ATK=(byte)gv[1];g.GV_DEF=(byte)gv[2];g.GV_SPA=(byte)gv[3];g.GV_SPD=(byte)gv[4];g.GV_SPE=(byte)gv[5];}
        if(e.DynamaxLevel is int dl)((IDynamaxLevel)p).DynamaxLevel=(byte)dl;
        if(e.Gigantamax is bool gm)((IGigantamax)p).CanGigantamax=gm;
        if(e.Alpha is bool al)((IAlpha)p).IsAlpha=al;
        if(e.Noble is bool no)((INoble)p).IsNoble=no;
        if(e.TeraOriginal is int ot)((ITeraType)p).TeraTypeOriginal=(MoveType)ot;
        if(e.TeraOverride is int ov)((ITeraType)p).TeraTypeOverride=(MoveType)ov;
        int index=e.Index is int i?new[]{0,1,2,4,5,3}[i]:0;
        switch(e.Action)
        {
            case "avClear":((IAwakened)p).AwakeningClear();break;
            case "avMax":((IAwakened)p).AwakeningMaximize();break;
            case "avMinimum":((IAwakened)p).AwakeningMinimum();break;
            case "avSuggested":((IAwakened)p).SetSuggestedAwakenedValues(p);break;
            case "avRandom":
                var minimum=(PB7)p.Clone();minimum.AwakeningMinimum();var min=new byte[6];minimum.AwakeningGetVisual(min);
                Check(actual.Awakening!.Values.Select((v,n)=>v>=min[n]&&v<=200).All(v=>v),"Random AV source minimum / maximum");
                ((IAwakened)p).AwakeningSetVisual(actual.Awakening.Values.Select(v=>(byte)v).ToArray());break;
            case "avToggle":var a=(IAwakened)p;a.SetAV(index,a.GetAV(index)==200?(byte)0:(byte)200);break;
            case "avZero":((IAwakened)p).SetAV(index,0);break;
            case "gvSuggested":((IGanbaru)p).SetSuggestedGanbaruValues(p);break;
            case "gvMax":var g=(IGanbaru)p;for(int n=0;n<6;n++)g.SetGV(n,g.GetMax(p,n));break;
            case "gvClear":((IGanbaru)p).ClearGanbaruValues();break;
            case "gvToggle":var gt=(IGanbaru)p;byte max=gt.GetMax(p,index);gt.SetGV(index,gt.GetGV(index)==max?(byte)0:max);break;
            case "gvZero":((IGanbaru)p).SetGV(index,0);break;
            case "dynamaxToggle":var d=(IDynamaxLevel)p;d.DynamaxLevel=d.DynamaxLevel==0?(byte)10:(byte)0;break;
            case "teraToggle":SetTera(p,p.SV?p.PersonalInfo.Type1==(byte)((ITeraType)p).TeraTypeOriginal?p.PersonalInfo.Type2:p.PersonalInfo.Type1:(int)TeraTypeUtil.GetTeraTypeImport(p.PersonalInfo.Type1,p.PersonalInfo.Type2));break;
            case "teraPrimary":SetTera(p,p.PersonalInfo.Type1);break;
            case "teraSecondary":SetTera(p,p.PersonalInfo.Type2);break;
            case "teraReset":var t=(ITeraType)p;t.TeraTypeOverride=p.SV?(MoveType)19:t.TeraTypeOriginal;break;
        }
    }
    private static void SetTera(PKM p,int value){var t=(ITeraType)p;t.TeraTypeOriginal=(MoveType)value;t.TeraTypeOverride=(MoveType)19;}
    private static void Derived(PKM expected,PKM before,bool party)
    {
        Span<ushort> a=stackalloc ushort[6],b=stackalloc ushort[6];before.LoadStats(before.PersonalInfo,a);expected.LoadStats(expected.PersonalInfo,b);
        if(party&&!a.SequenceEqual(b)){expected.ResetPartyStats();expected.Stat_HPCurrent=Math.Min(before.Stat_HPCurrent,expected.Stat_HPMax);expected.Status_Condition=before.Status_Condition;}
        if(expected is PB7)PokemonEditing.RefreshDerived(expected,before,true);expected.RefreshChecksum();
    }
    internal static void Run()
    {
        foreach(var candidate in Entities())foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true})
        {
            var p=Seed(candidate.Clone());byte[] input=StandalonePokemon.Serialize(p,party,encrypted),original=input.ToArray();string name="entity."+p.Extension;
            var before=StandalonePokemon.Open(input,name,encrypted,true).Entity;bool actualParty=input.Length==before.SIZE_PARTY;
            var read=StandalonePokemon.Inspect(input,name,encrypted,true).Pokemon.AdvancedStats!;
            if(read.Awakening is not null)Check(read.Awakening.Values.SequenceEqual(new[]{1,2,3,5,6,4})&&read.Awakening.Maximum==200,"AV visual order / max");
            if(read.Ganbaru is not null)Check(read.Ganbaru.Values.SequenceEqual(new[]{1,2,3,5,6,4})&&read.Ganbaru.LegalMaximum!.SequenceEqual(new[]{10,10,9,8,7,9}),"GV visual order and all IV bias thresholds");
            if(read.Tera is not null)Check(read.Tera.Choices.Select(c=>c.Id).ToHashSet().SetEquals(Enumerable.Range(0,18).Concat(new[]{19,99})),"Both source Tera catalogs / none and Stellar");
            foreach(var edit in Changes(before))
            {
                var output=Edit(input,before,edit,encrypted);var actual=StandalonePokemon.Inspect(output,name,useFileFormat:true).Pokemon.AdvancedStats!;
                var expected=before.Clone();Oracle(expected,edit,actual);Derived(expected,before,actualParty);
                Check(output.AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected,party,false)),"Every action / public file / complete serialized oracle and health/CP/padding preservation");
            }
            foreach(var bad in new PokemonAdvancedStatsEdit[]{new("invalid"),new("values"),new("values",Index:0,Alpha:true),new("avToggle",Index:-1),new("gvToggle",Index:6),new("dynamaxToggle",Index:0),new("avRandom",Awakening:new int[6]),new("values",Awakening:[201,0,0,0,0,0]),new("values",Ganbaru:[11,0,0,0,0,0]),new("values",DynamaxLevel:11),new("values",TeraOriginal:18),new("values",TeraOverride:255)})
            {byte[] snapshot=before.Data.ToArray();Reject(()=>Edit(input,before,bad,encrypted));Reject(()=>PokemonAdvancedStats.Apply(before,bad,actualParty));Check(before.Data.SequenceEqual(snapshot),"Invalid direct edit atomicity");}
            Check(input.AsSpan().SequenceEqual(original),"Immutable independent input");Console.WriteLine($"PASS advanced stats {p.GetType().Name}/party={party}/encrypted={encrypted}: source AV/GV/actions, dmax/flags, every Tera type, full public file and rejected parameters");
        }
        Exceptional();Saves();
    }
    private static void Exceptional()
    {
        var hidden=(PB7)Seed(new PB7{Version=GameVersion.GP});hidden.EV_HP=hidden.EV_ATK=hidden.EV_DEF=hidden.EV_SPA=hidden.EV_SPD=hidden.EV_SPE=255;hidden.RefreshChecksum();
        var hiddenBytes=StandalonePokemon.Serialize(hidden,true,false);var hiddenExpected=(PB7)hidden.Clone();hiddenExpected.Nickname="NEW";hiddenExpected.IsNicknamed=true;hiddenExpected.RefreshChecksum();
        var basic=new PokemonEdit(0,0,"NEW",hidden.CurrentLevel,hidden.CurrentFriendship,hidden.OriginalTrainerName,hidden.TID16,hidden.SID16,
            [hidden.IV_HP,hidden.IV_ATK,hidden.IV_DEF,hidden.IV_SPA,hidden.IV_SPD,hidden.IV_SPE],[255,255,255,255,255,255],hidden.Moves,[hidden.Move1_PP,hidden.Move2_PP,hidden.Move3_PP,hidden.Move4_PP]);
        var basicRequest=new StandalonePokemonRequest("entity.pb7",UseFileFormat:true,Edit:basic);
        var changed=PokeRNGKit.SaveEditor.Program.EditStandalonePokemon(hiddenBytes,JsonSerializer.Serialize(basicRequest,StandalonePokemonJson.Default.StandalonePokemonRequest));
        Check(changed.AsSpan().SequenceEqual(StandalonePokemon.Serialize(hiddenExpected,true,false)),"LGPE ordinary edit preserves hidden EV bytes above ordinary EV total/range");
        var suggestedAv=(PB7)Seed(new PB7{Version=GameVersion.GP});suggestedAv.IV_ATK=0;suggestedAv.IV_SPE=0;
        var minimumAv=(PB7)suggestedAv.Clone();minimumAv.AwakeningMinimum();
        PokemonAdvancedStats.Apply(suggestedAv,new("avSuggested"),false);
        Check(suggestedAv.AV_HP==200&&suggestedAv.AV_ATK==minimumAv.AV_ATK&&suggestedAv.AV_SPE==minimumAv.AV_SPE,"Suggested AV preserves minimum attack/speed for zero IVs");
        var suggestedGv=(PA8)Seed(new PA8{Version=GameVersion.PLA});suggestedGv.IV_ATK=0;suggestedGv.IV_SPE=0;
        PokemonAdvancedStats.Apply(suggestedGv,new("gvSuggested"),false);
        Check(suggestedGv.GV_ATK==0&&suggestedGv.GV_SPE==0,"Suggested GV keeps zero-IV attack/speed zero");
        PokemonAdvancedStats.Apply(suggestedGv,new("gvMax"),false);
        Check(suggestedGv.GV_ATK==10&&suggestedGv.GV_SPE==10,"GV maximum action remains distinct from suggestion");
        var gv=(PA8)Seed(new PA8{Version=GameVersion.PLA});PokemonAdvancedStats.Apply(gv,new("values",Ganbaru:[10,10,10,10,10,10]),true);
        Check(gv.GV_SPD==10&&PokemonAdvancedStats.Read(gv)!.Ganbaru!.LegalMaximum![4]==7,"GV above suggested maximum remains writable");
        var av=(PB7)Seed(new PB7{Version=GameVersion.GP});av.AV_HP=255;PokemonAdvancedStats.Apply(av,new("values",Awakening:[255,3,3,5,6,4]),false);Check(av.AV_HP==255&&av.AV_ATK==3,"Unedited abnormal AV preserved");
        var alpha=(PA9)Seed(new PA9{Version=GameVersion.ZA});alpha.Data[0x23]=2;var raw=alpha.Data.ToArray();PokemonAdvancedStats.Apply(alpha,new("values",Alpha:true),false);Check(alpha.Data.SequenceEqual(raw),"Unchanged noncanonical alpha byte preserved");
        var tera=(PK9)Seed(new PK9{Version=GameVersion.US});tera.TeraTypeOriginal=MoveType.Fire;PokemonAdvancedStats.Apply(tera,new("teraReset"),false);Check(tera.TeraTypeOverride==MoveType.Fire,"Transferred non-SV override reset uses original");
        foreach(PKM p in new PKM[]{new PK3(),new PK7()}){Check(PokemonAdvancedStats.Read(p)is null,"Unsupported metadata omitted");Reject(()=>PokemonAdvancedStats.Apply(p,new("values",Alpha:false),false));}
    }
    private static void Saves()
    {
        var saves=new List<SaveFile>{SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/GP.sav"))!,SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav"))!,new SAV8SWSH(SwshBlockFixtureTests.Create(GameVersion.SW,2)),new SAV8LA(LegendsPokedexTests.Fixture(0)),new SAV8LA(LegendsPokedexTests.Fixture(1)),new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL,2)),new SAV9ZA(ZaBlockFixtureTests.Create(2))};
        foreach(var seed in saves)foreach(int logicalBox in new[]{-1,0})
        {
            var seeded=seed.Clone();var p=Seed(seeded.BlankPKM);seeded.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);
            if(seeded is SAV7b){var header=new SAV7b(seeded.Write().ToArray());System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(header.Blocks.Storage.Data,0);seeded=new SAV7b(header.Data.ToArray());Check(seeded.PartyCount==1,"LGPE synthetic team pointer aliases occupied storage");}
            else seeded.PartyData=[p.Clone()];
            int box=seeded is SAV7b?0:logicalBox;byte[] original=seeded.Write().ToArray();
            foreach(var edit in Changes(PokemonEditing.Read(seeded,box,0)).Where(e=>e.Index is null && e.Action is "values" or "avSuggested" or "gvSuggested" or "teraPrimary" or "teraReset" or "dynamaxToggle").Where(e=>(e.TeraOriginal is null or 0 or 99)&&(e.TeraOverride is null or 0 or 99)))
            {
                var actual=seeded.Clone();var source=PokemonEditing.Read(actual,box,0);var expectedEntity=source.Clone();Oracle(expectedEntity,edit,PokemonAdvancedStats.Read(source)!);Derived(expectedEntity,source,box==-1);
                var expected=seeded.Clone();if(box==-1)expected.SetPartySlotAtIndex(expectedEntity,0,EntityImportSettings.None);else expected.SetBoxSlotAtIndex(expectedEntity,0,0,EntityImportSettings.None);
                PokemonRawEditing.Apply(actual,new(box,0,"advancedStats",AdvancedStats:edit));
                Check(actual.Write().Span.SequenceEqual(expected.Write().Span),"Typed save / sampled actions / complete file oracle / linked storage and unrelated slots");
                if(actual is SAV7b&&logicalBox==-1)Check(actual.GetPartySlotAtIndex(0).Data.SequenceEqual(expected.GetPartySlotAtIndex(0).Data),"LGPE linked team reads edited physical storage");
            }
            Check(seeded.Write().Span.SequenceEqual(original),"Immutable typed save source");Console.WriteLine($"PASS advanced stats typed {seeded.GetType().Name}/box={box}/teamAlias={seeded is SAV7b&&logicalBox==-1}: sampled complete save actions, storage and original preservation; synthetic fixtures are not owner acceptance");
        }
    }
}

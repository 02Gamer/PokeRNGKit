// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Buffers.Binary;
using PKHeX.Core.Searching;
using PokeRNGKit.SaveEditor;
internal static class PokemonEncounterDatabaseTests
{
    internal static void Run()
    {
        var groups=Enum.GetValues<EncounterTypeGroup>().Where(group=>group!=0).ToArray();
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"}) {
            byte[] input=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"),before=input.ToArray();var save=SaveService.OpenDatabaseSave(input.ToArray());var version=Enum.Parse<GameVersion>(fixture);
            var prepared=save.BlankPKM;prepared.Species=25;prepared.Version=save.Version;prepared.CurrentLevel=50;prepared.IV_HP=31;prepared.IV_ATK=7;prepared.Valid=true;byte[] editor=prepared.Data.ToArray();
            var db=new PokemonEncounterDatabase(save,prepared,options:new(FilterUnavailableSpecies:false));
            Check(db.GridRows==9 && db.Search(new()).Length==0 && db.Search(new(25,Types:[])).Length==0,"Source grid/empty search/no type defaults");
            foreach(var selection in new[]{groups}.Concat(groups.Select(group=>new[]{group}))) {
                var query=new PokemonEncounterDatabaseQuery(25,(int)version,Types:selection);
                var actual=db.Search(query);var settings=new SearchSettings{Context=save.Context,Generation=save.Generation,Version=version,Species=25};
                var oracle=save.BlankPKM;oracle.Species=25;oracle.Form=0;oracle.SetGender(oracle.GetSaneGender());EncounterMovesetGenerator.OptimizeCriteria(oracle,save);
                IEncounterInfo[] expected;
                try {
                    EncounterMovesetGenerator.PriorityList=selection;var templates=new List<IEncounterInfo>();
                    for(byte form=0;form<save.Personal.GetFormEntry(25,0).FormCount;form++) {
                        if(FormInfo.IsBattleOnlyForm(25,form,oracle.Format))continue;
                        oracle.Species=25;oracle.Form=form;oracle.SetGender(oracle.GetSaneGender());EncounterMovesetGenerator.OptimizeCriteria(oracle,save);
                        templates.AddRange(EncounterMovesetGenerator.GenerateEncounters(oracle,ReadOnlyMemory<ushort>.Empty,settings.GetVersions(save)));
                    }
                    expected=templates.Distinct<IEncounterInfo>(ReferenceEqualityComparer.Instance).ToArray();
                }
                finally {EncounterMovesetGenerator.ResetFilters();}
                Check(actual.Select(Signature).SequenceEqual(expected.Select(Signature)),"Every encounter type preserves complete Core result sequence");
                Check(EncounterMovesetGenerator.PriorityList.SequenceEqual(groups),"Consumed search resets global priority selection");
            }
            var all=db.Search(new(25,(int)version));
            var available=new PokemonEncounterDatabase(save,prepared);
            var presence=EntityPresenceFilters.GetFilterGeneric<IEncounterInfo>(save.Context);
            Check(available.Search(new(25,(int)version)).Select(Signature).SequenceEqual(all.Where(enc=>presence is null || presence(enc)).Select(Signature)),"Source unavailable-species setting");
            foreach(var moves in new ushort[][]{[85],[85,85],[85,98,86,104]}) {
                var settings=new SearchSettings{Context=save.Context,Generation=save.Generation,Species=25,Version=version};
                foreach(var move in moves)settings.AddMove(move);
                var expected=new List<IEncounterInfo>();var blank=save.BlankPKM;
                try {
                    EncounterMovesetGenerator.PriorityList=groups;
                    for(byte form=0;form<save.Personal.GetFormEntry(25,0).FormCount;form++) {
                        if(FormInfo.IsBattleOnlyForm(25,form,blank.Format))continue;
                        blank.Species=25;blank.Form=form;blank.SetGender(blank.GetSaneGender());EncounterMovesetGenerator.OptimizeCriteria(blank,save);
                        expected.AddRange(EncounterMovesetGenerator.GenerateEncounters(blank,settings.Moves.ToArray(),settings.GetVersions(save)));
                    }
                }finally{EncounterMovesetGenerator.ResetFilters();}
                Check(db.Search(new(25,(int)version,Moves:moves)).Select(Signature).SequenceEqual(expected.Distinct<IEncounterInfo>(ReferenceEqualityComparer.Instance).Select(Signature)),"Move restrictions and duplicate removal match full Core sequence");
            }
            Check(db.Search(new(25,(int)version,Instructions:"=Species=25\n\n")).Select(Signature).SequenceEqual(all.Select(Signature)),"Source ignores instructions containing an empty line");
            var custom=EncounterCriteria.Unrestricted with{Gender=Gender.Female,Ability=AbilityPermission.OnlyHidden,Nature=Nature.Adamant,Shiny=Shiny.Always,IV_HP=3,IV_ATK=4,IV_DEF=5,IV_SPA=6,IV_SPD=7,IV_SPE=8,LevelMin=5,LevelMax=40,HiddenPowerType=2,Form=0,Mutations=EncounterMutation.CanAbilityCapsule};
            foreach(bool any in new[]{false,true}) {
                var criteriaDb=new PokemonEncounterDatabase(save,prepared,custom,options:new(UseTabsAsCriteriaAnySpecies:any));
                foreach(var encounter in all) {
                    bool chain=EvolutionTree.GetEvolutionTree(prepared.Context).IsSpeciesDerivedFrom(prepared.Species,prepared.Form,encounter.Species,encounter.Form);
                    var expected=custom;
                    if(!any&&!chain)expected=EncounterCriteria.Unrestricted;
                    else {
                        if(!chain||EntityGender.IsSingleGender(encounter.Species))expected=expected with{Gender=Gender.Random};
                        if(!expected.Mutations.CanGetAbility(encounter.Ability,expected.Ability))expected=expected with{Ability=AbilityPermission.Any12H};
                    }
                    Check(criteriaDb.CriteriaFor(encounter)==expected,"All custom criteria fields survive exact source chain/gender/ability rules");
                }
            }
            foreach(bool egg in new[]{false,true})Check(db.Search(new(25,(int)version,Egg:egg)).Select(Signature).SequenceEqual(all.Where(e=>e.IsEgg==egg).Select(Signature)),"Source egg filter");
            foreach(bool shiny in new[]{false,true})Check(db.Search(new(25,(int)version,Shiny:shiny)).Select(Signature).SequenceEqual(all.Where(e=>e.IsShiny==shiny).Select(Signature)),"Source fixed-shiny filter");
            Check(db.Search(new(25,(int)version,Instructions:"=Species=25")).Select(Signature).SequenceEqual(all.Where(encounter=>encounter.Species==25).Select(Signature)),"Readonly template property instructions include evolution-chain filtering");
            var built=PokemonEncounterDatabase.BuildCriteria(prepared);Check(built.IV_ATK==7 && built.IV_HP==(prepared.Context.IsHyperTrainingAvailable(100)?-1:31),"Source Showdown criteria and hypertraining IV revision");
            var unrestricted=new PokemonEncounterDatabase(save,prepared,options:new(UseTabsAsCriteria:false));
            if(all.Length!=0)Check(unrestricted.CriteriaFor(all[0])==EncounterCriteria.Unrestricted,"Disabled tabs preserve unrestricted source criteria");
            all=db.Search(new(25,(int)version));int candidate=Array.FindIndex(all,e=>e.Species==25 && !e.IsEgg && e.Generation>=3);
            if(all.Length!=0) {
                var trainer=new MutableTrainerInfo(version){OT="REF",TID16=123,SID16=456,Language=(int)LanguageID.English};
                var trained=new PokemonEncounterDatabase(save,prepared,training:[trainer]);trainer.OT="CHANGED";
                var chosen=trained.TrainerFor(all.First(enc=>enc.Version==version || enc.Version.Contains(version)));
                Check(chosen.OT=="REF"&&chosen.TID16==123&&chosen.SID16==456,"Trainer database selects an immutable registered copy by source version/group");
                Check(db.TrainerFor(all[0]).OT==save.OT,"Missing trainer falls back to current save");
            }
            if(candidate>=0) {var generated=db.Generate(candidate);Check(generated.GetType()==save.PKMType && generated.Species==25 && generated.ChecksumValid,"Source converter generates current-format prepared entity");}
            var session=new PokemonEncounterSession(input,prepared,options:new(FilterUnavailableSpecies:false));
            var sessionRows=session.Search(input,new(25,(int)version));
            int chosenId=Array.FindIndex(sessionRows,e=>e.Species==25&&!e.IsEgg&&e.Generation>=3);
            if(chosenId>=0) {
                var ticket=session.Prepare(input,chosenId);var file=session.Commit(input,ticket.Confirmation);
                Check(Br4Editing.Hash(Convert.FromBase64String(file.Data))==ticket.Confirmation.OutputHash,"Confirmation consumes exact frozen generated bytes");
                Reject(()=>session.Commit(input,ticket.Confirmation));
                ticket=session.Prepare(input,chosenId);session.Discard("wrong-token");session.Commit(input,ticket.Confirmation);
                ticket=session.Prepare(input,chosenId);session.Discard(ticket.Confirmation.Token);Reject(()=>session.Commit(input,ticket.Confirmation));
                ticket=session.Prepare(input,chosenId);var changed=input.ToArray();changed[^1]^=1;Reject(()=>session.Commit(changed,ticket.Confirmation));Reject(()=>session.Commit(input,ticket.Confirmation));
                ticket=session.Prepare(input,chosenId);Reject(()=>session.Prepare(input,-1));Reject(()=>session.Commit(input,ticket.Confirmation));
                ticket=session.Prepare(input,chosenId);session.Search(input,new(25,(int)version));Reject(()=>session.Commit(input,ticket.Confirmation));
            }
            Reject(()=>db.Search(new(25,Version:255)));Reject(()=>db.Search(new(25,Moves:new ushort[5])));Reject(()=>db.Search(new(25,Types:[groups[0],groups[0]])));Reject(()=>db.Generate(-1));
            Check(input.SequenceEqual(before)&&prepared.Data.SequenceEqual(editor),"Encounter search/generation/rejection leave source buffers unchanged");
            Console.WriteLine($"PASS encounter database {fixture}: all type groups/Core sequence, source egg/shiny/instructions/criteria, current-format generation and input preservation");
        }
        foreach(var save in new SaveFile[]{new SAV1(),new SAV1(LanguageID.English,GameVersion.YW),new SAV2(),new SAV3Colosseum(new byte[ColoCrypto.SAVE_SIZE],false),CreateXD(),CreateRSBox(),new SAV4BR(),new SAV8SWSH(),new SAV8LA(),new SAV9SV(),new SAV9ZA()}) {
            byte[] before=save.Data.ToArray();var p=save.BlankPKM;p.Species=25;p.CurrentLevel=50;
            var db=new PokemonEncounterDatabase(save,p,options:new(FilterUnavailableSpecies:false));
            var actual=db.Search(new(25));var settings=new SearchSettings{Context=save.Context,Generation=save.Generation,Species=25};
            var oracle=save.BlankPKM;var expected=new List<IEncounterInfo>();
            try {
                EncounterMovesetGenerator.PriorityList=groups;
                for(byte form=0;form<save.Personal.GetFormEntry(25,0).FormCount;form++) {
                    if(FormInfo.IsBattleOnlyForm(25,form,oracle.Format))continue;
                    oracle.Species=25;oracle.Form=form;oracle.SetGender(oracle.GetSaneGender());EncounterMovesetGenerator.OptimizeCriteria(oracle,save);
                    expected.AddRange(EncounterMovesetGenerator.GenerateEncounters(oracle,ReadOnlyMemory<ushort>.Empty,settings.GetVersions(save)));
                }
            }finally{EncounterMovesetGenerator.ResetFilters();}
            Check(actual.Select(Signature).SequenceEqual(expected.Distinct<IEncounterInfo>(ReferenceEqualityComparer.Instance).Select(Signature)),"Every additional current-save context keeps source version range and full form sequence");
            Check(save.Data.SequenceEqual(before),"Additional context search keeps original buffer");
            Console.WriteLine($"PASS encounter context {save.GetType().Name}/{save.Version}: full source version range/forms and input preservation");
        }
    }
    private static SAV3XD CreateXD()
    {
        byte[] raw=new byte[XDCrypto.SAVE_SIZE];var slot=XDCrypto.GetSlot(raw,0).Span;
        int[] offsets=[0,0xCC30,0x10D60,0,0x1C9C0,0xF5D0,0,0x1CAA0];
        for(int i=0;i<offsets.Length;i++){BinaryPrimitives.WriteUInt16BigEndian(slot[(0x40+i*4)..],(ushort)offsets[i]);BinaryPrimitives.WriteUInt16BigEndian(slot[(0x42+i*4)..],(ushort)(offsets[i]>>16));}
        BinaryPrimitives.WriteUInt16BigEndian(slot[0x2A..],4);XDCrypto.EncryptSlot(slot);
        return new SAV3XD(raw);
    }
    private static SAV3RSBox CreateRSBox()
    {
        byte[] raw=new byte[SaveUtil.SIZE_G3BOX];
        for(int i=0;i<46;i++)BinaryPrimitives.WriteUInt32BigEndian(raw.AsSpan((i+1)*0x2000+4),(uint)(i%23));
        return new SAV3RSBox(raw);
    }
    private static string Signature(IEncounterInfo encounter)=>$"{encounter.GetType().Name}:{encounter.Species}:{encounter.Form}:{encounter.Generation}:{encounter.Version}:{encounter.LevelMin}:{encounter.LevelMax}:{encounter.Location}:{encounter.EggLocation}:{encounter.IsEgg}:{encounter.IsShiny}:{encounter.Ability}";
    private static void Check(bool condition,string message){if(!condition)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid encounter input accepted");}
}

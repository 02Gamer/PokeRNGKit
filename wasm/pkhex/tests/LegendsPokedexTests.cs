// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class LegendsPokedexTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SAV8LA Open(byte[] bytes) => new(bytes.ToArray());
    internal static byte[] Fixture(int revision)
    {
        var seed = new SAV8LA { Version = GameVersion.PLA, OT = "TEST" };
        var u32 = PokedexConstants8a.ResearchTasks.SelectMany(v => v).Where(t => t.Task == PokedexResearchTaskType8a.PartOfArceus && t.Hash_08 != 0xCBF29CE484222645).Select(t => (uint)t.Hash_08).ToHashSet();
        u32.UnionWith([SaveBlockAccessor8LA.KExpeditionTeamRank, SaveBlockAccessor8LA.KMoney, SaveBlockAccessor8LA.KGameLanguage]);
        var blocks = seed.AllBlocks.Where(b => revision == 1 || b.Key != 0x8184EFB4).Select(b => {
            var type = b.Data.Length == 0 ? SCTypeCode.Bool1 : SCTypeCode.Object;
            if (u32.Contains(b.Key)) type = SCTypeCode.UInt32;
            if (b.Key is SaveBlockAccessor8LA.KCurrentBox or SaveBlockAccessor8LA.KBoxesUnlocked) type = SCTypeCode.Byte;
            return SwshBlockFixtureTests.Typed(b.Key, b.Data.ToArray(), type);
        }).ToArray();
        var save = Open(SwishCrypto.Encrypt(blocks)); save.Language = 9;
        var raw = save.Blocks.GetBlock(LegendsPokedex.DexKey).Data;
        WriteUInt16LittleEndian(raw[6..], 1); WriteUInt16LittleEndian(raw[8..], 1);
        for (int i = 0; i < PokedexSave8a.MAX_SPECIES; i++) WriteUInt32LittleEndian(raw[(0x70 + i * 0x58 + 0x54)..], 0xABCDEF01);
        for (int i = 0; i < PokedexSaveData.STATISTICS_ENTRIES_MAX; i++)
        {
            int offset = 0x151A8 + i * 0x18; raw[offset + 7] = 0xA7;
            WriteUInt32LittleEndian(raw[offset..], 0xA0000000);
            WriteUInt32LittleEndian(raw[(offset + 12)..], 0x7FC12345); // hidden max-height NaN payload
        }
        return save.Write().ToArray();
    }
    public static void Run()
    {
        for (int revision = 0; revision < 2; revision++)
        {
            var input = Fixture(revision); var original = input.ToArray(); var save = Open(input); var d = save.Blocks.PokedexSave;
            Check(save.SaveRevision == revision && SwishCrypto.GetIsHashValid(input), "LA synthetic revision/hash");
            var catalog = LegendsPokedex.Read(save);
            Check(catalog.Entries.Length == 242 && catalog.Entries.Select(e => e.Number).SequenceEqual(Enumerable.Range(1, 242)), "LA complete Hisui species/order");
            Check(catalog.Entries.All(e => e.Advanced.Length == 30 && e.State.Forms.Length == e.Forms.Length && e.Forms.Length > 0 && e.Tasks.Length == e.State.Tasks.Length), "LA complete form, task and advanced catalogs");
            Check(catalog.Entries.All(e => e.Name.Zh.Length > 0 && e.Tasks.All(t => t.Name.Zh.Length > 0 && t.Name.En.Length > 0 && t.Name.Ja.Length > 0)), "LA task localization");
            foreach (var entry in catalog.Entries.Where(e => e.Forms.Length > 1 || e.State.Species is 25 or 399 or 493))
            {
                var current = Open(input); var state = entry.State;
                LegendsPokedex.Apply(current, new("entry", state));
                Check(current.Write().Span.SequenceEqual(input), "LA manual no-op keeps hidden size values, flags and padding");
                foreach (var form in state.Forms)
                {
                    bool[][] flags = [Enumerable.Range(0, 8).Select(i => i % 2 == 0).ToArray(), Enumerable.Range(0, 8).Select(i => i % 3 == 0).ToArray(), Enumerable.Range(0, 8).Select(i => i % 2 != 0).ToArray()];
                    var changed = state with { Forms = state.Forms.Select(f => f.Form == form.Form ? f with { Flags = flags, HasMax = true, Sizes = ["1.25", "2.5", "3.75", "7.5"] } : f).ToArray() };
                    var expected = Open(input); var dex = expected.Blocks.PokedexSave; ushort species = (ushort)state.Species;
                    dex.SetPokeSeenInWildFlags(species, (byte)form.Form, 0x55); dex.SetPokeObtainFlags(species, (byte)form.Form, 0x49); dex.SetPokeCaughtInWildFlags(species, (byte)form.Form, 0xAA); dex.SetPokeHasBeenUpdated(species);
                    dex.SetSizeStatistics(species, (byte)form.Form, true, 1.25f, 2.5f, 3.75f, 7.5f);
                    Compare(input, new("entry", changed), expected);
                }
            }
            var sample = catalog.Entries.Single(e => e.State.Species == 25);
            foreach (var entry in catalog.Entries.Where(e => e.Forms.Length > 1 || e.State.Species == 25))
            {
                foreach (var form in entry.Forms)
                {
                    var changed = entry.State with { Solitude = true, DisplayForm = form.Form, DisplayAlpha = true, DisplayShiny = true, DisplayFemale = entry.CanSelectGender };
                    var expected = Open(input); var dex = expected.Blocks.PokedexSave; ushort s = (ushort)changed.Species;
                    dex.SetSolitudeComplete(s,true);dex.SetSelectedGenderForm(s,(byte)form.Form,changed.DisplayFemale,true,true);dex.SetPokeHasBeenUpdated(s);
                    Compare(input,new("entry",changed),expected);
                }
            }
            for(int i=0;i<sample.Tasks.Length;i++)if(sample.Tasks[i].Editable)
            {
                var values=sample.State.Tasks.ToArray();values[i]=60000;var expected=Open(input);
                var task=PokedexConstants8a.ResearchTasks[sample.Number-1][i];expected.Blocks.PokedexSave.SetResearchTaskProgressByForce(25,task,60000);
                Compare(input,new("entry",sample.State with{Tasks=values}),expected);
            }
            var invalidSize=sample.State with{Forms=sample.State.Forms.Select(f=>f with{Sizes=["invalid",""," ","not a size"]}).ToArray()};
            Compare(input,new("entry",invalidSize),Open(input));
            var normalized=sample.State with{Forms=sample.State.Forms.Select(f=>f with{HasMax=true,Sizes=["-5","-10","3","2"]}).ToArray()};
            var normalizedExpected=Open(input);foreach(var f in sample.State.Forms)normalizedExpected.Blocks.PokedexSave.SetSizeStatistics(25,(byte)f.Form,true,-5,-10,3,2);
            Compare(input,new("entry",normalized),normalizedExpected);
            var abnormal=Open(input);var rawData=new PokedexSaveData(abnormal.Blocks.GetBlock(LegendsPokedex.DexKey).Raw);rawData.GetResearchEntry(25).NumObtained=ushort.MaxValue;
            var abnormalBytes=abnormal.Write().ToArray();var abnormalEntry=LegendsPokedex.Read(Open(abnormalBytes)).Entries.Single(e=>e.State.Species==25);
            Compare(abnormalBytes,new("advanced",Species:25,Counters:abnormalEntry.Advanced.Select(v=>v.Value).ToArray()),Open(abnormalBytes));
            Compare(abnormalBytes,new("entry",abnormalEntry.State),Open(abnormalBytes));
            for (int i = 0; i < 30; i++)
            {
                var values = sample.Advanced.Select(v => v.Value).ToArray(); values[i] = 60000;
                var current = Open(input); var snapshot = LegendsPokedex.Apply(current, new("advanced", Species:25, Counters:values));
                var bytes = current.Write().ToArray(); var after = Open(bytes); var reread = LegendsPokedex.Read(after).Entries.Single(e => e.State.Species == 25);
                Check(reread.Advanced.Select(v => v.Value).SequenceEqual(values) && snapshot == LegendsPokedex.Snapshot(after) && SwishCrypto.GetIsHashValid(bytes), "LA all thirty advanced counters and encrypted roundtrip");
                Check(reread.Research.Updated && !reread.Research.Complete, "LA progress edits do not report research automatically");
                var expected = Open(bytes); expected.Blocks.PokedexSave.UpdateSpecificReportPoke(25);
                Compare(bytes, new("report", Species:25), expected);
            }
            // Invalid requests are rejected before even valid earlier form/task fields are written.
            foreach (var bad in new[] {
                new Dex8aEdit("entry",sample.State with { Species=1 }),
                new("entry",sample.State with { Tasks=[] }),
                new("entry",sample.State with { DisplayForm=119 }),
                new("entry",sample.State with { Forms=[sample.State.Forms[0] with {Flags=[[],[],[]]}] }),
                new("advanced",Species:25,Counters:Enumerable.Repeat(60001,30).ToArray()),
                new("advanced",Species:25,Counters:[0]),new("report",Species:0),new("report",Species:25,Counters:[]),new("unknown",Species:25) }) Reject(input,bad);
            var readOnly = catalog.Entries.First(e => e.Tasks.Any(t => !t.Editable)); int taskIndex = Array.FindIndex(readOnly.Tasks,t=>!t.Editable);
            var taskValues = readOnly.State.Tasks.ToArray(); taskValues[taskIndex]++;
            Reject(input,new("entry",readOnly.State with{Tasks=taskValues}));
            var json=System.Text.Json.JsonSerializer.Serialize(new Dex8aEdit("entry",sample.State),SaveJsonContext.Default.Dex8aEdit);
            foreach(string property in new[]{"species","solitude","displayForm","displayFemale","displayShiny","displayAlpha"})
            {
                var node=System.Text.Json.Nodes.JsonNode.Parse(json)!;node["entry"]!.AsObject().Remove(property);
                try{System.Text.Json.JsonSerializer.Deserialize(node.ToJsonString(),SaveJsonContext.Default.Dex8aEdit);throw new Exception("Missing LA field accepted");}catch(System.Text.Json.JsonException){}
            }
            Check(input.SequenceEqual(original), "LA original input untouched");
            Console.WriteLine($"PASS LA synthetic revision {revision}: 242 species, forms, task labels, all 30 counters, reporting, exact export and invalid requests; real-save/product acceptance pending");
        }
    }
    private static void Compare(byte[] input,Dex8aEdit edit,SAV8LA expected)
    {
        var save=Open(input);var snapshot=LegendsPokedex.Apply(save,edit);var bytes=save.Write().ToArray();
        Check(bytes.SequenceEqual(expected.Write().ToArray()) && SwishCrypto.GetIsHashValid(bytes) && LegendsPokedex.Snapshot(Open(bytes))==snapshot,"LA complete output equals Core and reopens");
    }
    private static void Reject(byte[] input,Dex8aEdit edit)
    {
        var save=Open(input);try{LegendsPokedex.Apply(save,edit);throw new Exception("Invalid LA edit accepted");}catch(ArgumentException){Check(save.Write().Span.SequenceEqual(input),"LA rejection atomic");}
    }
}

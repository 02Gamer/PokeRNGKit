// SPDX-License-Identifier: GPL-3.0-or-later
using System.ComponentModel;
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

// Source/coverage inventory only. No setters, original changes, or product acceptance.
internal static class BlockAccessorAuditTests
{
    private static readonly HashSet<Type> RootTypes = [];
    private static void Root(Type type)
    {
        if (type.IsGenericParameter) return;
        if (type.HasElementType) { Root(type.GetElementType()!); return; }
        if (type.IsConstructedGenericType) { foreach (var argument in type.GetGenericArguments()) Root(argument); type = type.GetGenericTypeDefinition(); }
        if (type.Assembly == typeof(SaveFile).Assembly || typeof(TypeConverter).IsAssignableFrom(type)) RootTypes.Add(type);
        if (type.BaseType is { } parent) Root(parent);
    }
    private sealed record Field(string Path, string DeclaringType, string Type, bool ReadOnly, string Converter, bool FromString, bool Expandable, bool StandardValues, string[]? Choices, string? Value, string? Error, int[] ChangedOffsets);
    private sealed record Block(string Name, string Type, int Bytes, Field[] Fields);
    private sealed record Family(string Save, string Accessor, Block[] Blocks, bool GetterChangesData, int[] MetadataChanges);
    private static IEnumerable<SaveFile> Samples()
    {
        foreach (string file in new[] { "B", "B2", "X", "OR", "SN", "US", "GP" })
            yield return SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{file}.sav")) ?? throw new Exception($"Missing recognized accessor fixture: {file}");
        var demo = new SAV6AODemo { Version = GameVersion.OR, Language = 2, OT = "DEMO" };
        yield return new SAV6AODemo(demo.Write().ToArray());
    }
    private static ISaveBlockAccessor<BlockInfo> Accessor(SaveFile save) => save switch
    {
        SAV5BW s => s.Blocks, SAV5B2W2 s => s.Blocks, SAV6XY s => s.Blocks, SAV6AO s => s.Blocks,
        SAV6AODemo s => s.Blocks, SAV7SM s => s.Blocks, SAV7USUM s => s.Blocks, SAV7b s => s.Blocks,
        _ => throw new ArgumentException("Unsupported accessor audit fixture"),
    };
    private static Field[] Fields(object target, SaveFile save)
    {
        var rows = new List<Field>();
        var ancestors = new HashSet<object>(ReferenceEqualityComparer.Instance);
        void Visit(object instance, string prefix, int depth, PropertyDescriptorCollection? descriptors = null)
        {
            if (!ancestors.Add(instance)) return;
            Root(instance.GetType());
            foreach (PropertyDescriptor property in descriptors ?? TypeDescriptor.GetProperties(instance))
            {
                if (!property.IsBrowsable) continue;
                string path = prefix + property.Name;
                var converter = property.Converter;
                Root(property.ComponentType); Root(property.PropertyType); Root(converter.GetType());
                bool expandable = converter.GetPropertiesSupported(), standard = converter.GetStandardValuesSupported();
                string[]? choices = null;
                try { if (standard) choices = converter.GetStandardValues()?.Cast<object>().Select(v => converter.ConvertToString(null, CultureInfo.InvariantCulture, v) ?? "").ToArray(); }
                catch (Exception e) { choices = ["ERROR: " + e.GetType().Name]; }
                object? value = null;
                string? text = null, error = null;
                var before = save.Data.ToArray();
                try { value = property.GetValue(instance); text = converter.ConvertToString(null, CultureInfo.InvariantCulture, value); }
                catch (Exception e) { error = e.GetType().Name + ": " + e.Message; }
                if (value is not null) Root(value.GetType());
                var changed = Enumerable.Range(0, before.Length).Where(i => before[i] != save.Data[i]).ToArray();
                rows.Add(new(path, property.ComponentType.FullName ?? "", property.PropertyType.FullName ?? "", property.IsReadOnly, converter.GetType().FullName ?? "", converter.CanConvertFrom(typeof(string)), expandable, standard, choices, text, error, changed));
                bool itemObject = instance is Array && !property.PropertyType.IsPrimitive && !property.PropertyType.IsEnum && !converter.CanConvertFrom(typeof(string));
                if ((expandable || itemObject) && value is not null && depth < 8 && value is not string)
                    Visit(value, path + ".", depth + 1, expandable ? converter.GetProperties(value) : null);
            }
            ancestors.Remove(instance);
        }
        Visit(target, "", 0);
        return rows.ToArray();
    }
    internal static void Run()
    {
        RootTypes.Clear();
        var families = new List<Family>();
        foreach (var sample in Samples())
        {
            var sourceBytes = sample.Data.ToArray();
            var catalog = BlockAccessorReading.Read(sample, "engineering-audit");
            if (!sample.Data.SequenceEqual(sourceBytes)) throw new Exception("Product accessor catalog mutated original data");
            var save = sample.Clone();
            var before = save.Data.ToArray();
            var accessor = Accessor(save);
            Root(accessor.GetType());
            var metadata = new SaveBlockMetadata<BlockInfo>(accessor);
            var metadataChanges = Enumerable.Range(0, before.Length).Where(i => before[i] != save.Data[i]).ToArray();
            var names = metadata.GetSortedBlockList().ToArray();
            if (!catalog.Blocks.Select(b => b.Key).SequenceEqual(names)) throw new Exception("Product accessor names differ from source metadata");
            if (names.Length == 0 || names.Distinct().Count() != names.Length) throw new Exception("Empty/duplicate source accessor names");
            var blocks = names.Select(name => { var block = metadata.GetBlock(name); return new Block(name, block.GetType().FullName ?? "", block.Data.Length, Fields(block, save)); }).ToArray();
            bool changed = !save.Data.SequenceEqual(before);
            families.Add(new(save.GetType().Name, accessor.GetType().FullName ?? "", blocks, changed, metadataChanges));
            Console.WriteLine($"AUDIT {save.GetType().Name}: {blocks.Length} named objects / {blocks.Sum(b => b.Fields.Length)} visible properties / {blocks.Sum(b => b.Fields.Count(p => !p.ReadOnly))} writable / {blocks.Sum(b => b.Fields.Count(p => p.Error is not null))} getter/conversion errors / read changes={changed}");
            var heavy = save is SAV5 ? "EntreeForest" : save is SAV7 ? "Fashion" : names[0];
            var extra = BlockAccessorReading.Read(sample, "engineering-audit", heavy);
            if (!sample.Data.SequenceEqual(sourceBytes)) throw new Exception("Product nested catalog mutated original data");
            static IEnumerable<AccessorProperty> Flatten(IEnumerable<AccessorProperty> items) => items.SelectMany(p => new[] { p }.Concat(Flatten(p.Children)));
            var leaves = Flatten(extra.Properties).ToArray();
            if (sample is SAV5 && !leaves.Any(p => p.Path.Length == 3 && p.Path[0] == "Slots" && p.Path[1] == "[529]" && p.Path[2] == "Species")) throw new Exception("Accessor lost the final source forest slot property");
            if (sample is SAV7 && !leaves.Any(p => p.Path.Length == 3 && p.Path[0] == "Wardrobe" && p.Path[1] == "[1447]" && p.Path[2] == "IsOwned")) throw new Exception("Accessor lost the final source wardrobe property");
            Console.WriteLine($"READ {sample.GetType().Name}: exact source names, immutable original and complete selected {heavy} object / {leaves.Length} tree nodes; editing and trim pending.");
        }
        Directory.CreateDirectory(".tmp");
        File.WriteAllText(".tmp/pkhex-accessor-audit.json", JsonSerializer.Serialize(families, new JsonSerializerOptions { WriteIndented = true }));
        // Fashion's declared type is abstract and its converter is not expandable; preserve both actual genders.
        Root(typeof(Fashion6Male)); Root(typeof(Fashion6Female));
        // SCBlockMetadata/Compare reflect these accessors for physical block labels and constants.
        Root(typeof(SaveBlockAccessor8SWSH)); Root(typeof(SaveBlockAccessor8LA));
        Root(typeof(SaveBlockAccessor9SV)); Root(typeof(SaveBlockAccessor9ZA));
        foreach (var type in new[] { typeof(Fashion6Male), typeof(Fashion6Female) })
            foreach (PropertyDescriptor property in TypeDescriptor.GetProperties(type)) { Root(property.PropertyType); Root(property.Converter.GetType()); }
        if (Environment.GetEnvironmentVariable("PKHEX_ACCESSOR_GENERATE_ROOTS") == "1")
        {
            var assemblies = RootTypes.GroupBy(t => t.Assembly.GetName().Name!).OrderBy(g => g.Key, StringComparer.Ordinal);
            var root = new System.Xml.Linq.XElement("linker", assemblies.Select(g => new System.Xml.Linq.XElement("assembly", new System.Xml.Linq.XAttribute("fullname", g.Key), g.OrderBy(t => t.FullName, StringComparer.Ordinal).Select(t => new System.Xml.Linq.XElement("type", new System.Xml.Linq.XAttribute("fullname", t.FullName!.Replace('+', '/')), new System.Xml.Linq.XAttribute("preserve", "all"))))));
            new System.Xml.Linq.XDocument(new System.Xml.Linq.XComment("Generated SAV_Accessor runtime/converter roots plus four SCBlock accessor roots for reflected names and constants."), root).Save("wasm/pkhex/BlockAccessorRoots.xml");
            Console.WriteLine($"GENERATED accessor roots: {RootTypes.Count} types in {assemblies.Count()} assemblies; trimming equivalence still required.");
        }
        Console.WriteLine("Accessor source inventory: .tmp/pkhex-accessor-audit.json; not a product or real-save acceptance result.");
    }
}

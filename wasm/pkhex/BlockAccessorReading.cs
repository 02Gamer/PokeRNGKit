// SPDX-License-Identifier: GPL-3.0-or-later
using System.ComponentModel;
using System.Globalization;
using System.Text.Json.Nodes;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record AccessorBlock(string Key, string Type, int Bytes);
public sealed record AccessorProperty(string[] Path, string Type, string Kind, bool ReadOnly, bool CanConvertText, string? Value, string? Error, string[] Choices, AccessorProperty[] Children) { public string? StructuredJson { get; init; } }
public sealed record AccessorCatalog(string SourceHash, string Format, AccessorBlock[] Blocks, string Selected, AccessorProperty[] Properties) { public string Culture { get; init; } = "en-US"; }

internal static class BlockAccessorReading
{
    internal static bool Supports(SaveFile save) => save is SAV5BW or SAV5B2W2 or SAV6XY or SAV6AO or SAV6AODemo or SAV7SM or SAV7USUM or SAV7b;
    internal static ISaveBlockAccessor<BlockInfo> Accessor(SaveFile save) => save switch
    {
        SAV5BW s => s.Blocks, SAV5B2W2 s => s.Blocks, SAV6XY s => s.Blocks, SAV6AO s => s.Blocks,
        SAV6AODemo s => s.Blocks, SAV7SM s => s.Blocks, SAV7USUM s => s.Blocks, SAV7b s => s.Blocks,
        _ => throw new ArgumentException("Block accessor tools are unsupported for this save."),
    };
    internal static AccessorCatalog Read(SaveFile original, string hash, string? selected = null, string cultureName = "en-US")
    {
        if (!Supports(original)) throw new ArgumentException("Block accessor tools are unsupported for this save.");
        if (cultureName is not ("en-US" or "zh-CN" or "ja-JP")) throw new ArgumentException("Invalid block accessor culture.");
        var culture = CultureInfo.GetCultureInfo(cultureName);
        // Getters such as EntreeForest.Slots decrypt their backing data. Keep all browsing off the working save.
        var copy = original.Clone();
        var metadata = new SaveBlockMetadata<BlockInfo>(Accessor(copy));
        var names = metadata.GetSortedBlockList().ToArray();
        if (selected is null) selected = names.FirstOrDefault() ?? throw new ArgumentException("Block accessor has no named objects.");
        if (!names.Contains(selected)) throw new ArgumentException("Invalid block accessor selection.");
        var blocks = names.Select(key => { var block = metadata.GetBlock(key); return new AccessorBlock(key, block.GetType().FullName ?? "", block.Data.Length); }).ToArray();
        var value = metadata.GetBlock(selected);
        return new(hash, original.GetType().Name, blocks, selected, Properties(value, [], new HashSet<object>(ReferenceEqualityComparer.Instance), 0, culture)) { Culture = cultureName };
    }

    private static AccessorProperty[] Properties(object instance, string[] prefix, HashSet<object> ancestors, int depth, CultureInfo culture, PropertyDescriptorCollection? descriptors = null)
    {
        if (depth > 12 || !ancestors.Add(instance)) return [];
        var result = new List<AccessorProperty>();
        foreach (PropertyDescriptor property in descriptors ?? TypeDescriptor.GetProperties(instance))
        {
            if (!property.IsBrowsable) continue;
            var path = prefix.Append(property.Name).ToArray();
            var converter = property.Converter;
            var type = property.PropertyType;
            object? value = null;
            string? display = null, error = null;
            var children = Array.Empty<AccessorProperty>();
            var choices = Array.Empty<string>();
            bool fromText = converter.CanConvertFrom(typeof(string));
            string kind = type.IsArray ? "array" : type.IsEnum ? "enum" : type == typeof(bool) ? "boolean" : type == typeof(string) ? "text" : fromText ? "scalar" : "object";
            try
            {
                value = property.GetValue(instance);
                display = converter.ConvertToString(null, culture, value);
                if (converter.GetStandardValuesSupported())
                    choices = converter.GetStandardValues()?.Cast<object>().Select(v => converter.ConvertToString(null, culture, v) ?? "").ToArray() ?? [];
            }
            catch (Exception e) when (e is not OutOfMemoryException) { error = e.GetType().Name; }
            if (value is not null && value is not string && error is null)
            {
                bool expandable = converter.GetPropertiesSupported();
                // Array/collection editors expose item property grids even when the item converter is not expandable.
                bool itemObject = instance is Array && !type.IsPrimitive && !type.IsEnum && !fromText;
                if (expandable || itemObject)
                    children = Properties(value, path, ancestors, depth + 1, culture, expandable ? converter.GetProperties(value) : null);
            }
            string? structured = null;
            if (!fromText && !property.IsReadOnly && error is null)
            {
                try { structured = Structured(value, converter, culture, new HashSet<object>(ReferenceEqualityComparer.Instance), 0)?.ToJsonString() ?? "null"; }
                catch (Exception e) when (e is not OutOfMemoryException) { /* Individual paths remain available when a getter cannot be serialized. */ }
            }
            result.Add(new(path, type.FullName ?? type.Name, kind, property.IsReadOnly, fromText, display, error, choices, children) { StructuredJson = structured });
        }
        ancestors.Remove(instance);
        return result.ToArray();
    }

    private static JsonNode? Structured(object? value, TypeConverter converter, CultureInfo culture, HashSet<object> ancestors, int depth)
    {
        if (value is null) return null;
        if (depth > 12) throw new ArgumentException("Structured accessor value is too deeply nested.");
        // Converter text preserves UInt128 and non-finite floats exactly.
        if (converter.CanConvertFrom(typeof(string))) return JsonValue.Create(converter.ConvertToString(null, culture, value));
        if (!ancestors.Add(value)) throw new ArgumentException("Circular accessor object.");
        try
        {
            if (value is Array array)
                return new JsonArray(array.Cast<object?>().Select(item => Structured(item, TypeDescriptor.GetConverter(item?.GetType() ?? typeof(object)), culture, ancestors, depth + 1)).ToArray());
            var properties = converter.GetPropertiesSupported() ? converter.GetProperties(value) : TypeDescriptor.GetProperties(value);
            var result = new JsonObject();
            if (properties is null) return result;
            foreach (PropertyDescriptor property in properties)
                if (property.IsBrowsable && !property.IsReadOnly)
                    result[property.Name] = Structured(property.GetValue(value), property.Converter, culture, ancestors, depth + 1);
            return result;
        }
        finally { ancestors.Remove(value); }
    }
}

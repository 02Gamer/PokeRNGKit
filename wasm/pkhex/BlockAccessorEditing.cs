// SPDX-License-Identifier: GPL-3.0-or-later
using System.ComponentModel;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record AccessorChange([property: JsonRequired] string Block, [property: JsonRequired] string[] Path, [property: JsonRequired] string Value, string Kind = "text");
public sealed record AccessorRequest([property: JsonRequired] string SourceHash, [property: JsonRequired] AccessorChange[] Changes, string Culture = "en-US");

internal static class BlockAccessorEditing
{
    internal static byte[] Prepare(SaveFile source, byte[] original, AccessorRequest request)
    {
        if (!BlockAccessorReading.Supports(source) || !source.State.Exportable || !SaveChecksums.Valid(source)) throw new ArgumentException("Block accessor editing requires a supported valid save.");
        if (request.SourceHash != Br4Editing.Hash(original)) throw new ArgumentException("Block accessor preview is stale.");
        if (request.Culture is not ("en-US" or "zh-CN" or "ja-JP")) throw new ArgumentException("Invalid block accessor culture.");
        if (request.Changes is null || request.Changes.Length > 512) throw new ArgumentException("Invalid block accessor changes.");
        var copy = source.Clone();
        var metadata = new SaveBlockMetadata<BlockInfo>(BlockAccessorReading.Accessor(copy));
        var names = metadata.GetSortedBlockList().ToHashSet(StringComparer.Ordinal);
        var culture = CultureInfo.GetCultureInfo(request.Culture);
        foreach (var change in request.Changes)
        {
            if (change is null || !names.Contains(change.Block) || change.Path is null || change.Path.Length is < 1 or > 12 || change.Path.Any(p => p is null || p.Length is < 1 or > 256) || change.Value is null || change.Value.Length > 4 * 1024 * 1024 || change.Kind is not ("text" or "json"))
                throw new ArgumentException("Invalid block accessor property request.");
            try { SetPath(metadata.GetBlock(change.Block), change.Path, 0, change.Value, change.Kind, culture, null); }
            catch (Exception e) when (e is ArgumentException or FormatException or OverflowException or NotSupportedException or System.Reflection.TargetInvocationException or JsonException)
            { throw new ArgumentException("Invalid block accessor property value.", e); }
        }
        // SAV5.GetFinalData re-encrypts EntreeForest/Mystery after getter-based access.
        var output = copy.Write().ToArray();
        var reopened = SaveDetectionContext.OpenDerived(output);
        if (reopened is null || reopened.GetType() != copy.GetType() || output.Length != original.Length || !SaveChecksums.Valid(reopened))
            throw new InvalidOperationException("Block accessor export verification failed.");
        return output;
    }

    private static void SetPath(object instance, string[] path, int index, string text, string kind, CultureInfo culture, PropertyDescriptorCollection? descriptors)
    {
        var property = (descriptors ?? TypeDescriptor.GetProperties(instance))[path[index]];
        if (property is null || !property.IsBrowsable) throw new ArgumentException("Unknown block accessor property.");
        if (index == path.Length - 1)
        {
            if (property.IsReadOnly) throw new ArgumentException("Block accessor property is read-only.");
            object? next;
            if (kind == "text")
            {
                if (!property.Converter.CanConvertFrom(typeof(string))) throw new ArgumentException("Block accessor value needs a structured editor.");
                next = property.Converter.ConvertFromString(null, culture, text);
            }
            else
            {
                using var json = JsonDocument.Parse(text, new JsonDocumentOptions { MaxDepth = 16 });
                next = Structured(property.PropertyType, property.Converter, property.GetValue(instance), json.RootElement, culture, 0);
            }
            property.SetValue(instance, next);
            return;
        }
        var child = property.GetValue(instance) ?? throw new ArgumentException("Block accessor child is null.");
        bool expandable = property.Converter.GetPropertiesSupported();
        bool collectionItem = instance is Array && !property.PropertyType.IsPrimitive && !property.PropertyType.IsEnum && !property.Converter.CanConvertFrom(typeof(string));
        if (!expandable && !collectionItem) throw new ArgumentException("Block accessor property is not expandable.");
        SetPath(child, path, index + 1, text, kind, culture, expandable ? property.Converter.GetProperties(child) : null);
        // Array getters and detached class/value objects need propagation back to the saved block.
        // Read-only live objects (e.g. Roamer5 and EntreeSlot) already write through their Memory<byte>.
        if (!property.IsReadOnly) property.SetValue(instance, child);
        else if (child.GetType().IsValueType) throw new ArgumentException("Read-only block accessor value cannot be written back.");
    }

    private static object? Structured(Type type, TypeConverter converter, object? existing, JsonElement value, CultureInfo culture, int depth)
    {
        if (depth > 12) throw new ArgumentException("Block accessor value is too deeply nested.");
        if (value.ValueKind == JsonValueKind.Null)
        {
            if (type.IsValueType && Nullable.GetUnderlyingType(type) is null) throw new ArgumentException("Block accessor value cannot be null.");
            return null;
        }
        if (type.IsArray)
        {
            if (value.ValueKind != JsonValueKind.Array || value.GetArrayLength() > 8192) throw new ArgumentException("Invalid block accessor array.");
            var element = type.GetElementType()!;
            var old = existing as Array;
            var result = Array.CreateInstance(element, value.GetArrayLength());
            int index = 0;
            foreach (var item in value.EnumerateArray())
            {
                object? current = old is not null && index < old.Length ? old.GetValue(index) : null;
                result.SetValue(Structured(element, TypeDescriptor.GetConverter(element), current, item, culture, depth + 1), index++);
            }
            return result;
        }
        if (value.ValueKind is JsonValueKind.String or JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False)
        {
            string text = value.ValueKind == JsonValueKind.String ? value.GetString()! : value.GetRawText();
            if (!converter.CanConvertFrom(typeof(string))) throw new ArgumentException("Block accessor type has no text converter.");
            return converter.ConvertFromString(null, culture, text);
        }
        if (value.ValueKind != JsonValueKind.Object) throw new ArgumentException("Invalid block accessor object.");
        var target = existing ?? Default(type, depth + 1);
        var properties = converter.GetPropertiesSupported() ? converter.GetProperties(target) : TypeDescriptor.GetProperties(target);
        if (properties is null) throw new ArgumentException("Block accessor object has no properties.");
        foreach (var member in value.EnumerateObject())
        {
            var property = properties[member.Name];
            if (property is null || !property.IsBrowsable || property.IsReadOnly) throw new ArgumentException("Invalid block accessor object member.");
            var next = Structured(property.PropertyType, property.Converter, property.GetValue(target), member.Value, culture, depth + 1);
            property.SetValue(target, next);
        }
        return target;
    }

    private static object Default(Type type, int depth)
    {
        if (depth > 12) throw new ArgumentException("Block accessor constructor is too deeply nested.");
        if (type == typeof(string)) return "";
        if (type.IsArray) return Array.CreateInstance(type.GetElementType()!, 0);
        if (type.IsValueType) return Activator.CreateInstance(type)!;
        var constructor = type.GetConstructors().OrderBy(c => c.GetParameters().Length).FirstOrDefault() ?? throw new ArgumentException("Block accessor item has no public constructor.");
        return constructor.Invoke(constructor.GetParameters().Select(p => p.HasDefaultValue ? p.DefaultValue : Default(p.ParameterType, depth + 1)).ToArray());
    }
}

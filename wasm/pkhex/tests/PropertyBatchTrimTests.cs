// SPDX-License-Identifier: GPL-3.0-or-later
using System.Collections.Immutable;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using PKHeX.Core;

// Inspect metadata without executing a Mono browser assembly on CoreCLR.
internal static class PropertyBatchTrimTests
{
    public static void Run()
    {
        using var originalStream = File.OpenRead(typeof(PKM).Assembly.Location);
        using var trimmedStream = File.OpenRead("wasm/pkhex/obj/Release/net10.0/linked/PKHeX.Core.dll");
        using var originalPe = new PEReader(originalStream); using var trimmedPe = new PEReader(trimmedStream);
        var original = originalPe.GetMetadataReader(); var trimmed = trimmedPe.GetMetadataReader();
        var roots = System.Xml.Linq.XDocument.Load("wasm/pkhex/PropertyBatchRoots.xml").Descendants("type").Select(e => (string)e.Attribute("fullname")!);
        foreach (string name in roots)
        {
            var before = Properties(original, name); var after = Properties(trimmed, name);
            if (!before.SequenceEqual(after)) throw new Exception($"Trimmed property metadata or accessors differ: {name}\nBefore: {string.Join(';', before)}\nAfter: {string.Join(';', after)}");
            Console.WriteLine($"PASS trimmed metadata {name}: {before.Length} exact declared property signatures and getter/setter visibility/body presence");
        }
    }
    private static string[] Properties(MetadataReader reader, string typeName)
    {
        var decoder = new SignatureNames();
        var handle = reader.TypeDefinitions.Single(h => decoder.GetTypeFromDefinition(reader, h, 0) == typeName);
        return reader.GetTypeDefinition(handle).GetProperties().Select(h =>
        {
            var p = reader.GetPropertyDefinition(h); var signature = p.DecodeSignature(decoder, (object?)null); var a = p.GetAccessors();
            string Accessor(MethodDefinitionHandle method)
            {
                if (method.IsNil) return "none";
                var m = reader.GetMethodDefinition(method);
                return reader.GetString(m.Name) + ":" + ((m.Attributes & MethodAttributes.MemberAccessMask) == MethodAttributes.Public) + ":" + (m.RelativeVirtualAddress != 0);
            }
            return reader.GetString(p.Name) + ":" + signature.ReturnType + "(" + string.Join(',', signature.ParameterTypes) + ")|" + Accessor(a.Getter) + "|" + Accessor(a.Setter);
        }).Order(StringComparer.Ordinal).ToArray();
    }
    private sealed class SignatureNames : ISignatureTypeProvider<string, object?>
    {
        public string GetArrayType(string elementType, ArrayShape shape) => elementType + "[" + new string(',', shape.Rank - 1) + "]";
        public string GetByReferenceType(string elementType) => elementType + "&";
        public string GetFunctionPointerType(MethodSignature<string> signature) => signature.ReturnType + "(*)" + string.Join(',', signature.ParameterTypes);
        public string GetGenericInstantiation(string genericType, ImmutableArray<string> typeArguments) => genericType + "<" + string.Join(',', typeArguments) + ">";
        public string GetGenericMethodParameter(object? context, int index) => "!!" + index;
        public string GetGenericTypeParameter(object? context, int index) => "!" + index;
        public string GetModifiedType(string modifier, string unmodifiedType, bool isRequired) => unmodifiedType + (isRequired ? " modreq(" : " modopt(") + modifier + ")";
        public string GetPinnedType(string elementType) => elementType + " pinned";
        public string GetPointerType(string elementType) => elementType + "*";
        public string GetPrimitiveType(PrimitiveTypeCode typeCode) => typeCode.ToString();
        public string GetSZArrayType(string elementType) => elementType + "[]";
        public string GetTypeFromDefinition(MetadataReader reader, TypeDefinitionHandle handle, byte rawTypeKind)
        {
            var t = reader.GetTypeDefinition(handle); var parent = t.GetDeclaringType();
            return (parent.IsNil ? reader.GetString(t.Namespace) : GetTypeFromDefinition(reader, parent, 0)) + (parent.IsNil ? "." : "+") + reader.GetString(t.Name);
        }
        public string GetTypeFromReference(MetadataReader reader, TypeReferenceHandle handle, byte rawTypeKind)
        {
            var t = reader.GetTypeReference(handle);
            return (t.ResolutionScope.Kind == HandleKind.TypeReference ? GetTypeFromReference(reader, (TypeReferenceHandle)t.ResolutionScope, 0) + "+" : reader.GetString(t.Namespace) + ".") + reader.GetString(t.Name);
        }
        public string GetTypeFromSpecification(MetadataReader reader, object? context, TypeSpecificationHandle handle, byte rawTypeKind) => reader.GetTypeSpecification(handle).DecodeSignature(this, context);
    }
}

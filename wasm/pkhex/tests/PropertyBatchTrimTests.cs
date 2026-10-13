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
        var roots = System.Xml.Linq.XDocument.Load("wasm/pkhex/PropertyBatchRoots.xml").Descendants("type").Select(e => (string)e.Attribute("fullname")!)
            .Concat(System.Xml.Linq.XDocument.Load("wasm/pkhex/BlockAccessorRoots.xml").Descendants("assembly").Where(a => (string?)a.Attribute("fullname") == "PKHeX.Core").SelectMany(a => a.Elements("type")).Select(e => (string)e.Attribute("fullname")!)).Select(name => name.Replace('/', '+')).Distinct(StringComparer.Ordinal);
        var originalDecoder=new SignatureNames();
        var originalNames=original.TypeDefinitions.Select(h=>originalDecoder.GetTypeFromDefinition(original,h,0)).ToArray();
        var expanded=roots.SelectMany(name=>name.Contains('*')
            ?originalNames.Where(value=>System.Text.RegularExpressions.Regex.IsMatch(value,"^"+System.Text.RegularExpressions.Regex.Escape(name).Replace("\\*",".*")+"$"))
            :new[]{name}).Distinct(StringComparer.Ordinal).ToArray();
        foreach(var pattern in roots.Where(name=>name.Contains('*')))
            if(!originalNames.Any(value=>System.Text.RegularExpressions.Regex.IsMatch(value,"^"+System.Text.RegularExpressions.Regex.Escape(pattern).Replace("\\*",".*")+"$")))throw new Exception($"Trim root pattern matches no original type: {pattern}");
        foreach (string name in expanded)
        {
            var before = Properties(original, name); var after = Properties(trimmed, name);
            if (!before.SequenceEqual(after)) throw new Exception($"Trimmed property metadata or accessors differ: {name}\nBefore: {string.Join(';', before)}\nAfter: {string.Join(';', after)}");
            Console.WriteLine($"PASS trimmed metadata {name}: {before.Length} exact declared property signatures and getter/setter visibility/body presence");
        }
        foreach (var assembly in System.Xml.Linq.XDocument.Load("wasm/pkhex/BlockAccessorRoots.xml").Descendants("assembly"))
        {
            string name = (string)assembly.Attribute("fullname")!;
            var nativeAssembly = Assembly.Load(name);
            using var nativeStream = File.OpenRead(nativeAssembly.Location);
            using var linkedStream = File.OpenRead($"wasm/pkhex/obj/Release/net10.0/linked/{name}.dll");
            using var nativePe = new PEReader(nativeStream); using var linkedPe = new PEReader(linkedStream);
            var native = nativePe.GetMetadataReader(); var linked = linkedPe.GetMetadataReader();
            foreach (var type in assembly.Elements("type"))
            {
                string typeName = ((string)type.Attribute("fullname")!).Replace('/', '+');
                if (!Members(native, typeName).SequenceEqual(Members(linked, typeName)))
                    throw new Exception($"Accessor trim members/attributes differ: {name}/{typeName}");
                Console.WriteLine($"PASS accessor trim {name}/{typeName}: properties, constructors, fields, custom attributes and method signatures/body presence");
            }
        }
    }
    private static string[] Members(MetadataReader reader, string name)
    {
        var decoder = new SignatureNames();
        var handle = reader.TypeDefinitions.Single(h => decoder.GetTypeFromDefinition(reader, h, 0) == name);
        var type = reader.GetTypeDefinition(handle);
        string[] Attributes(CustomAttributeHandleCollection attributes) => attributes.Select(h =>
        {
            var attribute = reader.GetCustomAttribute(h);
            string owner = attribute.Constructor.Kind switch
            {
                HandleKind.MethodDefinition => decoder.GetTypeFromDefinition(reader, reader.GetMethodDefinition((MethodDefinitionHandle)attribute.Constructor).GetDeclaringType(), 0),
                HandleKind.MemberReference => Parent(reader.GetMemberReference((MemberReferenceHandle)attribute.Constructor).Parent),
                _ => attribute.Constructor.Kind.ToString(),
            };
            return owner + ":" + Convert.ToHexString(reader.GetBlobBytes(attribute.Value));
        }).Order(StringComparer.Ordinal).ToArray();
        string Parent(EntityHandle parent) => parent.Kind switch
        {
            HandleKind.TypeDefinition => decoder.GetTypeFromDefinition(reader, (TypeDefinitionHandle)parent, 0),
            HandleKind.TypeReference => decoder.GetTypeFromReference(reader, (TypeReferenceHandle)parent, 0),
            HandleKind.TypeSpecification => decoder.GetTypeFromSpecification(reader, null, (TypeSpecificationHandle)parent, 0),
            _ => parent.Kind.ToString(),
        };
        var result = Properties(reader, name).Select(p => "property:" + p).ToList();
        result.AddRange(Attributes(type.GetCustomAttributes()).Select(a => "type-attribute:" + a));
        foreach (var h in type.GetProperties()) { var p = reader.GetPropertyDefinition(h); result.AddRange(Attributes(p.GetCustomAttributes()).Select(a => "property-attribute:" + reader.GetString(p.Name) + ":" + a)); }
        foreach (var h in type.GetMethods())
        {
            var method = reader.GetMethodDefinition(h); var signature = method.DecodeSignature(decoder, (object?)null);
            result.Add("method:" + reader.GetString(method.Name) + ":" + method.Attributes + ":" + signature.ReturnType + "(" + string.Join(',', signature.ParameterTypes) + "):" + (method.RelativeVirtualAddress != 0));
        }
        foreach (var h in type.GetFields())
        {
            var field = reader.GetFieldDefinition(h); var constant = field.GetDefaultValue();
            result.Add("field:" + reader.GetString(field.Name) + ":" + field.Attributes + ":" + field.DecodeSignature(decoder, (object?)null) + ":" + (constant.IsNil ? "" : Convert.ToHexString(reader.GetBlobBytes(reader.GetConstant(constant).Value))));
        }
        return result.Order(StringComparer.Ordinal).ToArray();
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

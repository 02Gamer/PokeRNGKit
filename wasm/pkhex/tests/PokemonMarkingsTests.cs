// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonMarkingsTests
{
    internal static void Run()
    {
        foreach(var p in new PKM[]{new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()}) {
            p.Species=25;
            if(p is IAppliedMarkings7 c)c.MarkingValue=0xFC00;
            else ((IAppliedMarkings3)p).MarkingValue=0xF0;
            p.RefreshChecksum();
            var original=p.Data.ToArray();
            var info=PokemonMarkings.Read(p)??throw new Exception("Missing source markings");
            int count=((IAppliedMarkings)p).MarkingCount;
            if(info.Values.Length!=count||info.Shapes.Length!=count||info.Shapes[1]!=(p.Format==3?"square":"triangle"))throw new Exception("Source marking count/order mismatch");
            var values=Enumerable.Range(0,count).Select(i=>info.Colored?i%3:i%2).ToArray();
            var expected=p.Clone();
            for(int i=0;i<count;i++) {
                if(expected is IAppliedMarkings<MarkingColor> color)color.SetMarking(i,(MarkingColor)values[i]);
                else {
                    var plain=(IAppliedMarkings3)expected;
                    switch(info.Shapes[i]) {
                        case "circle":plain.MarkingCircle=values[i]!=0;break;
                        case "triangle":plain.MarkingTriangle=values[i]!=0;break;
                        case "square":plain.MarkingSquare=values[i]!=0;break;
                        case "heart":plain.MarkingHeart=values[i]!=0;break;
                        case "star":((IAppliedMarkings4)plain).MarkingStar=values[i]!=0;break;
                        case "diamond":((IAppliedMarkings4)plain).MarkingDiamond=values[i]!=0;break;
                    }
                }
            }
            expected.RefreshChecksum();
            var actual=p.Clone();
            PokemonRawEditing.Apply(actual,new(0,0,"markings",Markings:values),true);
            if(!actual.Data.SequenceEqual(expected.Data)||!p.Data.SequenceEqual(original))throw new Exception("Marking full-file/party/original parity failed");
            var invalid=values.ToArray();invalid[^1]=9;
            Reject(invalid);Reject(values[..^1]);
            if(info.Colored) {
                var reserved=p.Clone();
                var read=PokemonMarkings.Read(reserved)!;
                var next=read.Values.ToArray();next[0]=1;
                PokemonMarkings.Apply(reserved,next);
                if(((IAppliedMarkings<MarkingColor>)reserved).GetMarking(5)!=(MarkingColor)3)throw new Exception("Unedited reserved marking was changed");
                var zero=p.Clone();((IAppliedMarkings<MarkingColor>)zero).SetMarking(0,MarkingColor.None);
                var bad=PokemonMarkings.Read(zero)!.Values;bad[0]=3;
                try {PokemonMarkings.Apply(zero,bad);throw new Exception("Created a reserved marking");}catch(ArgumentException){}
            }
            Console.WriteLine($"PASS {p.GetType().Name} markings: source count/order and setters, full-file/party parity, reserved bits, atomic bounds and original");
            void Reject(int[] invalid) {
                var entity=p.Clone();var before=entity.Data.ToArray();
                try {PokemonRawEditing.Apply(entity,new(0,0,"markings",Markings:invalid),true);throw new Exception("Accepted invalid markings");}catch(ArgumentException){}
                if(!entity.Data.SequenceEqual(before))throw new Exception("Rejected markings mutated entity");
            }
        }
        if(PokemonMarkings.Read(new PK1()) is not null||PokemonMarkings.Read(new PK2()) is not null)throw new Exception("Unsupported format has marking controls");
    }
}

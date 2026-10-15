// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record PokemonMarkingsInfo(int[] Values,bool Colored,string[] Shapes);
internal static class PokemonMarkings
{
    private static int SourceIndex(PKM pk,int index)=>pk.Format==3?index switch {1=>2,2=>1,_=>index}:index;
    internal static PokemonMarkingsInfo? Read(PKM pk)
    {
        if(pk.Format<3||pk is not IAppliedMarkings markings)return null;
        int[] values=pk switch {
            IAppliedMarkings<bool> plain=>Enumerable.Range(0,markings.MarkingCount).Select(i=>plain.GetMarking(SourceIndex(pk,i))?1:0).ToArray(),
            IAppliedMarkings<MarkingColor> color=>Enumerable.Range(0,markings.MarkingCount).Select(i=>(int)color.GetMarking(i)).ToArray(),
            _=>[],
        };
        if(values.Length==0)return null;
        string[] shapes=pk.Format==3?["circle","square","triangle","heart"]:["circle","triangle","square","heart","star","diamond"];
        if(shapes.Length!=values.Length)throw new InvalidOperationException("Unexpected source marking count.");
        return new(values,pk is IAppliedMarkings<MarkingColor>,shapes);
    }
    internal static void Apply(PKM pk,int[] values)
    {
        var info=Read(pk)??throw new ArgumentException("Pokemon markings are unavailable.");
        if(values.Length!=info.Values.Length||values.Where((value,index)=>value<0||(value>(info.Colored?2:1)&&value!=info.Values[index])).Any())
            throw new ArgumentException("Invalid Pokemon marking values.");
        // Validate the whole request first. SetMarking preserves packed reserved bits.
        for(int i=0;i<values.Length;i++) {
            if(values[i]==info.Values[i])continue;
            if(pk is IAppliedMarkings<MarkingColor> color)color.SetMarking(i,(MarkingColor)values[i]);
            else ((IAppliedMarkings<bool>)pk).SetMarking(SourceIndex(pk,i),values[i]!=0);
        }
    }
}

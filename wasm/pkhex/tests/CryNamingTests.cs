// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
using PokeRNGKit.SaveEditor;
internal static class CryNamingTests
{
    internal static void Run()
    {
        foreach(var pk in new PKM[]{new PK3{Species=25,HeldItem=1},new PK3{Species=490,IsEgg=true},new XK3{Species=249}}) {
            var art=PokemonHover.GlowArtwork(pk);
            string expected=SaveSpriteView.BaseSprite(pk.Species,pk.Form,pk.Gender,pk is IFormArgument arg?arg.FormArgument:0,pk.Context,pk.IsShiny);
            if(art.Sprite!=expected||art.ItemOverlay is not null||art.BallOverlay is not null||art.AdditionalMarker is not null||art.SpecialEffects?.ShadowGlowSource is not null)throw new Exception("Hover glow contains decorated slot artwork");
            if((art.EggOverlay is not null)!=pk.IsEgg)throw new Exception("Hover glow egg hollow metadata lost");
        }
        foreach(var value in new PKM[]{new PK3{Species=25},new PK6{Species=25,Form=1},new PK7{Species=25,Form=8},new PK8{Species=892,Form=1},new PK9{Species=1024,Form=2},new PA9{Species=716}}) {
            string expected=value is {Species:892,Form:1}?"892-1":SpriteName.GetResourceStringSprite(value.Species,value.Form,0,0,value.Context).Replace('_','-')[1..];
            var names=PokemonHover.CryFileNames(value,value.Context);
            if(!names.SequenceEqual(new[]{expected+".wav",value.Species+".wav"}.Distinct(StringComparer.OrdinalIgnoreCase)))throw new Exception("Cry file selection differs from source CryPlayer");
            if(value is PK8 {Species:892}&&names[0]!="892-1.wav")throw new Exception("Urshifu source cry exception lost");
        }
        if(PokemonHover.CryFileNames(new PK3(),EntityContext.Gen3).Length!=0)throw new Exception("Empty slot has a cry");
        Console.WriteLine("PASS cry names: exact source sprite/form/context names, Urshifu exception, species fallback order, duplicate and empty handling");
    }
}

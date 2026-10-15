// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;

public sealed record PokemonArtwork(ushort Species,string Sprite,string? EggOverlay=null,bool EggAsItem=false,
    string? ItemOverlay=null,string? ShinyOverlay=null,SpriteSpecialEffects? SpecialEffects=null,
    string? BallOverlay=null,SpriteColorLayer? EncounterLayer=null,string? AdditionalMarker=null);
internal static class SaveArtwork
{
    internal static SpriteColorLayer? EncounterColor(IEncounterTemplate encounter,BrowserSpriteBackground mode,int thickness,byte background,byte stripe)
    {
        if(mode==BrowserSpriteBackground.None)return null;
        int rgb=unchecked(encounter.GetType().Name.GetHashCode()*0x43FD43FD);
        if((uint)thickness>56)thickness=56;
        return new($"#{(rgb&0xFFFFFF):X6}",(int)mode,thickness,mode==BrowserSpriteBackground.FullBackground?background:stripe);
    }
    internal static PokemonArtwork Entity(PKM pokemon) => new(pokemon.Species,SaveSpriteView.Sprite(pokemon),
        pokemon.IsEgg?SaveSpriteView.Egg(pokemon.Species):null,
        pokemon.IsEgg&&pokemon.SpriteItem==0&&SaveProgramSettingsRuntime.Current?.Sprite.ShowEggSpriteAsHeldItem==true,
        SaveSpriteView.Item(pokemon),SaveSpriteView.ShinyIcon(pokemon),SaveSpriteView.Special(pokemon));
    // SpriteUtil.Sprite(IEncounterTemplate) and GetMysteryGiftPreviewPoke.
    internal static PokemonArtwork Encounter(IEncounterTemplate encounter)
    {
        var settings=SaveProgramSettingsRuntime.Current?.Sprite;
        bool manaphy=encounter is MysteryGift {IsEgg:true,Species:490};
        byte gender=manaphy?(byte)2:encounter switch {
            MysteryGift gift=>Math.Max((byte)0,gift.Gender),
            IFixedGender {IsFixedGender:true} fixedGender=>Math.Max((byte)0,fixedGender.Gender),
            IPogoSlot pogo=>(byte)((int)pogo.Gender&1),_=> (byte)0,
        };
        int item=!manaphy&&encounter is MysteryGift giftItem?giftItem.HeldItem:0;
        bool shiny=!manaphy&&encounter.IsShiny;
        bool totem=FormInfo.IsTotemForm(encounter.Species,manaphy?(byte)0:encounter.Form,encounter.Context);
        bool giant=!manaphy&&encounter is IGigantamaxReadOnly {CanGigantamax:true};
        bool alpha=encounter is not MysteryGift&&encounter is IAlphaReadOnly {IsAlpha:true};
        string? marker=giant?"dyna":alpha?"alpha_alt":null;
        var special=totem||marker is not null?new SpriteSpecialEffects(totem,null,false,marker):null;
        string? ball=!manaphy&&settings?.ShowEncounterBall==true&&encounter.FixedBall!=Ball.None
            ?SpriteName.GetResourceStringBall((byte)encounter.FixedBall):null;
        SpriteColorLayer? color=null;
        if(encounter is not MysteryGift&&settings is not null&&settings.ShowEncounterColor!=BrowserSpriteBackground.None) {
            // Preserve the upstream process-local managed hash; do not replace
            // the encounter type with a different browser hash algorithm.
            color=EncounterColor(encounter,settings.ShowEncounterColor,settings.ShowEncounterThicknessStripe,settings.ShowEncounterOpacityBackground,settings.ShowEncounterOpacityStripe);
        }
        return new(encounter.Species,SaveSpriteView.BaseSprite(encounter.Species,manaphy?(byte)0:encounter.Form,gender,0,encounter.Context,shiny),
            encounter.IsEgg?SaveSpriteView.Egg(encounter.Species):null,encounter.IsEgg&&item==0&&settings?.ShowEggSpriteAsHeldItem==true,
            SaveSpriteView.Item(item,encounter.Context),shiny?"rare_icon_alt":null,special,ball,color,giant&&alpha?"alpha_alt":null);
    }
}

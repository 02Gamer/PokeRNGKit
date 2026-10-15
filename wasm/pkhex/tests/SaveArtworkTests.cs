// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class SaveArtworkTests
{
    internal static void Run()
    {
        foreach(var (preference,mode) in new[]{(BrowserSpritePreference.ForceArtwork,"a"),(BrowserSpritePreference.ForceMugshots,"c"),(BrowserSpritePreference.ForceSprites,"b")}) {
            var settings=SaveProgramSettingsCodec.Defaults();settings.Sprite.SpritePreference=preference;
            try {
                SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));SaveSpriteView.Configure("b");
                var encounter=new EncounterStatic8(GameVersion.SW){Species=25,Level=5,Location=1,FixedBall=Ball.Ultra,CanGigantamax=true};
                var view=SaveArtwork.Encounter(encounter);
                int color=unchecked(encounter.GetType().Name.GetHashCode()*0x43FD43FD);
                Check(view.Sprite.StartsWith(mode+"_25")&&view.BallOverlay=="_ball2"&&view.SpecialEffects is {Marker:"dyna"},"Encounter shares active mode, fixed ball and Gigantamax marker");
                Check(view.EncounterLayer is {Mode:2,Opacity:63}&&view.EncounterLayer.Color==$"#{color&0xFFFFFF:X6}","Encounter uses exact source managed hash and background settings");
                var egg=new EncounterStatic7(GameVersion.US){Species=20,Form=2,Level=1,EggLocation=1,FixedBall=Ball.Poke};
                view=SaveArtwork.Encounter(egg);
                Check(view.EggOverlay==(mode=="a"?"a_egg":"b_egg")&&view.EggAsItem&&view.SpecialEffects is {TotemGlow:true},"Encounter retains egg/base species and Totem glow");
                var gift=new WC8 {Species=25,HeldItem=328,Ball=2,PIDType=ShinyType8.AlwaysSquare,CanGigantamax=true,IsEgg=true};
                var before=gift.Data.ToArray();view=SaveArtwork.Encounter(gift);
                Check(view.Sprite.StartsWith(mode+"_25")&&view.ItemOverlay==(mode=="a"?"aitem_tm":"bitem_tm")&&view.ShinyOverlay=="rare_icon_alt"&&!view.EggAsItem&&view.EncounterLayer is null&&view.SpecialEffects is {Marker:"dyna"},"Mystery gift has source item/star/egg/Gmax and no encounter background");
                Check(before.SequenceEqual(gift.Data.ToArray()),"Gift picture does not change template bytes");
                gift.Species=490;view=SaveArtwork.Encounter(gift);
                Check(view.ItemOverlay is null&&view.BallOverlay is null&&view.ShinyOverlay is null&&view.SpecialEffects is null&&view.EggAsItem,"Manaphy egg ignores other template picture properties");
                var save=new SAV3E(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"));
                var p=new PK3 {Species=25,Version=GameVersion.E,Language=2,HeldItem=1};p.RefreshChecksum();save.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);
                var original=save.Write().ToArray();var report=PokemonReport.Read(save,new());
                Check(report.Rows.Where(row=>row.Artwork is not null).All(row=>row.Sprite==row.Artwork!.Sprite&&row.Sprite.StartsWith(mode+"_")),"Actual report rows retain current image mode and view");
                Check(report.Rows.Single(row=>row.Source=="box"&&row.Box==0&&row.Slot==0).Artwork is {Species:25,ItemOverlay:not null},"Report retains species for form fallback and held item layer");
                Check(original.SequenceEqual(save.Write().ToArray()),"Report pictures preserve save bytes");
                var frlg=FrlgSeed();frlg.ResetPersonal(GameVersion.LG);frlg.Version=GameVersion.FRLG;
                var deoxys=new PK3 {Species=386,Version=GameVersion.R,Language=2};deoxys.RefreshChecksum();frlg.SetBoxSlotAtIndex(deoxys,0,0,EntityImportSettings.None);
                var frlgRow=PokemonReport.Read(frlg,new()).Rows.Single(row=>row.Source=="box"&&row.Box==0&&row.Slot==0);
                Check(frlgRow.Artwork!.Sprite==mode+PKHeX.Drawing.PokeSprite.SpriteName.GetResourceStringSprite(386,2,deoxys.Gender,0,EntityContext.Gen3,deoxys.IsShiny),"Report uses original ambiguous LG personal table rather than reset clone");
                var publicReport=JsonSerializer.Deserialize(SaveService.ReadPokemonReport(original,"{}"),SaveJsonContext.Default.PokemonReportData)!;
                Check(publicReport.Rows.All(row=>row.Artwork is not null&&row.Artwork.Sprite.StartsWith(mode+"_")),"Public report JSON carries the shared picture view");
                SaveService.OpenPokemonEncounters(original,[],"{}");
                var publicEncounters=JsonSerializer.Deserialize(SaveService.ReadPokemonEncounters(original,JsonSerializer.Serialize(new PokemonEncounterReadRequest(new(25,(int)GameVersion.E)),PokemonEncounterJson.Default.PokemonEncounterReadRequest)),PokemonEncounterJson.Default.PokemonEncounterView)!;
                Check(publicEncounters.Rows.Length!=0&&publicEncounters.Rows.All(row=>row.Artwork is not null&&row.Artwork.EncounterLayer is not null&&row.Sprite==row.Artwork.Sprite),"Public encounter JSON carries mode and source background");
                // Gen3 has no built-in modern cards; explicitly show the full
                // source library instead of expecting the presence filter to do so.
                var publicGifts=JsonSerializer.Deserialize(SaveService.OpenMysteryGiftDatabase(original,"{\"options\":{\"filterUnavailableSpecies\":false}}"),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseView)!;
                Check(publicGifts.Rows.Length!=0&&publicGifts.Rows.All(row=>row.Artwork is not null&&row.Artwork.EncounterLayer is null&&row.Sprite==row.Artwork.Sprite),"Public gift JSON carries pictures without encounter background");
                settings.Sprite.ShowEncounterBall=false;settings.Sprite.ShowEncounterColor=BrowserSpriteBackground.TopStripe;settings.Sprite.ShowEncounterThicknessStripe=-1;settings.Sprite.ShowEncounterOpacityStripe=95;
                SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
                view=SaveArtwork.Encounter(encounter);
                Check(view.BallOverlay is null&&view.EncounterLayer is {Mode:3,Thickness:56,Opacity:95},"Source background controls and fixed-ball switch reach picture");
            }finally {SaveProgramSettingsRuntime.Reset();SaveSpriteView.Configure("b");}
        }
        Console.WriteLine("PASS shared report/encounter/gift artwork: all modes, source ball/hash/egg/item/star/markers, Manaphy exception and original bytes");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static SAV3FRLG FrlgSeed()
    {
        var data=new byte[SaveUtil.SIZE_G3RAW];
        for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++) {
            int offset=(bank*14+sector)*0x1000;
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(offset+0xFF4),sector);
            System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(data.AsSpan(offset+0xFF8),0x08012025);
        }
        data[0xAC]=1;data[6]=data[7]=255;return new(data);
    }
}

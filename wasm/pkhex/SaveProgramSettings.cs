// SPDX-License-Identifier: GPL-3.0-or-later
// Core settings use PKHeX types. Browser models mirror the public WinForms
// settings properties without importing Windows Forms or desktop file access.
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed class SaveProgramSettings
{
    public BrowserStartupSettings Startup {get;set;}=new();
    public BackupSettings Backup {get;set;}=new();
    public LocalResourceSettings LocalResources {get;set;}=new();
    public LegalitySettings Legality {get;set;}=new();
    public EntityConverterSettings Converter {get;set;}=new();
    public SetImportSettings Import {get;set;}=new();
    public SlotWriteSettings SlotWrite {get;set;}=new();
    public PrivacySettings Privacy {get;set;}=new();
    public SaveLanguageSettings SaveLanguage {get;set;}=new();
    public BrowserDisplaySettings Display {get;set;}=new();
    public BrowserSpriteSettings Sprite {get;set;}=new();
    public SoundSettings Sounds {get;set;}=new();
    public BrowserHoverSettings Hover {get;set;}=new();
    public BattleTemplateSettings BattleTemplate {get;set;}=new();
    public BrowserDrawSettings Draw {get;set;}=new();
    public AdvancedSettings Advanced {get;set;}=new();
    public EntityEditorSettings EntityEditor {get;set;}=new();
    public EntityDatabaseSettings EntityDb {get;set;}=new();
    public EncounterDatabaseSettings EncounterDb {get;set;}=new();
    public MysteryGiftDatabaseSettings MysteryDb {get;set;}=new();
    public ReportGridSettings Report {get;set;}=new();
    public BrowserSlotExportSettings SlotExport {get;set;}=new();
    internal SaveCoreSettings Core() => new(Legality,Converter,Import,SlotWrite,SaveLanguage);
}
internal sealed class BrowserStartupSettings
{
    public string Version {get;set;}="";
    public bool DarkMode {get;set;}
    public bool ForceHaXOnLaunch {get;set;}
    public bool HighDpiText {get;set;}
    public bool SkipSplashScreen {get;set;}
    public bool TryDetectRecentSave {get;set;}=true;
    public SaveFileLoadSetting AutoLoadSaveOnStartup {get;set;}=SaveFileLoadSetting.RecentBackup;
    public bool ShowChangelogOnUpdate {get;set;}=true;
    public bool PluginLoadEnable {get;set;}=true;
    public bool PluginLoadMerged {get;set;}
    public List<string> RecentlyLoaded {get;set;}=[];
    public uint RecentlyLoadedMaxCount {get;set=>field=Math.Clamp(value,1u,1000u);}=10;
    public string Language {get;set {
        if(GameLanguage.IsLanguageValid(value)) field=value;
        else if(value=="zh") field="zh-Hans";
        else if(value=="zh2") field="zh-Hant";
    }}="en";
    public GameVersion DefaultSaveVersion {get;set {if(value.IsValidSavedVersion())field=value;}}=Latest.Version;
}
internal sealed class BrowserDisplaySettings
{
    public bool Unicode {get;set;}=true;
    public bool IgnoreLegalPopup {get;set;}
    public bool ExportLegalityVerboseProperties {get;set;}
    public bool ExportLegalityAlwaysVerbose {get;set;}
    public bool ExportLegalityNeverClipboard {get;set;}
    public bool FlagIllegal {get;set;}=true;
    public int FocusBorderDeflate {get;set;}=1;
    public bool DisableScalingDpi {get;set;}
    public bool SlotLegalityAlwaysVisible {get;set;}
}
internal enum BrowserSpritePreference {UseSuggested,DoNotChange,ForceSprites,ForceMugshots,ForceArtwork}
internal enum BrowserSpriteBackground {None,BottomStripe,FullBackground,TopStripe}
internal sealed class BrowserSpriteSettings
{
    public BrowserSpritePreference SpritePreference {get;set;}
    public bool ShinySprites {get;set;}=true;
    public bool ShowEggSpriteAsHeldItem {get;set;}=true;
    public bool ShowEncounterBall {get;set;}=true;
    public BrowserSpriteBackground ShowEncounterColor {get;set;}=BrowserSpriteBackground.FullBackground;
    public BrowserSpriteBackground ShowEncounterColorPKM {get;set;}
    public byte ShowEncounterOpacityBackground {get;set;}=0x3F;
    public byte ShowEncounterOpacityStripe {get;set;}=0x5F;
    public int ShowEncounterThicknessStripe {get;set;}=4;
    public bool ShowExperiencePercent {get;set;}
    public BrowserSpriteBackground ShowTeraType {get;set;}=BrowserSpriteBackground.BottomStripe;
    public int ShowTeraThicknessStripe {get;set;}=4;
    public byte ShowTeraOpacityBackground {get;set;}=0xFF;
    public byte ShowTeraOpacityStripe {get;set;}=0xAF;
    public float FilterMismatchOpacity {get;set;}=0.4f;
    public float FilterMismatchGrayscale {get;set;}=0.7f;
}
internal sealed class BrowserHoverSettings
{
    public bool HoverSlotShowPreview {get;set;}=true;
    public bool HoverSlotShowEncounter {get;set;}=true;
    public bool HoverSlotShowEncounterVerbose {get;set;}
    public bool HoverSlotShowLegalityHint {get;set;}=true;
    public bool HoverSlotShowText {get;set;}=true;
    public bool HoverSlotPlayCry {get;set;}=true;
    public bool HoverSlotGlowEdges {get;set;}=true;
    public bool PreviewShowPaste {get;set;}=true;
    public BrowserPoint PreviewCursorShift {get;set;}=new(16,8);
}
internal sealed record BrowserPoint(int X,int Y);
internal sealed class BrowserDrawSettings
{
    public string InvalidSelection {get;set;}="#e9967a";
    public string MarkBlue {get;set;}="#00bfff";
    public string MarkPink {get;set;}="#ff75b3";
    public string ShinyUnicode {get;set;}="☆";
    public string ShinyDefault {get;set;}="*";
}
internal sealed class BrowserSlotExportSettings
{
    public BoxExportSettings BoxExport {get;set;}=new();
    public string DefaultBoxExportNamer {get;set;}="";
    public bool AllowBoxDataDrop {get;set;}
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveProgramSettings))]
internal partial class SaveProgramSettingsJson : JsonSerializerContext { }

// SPDX-License-Identifier: GPL-3.0-or-later
import type { SaveSettingsBundle } from "./settingsProtocol";
// Enable only settings with a verified runtime consumer; unknown paths stay pending.
export function unavailableProgramSettings(
  catalog: SaveSettingsBundle["catalog"],
  pending: string,
): Record<string, string> {
  const unavailable: Record<string, string> = {};
  const enabled = new Set([
    "advanced.saveExportCheckUnsavedEntity",
    "advanced.hideEvent8Contains",
    "advanced.pathBlockKeyList",
    "startup.forceHaXOnLaunch",
    "display.unicode",
    "startup.defaultSaveVersion",
    "localResources.templatePath",
    "entityEditor.showLegalBallsFirst",
    "entityEditor.hiddenPowerOnChangeMaxPower",
    "entityEditor.showGenderGen1",
    "entityEditor.showStatusCondition",
    "entityEditor.showExperienceBar",
    "hover.hoverSlotShowPreview",
    "hover.hoverSlotPlayCry",
    "hover.hoverSlotGlowEdges",
    "draw.markBlue",
    "draw.markPink",
    "draw.invalidSelection",
    "draw.shinyUnicode",
    "draw.shinyDefault",
    "sounds.playSoundSAVLoad",
    "sounds.playSoundLegalityCheck",
    "sounds.playSoundOther",
    "localResources.soundPath",
    "hover.hoverSlotShowText",
    "hover.hoverSlotShowEncounter",
    "hover.hoverSlotShowEncounterVerbose",
    "hover.hoverSlotShowLegalityHint",
    "hover.previewShowPaste",
    "hover.previewCursorShift.x",
    "hover.previewCursorShift.y",
    "backup.bakEnabled",
    "localResources.backupPath",
    "localResources.databasePath",
    "localResources.mgDatabasePath",
    "startup.autoLoadSaveOnStartup",
    "startup.recentlyLoadedMaxCount",
    "entityDb.searchBackups",
    "entityDb.searchExtraSaves",
    "entityDb.searchExtraSavesDeep",
    "backup.otherBackupPaths",
    "privacy.hideSecretDetails",
    "privacy.hideSAVDetails",
    "sprite.spritePreference",
    "sprite.shinySprites",
    "sprite.showEggSpriteAsHeldItem",
    "sprite.showTeraType",
    "sprite.showTeraThicknessStripe",
    "sprite.showTeraOpacityBackground",
    "sprite.showTeraOpacityStripe",
    "sprite.showExperiencePercent",
    "sprite.showEncounterBall",
    "sprite.showEncounterColor",
    "sprite.showEncounterColorPKM",
    "sprite.filterMismatchOpacity",
    "sprite.filterMismatchGrayscale",
    "display.flagIllegal",
    "display.slotLegalityAlwaysVisible",
    "display.ignoreLegalPopup",
    "display.exportLegalityVerboseProperties",
    "display.exportLegalityAlwaysVerbose",
    "display.exportLegalityNeverClipboard",
    "sprite.showEncounterThicknessStripe",
    "sprite.showEncounterOpacityBackground",
    "sprite.showEncounterOpacityStripe",
    "entityDb.initialSortMode",
    "entityDb.filterUnavailableSpecies",
    "entityDb.resultsGridRowCount",
    "report.extraProperties",
    "report.hiddenProperties",
    "slotExport.boxExport.scope",
    "slotExport.boxExport.folderCreation",
    "slotExport.boxExport.folderPrefix",
    "slotExport.boxExport.emptySlots",
    "slotExport.boxExport.fileIndexPrefix",
    "slotExport.boxExport.notify",
    "slotExport.defaultBoxExportNamer",
  ]);
  for (const field of catalog.groups.flatMap((group) => group.fields)) {
    if (
      !/^(legality|converter|import|slotWrite|saveLanguage|encounterDb|mysteryDb)\./.test(
        field.path,
      ) &&
      !/^battleTemplate\.(hover|export)\.(language|styleStatEVs|styleStatIVs|styleStatSPs|styleStatOther|styleMove|includeChampionsStatPoints|tokenOrder|tokenOrderCustom)$/.test(
        field.path,
      ) &&
      !enabled.has(field.path)
    )
      unavailable[field.path] = pending;
  }
  return unavailable;
}

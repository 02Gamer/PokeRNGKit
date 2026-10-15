// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { SaveEditorClient } from "./client";
import { SaveSettingsEditor } from "./SaveSettingsEditor";
import {
  readSaveSettings,
  replaceSaveSettings,
  type SaveSettingsSnapshot,
} from "./settingsRepository";
import type { SaveSettingsBundle } from "./settingsProtocol";
import { settingsWords } from "./settingsLabels";
import { useSaveClientBusy } from "./useSaveClientBusy";
import { getSaveRequestCount } from "./clientActivity";
import { hydrateDatabaseSettings } from "./programDatabaseSettings";
import { loadLegacyDatabaseOptions } from "./databaseSettings";
import { loadLegacyEncounterSettings } from "./encounterSettings";
import { loadLegacyMysterySettings } from "./mysteryGiftSettings";
import { saveLibraryWords } from "./saveLibrarySettings";
import { CryLibraryWorkspace } from "./CryLibraryWorkspace";
import { SaveSoundControl } from "./SaveSoundControl";

export function SaveSettingsWorkspace({
  lang,
  group = "legality",
}: {
  lang: "zh" | "en" | "ja";
  group?: string;
}) {
  const words = settingsWords[lang];
  const client = useRef<SaveEditorClient | undefined>(undefined);
  const busy = useSaveClientBusy();
  const [loaded, setLoaded] = useState<{
    bundle: SaveSettingsBundle;
    json: string;
    snapshot?: SaveSettingsSnapshot;
  }>();
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const instance = new SaveEditorClient();
    instance.setProgramSettings();
    client.current = instance;
    queueMicrotask(() => {
      if (!active) return;
      void (async () => {
        const result = await instance.run(
          new Uint8Array(),
          undefined,
          "programSettingsRead",
        );
        if (!result.programSettings)
          throw new Error("Missing settings catalog.");
        const snapshot = readSaveSettings();
        let json = snapshot
          ? (
              await instance.run(
                new Uint8Array(),
                snapshot.json,
                "programSettingsValidate",
              )
            ).programSettingsJson
          : result.programSettings.json;
        if (!json) throw new Error("Missing settings values.");
        if (!snapshot?.databaseSettingsUnified) {
          const hydrated = hydrateDatabaseSettings(json, {
            entity: loadLegacyDatabaseOptions(),
            encounter: loadLegacyEncounterSettings().options,
            mystery: loadLegacyMysterySettings(),
          });
          json = (
            await instance.run(
              new Uint8Array(),
              hydrated,
              "programSettingsValidate",
            )
          ).programSettingsJson;
          if (!json) throw new Error("Missing migrated settings.");
        }
        if (active)
          setLoaded({ bundle: result.programSettings, json, snapshot });
      })().catch(() => {
        if (active) setFailed(true);
      });
    });
    return () => {
      active = false;
      instance.dispose();
      if (client.current === instance) client.current = undefined;
    };
  }, [reload]);
  const reloadButton = (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setLoaded(undefined);
        setFailed(false);
        setReload((value) => value + 1);
      }}
    >
      {words.reload}
    </button>
  );
  if (failed)
    return (
      <>
        <p role="alert" className="save-editor-error">
          {words.loadError}
        </p>
        <div className="save-editor-toolbar">{reloadButton}</div>
      </>
    );
  if (!loaded) return <p role="status">{words.loading}</p>;
  // Keep the complete source directory visible, but never enable a saved option
  // until its actual browser behavior is bound. Remaining bindings stay in scope.
  const unavailable: Record<string, string> = {};
  const enabled = new Set([
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
  for (const field of loaded.bundle.catalog.groups.flatMap(
    (group) => group.fields,
  )) {
    if (
      !/^(legality|converter|import|slotWrite|saveLanguage|encounterDb|mysteryDb)\./.test(
        field.path,
      ) &&
      !/^battleTemplate\.(hover|export)\.(language|styleStatEVs|styleStatIVs|styleStatSPs|styleStatOther|styleMove|includeChampionsStatPoints|tokenOrder|tokenOrderCustom)$/.test(
        field.path,
      ) &&
      !enabled.has(field.path)
    )
      unavailable[field.path] = words.pending;
  }
  return (
    <>
      <div className="save-editor-toolbar">{reloadButton}</div>
      <p>{saveLibraryWords[lang].scope}</p>
      <SaveSettingsEditor
        initialGroup={group}
        bundle={loaded.bundle}
        json={loaded.json}
        lang={lang}
        busy={busy}
        unavailable={unavailable}
        onValidate={async (json) => {
          const result = await client.current!.run(
            new Uint8Array(),
            json,
            "programSettingsValidate",
          );
          if (!result.programSettingsJson)
            throw new Error("Missing validated settings.");
          return result.programSettingsJson;
        }}
        onSave={async (json) => {
          if (getSaveRequestCount())
            throw new Error("An edit is still running.");
          const verified = await client.current!.run(
            new Uint8Array(),
            json,
            "programSettingsValidate",
          );
          if (!verified.programSettingsJson)
            throw new Error("Missing validated settings.");
          if (getSaveRequestCount())
            throw new Error("An edit started while validating settings.");
          const snapshot = replaceSaveSettings(
            verified.programSettingsJson,
            loaded.snapshot?.revision,
            localStorage,
            true,
          );
          setLoaded((previous) =>
            previous
              ? { ...previous, json: snapshot.json, snapshot }
              : previous,
          );
        }}
      />
      <CryLibraryWorkspace lang={lang} busy={busy} />
      <SaveSoundControl lang={lang} busy={busy} />
    </>
  );
}

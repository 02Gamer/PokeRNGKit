import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import {
  boxArchiveWords,
  boxArchiveRequest,
  type BoxArchiveRequest,
} from "./boxArchive";
import { loadBoxExportDefaults } from "./programExportSettings";
import { readSaveSettings } from "./settingsRepository";
import { parseBoxExportOptions } from "./boxExportOptions";
import type { RememberBoxExport } from "./boxExportPreferences";
import { settingsFieldName, settingsEnumName } from "./settingsLabels";
import { useSaveClientBusy } from "./useSaveClientBusy";

export function BoxArchiveEditor({
  box,
  busy,
  onExport,
  onRemember,
}: {
  box: number;
  busy: boolean;
  onExport(request: BoxArchiveRequest, notify: 0 | 1): Promise<boolean>;
  onRemember: RememberBoxExport;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = boxArchiveWords[lang];
  const globalBusy = useSaveClientBusy();
  const [initial] = useState(() => ({
    snapshot: readSaveSettings(),
    options: loadBoxExportDefaults(),
  }));
  const defaults = initial.options;
  const saved = useRef({
    revision: initial.snapshot?.revision,
    options: defaults,
    namer: initial.snapshot
      ? (JSON.parse(initial.snapshot.json)?.slotExport?.defaultBoxExportNamer ??
        "Default")
      : "Default",
  });
  const opened = useRef(false),
    flight = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [all, setAll] = useState(box < 0 || defaults.scope === 0);
  const [folderMode, setFolderMode] = useState<number>(defaults.folderCreation);
  const [folderNaming, setFolderNaming] = useState<number>(
    defaults.folderPrefix,
  );
  const [indexPrefix, setIndexPrefix] = useState<number>(
    defaults.fileIndexPrefix,
  );
  const [include, setInclude] = useState(defaults.emptySlots === 1);
  const [downloaded, setDownloaded] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const [notify, setNotify] = useState<0 | 1>(defaults.notify);
  const [saving, setSaving] = useState(false),
    [failed, setFailed] = useState(false),
    [remembered, setRemembered] = useState(false);
  const locked = busy || saving || globalBusy;
  function options() {
    return parseBoxExportOptions({
      scope: box < 0 || all ? 0 : 1,
      folderCreation: folderMode,
      folderPrefix: folderNaming,
      fileIndexPrefix: indexPrefix,
      emptySlots: include ? 1 : 0,
      notify,
    });
  }
  async function remember() {
    if (flight.current) return;
    let current: ReturnType<typeof options>;
    try {
      current = options();
      if (
        JSON.stringify(current) === JSON.stringify(saved.current.options) &&
        saved.current.namer === "Default"
      ) {
        if (readSaveSettings()?.revision !== saved.current.revision) reload();
        return;
      }
    } catch {
      setFailed(true);
      return;
    }
    flight.current = true;
    setSaving(true);
    setFailed(false);
    setRemembered(false);
    try {
      const result = await onRemember({
        options: current,
        namer: "Default",
        expectedRevision: saved.current.revision,
      });
      saved.current = {
        revision: result.revision,
        options: current,
        namer: "Default",
      };
      if (alive.current) {
        setAll(current.scope === 0);
        setRemembered(true);
      }
    } catch {
      if (alive.current) setFailed(true);
    } finally {
      flight.current = false;
      if (alive.current) setSaving(false);
    }
  }
  function reload() {
    try {
      const snapshot = readSaveSettings(),
        next = loadBoxExportDefaults();
      saved.current = {
        revision: snapshot?.revision,
        options: next,
        namer: snapshot
          ? (JSON.parse(snapshot.json)?.slotExport?.defaultBoxExportNamer ??
            "Default")
          : "Default",
      };
      setAll(box < 0 || next.scope === 0);
      setFolderMode(next.folderCreation);
      setFolderNaming(next.folderPrefix);
      setIndexPrefix(next.fileIndexPrefix);
      setInclude(next.emptySlots === 1);
      setNotify(next.notify);
      setFailed(false);
      setRemembered(false);
      setDownloaded(false);
    } catch {
      setFailed(true);
    }
  }
  function syncSavedOptions() {
    if (flight.current || failed) return;
    try {
      if (
        readSaveSettings()?.revision !== saved.current.revision &&
        JSON.stringify(options()) === JSON.stringify(saved.current.options)
      )
        reload();
    } catch {
      setFailed(true);
    }
  }
  return (
    <>
      <details
        className="save-pokemon-editor save-box-archive"
        onToggle={(event) => {
          if (event.currentTarget.open) {
            syncSavedOptions();
            opened.current = true;
          } else if (opened.current) {
            opened.current = false;
            void remember();
          }
        }}
      >
        <summary
          aria-disabled={locked}
          onClick={(event) => {
            if (locked) event.preventDefault();
          }}
        >
          {words.title}
        </summary>
        <p className="save-editor-note">{words.note}</p>
        <p className="save-editor-note">{words.rememberNote}</p>
        <fieldset disabled={locked}>
          <div className="save-editor-fields">
            <label className="field">
              <span>{words.scope}</span>
              <Select
                disabled={locked}
                value={box < 0 || all ? 1 : 0}
                onChange={(e) => {
                  setAll(e.target.value === "1");
                  setDownloaded(false);
                  setRemembered(false);
                  setFailed(false);
                }}
              >
                {words.scopes.map((label, value) => (
                  <option
                    key={value}
                    value={value}
                    disabled={value === 0 && box < 0}
                  >
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{words.folders}</span>
              <Select
                disabled={locked}
                value={folderMode}
                onChange={(e) => {
                  setFolderMode(Number(e.target.value));
                  setDownloaded(false);
                  setRemembered(false);
                  setFailed(false);
                }}
              >
                {words.folderModes.map((label, value) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{words.naming}</span>
              <Select
                value={folderNaming}
                disabled={locked || folderMode === 0}
                onChange={(e) => {
                  setFolderNaming(Number(e.target.value));
                  setDownloaded(false);
                  setRemembered(false);
                  setFailed(false);
                }}
              >
                {words.names.map((label, value) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{words.prefix}</span>
              <Select
                disabled={locked}
                value={indexPrefix}
                onChange={(e) => {
                  setIndexPrefix(Number(e.target.value));
                  setDownloaded(false);
                  setRemembered(false);
                  setFailed(false);
                }}
              >
                {words.prefixes.map((label, value) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{settingsFieldName("Notify", lang)}</span>
              <Select
                disabled={locked}
                value={notify}
                onChange={(event) => {
                  setNotify(Number(event.target.value) as 0 | 1);
                  setDownloaded(false);
                  setRemembered(false);
                }}
              >
                {(["NotifyResult", "Silent"] as const).map((name, value) => (
                  <option key={name} value={value}>
                    {settingsEnumName("BoxExportNofify", name, lang)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{words.namer}</span>
              <Select value="Default" disabled={locked}>
                <option value="Default">Default</option>
              </Select>
            </label>
          </div>
          <label className="save-pokedex-check">
            <input
              type="checkbox"
              checked={include}
              onChange={(e) => {
                setInclude(e.target.checked);
                setDownloaded(false);
                setRemembered(false);
                setFailed(false);
              }}
            />{" "}
            {words.include}
          </label>
          {include && <p className="save-editor-note">{words.includeNote}</p>}
          <div className="save-editor-toolbar">
            <button
              type="button"
              onClick={async () => {
                setDownloaded(false);
                setExportFailed(false);
                try {
                  const selected = options();
                  setDownloaded(
                    await onExport(
                      boxArchiveRequest(box, selected),
                      selected.notify,
                    ),
                  );
                } catch {
                  setExportFailed(true);
                }
              }}
            >
              {words.download}
            </button>
          </div>
        </fieldset>
        {downloaded && notify === 0 && <p role="status">{words.downloaded}</p>}
      </details>
      {saving && <p role="status">{words.remembering}</p>}
      {exportFailed && <p role="alert">{words.error}</p>}
      {remembered && !saving && <p role="status">{words.remembered}</p>}
      {failed && (
        <div role="alert">
          <p>{words.rememberFailed}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked}
              onClick={() => void remember()}
            >
              {words.retryRemember}
            </button>
            <button type="button" disabled={locked} onClick={reload}>
              {words.reloadOptions}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

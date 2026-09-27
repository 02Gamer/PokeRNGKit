import { useEffect, useState } from "react";
import { Select } from "../shared/Select";
import {
  letsGoLabels,
  validateCapture7,
  type Capture7Catalog,
  type Capture7Edit,
} from "./letsGoPokedex";
export function LetsGoCaptureEditor({
  catalog,
  lang,
  disabled,
  onDirty,
  onApply,
  onError,
}: {
  catalog: Capture7Catalog;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  onDirty(dirty: boolean): void;
  onApply(edit: Capture7Edit): Promise<void>;
  onError(error: unknown): void;
}) {
  const labels = letsGoLabels[lang];
  const [species, setSpecies] = useState(1);
  const [pending, setPending] = useState<{
    catalog: Capture7Catalog;
    edit: Capture7Edit;
  }>();
  const draft = pending?.catalog === catalog ? pending.edit : undefined;
  const setDraft = (edit: Capture7Edit | undefined) =>
    setPending(edit ? { catalog, edit } : undefined);
  const entry = catalog.entries.find((e) => e.species === species)!;
  const original: Capture7Edit = {
    kind: "entry",
    species,
    captured: entry.captured,
    transferred: entry.transferred,
    totalCaptured: catalog.totalCaptured,
    totalTransferred: catalog.totalTransferred,
  };
  const state = draft ?? original;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(original);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const apply = (kind: Capture7Edit["kind"]) => {
    try {
      void onApply(validateCapture7({ ...state, kind }, catalog)).catch(
        onError,
      );
    } catch (e) {
      onError(e);
    }
  };
  const fields = [
    ["captured", labels.captured, 9999],
    ["transferred", labels.transferred, 999999999],
    ["totalCaptured", labels.totalCaptured, 999999999],
    ["totalTransferred", labels.totalTransferred, 999999999],
  ] as const;
  return (
    <details>
      <summary>{labels.capture}</summary>
      <fieldset disabled={disabled}>
        <label className="field">
          <span>{labels.choose}</span>
          <Select
            value={species}
            disabled={dirty}
            onChange={(e) => {
              setSpecies(Number(e.target.value));
              setDraft(undefined);
            }}
          >
            {catalog.entries.map((e) => (
              <option key={e.species} value={e.species}>
                {e.species} · {e.name[lang]}
              </option>
            ))}
          </Select>
        </label>
        <div className="save-editor-fields">
          {fields.map(([key, label, max]) => (
            <div key={key} className="field">
              <span>{label}</span>
              <input
                type="text"
                aria-label={label}
                inputMode="numeric"
                maxLength={10}
                value={state[key]}
                onChange={(e) => setDraft({ ...state, [key]: e.target.value })}
              />
              <button
                type="button"
                aria-label={label + " · " + labels.max}
                onClick={() =>
                  setDraft({
                    ...state,
                    [key]: Number(state[key]) === max ? "0" : String(max),
                  })
                }
              >
                {labels.max}
              </button>
            </div>
          ))}
        </div>
        <div className="save-editor-toolbar">
          <button
            type="button"
            className="primary"
            disabled={!dirty}
            onClick={() => apply("entry")}
          >
            {labels.apply}
          </button>
          <button type="button" onClick={() => apply("sum")}>
            {labels.sum}
          </button>
          <button type="button" onClick={() => apply("all")}>
            {labels.all}
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={() => setDraft(undefined)}
          >
            {labels.reset}
          </button>
        </div>
        <p className="save-editor-note">{labels.captureNote}</p>
      </fieldset>
    </details>
  );
}

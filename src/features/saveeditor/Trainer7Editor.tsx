import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import type { Br4Lang } from "./br4";
import {
  tr7Action,
  tr7Fashion,
  tr7Frozen,
  tr7Ids,
  tr7Patch,
  tr7Position,
  tr7Trash,
  type Tr7Catalog,
  type Tr7Edit,
  type Tr7Preview,
} from "./trainer7";
import { trainer7Words } from "./trainer7Words";
import { trainer6Words } from "./trainer6Words";
import { saveEditorResources } from "./locales";
import "./Trainer6Editor.css";
import "./Trainer7Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Tr7Catalog | undefined>;
  onPreview(edit: Tr7Edit): Promise<Tr7Preview | undefined>;
  onApply(edit: Tr7Edit): Promise<void>;
  onDirtyChange?(dirty: boolean): void;
};
export function Trainer7Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Tr7Catalog }>();
  const reader = useRef(props.onRead);
  useEffect(() => {
    reader.current = props.onRead;
  }, [props.onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((c) => {
      if (active && c) setLoaded({ revision: props.revision, c });
    });
    return () => {
      active = false;
    };
  }, [props.revision]);
  return (
    <section className="save-record-editor save-trainer7-editor">
      <h3>{trainer7Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <Form key={props.revision} {...props} c={loaded.c} />
      ) : (
        <button
          type="button"
          disabled={props.busy}
          onClick={() =>
            void props.onRead().then((c) => {
              if (c) setLoaded({ revision: props.revision, c });
            })
          }
        >
          {trainer7Words[props.lang].read}
        </button>
      )}
    </section>
  );
}
function Form({
  c,
  busy,
  lang,
  onPreview,
  onApply,
  onDirtyChange,
}: Props & { c: Tr7Catalog }) {
  const w = trainer7Words[lang],
    t = trainer6Words[lang];
  const [group, setGroup] = useState("finder"),
    [field, setField] = useState(""),
    [draft, setDraft] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Tr7Preview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [allowSkin, setAllowSkin] = useState(false),
    [text, setText] = useState(c.basics.name),
    [hex, setHex] = useState(c.nameTrash);
  const [species, setSpecies] = useState(25),
    [language, setLanguage] = useState(2),
    [generation, setGeneration] = useState("7");
  const [tid, setTid] = useState(String(c.ids.tid).padStart(6, "0")),
    [sid, setSid] = useState(String(c.ids.sid).padStart(4, "0"));
  const idsDirty =
    Number(tid || 0) !== c.ids.tid || Number(sid || 0) !== c.ids.sid;
  const dirty =
    !!Object.keys(draft).length ||
    text !== c.basics.name ||
    hex !== c.nameTrash ||
    idsDirty;
  const locked = busy || pending || !!preview,
    writable = c.canEdit && !locked;
  useEffect(() => {
    onDirtyChange?.(dirty || pending || !!preview);
  }, [dirty, pending, preview, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const groups = [
    "ids",
    "finder",
    "tree",
    "appearance",
    "style",
    "stamps",
    "flags",
    "other",
    "fly",
    "map",
    ...(c.fields.some((f) => f.group === "ultra") ? ["ultra"] : []),
    "position",
    "fashion",
    "trash",
  ];
  const rows = c.fields.filter((f) => f.group === group);
  const selectSingle = ["fly", "map", "stamps", "style"].includes(group);
  const selected = rows.find((f) => f.key === field) ?? rows[0];
  const visible = selectSingle ? (selected ? [selected] : []) : rows;
  const skinNamesJa = [
    "明るい肌・男性",
    "明るい肌・女性",
    "中間の肌・男性",
    "中間の肌・女性",
    "日焼けした肌・男性",
    "日焼けした肌・女性",
    "暗い肌・男性",
    "暗い肌・女性",
  ];
  const choiceName = (key: string, id: number, translated: string) =>
    key === "Skin" && lang === "ja" ? skinNamesJa[id] : translated;
  const fieldValue = (f: Tr7Catalog["fields"][number] | undefined) => {
    if (!f) return w.unknown;
    if (f.kind !== "choice") return f.value;
    const option = f.choices.find((v) => String(v.id) === f.value);
    return option
      ? choiceName(f.key, option.id, option.name[lang])
      : `${w.unknown} (${f.value})`;
  };
  const geography = (catalog: Tr7Catalog) => {
    const g = catalog.existing.geography;
    if (!g) return "";
    const value = g.value;
    return [
      g.countries.find((v) => v.id === value.country)?.name[lang] ??
        String(value.country),
      g.regions
        .find((v) => v.country === value.country)
        ?.choices.find((v) => v.id === value.region)?.name[lang] ??
        String(value.region),
      g.consoles.find((v) => v.id === value.consoleRegion)?.name[lang] ??
        String(value.consoleRegion),
    ].join(" / ");
  };
  async function start(build: () => Tr7Edit) {
    setError("");
    setPending(true);
    try {
      const p = await onPreview(build());
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function discard() {
    setDraft({});
    setText(c.basics.name);
    setHex(c.nameTrash);
    setTid(String(c.ids.tid).padStart(6, "0"));
    setSid(String(c.ids.sid).padStart(4, "0"));
    setPreview(undefined);
    setError("");
    setAllowSkin(false);
  }
  return (
    <div className="save-trainer6-body">
      <p>{w.note}</p>
      <label>
        <span>{w.group}</span>
        <Select
          value={group}
          disabled={locked || dirty}
          onChange={(e) => {
            setGroup(e.target.value);
            setField("");
          }}
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g === "ids"
                ? saveEditorResources[lang].tid
                : w[g as keyof typeof w]}
            </option>
          ))}
        </Select>
      </label>
      {selectSingle && (
        <label>
          <span>{w.field}</span>
          <Candidate
            value={selected?.key ?? ""}
            disabled={!writable}
            options={rows.map((f) => ({ value: f.key, label: f.name[lang] }))}
            onChange={setField}
          />
        </label>
      )}
      {group === "ids" ? (
        <>
          <fieldset className="save-trainer6-grid" disabled={!writable}>
            <label>
              <span>{saveEditorResources[lang].tid}</span>
              <input
                inputMode="numeric"
                maxLength={6}
                value={tid}
                onChange={(e) => setTid(e.target.value)}
              />
            </label>
            <label>
              <span>{saveEditorResources[lang].sid}</span>
              <input
                inputMode="numeric"
                maxLength={4}
                value={sid}
                onChange={(e) => setSid(e.target.value)}
              />
            </label>
          </fieldset>
          <p>
            TSV: {String(c.ids.tsv).padStart(4, "0")} · ID32: {c.ids.id32}
          </p>
        </>
      ) : group === "position" ? (
        <>
          <p className="save-trainer6-note">
            {c.position.canEdit ? t.positionNote : t.positionUnavailable}
          </p>
          <fieldset
            className="save-trainer6-grid"
            disabled={!writable || !c.position.canEdit}
          >
            {c.position.fields.map((f) => (
              <label key={f.key}>
                <span>
                  {
                    saveEditorResources[lang].trainerSpatialNames[
                      f.key as "map" | "x" | "z" | "y" | "rotation"
                    ]
                  }
                </span>
                <input
                  value={draft[f.key] ?? f.display}
                  maxLength={32767}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                />
                <small>
                  {f.min}–{f.max}
                </small>
              </label>
            ))}
          </fieldset>
        </>
      ) : group === "fashion" ? (
        <>
          <p>{w.fashionNote}</p>
          <div className="save-editor-toolbar">
            {(["base", "legal", "all"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={!writable || dirty}
                onClick={() => void start(() => tr7Fashion(c, mode))}
              >
                {mode === "base"
                  ? w.fashionBase
                  : mode === "legal"
                    ? w.fashionLegal
                    : w.fashionAll}
              </button>
            ))}
          </div>
        </>
      ) : group === "trash" ? (
        <>
          <fieldset className="save-trainer6-grid" disabled={!writable}>
            <label>
              <span>{t.text}</span>
              <input
                value={text}
                maxLength={12}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <label>
              <span>{t.hex}</span>
              <input
                value={hex}
                maxLength={52}
                spellCheck={false}
                onChange={(e) => setHex(e.target.value)}
              />
            </label>
          </fieldset>
          <div className="save-trainer6-characters">
            {c.characters.map((n) => (
              <button
                key={n}
                type="button"
                disabled={!writable || text.length >= 12}
                aria-label={`${t.text}: ${String.fromCharCode(n)}`}
                onClick={() => setText(text + String.fromCharCode(n))}
              >
                {String.fromCharCode(n)}
              </button>
            ))}
          </div>
          <fieldset className="save-trainer6-grid" disabled={!writable}>
            <label>
              <span>{t.species}</span>
              <Candidate
                value={String(species)}
                options={c.trashSpecies.map((v) => ({
                  value: String(v.id),
                  label: v.name[lang],
                }))}
                disabled={!writable}
                onChange={(v) => setSpecies(Number(v))}
              />
            </label>
            <label>
              <span>{t.language}</span>
              <Select
                value={language}
                disabled={!writable}
                onChange={(e) => setLanguage(Number(e.target.value))}
              >
                {c.trashLanguages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{t.generation}</span>
              <input
                inputMode="numeric"
                maxLength={3}
                value={generation}
                onChange={(e) => setGeneration(e.target.value)}
              />
            </label>
          </fieldset>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!writable || hex !== c.nameTrash}
              onClick={() =>
                void start(() => tr7Trash(c, { action: "text", text }))
              }
            >
              {t.textAction}
            </button>
            <button
              type="button"
              disabled={!writable || text !== c.basics.name}
              onClick={() =>
                void start(() => tr7Trash(c, { action: "hex", hex }))
              }
            >
              {t.hexAction}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() =>
                void start(() => tr7Trash(c, { action: "prepare" }))
              }
            >
              {t.prepare}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() => void start(() => tr7Trash(c, { action: "clear" }))}
            >
              {t.clear}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() =>
                void start(() => {
                  if (!/^\d{1,3}$/.test(generation)) throw Error(w.invalid);
                  return tr7Trash(c, {
                    action: "layer",
                    species,
                    language,
                    generation: Number(generation),
                    uiLanguage: lang,
                  });
                })
              }
            >
              {t.layer}
            </button>
          </div>
        </>
      ) : (
        <fieldset className="save-trainer6-grid" disabled={!writable}>
          {visible.map((f) => (
            <label key={f.key}>
              <span>{f.name[lang]}</span>
              {f.kind === "choice" ? (
                <Select
                  value={draft[f.key] ?? f.value}
                  disabled={!writable || !f.editable}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                >
                  {!f.choices.some(
                    (v) => String(v.id) === (draft[f.key] ?? f.value),
                  ) && (
                    <option value={f.value} disabled>
                      {w.unknown} ({f.value})
                    </option>
                  )}
                  {f.choices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {choiceName(f.key, v.id, v.name[lang])}
                    </option>
                  ))}
                </Select>
              ) : (
                <input
                  value={draft[f.key] ?? f.value}
                  maxLength={f.maxLength}
                  inputMode={f.kind === "number" ? "numeric" : "text"}
                  disabled={!f.editable}
                  onChange={(e) =>
                    setDraft({ ...draft, [f.key]: e.target.value })
                  }
                />
              )}
              {f.kind === "number" && (
                <small>
                  {f.min}–{f.max}
                </small>
              )}
              {!f.editable && <small>{w.disabled}</small>}
            </label>
          ))}
        </fieldset>
      )}
      {group === "appearance" && (
        <label className="save-trainer7-confirm">
          <span>
            <input
              type="checkbox"
              checked={allowSkin}
              disabled={!writable}
              onChange={(e) => setAllowSkin(e.target.checked)}
            />{" "}
            {w.skinConfirm}
          </span>
        </label>
      )}
      {(group === "fly" || group === "map") && (
        <button
          type="button"
          disabled={!writable || dirty}
          onClick={() =>
            void start(() =>
              tr7Action(c, group === "fly" ? "flyAll" : "mapAll"),
            )
          }
        >
          {group === "fly" ? w.flyAll : w.mapAll}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="save-editor-toolbar">
        {!["trash", "fashion"].includes(group) && (
          <button
            type="button"
            disabled={!writable || !dirty}
            onClick={() =>
              void start(() =>
                group === "ids"
                  ? tr7Ids(c, tid, sid)
                  : group === "position"
                    ? tr7Position(
                        c,
                        lang,
                        Object.entries(draft).map(([key, value]) => ({
                          key,
                          value,
                        })),
                      )
                    : tr7Patch(
                        c,
                        Object.entries(draft).map(([key, value]) => ({
                          key,
                          value,
                        })),
                        allowSkin,
                      ),
              )
            }
          >
            {w.preview}
          </button>
        )}
        <button type="button" disabled={locked || !dirty} onClick={discard}>
          {w.cancel}
        </button>
        <button
          type="button"
          disabled={!writable || dirty}
          onClick={() => void start(() => tr7Action(c, "resave"))}
        >
          {w.resave}
        </button>
      </div>
      <p className="save-trainer6-note">{dirty ? w.dirty : w.resaveNote}</p>
      {preview && (
        <div className="save-trainer6-preview" aria-live="polite">
          <h4>{t.changes}</h4>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          {preview.result.fields
            .filter(
              (f) => f.value !== c.fields.find((v) => v.key === f.key)?.value,
            )
            .map((f) => (
              <p key={f.key}>
                {f.name[lang]}:{" "}
                {fieldValue(c.fields.find((v) => v.key === f.key))} →{" "}
                {fieldValue(f)}
              </p>
            ))}
          {preview.result.nameTrash !== c.nameTrash && (
            <>
              <p>
                {t.name}: {c.basics.name} → {preview.result.basics.name}
              </p>
              <code>
                {c.nameTrash} → {preview.result.nameTrash}
              </code>
            </>
          )}
          {preview.result.ids.id32 !== c.ids.id32 && (
            <p>
              ID32: {c.ids.id32} → {preview.result.ids.id32} · TID:{" "}
              {preview.result.ids.tid} · SID: {preview.result.ids.sid} · TSV:{" "}
              {preview.result.ids.tsv}
            </p>
          )}
          {preview.result.basics.money !== c.basics.money && (
            <p>
              {t.money}: {c.basics.money} → {preview.result.basics.money}
            </p>
          )}
          {preview.result.existing.currencies
            .filter(
              (v) =>
                v.value !==
                c.existing.currencies.find((f) => f.key === v.key)?.value,
            )
            .map((v) => (
              <p key={v.key}>
                {saveEditorResources[lang].trainerCurrencyNames[v.key]}:{" "}
                {c.existing.currencies.find((f) => f.key === v.key)?.value} →{" "}
                {v.value}
              </p>
            ))}
          {["hours", "minutes", "seconds"].some(
            (key) =>
              preview.result.existing[key as "hours"] !==
              c.existing[key as "hours"],
          ) && (
            <p>
              {t.playTime}: {c.existing.hours}:{c.existing.minutes}:
              {c.existing.seconds} → {preview.result.existing.hours}:
              {preview.result.existing.minutes}:
              {preview.result.existing.seconds}
            </p>
          )}
          {JSON.stringify(preview.result.existing.geography?.value) !==
            JSON.stringify(c.existing.geography?.value) && (
            <p>
              {t.location}: {geography(c)} → {geography(preview.result)}
            </p>
          )}
          {preview.result.existing.dates
            .filter(
              (v) =>
                v.value !==
                c.existing.dates.find((f) => f.key === v.key)?.value,
            )
            .map((v) => (
              <p key={v.key}>
                {saveEditorResources[lang].trainerDateNames[v.key]}:{" "}
                {c.existing.dates.find((f) => f.key === v.key)?.value} →{" "}
                {v.value}
              </p>
            ))}
          {preview.result.position.fields
            .filter(
              (f) =>
                f.value !==
                c.position.fields.find((v) => v.key === f.key)?.value,
            )
            .map((f) => (
              <p key={f.key}>
                {
                  saveEditorResources[lang].trainerSpatialNames[
                    f.key as "map" | "x" | "z" | "y" | "rotation"
                  ]
                }
                : {c.position.fields.find((v) => v.key === f.key)?.value} →{" "}
                {f.value}
              </p>
            ))}
          {preview.ignoredFields.map((key) => (
            <p key={key}>
              {key}: {t.ignoredInput}
            </p>
          ))}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onApply(tr7Frozen(c, preview));
                } catch {
                  setError(w.invalid);
                } finally {
                  setPending(false);
                }
              }}
            >
              {w.apply}
            </button>
            <button
              type="button"
              disabled={busy || pending}
              onClick={() => setPreview(undefined)}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function Candidate({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange(value: string): void;
  disabled: boolean;
}) {
  const selected = options.find((v) => v.value === value)?.label ?? value;
  const [input, setInput] = useState<string>();
  return (
    <AutoCompleteComboBox
      value={value}
      options={options}
      disabled={disabled}
      inputValue={input ?? selected}
      label={selected}
      onInputChange={setInput}
      onValueChange={(value) => {
        setInput(undefined);
        onChange(value);
      }}
    />
  );
}

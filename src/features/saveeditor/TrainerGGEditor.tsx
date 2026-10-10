import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { pokemonImage } from "./art";
import type { Br4Lang } from "./br4";
import {
  ggAction,
  ggChangedParkSlots,
  ggDelete,
  ggFrozen,
  ggIds,
  ggImport,
  ggPatch,
  ggPosition,
  ggTrash,
  type GoParkEntry,
  type TrGGCatalog,
  type TrGGEdit,
  type TrGGPreview,
} from "./trainerGG";
import { trainerGGWords } from "./trainerGGWords";
import { trainer6Words } from "./trainer6Words";
import { saveEditorResources } from "./locales";
import "./Trainer6Editor.css";
import "./TrainerGGEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<TrGGCatalog | undefined>;
  onPreview(e: TrGGEdit): Promise<TrGGPreview | undefined>;
  onApply(e: TrGGEdit): Promise<void>;
  onExport(index?: number): Promise<boolean>;
  onDirtyChange?(value: boolean): void;
};
export function TrainerGGEditor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: TrGGCatalog }>();
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
    <section className="save-record-editor save-trainergg-editor">
      <h3>{trainerGGWords[props.lang].title}</h3>
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
          {trainerGGWords[props.lang].read}
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
  onExport,
  onDirtyChange,
}: Props & { c: TrGGCatalog }) {
  const w = trainerGGWords[lang],
    t = trainer6Words[lang];
  const [group, setGroup] = useState("basic"),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<TrGGPreview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [tid, setTid] = useState(String(c.ids.tid).padStart(6, "0")),
    [sid, setSid] = useState(String(c.ids.sid).padStart(4, "0"));
  const [target, setTarget] = useState<"name" | "rival">("name"),
    [text, setText] = useState(
      c.fields.find((f) => f.key === "name")?.value ?? "",
    ),
    [hex, setHex] = useState(c.nameTrash),
    [species, setSpecies] = useState(25),
    [language, setLanguage] = useState(2),
    [generation, setGeneration] = useState("7");
  const [index, setIndex] = useState(0),
    [confirmClear, setConfirmClear] = useState(false),
    [summaryText, setSummaryText] = useState("");
  const slotRefs = useRef(new Map<number, HTMLButtonElement>());
  const originalName = c.fields.find((f) => f.key === target)?.value ?? "",
    originalHex = target === "name" ? c.nameTrash : c.rivalTrash;
  const dirty =
    Object.keys(draft).length > 0 ||
    Number(tid || 0) !== c.ids.tid ||
    Number(sid || 0) !== c.ids.sid ||
    text !== originalName ||
    hex !== originalHex;
  const locked = busy || pending || !!preview,
    writable = c.canEdit && !locked,
    area = Math.floor(index / 50),
    selected = c.park[index];
  useEffect(() => {
    onDirtyChange?.(dirty || pending || !!preview);
  }, [dirty, pending, preview, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  async function start(build: () => TrGGEdit | Promise<TrGGEdit>) {
    setError("");
    setSummaryText("");
    setPending(true);
    try {
      const p = await onPreview(await build());
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function discard() {
    setDraft({});
    setTid(String(c.ids.tid).padStart(6, "0"));
    setSid(String(c.ids.sid).padStart(4, "0"));
    setText(originalName);
    setHex(originalHex);
    setPreview(undefined);
    setError("");
    setConfirmClear(false);
  }
  async function importFiles(files: File[], batch: boolean) {
    if (!files.length) return;
    await start(async () => {
      if (files.length > 1000 || (!batch && files[0].size !== 432))
        throw Error(w.invalid);
      const rows = [];
      for (const file of files) {
        const bytes =
          file.size === 432
            ? new Uint8Array(await file.arrayBuffer())
            : new Uint8Array();
        rows.push({
          name: file.name,
          data: btoa(String.fromCharCode(...bytes)),
        });
      }
      return ggImport(c, index, rows, batch);
    });
  }
  async function exportFiles(all: boolean) {
    setError("");
    setPending(true);
    try {
      if (all && !c.park.some((v) => v.species !== 0)) {
        setError(w.noEntries);
        return;
      }
      if (!(await onExport(all ? undefined : index))) setError(w.invalid);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function describe(p: GoParkEntry) {
    return p.species === 0
      ? w.empty
      : `${p.nickname || p.name[lang]} (${p.name[lang]}${p.form ? ` / ${w.form} ${p.form}` : ""}${p.shiny ? " ★" : ""}) · ${w.level} ${p.levelRaw} · CP ${p.cp} · ${p.ivs.join("/")}`;
  }
  async function copySummary() {
    const summary = c.park
      .filter((v) => v.species !== 0)
      .map(
        (p) =>
          `${w.area} ${Math.floor(p.index / 50) + 1}, ${w.slot} ${(p.index % 50) + 1}: ${describe(p)} · ${w.moves}: ${p.moveNames.map((n) => n[lang]).join(" / ")} · ${w.user}: ${p.username1} / ${p.username2} · ${w.city}: ${p.city} · ${w.date}: ${p.date}`,
      )
      .join("\n");
    setSummaryText(summary);
    try {
      await navigator.clipboard.writeText(summary);
      setError(w.copied);
    } catch {
      setError(w.copyFailed);
    }
  }
  function moveSlot(next: number) {
    next = Math.max(0, Math.min(999, next));
    setIndex(next);
    requestAnimationFrame(() => slotRefs.current.get(next)?.focus());
  }
  const changedSlots = preview
    ? ggChangedParkSlots(preview.changedOffsets)
    : [];
  const value = (field: TrGGCatalog["fields"][number]) =>
    field.choices.find((v) => String(v.id) === field.value)?.name[lang] ??
    field.value;
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
            setError("");
            setSummaryText("");
          }}
        >
          {(
            ["basic", "ids", "position", "trash", "park", "unlocks"] as const
          ).map((g) => (
            <option key={g} value={g}>
              {w[g]}
            </option>
          ))}
        </Select>
      </label>
      {group === "basic" ? (
        <>
          <fieldset className="save-trainer6-grid" disabled={!writable}>
            {c.fields.map((f) => (
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
                        {v.name[lang]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <input
                    type={f.kind === "date" ? "datetime-local" : "text"}
                    step={f.kind === "date" ? 1 : undefined}
                    min={f.kind === "date" ? f.min : undefined}
                    max={f.kind === "date" ? f.max : undefined}
                    maxLength={f.maxLength}
                    inputMode={f.kind === "number" ? "numeric" : undefined}
                    value={draft[f.key] ?? f.value}
                    disabled={!f.editable}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [f.key]:
                          f.kind === "date" && e.target.value.length === 16
                            ? e.target.value + ":00"
                            : e.target.value,
                      })
                    }
                  />
                )}{" "}
                {!f.editable && <small>{w.readonly}</small>}
                {f.kind === "number" && (
                  <small>
                    {f.min}–{f.max}
                  </small>
                )}
              </label>
            ))}
          </fieldset>
          <p className="save-trainer6-note">{w.dateNote}</p>
          <button
            type="button"
            disabled={!writable}
            onClick={() => setDraft({ ...draft, money: "9999999" })}
          >
            {w.maxCash}
          </button>
        </>
      ) : group === "ids" ? (
        <>
          <fieldset className="save-trainer6-grid" disabled={!writable}>
            <label>
              <span>{saveEditorResources[lang].tid}</span>
              <input
                value={tid}
                maxLength={6}
                inputMode="numeric"
                onChange={(e) => setTid(e.target.value)}
              />
            </label>
            <label>
              <span>{saveEditorResources[lang].sid}</span>
              <input
                value={sid}
                maxLength={4}
                inputMode="numeric"
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
          <p>{c.position.canEdit ? w.positionNote : t.positionUnavailable}</p>
          <fieldset
            className="save-trainer6-grid"
            disabled={!writable || !c.position.canEdit}
          >
            {c.position.fields.map((f) => (
              <label key={f.key}>
                <span>{w.mapNames[f.key as keyof typeof w.mapNames]}</span>
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
      ) : group === "trash" ? (
        <>
          <label>
            <span>{w.target}</span>
            <Select
              value={target}
              disabled={locked || dirty}
              onChange={(e) => {
                const next = e.target.value as "name" | "rival";
                setTarget(next);
                setText(c.fields.find((f) => f.key === next)?.value ?? "");
                setHex(next === "name" ? c.nameTrash : c.rivalTrash);
              }}
            >
              <option value="name">{w.name}</option>
              <option value="rival">{w.rival}</option>
            </Select>
          </label>
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
              <SpeciesCandidate
                value={species}
                choices={c.trashSpecies}
                lang={lang}
                disabled={!writable}
                onChange={setSpecies}
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
                value={generation}
                maxLength={3}
                inputMode="numeric"
                onChange={(e) => setGeneration(e.target.value)}
              />
            </label>
          </fieldset>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!writable || hex !== originalHex}
              onClick={() =>
                void start(() => ggTrash(c, target, { action: "text", text }))
              }
            >
              {t.textAction}
            </button>
            <button
              type="button"
              disabled={!writable || text !== originalName}
              onClick={() =>
                void start(() => ggTrash(c, target, { action: "hex", hex }))
              }
            >
              {t.hexAction}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() =>
                void start(() => ggTrash(c, target, { action: "prepare" }))
              }
            >
              {t.prepare}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() =>
                void start(() => ggTrash(c, target, { action: "clear" }))
              }
            >
              {t.clear}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() =>
                void start(() => {
                  if (!/^\d{1,3}$/.test(generation)) throw Error(w.invalid);
                  return ggTrash(c, target, {
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
      ) : group === "park" ? (
        <>
          <p>{w.parkNote}</p>
          <fieldset className="save-trainer6-grid" disabled={locked}>
            <label>
              <span>{w.area}</span>
              <Select
                value={area}
                disabled={locked}
                onChange={(e) =>
                  setIndex(Number(e.target.value) * 50 + (index % 50))
                }
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i} value={i}>
                    {w.area} {i + 1}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.slot}</span>
              <Select
                value={index % 50}
                disabled={locked}
                onChange={(e) => setIndex(area * 50 + Number(e.target.value))}
              >
                {Array.from({ length: 50 }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </Select>
            </label>
          </fieldset>
          <div
            className="save-gg-slots"
            role="group"
            aria-label={`${w.area} ${area + 1}`}
          >
            {c.park.slice(area * 50, (area + 1) * 50).map((p) => (
              <button
                key={p.index}
                type="button"
                ref={(node) => {
                  if (node) slotRefs.current.set(p.index, node);
                  else slotRefs.current.delete(p.index);
                }}
                disabled={locked}
                tabIndex={p.index === index ? 0 : -1}
                aria-pressed={p.index === index}
                aria-label={`${w.area} ${area + 1}, ${w.slot} ${(p.index % 50) + 1}: ${describe(p)}`}
                onClick={() => setIndex(p.index)}
                onKeyDown={(e) => {
                  const columns = window.matchMedia("(max-width: 540px)")
                    .matches
                    ? 5
                    : 10;
                  const offsets: Partial<Record<string, number>> = {
                    ArrowLeft: -1,
                    ArrowRight: 1,
                    ArrowUp: -columns,
                    ArrowDown: columns,
                  };
                  const offset = offsets[e.key];
                  if (offset !== undefined) {
                    e.preventDefault();
                    moveSlot(p.index + offset);
                  } else if (e.key === "Home" || e.key === "End") {
                    e.preventDefault();
                    moveSlot(area * 50 + (e.key === "End" ? 49 : 0));
                  }
                }}
              >
                {p.species !== 0 ? (
                  <img
                    src={pokemonImage(p)}
                    width={40}
                    height={40}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span className="save-gg-empty" aria-hidden="true">
                    ·
                  </span>
                )}
                <span>
                  {(p.index % 50) + 1}
                  {p.shiny ? " ★" : ""}
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <>
              <h4>
                {w.selected}: {w.area} {area + 1} / {w.slot} {(index % 50) + 1}
              </h4>
              <p>{describe(selected)}</p>
              {selected.species !== 0 && (
                <dl className="save-gg-details">
                  {[
                    [w.species, `${selected.species} · ${selected.name[lang]}`],
                    [w.form, String(selected.form)],
                    [
                      w.gender,
                      selected.gender <= 2
                        ? ["♂", "♀", "-"][selected.gender]
                        : w.unknown,
                    ],
                    [w.level, selected.levelRaw],
                    [w.cp, String(selected.cp)],
                    [w.hp, String(selected.hp)],
                    [w.ivs, selected.ivs.join(" / ")],
                    [
                      w.moves,
                      selected.moveNames
                        .map((n, i) => `${n[lang]} (${selected.moves[i]})`)
                        .join(" / "),
                    ],
                    [w.date, String(selected.date)],
                    [w.city, selected.city],
                    [w.user, `${selected.username1} / ${selected.username2}`],
                    [w.height, selected.height],
                    [w.weight, selected.weight],
                  ].map(([label, v]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
          <div className="save-gg-files">
            <label>
              <span>{w.importOne}</span>
              <input
                type="file"
                accept=".gp1"
                disabled={!writable}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void importFiles(files, false);
                }}
              />
            </label>
            <label>
              <span>{w.importBatch}</span>
              <input
                type="file"
                multiple
                accept=".gp1"
                disabled={!writable}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void importFiles(files, true);
                }}
              />
            </label>
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked}
              onClick={() => void exportFiles(false)}
            >
              {w.exportOne}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => void exportFiles(true)}
            >
              {w.exportAll}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => void copySummary()}
            >
              {w.summary}
            </button>
            <button
              type="button"
              disabled={!writable}
              onClick={() => void start(() => ggDelete(c, index))}
            >
              {w.deleteOne}
            </button>
          </div>
          <p className="save-trainer6-note">{w.archiveNote}</p>
          <label className="save-gg-confirm">
            <input
              type="checkbox"
              checked={confirmClear}
              disabled={!writable}
              onChange={(e) => setConfirmClear(e.target.checked)}
            />
            <span>{w.confirmDelete}</span>
          </label>
          <button
            type="button"
            disabled={!writable || !confirmClear}
            onClick={() => void start(() => ggAction(c, "parkClear"))}
          >
            {w.deleteAll}
          </button>
          {summaryText && (
            <textarea
              value={summaryText}
              rows={8}
              readOnly
              aria-label={w.summary}
            />
          )}
        </>
      ) : (
        <>
          <p>
            {w.titleCount}: {c.titleCount} / 156
          </p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() => void start(() => ggAction(c, "titles"))}
            >
              {w.titles}
            </button>
            <button
              type="button"
              disabled={!writable || dirty}
              onClick={() => void start(() => ggAction(c, "fashion"))}
            >
              {w.fashion}
            </button>
          </div>
          <p>{w.fashionNote}</p>
        </>
      )}
      {error && <p role="status">{error}</p>}
      <div className="save-editor-toolbar">
        {["basic", "ids", "position"].includes(group) && (
          <button
            type="button"
            disabled={!writable || !dirty}
            onClick={() =>
              void start(() => {
                const fields = Object.entries(draft).map(([key, value]) => ({
                  key,
                  value,
                }));
                return group === "ids"
                  ? ggIds(c, tid, sid)
                  : group === "position"
                    ? ggPosition(c, fields, lang)
                    : ggPatch(c, fields);
              })
            }
          >
            {w.preview}
          </button>
        )}
        <button type="button" disabled={locked || !dirty} onClick={discard}>
          {w.discard}
        </button>
        <button
          type="button"
          disabled={!writable || dirty}
          onClick={() => void start(() => ggAction(c, "resave"))}
        >
          {w.resave}
        </button>
      </div>
      <p className="save-trainer6-note">{dirty ? w.dirty : w.resaveNote}</p>
      {preview && (
        <div className="save-trainer6-preview" aria-live="polite">
          <h4>{w.changes}</h4>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          {!preview.changedOffsets.length && <p>{w.noChanges}</p>}
          {preview.result.fields
            .filter(
              (f) => f.value !== c.fields.find((v) => v.key === f.key)?.value,
            )
            .map((f) => (
              <p key={f.key}>
                {f.name[lang]}: {value(c.fields.find((v) => v.key === f.key)!)}{" "}
                → {value(f)}
              </p>
            ))}
          {preview.result.ids.id32 !== c.ids.id32 && (
            <p>
              ID32: {c.ids.id32} → {preview.result.ids.id32} · TID:{" "}
              {preview.result.ids.tid} · SID: {preview.result.ids.sid} · TSV:{" "}
              {preview.result.ids.tsv}
            </p>
          )}
          {preview.result.titleCount !== c.titleCount && (
            <p>
              {w.titleCount}: {c.titleCount} → {preview.result.titleCount}
            </p>
          )}
          {preview.result.position.fields
            .filter(
              (f) =>
                f.value !==
                c.position.fields.find((v) => v.key === f.key)?.value,
            )
            .map((f) => (
              <p key={f.key}>
                {w.mapNames[f.key as keyof typeof w.mapNames]}:{" "}
                {c.position.fields.find((v) => v.key === f.key)?.value} →{" "}
                {f.value}
              </p>
            ))}
          {(["name", "rival"] as const).map((n) => {
            const before = n === "name" ? c.nameTrash : c.rivalTrash,
              after =
                n === "name"
                  ? preview.result.nameTrash
                  : preview.result.rivalTrash;
            return before === after ? null : (
              <p key={n}>
                {n === "name" ? w.name : w.rival}:{" "}
                <code>
                  {before} → {after}
                </code>
              </p>
            );
          })}
          {changedSlots.length > 0 && (
            <div className="save-gg-changes">
              {changedSlots.map((i) => (
                <p key={i}>
                  {w.area} {Math.floor(i / 50) + 1} / {w.slot} {(i % 50) + 1}:{" "}
                  {describe(c.park[i])} → {describe(preview.result.park[i])}
                </p>
              ))}
            </div>
          )}
          {preview.receipt && (
            <>
              <p>{w.batchNote}</p>
              <div className="save-gg-changes">
                {preview.receipt.placements.map((v) => (
                  <p key={`p${v.file}`}>
                    {w.imported}: {preview.request.files?.[v.file].name} →{" "}
                    {w.area} {Math.floor(v.index / 50) + 1} / {w.slot}{" "}
                    {(v.index % 50) + 1}
                  </p>
                ))}
                {preview.receipt.skipped.map((v) => (
                  <p key={`s${v.file}`}>
                    {w.skipped}: {preview.request.files?.[v.file].name}
                  </p>
                ))}
                {preview.receipt.unplaced.map((v) => (
                  <p key={`u${v}`}>
                    {w.unplaced}: {preview.request.files?.[v].name}
                  </p>
                ))}
              </div>
            </>
          )}
          {preview.ignoredFields.map((key) => (
            <p key={key}>
              {w.mapNames[key as keyof typeof w.mapNames]}: {t.ignoredInput}
            </p>
          ))}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onApply(ggFrozen(c, preview));
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
              {w.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function SpeciesCandidate({
  value,
  choices,
  lang,
  disabled,
  onChange,
}: {
  value: number;
  choices: TrGGCatalog["trashSpecies"];
  lang: Br4Lang;
  disabled: boolean;
  onChange(value: number): void;
}) {
  const [input, setInput] = useState<string>();
  return (
    <AutoCompleteComboBox
      value={value}
      options={choices.map((v) => ({ value: v.id, label: v.name[lang] }))}
      disabled={disabled}
      inputValue={
        input ??
        choices.find((v) => v.id === value)?.name[lang] ??
        String(value)
      }
      label={trainer6Words[lang].species}
      onInputChange={setInput}
      onValueChange={(v) => {
        setInput(undefined);
        onChange(v);
      }}
    />
  );
}

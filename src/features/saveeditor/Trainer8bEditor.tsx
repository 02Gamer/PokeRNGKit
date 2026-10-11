import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import type { Br4Lang } from "./br4";
import type { Hall6Trash } from "./hall6";
import {
  tr8bRequest,
  tr8bFrozen,
  tr8bLocalDate,
  tr8bOffsetDate,
  type Tr8bCatalog,
  type Tr8bEdit,
  type Tr8bPreview,
} from "./trainer8b";
import { trainer8bWords } from "./trainer8bWords";
import { saveRecordName } from "./recordNames";
import "./Trainer8bEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Tr8bCatalog | undefined>;
  onPreview(e: Tr8bEdit): Promise<Tr8bPreview | undefined>;
  onApply(e: Tr8bEdit): Promise<void>;
};
export function Trainer8bEditor(p: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Tr8bCatalog }>();
  const reader = useRef(p.onRead);
  useEffect(() => {
    reader.current = p.onRead;
  }, [p.onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((c) => {
      if (active && c) setLoaded({ revision: p.revision, c });
    });
    return () => {
      active = false;
    };
  }, [p.revision]);
  return (
    <section className="save-record-editor">
      <h3>{trainer8bWords[p.lang].title}</h3>
      {loaded?.revision === p.revision ? (
        <Form key={p.revision} {...p} c={loaded.c} />
      ) : (
        <button
          type="button"
          disabled={p.busy}
          onClick={() =>
            void p.onRead().then((c) => {
              if (c) setLoaded({ revision: p.revision, c });
            })
          }
        >
          {trainer8bWords[p.lang].read}
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
}: Props & { c: Tr8bCatalog }) {
  const w = trainer8bWords[lang];
  const fieldName = (f: Tr8bCatalog["fields"][number]) =>
    f.key.startsWith("record")
      ? `${saveRecordName(f.name.en, lang)} (${f.key.slice(6)})`
      : f.name[lang];
  const [group, setGroup] = useState("basic"),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<Tr8bPreview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [tid, setTid] = useState(String(c.ids.tid)),
    [sid, setSid] = useState(String(c.ids.sid)),
    [target, setTarget] = useState<"name" | "rival">("name"),
    [text, setText] = useState(""),
    [hex, setHex] = useState(""),
    [species, setSpecies] = useState(c.trashSpecies[0]?.id ?? 1),
    [speciesInput, setSpeciesInput] = useState<string>(),
    [trashLanguage, setTrashLanguage] = useState(c.trashLanguages[0]?.id ?? 2),
    [generation, setGeneration] = useState("8");
  const locked = busy || pending || !!preview || !c.canEdit;
  async function start(e: Tr8bEdit) {
    setPending(true);
    setError("");
    try {
      const p = await onPreview(e);
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function submit() {
    try {
      if (group === "ids")
        void start(
          tr8bRequest(c, "ids", [
            { key: "tid", value: tid },
            { key: "sid", value: sid },
          ]),
        );
      else if (group === "position")
        void start({
          ...tr8bRequest(
            c,
            "position",
            Object.entries(draft)
              .filter(([k]) => k.startsWith("pos."))
              .map(([key, value]) => ({ key: key.slice(4), value })),
          ),
          uiLanguage: lang,
        });
      else
        void start(
          tr8bRequest(
            c,
            "patch",
            Object.entries(draft)
              .filter(([k]) => !k.startsWith("pos."))
              .map(([key, value]) => ({
                key,
                value:
                  c.fields.find((f) => f.key === key)?.kind === "date"
                    ? tr8bOffsetDate(value)
                    : value,
              })),
          ),
        );
    } catch {
      setError(w.invalid);
    }
  }
  function trash(e: Hall6Trash) {
    void start({ ...tr8bRequest(c, "trash"), nameTarget: target, trash: e });
  }
  function resave() {
    try {
      void start(
        tr8bRequest(
          c,
          "resave",
          c.fields
            .filter((f) => f.kind === "date")
            .map((f) => ({
              key: f.key,
              value: tr8bOffsetDate(tr8bLocalDate(f.value)),
            })),
        ),
      );
    } catch {
      setError(w.invalid);
    }
  }
  const fields = c.fields.filter((f) =>
    group === "records"
      ? f.key.startsWith("record")
      : group === "badges"
        ? f.key.startsWith("badge")
        : !f.key.startsWith("record") && !f.key.startsWith("badge"),
  );
  const changed =
    preview?.result.fields.filter(
      (f) => f.value !== c.fields.find((o) => o.key === f.key)?.value,
    ) ?? [];
  const originalBytes = target === "name" ? c.nameTrash : c.rivalTrash;
  return (
    <div className="save-tr8b-body" data-group={group}>
      <p>{w.linkHint}</p>
      <label>
        <span>{w.group}</span>
        <Select
          value={group}
          disabled={busy || pending}
          onChange={(e) => setGroup(e.target.value)}
        >
          {(
            ["basic", "ids", "position", "badges", "records", "trash"] as const
          ).map((g) => (
            <option key={g} value={g}>
              {w[g]}
            </option>
          ))}
        </Select>
      </label>
      {group === "ids" ? (
        <>
          <p>{w.idHint}</p>
          <div className="save-tr8b-fields">
            <label>
              <span>{w.tid}</span>
              <input
                value={tid}
                maxLength={6}
                inputMode="numeric"
                disabled={locked}
                onChange={(e) => setTid(e.target.value)}
              />
            </label>
            <label>
              <span>{w.sid}</span>
              <input
                value={sid}
                maxLength={4}
                inputMode="numeric"
                disabled={locked}
                onChange={(e) => setSid(e.target.value)}
              />
            </label>
          </div>
          <p>
            ID32: {c.ids.id32} · TSV: {c.ids.tsv}
          </p>
        </>
      ) : group === "position" ? (
        <div className="save-tr8b-fields">
          {c.existing.spatialPosition.map((f) => (
            <label key={f.key}>
              <span>
                {w.placeNames[f.key as keyof typeof w.placeNames] ?? f.key}
              </span>
              <input
                value={draft["pos." + f.key] ?? f.value}
                disabled={locked}
                inputMode="decimal"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, ["pos." + f.key]: e.target.value }))
                }
              />
              <small>
                {f.min}–{f.max}
              </small>
            </label>
          ))}
        </div>
      ) : group === "trash" ? (
        <>
          <div className="save-tr8b-fields">
            <label>
              <span>{w.target}</span>
              <Select
                value={target}
                disabled={locked}
                onChange={(e) => {
                  setTarget(e.target.value as "name" | "rival");
                  setText("");
                  setHex("");
                }}
              >
                <option value="name">{w.name}</option>
                <option value="rival">{w.rival}</option>
              </Select>
            </label>
            <label>
              <span>{w.text}</span>
              <input
                value={text}
                maxLength={12}
                disabled={locked}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <label className="save-tr8b-wide">
              <span>{w.hex}</span>
              <input
                value={hex || originalBytes}
                maxLength={52}
                disabled={locked}
                onChange={(e) => setHex(e.target.value)}
              />
            </label>
            <label>
              <span>{w.species}</span>
              <AutoCompleteComboBox
                value={species}
                inputValue={
                  speciesInput ??
                  c.trashSpecies.find((v) => v.id === species)?.name[lang] ??
                  ""
                }
                label={w.species}
                options={c.trashSpecies.map((v) => ({
                  value: v.id,
                  label: v.name[lang],
                }))}
                onInputChange={setSpeciesInput}
                onValueChange={(v) => {
                  setSpecies(v);
                  setSpeciesInput(undefined);
                }}
                disabled={locked}
              />
            </label>
            <label>
              <span>{w.language}</span>
              <Select
                value={String(trashLanguage)}
                disabled={locked}
                onChange={(e) => setTrashLanguage(Number(e.target.value))}
              >
                {c.trashLanguages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.generation}</span>
              <input
                value={generation}
                inputMode="numeric"
                disabled={locked}
                onChange={(e) => setGeneration(e.target.value)}
              />
            </label>
          </div>
          <div className="save-tr8b-characters">
            {c.characters.map((n) => (
              <button
                type="button"
                key={n}
                disabled={locked}
                onClick={() =>
                  setText((v) =>
                    v.length < 12 ? v + String.fromCodePoint(n) : v,
                  )
                }
              >
                {String.fromCodePoint(n)}
              </button>
            ))}
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked}
              onClick={() => trash({ action: "prepare" })}
            >
              {w.prepare}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => trash({ action: "clear" })}
            >
              {w.clear}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => trash({ action: "text", text })}
            >
              {w.writeText}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                trash({ action: "hex", hex: hex || originalBytes })
              }
            >
              {w.writeHex}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                trash({
                  action: "layer",
                  species,
                  language: trashLanguage,
                  generation: Number(generation),
                  uiLanguage: lang,
                })
              }
            >
              {w.layer}
            </button>
          </div>
        </>
      ) : (
        <>
          {group === "records" && (
            <label>
              <span>{w.recordSearch}</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          )}
          <div className="save-tr8b-fields">
            {fields
              .filter(
                (f) =>
                  `${f.key} ${fieldName(f)}`
                    .toLocaleLowerCase()
                    .includes(query.toLocaleLowerCase()) || group !== "records",
              )
              .map((f) => (
                <label key={f.key}>
                  <span>{fieldName(f)}</span>
                  {f.kind === "choice" ? (
                    <Select
                      value={draft[f.key] ?? f.value}
                      disabled={locked}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                      }
                    >
                      {!f.choices.some((v) => String(v.id) === f.value) && (
                        <option value={f.value}>{f.value}</option>
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
                      min={
                        f.kind === "date" ? "2000-01-01T00:00:00" : undefined
                      }
                      max={
                        f.kind === "date" ? "2099-12-31T23:59:59" : undefined
                      }
                      value={
                        draft[f.key] ??
                        (f.kind === "date" ? tr8bLocalDate(f.value) : f.value)
                      }
                      maxLength={f.maxLength}
                      disabled={locked || !f.editable}
                      inputMode={f.kind === "number" ? "numeric" : undefined}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                      }
                    />
                  )}{" "}
                  {f.kind === "number" && (
                    <small>
                      {f.min}–{f.max}
                    </small>
                  )}
                </label>
              ))}
          </div>
          {group === "basic" && (
            <button
              type="button"
              disabled={locked}
              onClick={() => setDraft((d) => ({ ...d, money: "999999" }))}
            >
              {w.maxMoney}
            </button>
          )}
        </>
      )}
      {group !== "trash" && (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={
              locked ||
              (group !== "ids" &&
                !Object.keys(draft).some((k) =>
                  group === "position"
                    ? k.startsWith("pos.")
                    : !k.startsWith("pos."),
                ))
            }
            onClick={submit}
          >
            {w.preview}
          </button>
          <button type="button" disabled={locked} onClick={resave}>
            {w.resave}
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section aria-live="polite">
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          {!preview.changedOffsets.length && <p>{w.noChanges}</p>}
          <div className="save-tr8b-table">
            <table>
              <thead>
                <tr>
                  <th>{w.field}</th>
                  <th>{w.before}</th>
                  <th>{w.after}</th>
                </tr>
              </thead>
              <tbody>
                {changed.map((f) => (
                  <tr key={f.key}>
                    <th scope="row">{fieldName(f)}</th>
                    <td>{c.fields.find((o) => o.key === f.key)?.value}</td>
                    <td>{f.value}</td>
                  </tr>
                ))}
                {preview.result.existing.spatialPosition
                  .filter(
                    (f) =>
                      f.value !==
                      c.existing.spatialPosition.find((o) => o.key === f.key)
                        ?.value,
                  )
                  .map((f) => (
                    <tr key={`pos.${f.key}`}>
                      <th scope="row">
                        {w.placeNames[f.key as keyof typeof w.placeNames] ??
                          f.key}
                      </th>
                      <td>
                        {
                          c.existing.spatialPosition.find(
                            (o) => o.key === f.key,
                          )?.value
                        }
                      </td>
                      <td>{f.value}</td>
                    </tr>
                  ))}
                {JSON.stringify(c.ids) !==
                  JSON.stringify(preview.result.ids) && (
                  <tr>
                    <th scope="row">{w.ids}</th>
                    <td>
                      {c.ids.tid} / {c.ids.sid} / {c.ids.id32}
                    </td>
                    <td>
                      {preview.result.ids.tid} / {preview.result.ids.sid} /{" "}
                      {preview.result.ids.id32}
                    </td>
                  </tr>
                )}
                {(
                  [
                    "nameTrash",
                    "rivalTrash",
                    "startTicks",
                    "savedTicks",
                    "recordAddRaw",
                  ] as const
                )
                  .filter((k) => c[k] !== preview.result[k])
                  .map((k) => (
                    <tr key={k}>
                      <th scope="row">
                        {k === "recordAddRaw"
                          ? w.rank
                          : k === "nameTrash"
                            ? w.name
                            : k === "rivalTrash"
                              ? w.rival
                              : w.ticks}
                      </th>
                      <td>
                        <code>{c[k]}</code>
                      </td>
                      <td>
                        <code>{preview.result[k]}</code>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onApply(tr8bFrozen(c, preview));
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
        </section>
      )}
    </div>
  );
}

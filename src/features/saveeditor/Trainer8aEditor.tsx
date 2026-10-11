import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import type { Br4Lang } from "./br4";
import type { Hall6Trash } from "./hall6";
import {
  tr8aRequest,
  tr8aFrozen,
  tr8aDate,
  type Tr8aCatalog,
  type Tr8aEdit,
  type Tr8aPreview,
} from "./trainer8a";
import { trainer8aWords } from "./trainer8aWords";
import "./Trainer8aEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Tr8aCatalog | undefined>;
  onPreview(e: Tr8aEdit): Promise<Tr8aPreview | undefined>;
  onApply(e: Tr8aEdit): Promise<void>;
};
export function Trainer8aEditor(p: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Tr8aCatalog }>();
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
      <h3>{trainer8aWords[p.lang].title}</h3>
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
          {trainer8aWords[p.lang].read}
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
}: Props & { c: Tr8aCatalog }) {
  const w = trainer8aWords[lang];
  const [group, setGroup] = useState("basic"),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<Tr8aPreview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [tid, setTid] = useState(String(c.ids.tid)),
    [sid, setSid] = useState(String(c.ids.sid)),
    [text, setText] = useState(""),
    [hex, setHex] = useState<string>(),
    [species, setSpecies] = useState(c.trashSpecies[0]?.id ?? 1),
    [speciesInput, setSpeciesInput] = useState<string>(),
    [trashLanguage, setTrashLanguage] = useState(c.trashLanguages[0]?.id ?? 2),
    [generation, setGeneration] = useState("8");
  const locked = busy || pending || !!preview || !c.canEdit;
  async function start(e: Tr8aEdit) {
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
          tr8aRequest(c, "ids", [
            { key: "tid", value: tid },
            { key: "sid", value: sid },
          ]),
        );
      else if (group === "position")
        void start({
          ...tr8aRequest(
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
          tr8aRequest(
            c,
            "patch",
            Object.entries(draft)
              .filter(([k]) => !k.startsWith("pos."))
              .map(([key, value]) => ({
                key,
                value:
                  c.fields.find((f) => f.key === key)?.kind === "date"
                    ? tr8aDate(value)
                    : value,
              })),
          ),
        );
    } catch {
      setError(w.invalid);
    }
  }
  function trash(e: Hall6Trash) {
    void start({ ...tr8aRequest(c, "trash"), trash: e });
  }
  const changes =
    preview?.result.fields.filter(
      (f) => f.value !== c.fields.find((o) => o.key === f.key)?.value,
    ) ?? [];
  return (
    <div className="save-tr8a-body">
      <label>
        <span>{w.group}</span>
        <Select
          value={group}
          disabled={busy || pending}
          onChange={(e) => setGroup(e.target.value)}
        >
          {(["basic", "ids", "position", "trash"] as const).map((g) => (
            <option key={g} value={g}>
              {w[g]}
            </option>
          ))}
        </Select>
      </label>
      {group === "basic" ? (
        <>
          <p>{w.dateHint}</p>
          <p>{w.clampHint}</p>
          <div className="save-tr8a-fields">
            {c.fields.map((f) => (
              <label key={f.key}>
                <span>{f.name[lang]}</span>
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
                    min={f.kind === "date" ? f.min : undefined}
                    max={f.kind === "date" ? f.max : undefined}
                    value={draft[f.key] ?? f.value}
                    maxLength={f.maxLength}
                    disabled={locked || !f.editable}
                    inputMode={f.kind === "number" ? "numeric" : undefined}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                    }
                  />
                )}
                {f.kind === "number" && (
                  <small>
                    {f.min}–{f.max}
                  </small>
                )}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={locked}
            onClick={() => setDraft((d) => ({ ...d, money: "9999999" }))}
          >
            {w.maxMoney}
          </button>
        </>
      ) : group === "ids" ? (
        <div className="save-tr8a-fields">
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
          <p>
            ID32: {c.ids.id32} · TSV: {c.ids.tsv}
          </p>
        </div>
      ) : group === "position" ? (
        <>
          <p>{w.mapHint}</p>
          <div className="save-tr8a-fields">
            <label>
              <span>{w.map}</span>
              <input
                value={draft["pos.map"] ?? c.map}
                maxLength={48}
                disabled={locked || !c.position.canEdit}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, "pos.map": e.target.value }))
                }
              />
            </label>
            {c.position.fields.map((f) => (
              <label key={f.key}>
                <span>
                  {w.placeNames[f.key as keyof typeof w.placeNames] ?? f.key}
                </span>
                <input
                  value={draft["pos." + f.key] ?? f.value}
                  disabled={locked || !c.position.canEdit}
                  inputMode="decimal"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      ["pos." + f.key]: e.target.value,
                    }))
                  }
                />
                <small>
                  {f.min}–{f.max}
                </small>
              </label>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="save-tr8a-fields">
            <label>
              <span>{w.text}</span>
              <input
                value={text}
                maxLength={12}
                disabled={locked}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <label>
              <span>{w.hex}</span>
              <input
                value={hex ?? c.nameTrash}
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
          <div className="save-tr8a-characters">
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
              onClick={() => trash({ action: "hex", hex: hex ?? c.nameTrash })}
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
      )}
      {group !== "trash" && (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={
              locked ||
              (group === "position" && !c.position.canEdit) ||
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
          <button
            type="button"
            disabled={locked}
            onClick={() => void start(tr8aRequest(c, "resave"))}
          >
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
          {preview.ignoredFields.length > 0 && (
            <p>
              {w.ignored}:{" "}
              {preview.ignoredFields
                .map((k) =>
                  k === "map"
                    ? w.map
                    : (w.placeNames[k as keyof typeof w.placeNames] ?? k),
                )
                .join(", ")}
            </p>
          )}
          <div className="save-tr8a-table">
            <table>
              <thead>
                <tr>
                  <th>{w.field}</th>
                  <th>{w.before}</th>
                  <th>{w.after}</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((f) => (
                  <tr key={f.key}>
                    <th scope="row">{f.name[lang]}</th>
                    <td>{c.fields.find((o) => o.key === f.key)?.value}</td>
                    <td>{f.value}</td>
                  </tr>
                ))}
                {preview.result.position.fields
                  .filter(
                    (f) =>
                      f.value !==
                      c.position.fields.find((o) => o.key === f.key)?.value,
                  )
                  .map((f) => (
                    <tr key={f.key}>
                      <th scope="row">
                        {w.placeNames[f.key as keyof typeof w.placeNames] ??
                          f.key}
                      </th>
                      <td>
                        {c.position.fields.find((o) => o.key === f.key)?.value}
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
                    "map",
                    "nameTrash",
                    "coordinateRaw",
                    "startedRaw",
                    "savedRaw",
                  ] as const
                )
                  .filter((k) => c[k] !== preview.result[k])
                  .map((k) => (
                    <tr key={k}>
                      <th scope="row">
                        {k === "map"
                          ? w.map
                          : k === "nameTrash"
                            ? w.hex
                            : k === "coordinateRaw"
                              ? w.position
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
                  await onApply(tr8aFrozen(c, preview));
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

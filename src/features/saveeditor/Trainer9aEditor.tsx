import { SaveTrainerImage } from "./SaveTrainerImage";
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  tr9aScrewText,
  tr9aConfirmation,
  tr9aDraft,
  tr9aRequest,
  tr9aWords,
  type Tr9aCatalog,
  type Tr9aConfirmation,
  type Tr9aRequest,
  type Tr9aTicket,
} from "./trainer9a";
import "./Trainer9Editor.css";
import "./Trainer9aEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Tr9aCatalog | undefined>;
  onPreview(edit: Tr9aRequest): Promise<Tr9aTicket | undefined>;
  onApply(confirm: Tr9aConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
};
export function Trainer9aEditor(props: Props) {
  return <Form key={props.revision} {...props} />;
}
function Form({ busy, lang, onRead, onPreview, onApply, onDiscard }: Props) {
  const w = tr9aWords[lang];
  const [catalog, setCatalog] = useState<Tr9aCatalog>(),
    [draft, setDraft] = useState<Tr9aRequest>(),
    [ticket, setTicket] = useState<Tr9aTicket>(),
    [tab, setTab] = useState("general"),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [trashText, setTrashText] = useState(""),
    [trashHex, setTrashHex] = useState(""),
    [trashSpecies, setTrashSpecies] = useState(25),
    [trashLanguage, setTrashLanguage] = useState(2),
    [trashGeneration, setTrashGeneration] = useState(9);
  const life = useRef({
      alive: true,
      epoch: 0,
      onRead,
      onDiscard,
      lang,
      ticket: undefined as Tr9aTicket | undefined,
    }),
    read = useRef<Promise<Tr9aCatalog | undefined>>(undefined),
    flight = useRef(false),
    locationUrls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    Object.assign(life.current, { onRead, onDiscard, lang });
  }, [onRead, onDiscard, lang]);
  useEffect(() => {
    const current = life.current;
    const downloads = locationUrls.current;
    current.alive = true;
    const epoch = current.epoch;
    read.current ??= current.onRead();
    void read.current
      .then((c) => {
        if (c && current.alive && epoch === current.epoch) {
          setCatalog(c);
          setDraft(tr9aDraft(c));
        }
      })
      .catch(() => {
        if (current.alive && epoch === current.epoch)
          setError(tr9aWords[current.lang].invalid);
      });
    return () => {
      current.alive = false;
      current.epoch++;
      if (current.ticket) void current.onDiscard(current.ticket.token);
      for (const [url, timer] of downloads) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      downloads.clear();
    };
  }, []);
  const locked = busy || pending,
    frame = ticket?.result ?? catalog;
  function update(patch: Partial<Tr9aRequest>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  }
  function trashEvent(event: import("./hall6").Hall6Trash) {
    if (!draft) return;
    update({ nameEvents: [...(draft.nameEvents ?? []), event] });
  }
  function idEvent(key: "tid" | "sid", value: string) {
    if (!draft || !catalog) return;
    const last = draft.idEvents?.at(-1),
      event = {
        tid: last?.tid ?? String(catalog.tid ?? 0),
        sid: last?.sid ?? String(catalog.sid ?? 0),
        [key]: value,
      };
    update({ idEvents: [...(draft.idEvents ?? []), event] });
  }
  async function readAgain() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const current = life.current,
      epoch = current.epoch;
    try {
      const c = await onRead();
      if (c && current.alive && epoch === current.epoch) {
        setCatalog(c);
        setDraft(tr9aDraft(c));
        setError("");
      }
    } catch {
      if (current.alive) setError(w.invalid);
    } finally {
      flight.current = false;
      if (current.alive) setPending(false);
    }
  }
  async function preview() {
    if (!catalog || !draft || locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setError("");
    setTicket(undefined);
    life.current.ticket = undefined;
    const current = life.current,
      epoch = current.epoch;
    try {
      const result = await onPreview(tr9aRequest(catalog, draft));
      if (!current.alive || epoch !== current.epoch) {
        if (result) await onDiscard(result.token);
        return;
      }
      if (result) {
        tr9aConfirmation(catalog, result);
        current.ticket = result;
        setTicket(result);
        setDirty(false);
      }
    } catch {
      if (current.alive) setError(w.invalid);
    } finally {
      flight.current = false;
      if (current.alive) setPending(false);
    }
  }
  async function discard() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const current = life.current;
    try {
      if (current.ticket) await onDiscard(current.ticket.token);
      if (current.alive) {
        current.ticket = undefined;
        setTicket(undefined);
        if (catalog) setDraft(tr9aDraft(catalog));
        setDirty(false);
        setError("");
      }
    } finally {
      flight.current = false;
      if (current.alive) setPending(false);
    }
  }
  async function apply() {
    if (!catalog || !ticket || dirty || locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const current = life.current;
    try {
      if ((await onApply(tr9aConfirmation(catalog, ticket))) && current.alive) {
        current.ticket = undefined;
        setTicket(undefined);
      }
    } catch {
      if (current.alive) setError(w.stale);
    } finally {
      flight.current = false;
      if (current.alive) setPending(false);
    }
  }
  const field = (
    label: string,
    key:
      | "money"
      | "royaleRegular"
      | "royaleInfinite"
      | "hours"
      | "minutes"
      | "seconds"
      | "surveyPoints",
    width: number,
    shortcut?: string,
  ) => (
    <label className="field" key={key}>
      <span>{label}</span>
      <div className="save-editor-toolbar save-trainer9a-numeric">
        <input
          inputMode="numeric"
          maxLength={width}
          value={draft?.[key] ?? ""}
          disabled={locked || !catalog?.canEdit}
          onChange={(e) =>
            update({ [key]: e.target.value.replace(/\D/g, "").slice(0, width) })
          }
        />
        {shortcut && (
          <button
            type="button"
            disabled={locked || !catalog?.canEdit}
            onClick={() => update({ [key]: shortcut })}
            title={`${label} · ${w.max}`}
            aria-label={`${label} · ${w.max}: ${shortcut}`}
          >
            {shortcut}
          </button>
        )}
      </div>
    </label>
  );
  function exportLocations() {
    if (!frame) return;
    const url = URL.createObjectURL(
      new Blob([tr9aScrewText(frame)], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "ColorfulScrewLocations.txt";
    link.click();
    locationUrls.current.set(
      url,
      setTimeout(() => {
        URL.revokeObjectURL(url);
        locationUrls.current.delete(url);
      }, 30000),
    );
  }
  const diffRows = (c: Tr9aCatalog): [string, string][] => [
    [w.name, c.name],
    [w.hex, c.nameTrash],
    [w.id, String(c.id)],
    [w.tid, String(c.tid)],
    [w.sid, String(c.sid)],
    [w.gender, c.gender === 0 ? w.male : w.female],
    [
      w.language,
      c.languages.find((v) => v.id === c.language)?.name[lang] ??
        String(c.language),
    ],
    [w.money, String(c.money)],
    [w.royaleRegular, String(c.royaleRegular)],
    [w.royaleInfinite, String(c.royaleInfinite)],
    [w.hours, String(c.hours)],
    [w.minutes, String(c.minutes)],
    [w.seconds, String(c.seconds)],
    [w.saved, c.saved],
    [w.mapName, c.map.name],
    ["X", c.map.x],
    ["Y", c.map.y],
    ["Z", c.map.z],
    [w.rotation, c.map.rotation],
    [w.surveyPoints, c.dlc ? String(c.dlc.surveyPoints) : ""],
    [w.streetName, c.dlc?.streetName ?? ""],
    [w.remaining, String(c.remainingScrews.length)],
    [w.quantity, String(c.screwQuantity)],
  ];
  return (
    <section className="save-trainer9-editor" aria-label={w.title}>
      <h3>{w.title}</h3>
      {!catalog || !draft ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={locked}
            onClick={() => void readAgain()}
          >
            {w.read}
          </button>
        </div>
      ) : (
        <>
          <div
            className="save-editor-toolbar"
            role="tablist"
            aria-label={w.title}
          >
            {(
              [
                "general",
                "map",
                ...(catalog.dlc ? ["dlc"] : []),
                "images",
                "unlocks",
              ] as const
            ).map((key) => (
              <button
                type="button"
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "primary" : undefined}
                disabled={locked}
                onClick={() => setTab(key)}
              >
                {w[key as "general" | "map" | "dlc" | "images" | "unlocks"]}
              </button>
            ))}
          </div>
          <fieldset
            disabled={locked || !catalog.canEdit}
            className="save-editor-fields"
          >
            {tab === "general" && (
              <>
                <label className="field">
                  <span>{w.name}</span>
                  <input
                    value={draft.name}
                    maxLength={12}
                    onChange={(e) =>
                      update({ name: e.target.value, nameEvents: undefined })
                    }
                  />
                </label>
                <label className="field">
                  <span>{w.id}</span>
                  <input
                    type="number"
                    min={0}
                    max={4294967295}
                    step={1}
                    value={draft.id}
                    onChange={(e) =>
                      update({
                        id: Number(e.target.value),
                        idEvents: undefined,
                      })
                    }
                  />
                </label>
                {(["tid", "sid"] as const).map((key) => (
                  <label className="field" key={key}>
                    <span>{w[key]}</span>
                    <input
                      inputMode="numeric"
                      maxLength={key === "tid" ? 6 : 4}
                      value={
                        draft.idEvents?.at(-1)?.[key] ?? String(catalog[key])
                      }
                      onChange={(e) =>
                        idEvent(key, e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </label>
                ))}
                <label className="field">
                  <span>{w.gender}</span>
                  <Select
                    value={draft.gender}
                    onChange={(e) => update({ gender: Number(e.target.value) })}
                  >
                    <option value={0}>{w.male}</option>
                    <option value={1}>{w.female}</option>
                  </Select>
                </label>
                <label className="field">
                  <span>{w.language}</span>
                  <Select
                    value={draft.language}
                    onChange={(e) =>
                      update({ language: Number(e.target.value) })
                    }
                  >
                    {catalog.languages.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name[lang]}
                      </option>
                    ))}
                  </Select>
                </label>
                {draft.gender !== catalog.gender && (
                  <p className="save-editor-note">{w.genderReset}</p>
                )}
                {field(w.money, "money", 7, "9999999")}
                {field(w.royaleRegular, "royaleRegular", 7, "310000")}
                {field(w.royaleInfinite, "royaleInfinite", 7, "50000")}
                {field(w.hours, "hours", 5)}
                {field(w.minutes, "minutes", 2)}
                {field(w.seconds, "seconds", 2)}
                <label className="field">
                  <span>{w.saved}</span>
                  <input
                    type="datetime-local"
                    step={1}
                    min="1753-01-01T00:00:00"
                    max="4095-12-31T23:59:59"
                    value={draft.saved}
                    onChange={(e) =>
                      update({
                        saved:
                          e.target.value.length === 16
                            ? e.target.value + ":00"
                            : e.target.value,
                      })
                    }
                  />
                </label>
                <details className="save-editor-note">
                  <summary>{w.trash}</summary>
                  <div className="save-editor-fields">
                    <label className="field">
                      <span>{w.text}</span>
                      <input
                        maxLength={12}
                        value={trashText}
                        onChange={(e) => setTrashText(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>{w.hex}</span>
                      <input
                        maxLength={52}
                        value={trashHex}
                        onChange={(e) => setTrashHex(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>{w.species}</span>
                      <Select
                        value={trashSpecies}
                        onChange={(e) =>
                          setTrashSpecies(Number(e.target.value))
                        }
                      >
                        {catalog.trashSpecies.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name[lang]}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="field">
                      <span>{w.language}</span>
                      <Select
                        value={trashLanguage}
                        onChange={(e) =>
                          setTrashLanguage(Number(e.target.value))
                        }
                      >
                        {catalog.trashLanguages.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name[lang]}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="field">
                      <span>{w.generation}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={trashGeneration}
                        onChange={(e) =>
                          setTrashGeneration(Number(e.target.value))
                        }
                      />
                    </label>
                  </div>
                  <div className="save-editor-toolbar">
                    <button
                      type="button"
                      onClick={() =>
                        trashEvent({ action: "text", text: trashText })
                      }
                    >
                      {w.text}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        trashEvent({ action: "hex", hex: trashHex })
                      }
                    >
                      {w.hex}
                    </button>
                    <button
                      type="button"
                      onClick={() => trashEvent({ action: "prepare" })}
                    >
                      {w.prepare}
                    </button>
                    <button
                      type="button"
                      onClick={() => trashEvent({ action: "clear" })}
                    >
                      {w.clear}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        trashEvent({
                          action: "layer",
                          species: trashSpecies,
                          language: trashLanguage,
                          generation: trashGeneration,
                          uiLanguage: lang,
                        })
                      }
                    >
                      {w.layer}
                    </button>
                  </div>
                  <div
                    className="save-editor-toolbar"
                    role="group"
                    aria-label={w.specialChars}
                  >
                    {catalog.specialChars.map((code) => (
                      <button
                        key={code}
                        type="button"
                        title={`U+${code.toString(16).toUpperCase()}`}
                        aria-label={`${w.specialChars}: ${String.fromCodePoint(code)}`}
                        disabled={trashText.length >= 12}
                        onClick={() =>
                          setTrashText((text) =>
                            (text + String.fromCodePoint(code)).slice(0, 12),
                          )
                        }
                      >
                        {String.fromCodePoint(code)}
                      </button>
                    ))}
                  </div>
                  <p>
                    {w.hex}: {frame?.nameTrash}
                  </p>
                </details>
              </>
            )}
            {tab === "map" && (
              <>
                {!catalog.map.editable && (
                  <p className="save-editor-note">{w.mapDisabled}</p>
                )}
                <label className="field">
                  <span>{w.mapName}</span>
                  <input
                    value={draft.mapName}
                    maxLength={32}
                    disabled={!catalog.map.editable}
                    onChange={(e) =>
                      update({ mapName: e.target.value, mapUpdated: true })
                    }
                  />
                </label>
                {["X", "Y", "Z", w.rotation].map((label, i) => (
                  <label className="field" key={i}>
                    <span>{label}</span>
                    <input
                      type="number"
                      min={-99999999}
                      max={99999999}
                      step={0.000001}
                      value={draft.map[i]}
                      disabled={!catalog.map.editable}
                      onChange={(e) =>
                        update({
                          map: draft.map.map((v, j) =>
                            j === i ? e.target.value : v,
                          ),
                          mapUpdated: true,
                        })
                      }
                    />
                  </label>
                ))}
              </>
            )}
            {tab === "dlc" && catalog.dlc && (
              <>
                {field(w.surveyPoints, "surveyPoints", 7, "100000")}
                <label className="field">
                  <span>{w.streetName}</span>
                  <input
                    value={draft.streetName ?? ""}
                    maxLength={18}
                    onChange={(e) => update({ streetName: e.target.value })}
                  />
                </label>
              </>
            )}
          </fieldset>
          {tab === "images" && frame && (
            <div className="save-trainer9-images">
              {frame.images.map((v) => (
                <SaveTrainerImage
                  key={v.image.key}
                  image={v.image}
                  fileName={v.fileName}
                  title={w[v.image.key as "current" | "sbc" | "initial"]}
                  unavailable={w.unavailable}
                  exportLabel={w.export}
                />
              ))}
            </div>
          )}
          {tab === "unlocks" && frame && (
            <>
              <div className="save-trainer9-unlocks">
                {(
                  [
                    "technicalMachines",
                    "screws",
                    "resetAndCollectScrews",
                  ] as const
                ).map((key) => (
                  <label className="save-editor-review" key={key}>
                    <input
                      type="checkbox"
                      disabled={locked || !catalog.canEdit}
                      checked={draft.operations?.includes(key) ?? false}
                      onChange={(e) =>
                        update({
                          operations: e.target.checked
                            ? [...(draft.operations ?? []), key]
                            : draft.operations?.filter((v) => v !== key),
                        })
                      }
                    />
                    {w[key]}
                  </label>
                ))}
              </div>
              <p>
                {w.remaining}: {frame.remainingScrews.length} · {w.quantity}:{" "}
                {frame.screwQuantity}
              </p>
              <div className="save-editor-toolbar">
                <button type="button" onClick={exportLocations}>
                  {w.locations}
                </button>
              </div>
              <details className="save-trainer9a-locations">
                <summary>{w.remaining}</summary>
                <pre>{tr9aScrewText(frame)}</pre>
              </details>
            </>
          )}
          {ticket && (
            <>
              <p role="status">
                {w.changes}: {ticket.changedOffsets.length}
              </p>
              <dl className="save-editor-summary">
                {diffRows(ticket.result).map(([label, value], i) => {
                  const old = diffRows(ticket.before)[i][1];
                  return old === value ? null : (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        {old} → {value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {ticket.before.fashion.some(
                (v, i) => v !== ticket.result.fashion[i],
              ) && <p>{w.genderReset}</p>}
              {ticket.operations.map((v, i) => (
                <p key={i}>
                  {
                    w[
                      v.key as
                        "technicalMachines" | "screws" | "resetAndCollectScrews"
                    ]
                  }{" "}
                  · {w.count}: {v.count}
                </p>
              ))}
            </>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || !catalog.canEdit}
              onClick={() => void preview()}
            >
              {w.preview}
            </button>
            <button
              type="button"
              disabled={locked || (!ticket && !dirty)}
              onClick={() => void discard()}
            >
              {w.cancel}
            </button>
            <button
              type="button"
              className="primary"
              disabled={locked || dirty || !ticket}
              onClick={() => void apply()}
            >
              {w.apply}
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
    </section>
  );
}

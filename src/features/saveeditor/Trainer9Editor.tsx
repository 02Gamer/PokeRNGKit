import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  tr9Confirmation,
  tr9Draft,
  tr9Pixels,
  tr9Bmp,
  tr9Request,
  tr9Words,
  type Tr9Catalog,
  type Tr9Confirmation,
  type Tr9Image,
  type Tr9Request,
  type Tr9Ticket,
} from "./trainer9";
import "./Trainer9Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<Tr9Catalog | undefined>;
  onPreview(edit: Tr9Request): Promise<Tr9Ticket | undefined>;
  onApply(confirm: Tr9Confirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
};
export function Trainer9Editor(props: Props) {
  return <Form key={props.revision} {...props} />;
}
function Form({ busy, lang, onRead, onPreview, onApply, onDiscard }: Props) {
  const w = tr9Words[lang];
  const [catalog, setCatalog] = useState<Tr9Catalog>(),
    [draft, setDraft] = useState<Tr9Request>(),
    [ticket, setTicket] = useState<Tr9Ticket>(),
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
      ticket: undefined as Tr9Ticket | undefined,
    }),
    read = useRef<Promise<Tr9Catalog | undefined>>(undefined),
    flight = useRef(false);
  useEffect(() => {
    Object.assign(life.current, { onRead, onDiscard, lang });
  }, [onRead, onDiscard, lang]);
  useEffect(() => {
    const current = life.current;
    current.alive = true;
    const epoch = current.epoch;
    read.current ??= current.onRead();
    void read.current
      .then((c) => {
        if (c && current.alive && epoch === current.epoch) {
          setCatalog(c);
          setDraft(tr9Draft(c));
        }
      })
      .catch(() => {
        if (current.alive && epoch === current.epoch)
          setError(tr9Words[current.lang].invalid);
      });
    return () => {
      current.alive = false;
      current.epoch++;
      if (current.ticket) void current.onDiscard(current.ticket.token);
    };
  }, []);
  const locked = busy || pending,
    frame = ticket?.result ?? catalog;
  function update(patch: Partial<Tr9Request>) {
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
        setDraft(tr9Draft(c));
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
      const result = await onPreview(tr9Request(catalog, draft));
      if (!current.alive || epoch !== current.epoch) {
        if (result) await onDiscard(result.token);
        return;
      }
      if (result) {
        tr9Confirmation(catalog, result);
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
        if (catalog) setDraft(tr9Draft(catalog));
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
      if ((await onApply(tr9Confirmation(catalog, ticket))) && current.alive) {
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
  const numeric = (
    label: string,
    key:
      | "money"
      | "leaguePoints"
      | "blueberryPoints"
      | "hours"
      | "minutes"
      | "seconds",
    width: number,
  ) => (
    <label className="field">
      <span>{label}</span>
      <input
        inputMode="numeric"
        maxLength={width}
        value={draft?.[key] ?? ""}
        disabled={locked || !catalog?.canEdit}
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </label>
  );
  return (
    <section className="save-trainer9-editor" aria-label={w.title}>
      <h3>{w.title}</h3>
      {!catalog || !draft || !frame ? (
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
          <div className="save-editor-toolbar" role="tablist">
            {[
              "general",
              "map",
              ...(catalog.blueberry ? ["blueberry"] : []),
              "images",
              "unlocks",
            ].map((key) => (
              <button
                role="tab"
                type="button"
                key={key}
                aria-selected={tab === key}
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
              >
                {
                  w[
                    key as
                      "general" | "map" | "blueberry" | "images" | "unlocks"
                  ]
                }
              </button>
            ))}
          </div>
          {tab === "general" && (
            <div className="save-editor-fields">
              <label className="field">
                <span>{w.name}</span>
                <input
                  value={draft.name}
                  maxLength={12}
                  disabled={locked || !catalog.canEdit}
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
                  disabled={locked || !catalog.canEdit}
                  onChange={(e) =>
                    update({ id: Number(e.target.value), idEvents: undefined })
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
                      draft.idEvents?.at(-1)?.[key] ?? String(catalog[key] ?? 0)
                    }
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) => idEvent(key, e.target.value)}
                  />
                </label>
              ))}
              <label className="field">
                <span>{w.gender}</span>
                <Select
                  value={draft.gender}
                  disabled={locked || !catalog.canEdit}
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
                  disabled={locked || !catalog.canEdit}
                  onChange={(e) => update({ language: Number(e.target.value) })}
                >
                  {catalog.languages.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{w.game}</span>
                <Select
                  value={draft.version}
                  disabled={locked || !catalog.canEdit}
                  onChange={(e) => update({ version: e.target.value })}
                >
                  <option value="SL">
                    {lang === "zh"
                      ? "朱"
                      : lang === "ja"
                        ? "スカーレット"
                        : "Scarlet"}
                  </option>
                  <option value="VL">
                    {lang === "zh"
                      ? "紫"
                      : lang === "ja"
                        ? "バイオレット"
                        : "Violet"}
                  </option>
                </Select>
              </label>
              {numeric(w.money, "money", 7)}
              {numeric(w.lp, "leaguePoints", 7)}
              {numeric(w.hours, "hours", 5)}
              {numeric(w.minutes, "minutes", 2)}
              {numeric(w.seconds, "seconds", 2)}
              <label className="field">
                <span>{w.enrollment}</span>
                <input
                  type="date"
                  min="1932-01-01"
                  max="2050-12-31"
                  value={draft.enrollment.slice(0, 10)}
                  disabled={locked || !catalog.canEdit}
                  onChange={(e) =>
                    update({
                      enrollment: e.target.value + "T00:00:00",
                    })
                  }
                />
              </label>
              <label className="field">
                <span>{w.saved}</span>
                <input
                  type="datetime-local"
                  step={1}
                  min="1753-01-01T00:00:00"
                  max="4095-12-31T23:59:59"
                  value={draft.saved}
                  disabled={locked || !catalog.canEdit}
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
            </div>
          )}
          {tab === "general" && catalog.nameTrash && (
            <details>
              <summary>{w.trash}</summary>
              <div className="save-editor-fields">
                <label className="field">
                  <span>{w.text}</span>
                  <input
                    maxLength={12}
                    value={trashText}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) => setTrashText(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{w.hex}</span>
                  <input
                    maxLength={52}
                    value={trashHex || frame.nameTrash || ""}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) => setTrashHex(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{w.species}</span>
                  <Select
                    value={trashSpecies}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) => setTrashSpecies(Number(e.target.value))}
                  >
                    {catalog.trashSpecies?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name[lang]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="field">
                  <span>{w.language}</span>
                  <Select
                    value={trashLanguage}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) => setTrashLanguage(Number(e.target.value))}
                  >
                    {catalog.trashLanguages?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name[lang]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="field">
                  <span>{w.generation}</span>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    value={trashGeneration}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) => setTrashGeneration(Number(e.target.value))}
                  />
                </label>
              </div>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() =>
                    trashEvent({ action: "text", text: trashText })
                  }
                >
                  {w.text}
                </button>
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() =>
                    trashEvent({
                      action: "hex",
                      hex: trashHex || frame.nameTrash,
                    })
                  }
                >
                  {w.hex}
                </button>
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() => trashEvent({ action: "prepare" })}
                >
                  {w.prepare}
                </button>
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() => trashEvent({ action: "clear" })}
                >
                  {w.clear}
                </button>
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
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
            </details>
          )}
          {tab === "map" && (
            <>
              {!catalog.map.editable && <p>{w.mapDisabled}</p>}
              <div className="save-editor-fields">
                {["X", "Y", "Z", w.rotation].map((label, i) => (
                  <label className="field" key={i}>
                    <span>{label}</span>
                    <input
                      type="number"
                      min={-99999999}
                      max={99999999}
                      step="0.000001"
                      value={draft.map[i]}
                      disabled={
                        locked || !catalog.canEdit || !catalog.map.editable
                      }
                      onChange={(e) =>
                        update({
                          mapUpdated: true,
                          map: draft.map.map((v, j) =>
                            j === i ? e.target.value : v,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </>
          )}
          {tab === "blueberry" && catalog.blueberry && (
            <div className="save-editor-fields">
              {numeric(w.bp, "blueberryPoints", 7)}
              {(["solo", "group"] as const).map((key) => (
                <label className="field" key={key}>
                  <span>{w[key]}</span>
                  <input
                    type="number"
                    min={0}
                    max={4294967295}
                    step={1}
                    value={draft[key]}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) => update({ [key]: Number(e.target.value) })}
                  />
                </label>
              ))}
              <label className="field">
                <span>{w.throwStyle}</span>
                <Select
                  value={draft.throwStyle}
                  disabled={locked || !catalog.canEdit}
                  onChange={(e) =>
                    update({ throwStyle: Number(e.target.value) })
                  }
                >
                  {catalog.blueberry.throwStyles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          )}
          {tab === "images" && (
            <div className="save-trainer9-images">
              {frame.images.map((image) => (
                <TrainerImage
                  key={image.key}
                  image={image}
                  title={w[image.key as "photo" | "icon" | "initialIcon"]}
                  unavailable={w.unavailable}
                  exportLabel={w.export}
                />
              ))}
            </div>
          )}
          {tab === "unlocks" && (
            <div className="save-trainer9-unlocks">
              {[
                "clothing",
                "bike",
                "stakes",
                "tm",
                "fly",
                ...(catalog.blueberry
                  ? ["throwStyles", "coaches", "legendaries"]
                  : []),
              ].map((operation) => (
                <label className="save-editor-review" key={operation}>
                  <input
                    type="checkbox"
                    checked={draft.operations.includes(operation)}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) =>
                      update({
                        operations: e.target.checked
                          ? [...draft.operations, operation]
                          : draft.operations.filter((v) => v !== operation),
                      })
                    }
                  />
                  {
                    w[
                      operation as
                        | "clothing"
                        | "bike"
                        | "stakes"
                        | "tm"
                        | "fly"
                        | "throwStyles"
                        | "coaches"
                        | "legendaries"
                    ]
                  }
                </label>
              ))}
            </div>
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
              disabled={locked || (!dirty && !ticket)}
              onClick={() => void discard()}
            >
              {w.cancel}
            </button>
            {ticket && (
              <button
                type="button"
                className="primary"
                disabled={locked || dirty || !ticket.changedOffsets.length}
                onClick={() => void apply()}
              >
                {w.apply}
              </button>
            )}
          </div>
          {ticket && (
            <p>
              {w.changes}: {ticket.changedOffsets.length}
            </p>
          )}
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
function TrainerImage({
  image,
  title,
  unavailable,
  exportLabel,
}: {
  image: Tr9Image;
  title: string;
  unavailable: string;
  exportLabel: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    urls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lifetime = useRef({ alive: true, epoch: 0 });
  let pixels: Uint8ClampedArray | undefined;
  try {
    if (image.available) pixels = tr9Pixels(image);
  } catch {
    pixels = undefined;
  }
  const error = !pixels;
  useEffect(() => {
    const element = canvas.current;
    if (!element || !image.available) return;
    try {
      const rendered = tr9Pixels(image);
      element.width = image.width;
      element.height = image.height;
      element
        .getContext("2d")
        ?.putImageData(
          new ImageData(rendered, image.width, image.height),
          0,
          0,
        );
    } catch {
      element.width = element.height = 0;
    }
  }, [image]);
  useEffect(() => {
    const current = urls.current;
    const active = lifetime.current;
    active.alive = true;
    return () => {
      active.alive = false;
      active.epoch++;
      for (const [url, timer] of current) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      current.clear();
    };
  }, []);
  function download(format: "png" | "jpg" | "bmp") {
    const element = canvas.current;
    if (!element || !image.available || error) return;
    const active = lifetime.current,
      epoch = active.epoch;
    const publish = (blob: Blob | null) => {
      if (!blob || !active.alive || epoch !== active.epoch) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `${image.key}.${format}`;
      link.click();
      urls.current.set(
        url,
        setTimeout(() => {
          URL.revokeObjectURL(url);
          urls.current.delete(url);
        }, 30000),
      );
    };
    if (format === "bmp") {
      publish(new Blob([tr9Bmp(image)], { type: "image/bmp" }));
      return;
    }
    element.toBlob(publish, format === "jpg" ? "image/jpeg" : "image/png");
  }
  return (
    <section>
      <h4>{title}</h4>
      {image.available && !error ? (
        <canvas ref={canvas} role="img" aria-label={title} />
      ) : (
        <p>{unavailable}</p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!image.available || error}
          onClick={() => download("png")}
        >
          {exportLabel} PNG
        </button>
        <button
          type="button"
          disabled={!image.available || error}
          onClick={() => download("jpg")}
        >
          {exportLabel} JPG
        </button>
        <button
          type="button"
          disabled={!image.available || error}
          onClick={() => download("bmp")}
        >
          {exportLabel} BMP
        </button>
      </div>
    </section>
  );
}

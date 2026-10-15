import { useEffect, useRef, useState } from "react";
import { saveCommitHasSound } from "./saveEditSound";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import {
  donutImage,
  donutEffectImage,
  donutProfileImage,
  donutBerryImage,
} from "./art";
import type { Br4Lang } from "./br4";
import type { OriginChoice } from "./domain";
import {
  donut9aRequest,
  donut9aFrozen,
  donut9aWallClock,
  type Dn9aCatalog,
  type Dn9aEntry,
  type Dn9aEdit,
  type Dn9aTicket,
  type Dn9aConfirmation,
  type Dn9aExportMode,
} from "./donut9a";
import { donut9aWords } from "./donut9aWords";
import "./Donut9aEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Dn9aCatalog | undefined>;
  onPreview(e: Dn9aEdit): Promise<Dn9aTicket | undefined>;
  onApply(e: Dn9aConfirmation, sourceSound?: true): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
  onExport(index: number, mode: Dn9aExportMode): Promise<boolean>;
};
export function Donut9aEditor(p: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Dn9aCatalog }>();
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
      <h3>{donut9aWords[p.lang].title}</h3>
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
          {donut9aWords[p.lang].read}
        </button>
      )}
    </section>
  );
}
type Group = "basic" | "berries" | "effects" | "time" | "generate" | "files";
function Choice({
  value,
  options,
  label,
  lang,
  disabled,
  onChange,
}: {
  value: number;
  options: OriginChoice[];
  label: string;
  lang: Br4Lang;
  disabled: boolean;
  onChange(id: number): void;
}) {
  const [input, setInput] = useState<string>();
  return (
    <AutoCompleteComboBox
      value={value}
      inputValue={
        input ??
        options.find((v) => v.id === value)?.name[lang] ??
        String(value)
      }
      label={label}
      options={options.map((v) => ({ value: v.id, label: v.name[lang] }))}
      onInputChange={setInput}
      onValueChange={(v) => {
        setInput(undefined);
        onChange(v);
      }}
      disabled={disabled}
    />
  );
}
function Profile({ entry, lang }: { entry: Dn9aEntry; lang: Br4Lang }) {
  const w = donut9aWords[lang];
  const order = [0, 4, 1, 3, 2];
  const points = order.map((stat, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    return `${138 + 55 * (entry.scale[stat] ?? 0.1) * Math.cos(angle)},${120 + 55 * (entry.scale[stat] ?? 0.1) * Math.sin(angle)}`;
  });
  const polygon = [0, 4, 3, 2, 1].map((i) => points[i]).join(" ");
  return (
    <figure className="save-donut-profile">
      <svg
        viewBox="0 0 276 240"
        role="img"
        aria-label={`${w.profile}: ${w.profileNames.map((n, i) => `${n} ${entry.profile[i]}`).join(", ")}`}
      >
        <image href={donutProfileImage()} width="276" height="240" />
        <polygon points={polygon} fill="#facc15" opacity=".85" />
      </svg>
      <figcaption>
        {w.profileNames.map((n, i) => (
          <span key={n}>
            {n}: {entry.profile[i]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
function Form({
  c,
  busy,
  lang,
  onPreview,
  onApply,
  onDiscard,
  onExport,
}: Props & { c: Dn9aCatalog }) {
  const w = donut9aWords[lang];
  const [index, setIndex] = useState(0),
    [slotInput, setSlotInput] = useState<string>(),
    [group, setGroup] = useState<Group>("basic"),
    [events, setEvents] = useState<NonNullable<Dn9aEdit["fields"]>>([]),
    [ticket, setTicket] = useState<Dn9aTicket>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [hex, setHex] = useState<string>(),
    [start, setStart] = useState("0"),
    [end, setEnd] = useState("999"),
    [flavors, setFlavors] = useState(
      c.flavors.filter((f) => f.generatorAllowed).map((f) => f.id),
    ),
    [reviewIndex, setReviewIndex] = useState<number>();
  const [reviewInput, setReviewInput] = useState<string>();
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | "">("");
  const alive = useRef(true);
  const discard = useRef(onDiscard),
    cueOrigin = useRef<
      { token: string; action: Dn9aEdit["action"] } | undefined
    >(undefined),
    token = useRef<string | undefined>(undefined),
    origin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    discard.current = onDiscard;
  }, [onDiscard]);
  useEffect(() => {
    token.current = ticket?.token;
  }, [ticket]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (token.current) void discard.current(token.current);
    };
  }, []);
  const entry = c.entries.find((e) => e.index === index);
  if (!entry) return <p>{w.missing}</p>;
  const locked = busy || pending || !!ticket || !c.canEdit;
  const draft = events.length > 0;
  const operationLocked = locked || draft;
  const text = (key: string, base: string) =>
    [...events].reverse().find((e) => e.key === key)?.value ?? base;
  function change(key: string, value: string) {
    if (events.length >= 512) {
      setError(w.invalid);
      return;
    }
    setEvents((e) => [...e, { key, value }]);
  }
  const label = (e: Dn9aEntry) =>
    `#${String(e.index + 1).padStart(3, "0")} · ${e.stars}★ · ${e.calories}`;
  async function preview(e: Omit<Dn9aEdit, "sourceHash" | "index">) {
    origin.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPending(true);
    setError("");
    try {
      const p = await onPreview(donut9aRequest(c, { ...e, index }));
      if (p) {
        cueOrigin.current = { token: p.token, action: e.action };
        setTicket(p);
        setReviewIndex(p.changedEntries[0] ?? index);
        setReviewInput(undefined);
      }
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  async function cancel() {
    if (!ticket) return;
    setPending(true);
    try {
      await onDiscard(ticket.token);
      setTicket(undefined);
      token.current = undefined;
      requestAnimationFrame(() => origin.current?.focus());
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  async function importFile(file: File | undefined) {
    if (!file || operationLocked) return;
    setError("");
    if (file.size !== 72) {
      setError(w.invalid);
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    await preview({
      action: "import",
      hex: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
    });
  }
  function chooseSlot(value: number) {
    if (operationLocked) return;
    setIndex(value);
    setSlotInput(undefined);
    setEvents([]);
    setHex(undefined);
    setError("");
  }
  const oldReview = c.entries.find((e) => e.index === (reviewIndex ?? index));
  const newReview = ticket?.result.entries.find(
    (e) => e.index === (reviewIndex ?? index),
  );
  return (
    <div
      className="save-donut-body"
      onDragOver={(e) => {
        if (!operationLocked) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        void importFile(e.dataTransfer.files[0]);
      }}
    >
      <label>
        <span>{w.slot}</span>
        <AutoCompleteComboBox
          value={index}
          inputValue={slotInput ?? label(entry)}
          label={w.slot}
          options={c.entries.map((e) => ({ value: e.index, label: label(e) }))}
          onInputChange={setSlotInput}
          onValueChange={chooseSlot}
          disabled={operationLocked}
        />
      </label>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={operationLocked || index <= 0}
          onClick={() => chooseSlot(index - 1)}
        >
          {w.previous}
        </button>
        <button
          type="button"
          disabled={operationLocked || index >= 998}
          onClick={() => chooseSlot(index + 1)}
        >
          {w.next}
        </button>
      </div>
      <div className="save-donut-summary">
        <figure>
          <img
            src={donutImage(entry.sprite)}
            alt={
              c.donuts.find((v) => v.id === entry.donut)?.name[lang] ??
              w.unknown
            }
            width={96}
            height={96}
          />
          <figcaption>
            {label(entry)}
            {!entry.hasMilliseconds ? ` · ${w.empty}` : ""}
          </figcaption>
        </figure>
        <Profile entry={entry} lang={lang} />
      </div>
      <label>
        <span>{w.group}</span>
        <Select
          value={group}
          disabled={busy || pending || !!ticket}
          onChange={(e) => setGroup(e.target.value as Group)}
        >
          {(
            [
              "basic",
              "berries",
              "effects",
              "time",
              "generate",
              "files",
            ] as Group[]
          ).map((g) => (
            <option key={g} value={g}>
              {w[g]}
            </option>
          ))}
        </Select>
      </label>
      {!entry.canLoad && <p>{w.invalidDate}</p>}
      {group === "basic" ? (
        <div className="save-donut-fields">
          {[
            {
              key: "stars",
              name: w.stars,
              base: Math.min(entry.stars, 6),
              max: 6,
            },
            { key: "boost", name: w.boost, base: entry.levelBoost, max: 255 },
            {
              key: "calories",
              name: w.calories,
              base: entry.calories,
              max: 65535,
            },
          ].map((f) => (
            <label key={f.key}>
              <span>{f.name}</span>
              <input
                value={text(f.key, String(f.base))}
                maxLength={32767}
                inputMode="numeric"
                disabled={locked || !entry.canLoad}
                onChange={(e) => change(f.key, e.target.value)}
              />
              <small>0–{f.max}</small>
            </label>
          ))}
          <label>
            <span>{w.donut}</span>
            <Choice
              value={Number(
                text(
                  "donut",
                  String(
                    c.donuts.some((d) => d.id === entry.donut)
                      ? entry.donut
                      : 0,
                  ),
                ),
              )}
              options={c.donuts}
              lang={lang}
              label={w.donut}
              disabled={locked || !entry.canLoad}
              onChange={(v) => change("donut", String(v))}
            />
          </label>
        </div>
      ) : group === "berries" ? (
        <div className="save-donut-fields">
          {entry.berries.map((berry, i) => (
            <label key={i}>
              <span>{i === 0 ? w.namedBerry : `${w.berry} ${i}`}</span>
              <Choice
                value={Number(
                  text(
                    "berry" + i,
                    String(c.berries.some((v) => v.id === berry) ? berry : 0),
                  ),
                )}
                options={c.berries}
                lang={lang}
                label={i === 0 ? w.namedBerry : `${w.berry} ${i}`}
                disabled={locked || !entry.canLoad}
                onChange={(v) => change("berry" + i, String(v))}
              />
              {Number(text("berry" + i, String(berry))) > 0 && (
                <img
                  className="save-donut-effect"
                  src={donutBerryImage(
                    Number(text("berry" + i, String(berry))),
                  )}
                  alt=""
                />
              )}
            </label>
          ))}
        </div>
      ) : group === "effects" ? (
        <div className="save-donut-fields">
          {entry.flavors.map((raw, i) => {
            const f = c.flavors.find((v) => v.hash === raw);
            const selectedId = Number(text("flavor" + i, String(f?.id ?? 0)));
            const selectedFlavor = c.flavors.find((v) => v.id === selectedId);
            return (
              <label key={i}>
                <span>
                  {w.effect} {i + 1}
                </span>
                <Choice
                  value={selectedId}
                  lang={lang}
                  options={[
                    { id: 0, name: { zh: w.none, en: w.none, ja: w.none } },
                    ...c.flavors,
                  ]}
                  label={`${w.effect} ${i + 1}`}
                  disabled={locked || !entry.canLoad}
                  onChange={(v) => change("flavor" + i, String(v))}
                />
                {selectedFlavor && (
                  <img
                    className="save-donut-effect"
                    src={donutEffectImage(selectedFlavor.sprite)}
                    alt=""
                  />
                )}
                <small>{raw}</small>
              </label>
            );
          })}
        </div>
      ) : group === "time" ? (
        <>
          <p>{w.timeHint}</p>
          <div className="save-donut-fields">
            <label>
              <span>{w.date}</span>
              <input
                type="datetime-local"
                step={1}
                min="1753-01-01T00:00:00"
                max="4095-12-31T00:00:00"
                value={text("date", entry.date)}
                disabled={locked || !entry.canLoad}
                onChange={(e) =>
                  change(
                    "date",
                    e.target.value.length === 16
                      ? e.target.value + ":00"
                      : e.target.value,
                  )
                }
              />
            </label>
            <label>
              <span>{w.milliseconds}</span>
              <input
                value={text("milliseconds", entry.milliseconds)}
                maxLength={32767}
                inputMode="numeric"
                disabled={locked || !entry.canLoad}
                onChange={(e) => change("milliseconds", e.target.value)}
              />
            </label>
          </div>
        </>
      ) : group === "generate" ? (
        <>
          <p>{w.generatorHint}</p>
          <div className="save-donut-fields">
            <label>
              <span>{w.start}</span>
              <input
                type="number"
                min={0}
                max={998}
                step={1}
                value={start}
                disabled={operationLocked}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              <span>{w.end}</span>
              <input
                type="number"
                min={0}
                max={999}
                step={1}
                value={end}
                disabled={operationLocked}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={operationLocked}
              onClick={() =>
                setFlavors(
                  c.flavors.filter((f) => f.generatorAllowed).map((f) => f.id),
                )
              }
            >
              {w.selectAll}
            </button>
            <button
              type="button"
              disabled={operationLocked}
              onClick={() => setFlavors([])}
            >
              {w.selectNone}
            </button>
          </div>
          <div className="save-donut-flavors">
            {c.flavors
              .filter((f) => f.generatorAllowed)
              .map((f) => (
                <label key={f.id}>
                  <input
                    type="checkbox"
                    checked={flavors.includes(f.id)}
                    disabled={operationLocked}
                    onChange={(e) =>
                      setFlavors((old) =>
                        e.target.checked
                          ? [...old, f.id]
                          : old.filter((id) => id !== f.id),
                      )
                    }
                  />
                  <span>{f.name[lang]}</span>
                </label>
              ))}
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={operationLocked || !entry.canLoad}
              onClick={() =>
                void preview({
                  action: "generate",
                  start: Number(start || "0"),
                  end: Number(end || "999"),
                  flavors: c.flavors
                    .filter((f) => f.generatorAllowed && flavors.includes(f.id))
                    .map((f) => f.id),
                  now: donut9aWallClock(),
                })
              }
            >
              {w.generateApply}
            </button>
            <button
              type="button"
              disabled={operationLocked}
              onClick={() =>
                void preview({ action: "randomLv3", now: donut9aWallClock() })
              }
            >
              {w.randomLv3}
            </button>
            <button
              type="button"
              disabled={operationLocked}
              onClick={() =>
                void preview({ action: "shiny", now: donut9aWallClock() })
              }
            >
              {w.shiny}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{w.hexHint}</p>
          <label>
            <span>{w.import}</span>
            <input
              type="file"
              accept=".donut"
              disabled={operationLocked}
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <label>
            <span>{w.hex}</span>
            <textarea
              maxLength={32767}
              value={hex ?? entry.raw}
              disabled={operationLocked}
              onChange={(e) => setHex(e.target.value)}
            />
          </label>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={operationLocked}
              onClick={() =>
                void preview({ action: "hex", hex: hex ?? entry.raw })
              }
            >
              {w.importHex}
            </button>
            <button
              type="button"
              disabled={operationLocked || !entry.canLoad}
              onClick={() => void onExport(index, "file")}
            >
              {w.export}
            </button>
            <button
              type="button"
              disabled={operationLocked || !entry.canLoad}
              onClick={() => void onExport(index, "text")}
            >
              {w.exportHex}
            </button>
            <button
              type="button"
              disabled={operationLocked || !entry.canLoad}
              onClick={async () => {
                setPending(true);
                setCopyStatus("");
                try {
                  const copied = await onExport(index, "clipboard");
                  if (alive.current)
                    setCopyStatus(copied ? "copied" : "failed");
                } catch {
                  if (alive.current) setCopyStatus("failed");
                } finally {
                  if (alive.current) setPending(false);
                }
              }}
            >
              {w.copyHex}
            </button>
          </div>
          {copyStatus && (
            <p role={copyStatus === "failed" ? "alert" : "status"}>
              {copyStatus === "copied" ? w.copied : w.copyFailed}
            </p>
          )}
        </>
      )}
      {draft && (
        <>
          <p>
            {w.draft}: {events.length} · {w.editHint}
          </p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || !entry.canLoad}
              onClick={() =>
                void preview({
                  action: "patch",
                  fields: events,
                  uiLanguage: lang,
                  now: donut9aWallClock(),
                })
              }
            >
              {w.preview}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => setEvents([])}
            >
              {w.discard}
            </button>
          </div>
        </>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={operationLocked || !entry.canLoad}
          onClick={() => void preview({ action: "resave" })}
        >
          {w.resave}
        </button>
        <button
          type="button"
          disabled={operationLocked}
          onClick={() => void preview({ action: "reset" })}
        >
          {w.reset}
        </button>
        <button
          type="button"
          disabled={operationLocked || !entry.canLoad}
          onClick={() => void preview({ action: "clone" })}
        >
          {w.clone}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {ticket && (
        <section className="save-donut-preview" aria-label={w.preview}>
          <h4>{w.preview}</h4>
          <p>
            {w.changed}: {ticket.changedEntries.length} · {w.changedBytes}:{" "}
            {ticket.changedOffsets.length}
            {ticket.changedEntries.length === 0 ? ` · ${w.noChanges}` : ""}
          </p>
          {ticket.ignoredFields.length > 0 && (
            <p>
              {w.ignored}:{" "}
              {ticket.ignoredFields
                .map((k) =>
                  k.startsWith("milliseconds")
                    ? w.milliseconds
                    : k.startsWith("date")
                      ? w.date
                      : k === "stars"
                        ? w.stars
                        : k === "boost"
                          ? w.boost
                          : k === "calories"
                            ? w.calories
                            : k,
                )
                .join(" / ")}
            </p>
          )}
          <label>
            <span>{w.more}</span>
            <AutoCompleteComboBox
              value={reviewIndex ?? index}
              inputValue={reviewInput ?? String((reviewIndex ?? index) + 1)}
              label={w.more}
              disabled={busy || pending}
              onInputChange={setReviewInput}
              onValueChange={(value) => {
                setReviewIndex(value);
                setReviewInput(undefined);
              }}
              options={(ticket.changedEntries.length
                ? ticket.changedEntries
                : [index]
              ).map((i) => ({ value: i, label: String(i + 1) }))}
            />
          </label>
          {oldReview && newReview && (
            <div className="save-donut-comparison">
              {[
                { row: oldReview, title: w.before },
                { row: newReview, title: w.after },
              ].map(({ row, title }) => (
                <div key={title}>
                  <h4>{title}</h4>
                  <img
                    src={donutImage(row.sprite)}
                    alt=""
                    width={96}
                    height={96}
                  />
                  <p>
                    {w.stars}: {row.stars} · {w.boost}: {row.levelBoost} ·{" "}
                    {w.calories}: {row.calories}
                  </p>
                  <p>
                    {c.donuts.find((v) => v.id === row.donut)?.name[lang] ??
                      `${w.unknown} (${row.donut})`}
                  </p>
                  <Profile entry={row} lang={lang} />
                  <p>
                    {w.date}: {row.date}
                  </p>
                  <p>
                    {w.milliseconds}: {row.milliseconds}
                  </p>
                  <p>
                    {w.berries}:{" "}
                    {row.berries
                      .map(
                        (id) =>
                          c.berries.find((b) => b.id === id)?.name[lang] ??
                          String(id),
                      )
                      .join(" / ")}
                  </p>
                  <p>
                    {w.effects}:{" "}
                    {row.flavors
                      .map((hash) =>
                        hash === "0000000000000000"
                          ? w.none
                          : (c.flavors.find((f) => f.hash === hash)?.name[
                              lang
                            ] ?? hash),
                      )
                      .join(" / ")}
                  </p>
                  <details>
                    <summary>{w.hex}</summary>
                    <code>{row.raw}</code>
                  </details>
                </div>
              ))}
            </div>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={async () => {
                setPending(true);
                setError("");
                try {
                  const applied = await onApply(
                    donut9aFrozen(c, ticket),
                    cueOrigin.current?.token === ticket.token &&
                      saveCommitHasSound(
                        "donut9aCommit",
                        cueOrigin.current.action,
                      )
                      ? true
                      : undefined,
                  );
                  if (applied) token.current = undefined;
                  else if (alive.current) setError(w.stale);
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
              onClick={() => void cancel()}
            >
              {w.cancel}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

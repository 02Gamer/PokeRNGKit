import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import { raid9Words } from "./raid9Words";
import {
  RAID9_FIELDS,
  isRaid9Catalog,
  raid9Frozen,
  raid9Request,
  type R9Catalog,
  type R9Confirmation,
  type R9Edit,
  type R9Entry,
  type R9Field,
  type R9Operation,
  type R9Origin,
  type R9Ticket,
} from "./raid9";
import "./Raid9Editor.css";

type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<R9Catalog | undefined>;
  onPreview(edit: R9Edit): Promise<R9Ticket | undefined>;
  onApply(confirmation: R9Confirmation): Promise<void>;
  onDiscard(token: string): Promise<void>;
};
const contents = ["Base05", "Black6", "Distribution", "Might7"] as const;
function fields(entry: R9Entry): Record<R9Field["name"], string> {
  return {
    IsEnabled: String(entry.isEnabled),
    AreaID: String(entry.areaID),
    LotteryGroup: String(entry.lotteryGroup),
    SpawnPointID: String(entry.spawnPointID),
    Seed: entry.seed,
    Unused: String(entry.unused),
    Content: entry.content,
    IsClaimedLeaguePoints: String(entry.isClaimedLeaguePoints),
  };
}
export function Raid9Editor(props: Props) {
  return <Form key={props.revision} {...props} />;
}
function Form({ busy, lang, onRead, onPreview, onApply, onDiscard }: Props) {
  const w = raid9Words[lang];
  const [original, setOriginal] = useState<R9Catalog>();
  const [snapshot, setSnapshot] = useState<R9Catalog>();
  const [origin, setOrigin] = useState<R9Origin>("Paldea"),
    [index, setIndex] = useState(0);
  const [operations, setOperations] = useState<R9Operation[]>([]);
  const ops = useRef<R9Operation[]>([]);
  const [drafts, setDrafts] = useState<Record<string, R9Field[]>>({});
  const draftsRef = useRef<Record<string, R9Field[]>>({});
  const [headers, setHeaders] = useState({ today: "", tomorrow: "" });
  const headerRef = useRef(headers),
    validated = useRef(headers);
  const [seedToo, setSeedToo] = useState(false);
  const [ticket, setTicket] = useState<R9Ticket>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"" | "invalid" | "stale">("");
  const reader = useRef(onRead),
    discard = useRef(onDiscard),
    alive = useRef(true),
    request = useRef(0);
  const token = useRef<string | undefined>(undefined),
    focus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    reader.current = onRead;
    discard.current = onDiscard;
  }, [onRead, onDiscard]);
  function resetHeaders(c: R9Catalog) {
    const paldea = c.regions[0];
    const h = {
      today: paldea.currentSeed ?? "",
      tomorrow: paldea.tomorrowSeed ?? "",
    };
    headerRef.current = h;
    validated.current = h;
    setHeaders(h);
  }
  useEffect(() => {
    alive.current = true;
    let active = true;
    const id = ++request.current;
    void reader
      .current()
      .then((c) => {
        if (!active || id !== request.current) return;
        if (!isRaid9Catalog(c)) {
          setError("invalid");
          return;
        }
        setOriginal(c);
        resetHeaders(c);
      })
      .catch(() => {
        if (active && id === request.current) setError("invalid");
      });
    return () => {
      active = false;
      alive.current = false;
      if (token.current) void discard.current(token.current);
    };
  }, []);
  const view = snapshot ?? original;
  const region = view?.regions.find((r) => r.origin === origin),
    entry = region?.entries[index];
  const key = origin + ":" + index;
  const current = entry
    ? {
        ...fields(entry),
        ...Object.fromEntries(
          (drafts[key] ?? []).map((f) => [f.name, f.value]),
        ),
      }
    : undefined;
  const locked = busy || pending || !!ticket,
    editable = !!original?.canEdit && !!region?.available && !locked;
  function stage(next: R9Operation[]) {
    ops.current = next;
    setOperations(next);
  }
  function field(name: R9Field["name"], value: string) {
    const old = draftsRef.current[key] ?? [];
    const next = {
      ...draftsRef.current,
      [key]: [...old.filter((f) => f.name !== name), { name, value }],
    };
    draftsRef.current = next;
    setDrafts(next);
  }
  function queued(): R9Operation[] {
    return [
      ...ops.current,
      ...Object.entries(draftsRef.current).map(([key, fields]) => {
        const split = key.lastIndexOf(":");
        return {
          action: "fields" as const,
          origin: key.slice(0, split) as R9Origin,
          index: Number(key.slice(split + 1)),
          fields,
        };
      }),
    ];
  }
  function header(name: "today" | "tomorrow", value: string) {
    const next = { ...headerRef.current, [name]: value.toUpperCase() };
    headerRef.current = next;
    setHeaders(next);
  }
  function validate(name: "today" | "tomorrow") {
    if (!editable || origin !== "Paldea") return;
    const value = headerRef.current[name];
    if (value === validated.current[name]) return;
    stage([
      ...ops.current,
      { action: "seeds", origin: "Paldea", [name]: value },
    ]);
    validated.current = { ...validated.current, [name]: value };
  }
  async function reload() {
    const id = ++request.current;
    setPending(true);
    setError("");
    try {
      const c = await onRead();
      if (alive.current && id === request.current) {
        if (!isRaid9Catalog(c)) throw Error("Invalid Raid9 catalog.");
        setOriginal(c);
        if (!snapshot) resetHeaders(c);
      }
    } catch {
      if (alive.current) setError("invalid");
    } finally {
      if (alive.current && id === request.current) setPending(false);
    }
  }
  async function preview(copy = false) {
    if (!original || locked || !region?.available) return;
    focus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPending(true);
    setError("");
    try {
      const queue = queued();
      if (copy) queue.push({ action: "propagate", origin, index, seedToo });
      const edit = raid9Request(original, queue, lang),
        t = await onPreview(edit);
      if (t && alive.current) {
        try {
          raid9Frozen(original, t);
          if (!isRaid9Catalog(t.result))
            throw Error("Invalid Raid9 preview catalog.");
        } catch (error) {
          await onDiscard(t.token);
          throw error;
        }
        token.current = t.token;
        stage(edit.operations);
        draftsRef.current = {};
        setDrafts({});
        setSnapshot(t.result);
        resetHeaders(t.result);
        setTicket(t);
      } else if (t) await onDiscard(t.token);
    } catch {
      if (alive.current) setError("invalid");
    } finally {
      if (alive.current) setPending(false);
    }
  }
  async function back() {
    if (!ticket || pending || busy) return;
    setPending(true);
    try {
      await onDiscard(ticket.token);
      token.current = undefined;
      if (alive.current) {
        setTicket(undefined);
        requestAnimationFrame(() => focus.current?.focus());
      }
    } catch {
      if (alive.current) setError("invalid");
    } finally {
      if (alive.current) setPending(false);
    }
  }
  function clear() {
    stage([]);
    draftsRef.current = {};
    setDrafts({});
    setSnapshot(undefined);
    setError("");
    if (original) resetHeaders(original);
  }
  function download() {
    if (!ticket) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(ticket, null, 2)], {
        type: "application/json;charset=utf-8",
      }),
    );
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "tera-raid-preview.json";
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return (
    <section className="save-record-editor save-raid9">
      <h4>{w.title}</h4>
      {!original ? (
        <>
          <p role="status">{w.loading}</p>
          <button type="button" disabled={locked} onClick={() => void reload()}>
            {w.reload}
          </button>
        </>
      ) : (
        <>
          <div className="save-raid9-selectors">
            <label>
              <span>{w.region}</span>
              <Select
                value={origin}
                disabled={locked}
                onChange={(e) => {
                  setOrigin(e.target.value as R9Origin);
                  setIndex(0);
                }}
              >
                {original.regions.map((r) => (
                  <option key={r.origin} value={r.origin}>
                    {w.origins[r.origin]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.record}</span>
              <Select
                value={index}
                disabled={locked || !region?.available}
                onChange={(e) => setIndex(Number(e.target.value))}
              >
                {region?.entries.map((e) => (
                  <option key={e.index} value={e.index}>
                    {w.record} {String(e.index + 1).padStart(3, "0")}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <small>
            {region?.countUsed} {w.available} · {region?.countAll} {w.physical}{" "}
            · {w.queued}: {operations.length} +{" "}
            {Object.values(drafts).reduce((n, v) => n + v.length, 0)}
          </small>
          {!editable && !locked && <p role="status">{w.readonly}</p>}
          {entry && current && (
            <>
              <div className="save-raid9-fields">
                {RAID9_FIELDS.map((name) => (
                  <label key={name}>
                    <span>{w.names[name]}</span>
                    {name === "IsEnabled" ||
                    name === "IsClaimedLeaguePoints" ? (
                      <Select
                        value={current[name]}
                        disabled={!editable}
                        onChange={(e) => field(name, e.target.value)}
                      >
                        <option value="false">{w.no}</option>
                        <option value="true">{w.yes}</option>
                      </Select>
                    ) : name === "Content" ? (
                      <Select
                        value={current[name]}
                        disabled={!editable}
                        onChange={(e) => field(name, e.target.value)}
                      >
                        {!contents.includes(
                          current.Content as (typeof contents)[number],
                        ) && (
                          <option value={current.Content}>
                            {w.unknown}: {current.Content}
                          </option>
                        )}
                        {contents.map((c) => (
                          <option key={c} value={c}>
                            {w.contents[c]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <input
                        value={current[name]}
                        maxLength={32767}
                        disabled={!editable}
                        onChange={(e) => field(name, e.target.value)}
                      />
                    )}
                  </label>
                ))}
              </div>
              <label>
                <span>{w.scene}</span>
                <code>{entry.scenePointName}</code>
              </label>
              <details>
                <summary>{w.raw}</summary>
                <code>{entry.raw}</code>
              </details>
            </>
          )}
          {region?.hasSeeds && region.available && (
            <details>
              <summary>{w.validate}</summary>
              <div className="save-raid9-seeds">
                {(["today", "tomorrow"] as const).map((name) => (
                  <label key={name}>
                    <span>{w[name]}</span>
                    <input
                      value={headers[name]}
                      maxLength={16}
                      disabled={!editable}
                      onChange={(e) => header(name, e.target.value)}
                      onBlur={() => validate(name)}
                    />
                  </label>
                ))}
              </div>
              <small>{w.seedHint}</small>
              <button
                type="button"
                disabled={!editable}
                onClick={() => {
                  validate("today");
                  validate("tomorrow");
                }}
              >
                {w.validate}
              </button>
            </details>
          )}
          <details>
            <summary>{w.copy}</summary>
            <p>{w.copyHint}</p>
            <label>
              <span>{w.seedToo}</span>
              <Select
                value={seedToo ? "true" : "false"}
                disabled={!editable}
                onChange={(e) => setSeedToo(e.target.value === "true")}
              >
                <option value="false">{w.withoutSeed}</option>
                <option value="true">{w.withSeed}</option>
              </Select>
            </label>
            <button
              type="button"
              disabled={!editable || !entry}
              onClick={() => void preview(true)}
            >
              {w.copy}
            </button>
          </details>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!editable}
              onClick={() => void preview()}
            >
              {w.preview}
            </button>
            <button
              type="button"
              disabled={
                locked || (!operations.length && !Object.keys(drafts).length)
              }
              onClick={clear}
            >
              {w.clear}
            </button>
          </div>
          <p>{w.hint}</p>
          {ticket && (
            <Review
              original={original}
              ticket={ticket}
              busy={busy || pending}
              lang={lang}
              onBack={() => void back()}
              onDownload={download}
              onConfirm={async () => {
                setPending(true);
                setError("");
                try {
                  await onApply(raid9Frozen(original, ticket));
                } catch {
                  if (alive.current) setError("stale");
                } finally {
                  if (alive.current) setPending(false);
                }
              }}
            />
          )}
        </>
      )}
      {error && <p role="alert">{w[error]}</p>}
    </section>
  );
}
function Review({
  original,
  ticket,
  busy,
  lang,
  onBack,
  onConfirm,
  onDownload,
}: {
  original: R9Catalog;
  ticket: R9Ticket;
  busy: boolean;
  lang: Br4Lang;
  onBack(): void;
  onConfirm(): Promise<void>;
  onDownload(): void;
}) {
  const w = raid9Words[lang],
    [offset, setOffset] = useState(0);
  function values(e: R9Entry) {
    const f = fields(e);
    return (
      <>
        <dl>
          {RAID9_FIELDS.map((name) => (
            <div key={name} style={{ display: "contents" }}>
              <dt>{w.names[name]}</dt>
              <dd>
                {name === "IsEnabled" || name === "IsClaimedLeaguePoints"
                  ? f[name] === "true"
                    ? w.yes
                    : w.no
                  : name === "Content"
                    ? (w.contents[f[name] as keyof typeof w.contents] ??
                      f[name])
                    : f[name]}
              </dd>
            </div>
          ))}
          <dt>{w.scene}</dt>
          <dd>{e.scenePointName}</dd>
        </dl>
        <code>{e.raw}</code>
      </>
    );
  }
  return (
    <section className="save-raid9-review" aria-label={w.review}>
      <h4>{w.review}</h4>
      <div className="save-raid9-pair">
        <div>
          <p>{w.source}</p>
          <code>{ticket.sourceHash}</code>
        </div>
        <div>
          <p>{w.target}</p>
          <code>{ticket.targetHash}</code>
        </div>
      </div>
      <div className="save-raid9-table">
        <table>
          <thead>
            <tr>
              <th>{w.region}</th>
              <th>{w.before}</th>
              <th>{w.after}</th>
            </tr>
          </thead>
          <tbody>
            {ticket.result.regions
              .filter((r) => r.hasSeeds && r.available)
              .map((r) => (
                <tr key={r.origin}>
                  <td>{w.origins[r.origin]}</td>
                  <td>
                    <p>{w.today}</p>
                    <code>
                      {
                        original.regions.find((b) => b.origin === r.origin)
                          ?.currentSeed
                      }
                    </code>
                    <p>{w.tomorrow}</p>
                    <code>
                      {
                        original.regions.find((b) => b.origin === r.origin)
                          ?.tomorrowSeed
                      }
                    </code>
                  </td>
                  <td>
                    <p>{w.today}</p>
                    <code>{r.currentSeed}</code>
                    <p>{w.tomorrow}</p>
                    <code>{r.tomorrowSeed}</code>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!!ticket.ignoredSeeds.length && (
        <details open>
          <summary>{w.ignored}</summary>
          <code>
            {ticket.ignoredSeeds
              .map((v) => {
                const split = v.indexOf(":");
                const origin = v.slice(0, split) as R9Origin;
                return (
                  (w.origins[origin] ?? origin) +
                  ": " +
                  (v.endsWith("CurrentSeed") ? w.today : w.tomorrow)
                );
              })
              .join(", ")}
          </code>
        </details>
      )}
      <div className="save-raid9-table">
        <table>
          <thead>
            <tr>
              <th>{w.record}</th>
              <th>{w.before}</th>
              <th>{w.after}</th>
            </tr>
          </thead>
          <tbody>
            {ticket.entries.slice(offset, offset + 20).map((d) => (
              <tr key={d.origin + ":" + d.index}>
                <td>
                  {w.origins[d.origin]} · {d.index + 1}
                </td>
                <td>{values(d.before)}</td>
                <td>{values(d.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ticket.entries.length && !ticket.blocks.length && (
          <p>{w.noChanges}</p>
        )}
      </div>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy || offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          {w.previous}
        </button>
        <span>
          {offset}–{Math.min(offset + 20, ticket.entries.length)} /{" "}
          {ticket.entries.length}
        </span>
        <button
          type="button"
          disabled={busy || offset + 20 >= ticket.entries.length}
          onClick={() => setOffset(offset + 20)}
        >
          {w.next}
        </button>
      </div>
      <details>
        <summary>
          {w.blocks} · {ticket.blocks.length}
        </summary>
        {ticket.blocks.map((b) => (
          <details key={b.key}>
            <summary>{b.key}</summary>
            <div className="save-raid9-pair">
              <div>
                <p>
                  {w.before} · {b.beforeType}/{b.beforeSubtype}
                </p>
                <code>{b.before}</code>
              </div>
              <div>
                <p>
                  {w.after} · {b.afterType}/{b.afterSubtype}
                </p>
                <code>{b.after}</code>
              </div>
            </div>
          </details>
        ))}
      </details>
      <div className="save-editor-toolbar">
        <button type="button" disabled={busy} onClick={() => void onConfirm()}>
          {w.confirm}
        </button>
        <button type="button" disabled={busy} onClick={onBack}>
          {w.back}
        </button>
        <button type="button" disabled={busy} onClick={onDownload}>
          {w.download}
        </button>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import {
  misc8bAction,
  misc8bFrozen,
  type Misc8bCatalog,
  type Misc8bEdit,
  type Misc8bPreview,
} from "./misc8b";
import { misc8bWords } from "./misc8bWords";
import "./Misc8bEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Misc8bCatalog | undefined>;
  onPreview(e: Misc8bEdit): Promise<Misc8bPreview | undefined>;
  onApply(e: Misc8bEdit): Promise<void>;
};
export function Misc8bEditor(props: Props) {
  const [loaded, setLoaded] = useState<{
    revision: number;
    c: Misc8bCatalog;
  }>();
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
    <section className="save-record-editor save-misc8b-editor">
      <h3>{misc8bWords[props.lang].title}</h3>
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
          {misc8bWords[props.lang].read}
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
}: Props & { c: Misc8bCatalog }) {
  const w = misc8bWords[lang];
  const [action, setAction] = useState(
      c.actions.find((a) => a.enabled)?.key ?? c.actions[0].key,
    ),
    [preview, setPreview] = useState<Misc8bPreview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [group, setGroup] = useState("state"),
    [query, setQuery] = useState("");
  const locked = busy || pending || !!preview;
  async function start() {
    setPending(true);
    setError("");
    try {
      const p = await onPreview(misc8bAction(c, action));
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  const changes =
    preview?.result.values.filter(
      (v) => v.value !== c.values.find((f) => f.key === v.key)?.value,
    ) ?? [];
  const rows = c.values.filter(
    (v) =>
      v.group === group &&
      (!query ||
        `${v.name[lang]} ${v.index} ${v.value}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())),
  );
  const operationName = (key: string) =>
    w.actions[key as keyof typeof w.actions] ?? key;
  return (
    <div className="save-misc8b-body">
      <p>{w.linked}</p>
      <label>
        <span>{w.operation}</span>
        <Select
          value={action}
          disabled={locked || !c.canEdit}
          onChange={(e) => setAction(e.target.value)}
        >
          {c.actions.map((a) => (
            <option key={a.key} value={a.key} disabled={!a.enabled}>
              {operationName(a.key)}
            </option>
          ))}
        </Select>
      </label>
      {(action === "defeat" || action === "rebattle") && <p>{w.postgame}</p>}
      {!c.actions.some((a) => a.key === action && a.enabled) && (
        <p>{w.disabled}</p>
      )}
      <button
        type="button"
        disabled={
          locked ||
          !c.canEdit ||
          !c.actions.some((a) => a.key === action && a.enabled)
        }
        onClick={() => void start()}
      >
        {w.preview}
      </button>
      <div className="save-misc8b-controls">
        <label>
          <span>{w.group}</span>
          <Select
            value={group}
            disabled={pending || busy}
            onChange={(e) => setGroup(e.target.value)}
          >
            {(
              [
                "state",
                "flag",
                "system",
                "work",
                "item",
                "itemRaw",
                "trainer",
                "trainerRaw",
              ] as const
            ).map((g) => (
              <option key={g} value={g}>
                {g === "state" ? w.other : g === "flag" ? w.flags : w[g]}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span>{w.filter}</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      <div className="save-misc8b-values">
        <table>
          <thead>
            <tr>
              <th>{w.field}</th>
              <th>{w.state}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.key}>
                <td>
                  {v.name[lang]}
                  {["flag", "system", "work"].includes(v.group)
                    ? ` (${v.index})`
                    : ""}
                </td>
                <td>
                  <code>{v.value}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section className="save-misc8b-preview" aria-live="polite">
          <h4>{operationName(preview.request.action)}</h4>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          {!preview.changedOffsets.length && <p>{w.noChanges}</p>}
          <div className="save-misc8b-values">
            <table>
              <caption>{w.changes}</caption>
              <thead>
                <tr>
                  <th>{w.field}</th>
                  <th>{w.before}</th>
                  <th>{w.after}</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((v) => (
                  <tr key={v.key}>
                    <td>
                      {v.name[lang]}
                      {["flag", "system", "work"].includes(v.group)
                        ? ` (${v.index})`
                        : ""}
                    </td>
                    <td>
                      <code>
                        {c.values.find((f) => f.key === v.key)?.value}
                      </code>
                    </td>
                    <td>
                      <code>{v.value}</code>
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
                  await onApply(misc8bFrozen(c, preview));
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

import { useEffect, useRef, useState } from "react";
import type { Br4Lang } from "./br4";
import {
  seal8bInteger,
  seal8bRequest,
  seal8bFrozen,
  type Seal8bCatalog,
  type Seal8bEdit,
  type Seal8bPreview,
  type Seal8bValue,
} from "./seal8b";
import { seal8bWords } from "./seal8bWords";
import "./Seal8bEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Seal8bCatalog | undefined>;
  onPreview(e: Seal8bEdit): Promise<Seal8bPreview | undefined>;
  onApply(e: Seal8bEdit): Promise<void>;
};
export function Seal8bEditor(p: Props) {
  const [loaded, setLoaded] = useState<{
    revision: number;
    c: Seal8bCatalog;
  }>();
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
    <section className="save-record-editor save-seal8b-editor">
      <h3>{seal8bWords[p.lang].title}</h3>
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
          {seal8bWords[p.lang].read}
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
}: Props & { c: Seal8bCatalog }) {
  const w = seal8bWords[lang];
  const [draft, setDraft] = useState<
      Record<number, { count: string; total: string; obtained: boolean }>
    >({}),
    [query, setQuery] = useState(""),
    [preview, setPreview] = useState<Seal8bPreview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const locked = busy || pending || !!preview || !c.canEdit;
  const edits: Seal8bValue[] = Object.entries(draft).map(([i, v]) => ({
    index: Number(i),
    count: seal8bInteger(v.count),
    total: seal8bInteger(v.total),
    obtained: v.obtained,
  }));
  async function start(action: Seal8bEdit["action"]) {
    setPending(true);
    setError("");
    try {
      const p = await onPreview(
        seal8bRequest(c, action, edits.length ? edits : undefined),
      );
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  const rows = c.entries.filter((v) =>
    `${v.index} ${v.name[lang]}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  const changed =
    preview?.result.entries.filter((v) => {
      const old = c.entries.find((o) => o.index === v.index)!;
      return (
        old.count !== v.count ||
        old.total !== v.total ||
        old.rawObtained !== v.rawObtained
      );
    }) ?? [];
  const normalized = preview
    ? c.rawObtained.flatMap((v, i) =>
        v === preview.result.rawObtained[i] ? [] : [i],
      )
    : [];
  return (
    <div className="save-seal8b-body">
      <p>{w.range}</p>
      <p>{w.normalization}</p>
      <label>
        <span>{w.search}</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="save-editor-toolbar">
        {(["all", "none", "resave"] as const).map((a) => (
          <button
            type="button"
            key={a}
            disabled={locked}
            onClick={() => void start(a)}
          >
            {w[a]}
          </button>
        ))}
        <button
          type="button"
          disabled={locked || !edits.length}
          onClick={() => void start("patch")}
        >
          {w.patch}
        </button>
      </div>
      <div className="save-seal8b-table">
        <p>
          {w.count} / {w.total} / {w.raw}
        </p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>{w.name}</th>
              <th>{w.count}</th>
              <th>{w.total}</th>
              <th>{w.obtained}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const d = draft[v.index] ?? {
                count: String(v.count),
                total: String(v.total),
                obtained: v.obtained,
              };
              function change(p: Partial<typeof d>) {
                setDraft((old) => ({ ...old, [v.index]: { ...d, ...p } }));
              }
              return (
                <tr key={v.index}>
                  <td>{String(v.index).padStart(3, "0")}</td>
                  <th scope="row">{v.name[lang]}</th>
                  {(["count", "total"] as const).map((k) => (
                    <td key={k}>
                      <input
                        aria-label={`${v.name[lang]} ${w[k]}`}
                        inputMode="text"
                        disabled={locked}
                        value={d[k]}
                        onChange={(e) => change({ [k]: e.target.value })}
                      />
                    </td>
                  ))}
                  <td>
                    <label className="save-seal8b-check">
                      <input
                        type="checkbox"
                        aria-label={`${v.name[lang]} ${w.obtained}`}
                        disabled={locked}
                        checked={d.obtained}
                        onChange={(e) => change({ obtained: e.target.checked })}
                      />
                    </label>
                    {v.rawObtained > 1 && (
                      <small>
                        {w.raw}: {v.rawObtained}
                      </small>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section aria-live="polite">
          <p>
            {w.count} / {w.total} / {w.raw}
          </p>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          <div className="save-seal8b-table">
            <table>
              <thead>
                <tr>
                  <th>{w.name}</th>
                  <th>{w.before}</th>
                  <th>{w.after}</th>
                </tr>
              </thead>
              <tbody>
                {changed.map((v) => {
                  const old = c.entries.find((o) => o.index === v.index)!;
                  return (
                    <tr key={v.index}>
                      <th scope="row">{v.name[lang]}</th>
                      <td>
                        {old.count} / {old.total} / {old.rawObtained}
                      </td>
                      <td>
                        {v.count} / {v.total} / {v.rawObtained}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!!normalized.length && (
            <p>
              {w.raw}:{" "}
              {normalized
                .map(
                  (i) =>
                    `${String(i).padStart(3, "0")}: ${c.rawObtained[i]} → ${preview.result.rawObtained[i]}`,
                )
                .join(", ")}
            </p>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onApply(seal8bFrozen(c, preview));
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

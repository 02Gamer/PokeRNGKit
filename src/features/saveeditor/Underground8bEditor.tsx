import { useEffect, useRef, useState } from "react";
import type { Br4Lang } from "./br4";
import {
  ug8bInteger,
  ug8bRequest,
  ug8bFrozen,
  type Ug8bCatalog,
  type Ug8bEdit,
  type Ug8bPreview,
  type Ug8bValue,
} from "./underground8b";
import { underground8bWords } from "./underground8bWords";
import "./Underground8bEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Ug8bCatalog | undefined>;
  onPreview(e: Ug8bEdit): Promise<Ug8bPreview | undefined>;
  onApply(e: Ug8bEdit): Promise<void>;
};
export function Underground8bEditor(p: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Ug8bCatalog }>();
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
      <h3>{underground8bWords[p.lang].title}</h3>
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
          {underground8bWords[p.lang].read}
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
}: Props & { c: Ug8bCatalog }) {
  const w = underground8bWords[lang];
  const [draft, setDraft] = useState<
      Record<number, { count: string; new: boolean; favorite: boolean }>
    >({}),
    [query, setQuery] = useState(""),
    [preview, setPreview] = useState<Ug8bPreview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const locked = busy || pending || !!preview || !c.canEdit;
  const edits: Ug8bValue[] = Object.entries(draft).map(([i, v]) => ({
    index: Number(i),
    count: ug8bInteger(v.count),
    new: v.new,
    favorite: v.favorite,
  }));
  async function start(action: Ug8bEdit["action"]) {
    setPending(true);
    setError("");
    try {
      const p = await onPreview(
        ug8bRequest(c, action, edits.length ? edits : undefined),
      );
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  const typeName = (t: string) => w.types[t as keyof typeof w.types] ?? t;
  const rows = c.entries.filter((v) =>
    `${v.index} ${v.name[lang]} ${typeName(v.type)}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  const changed =
    preview?.result.entries.filter((v) => {
      const old = c.entries.find((o) => o.index === v.index)!;
      return (
        old.count !== v.count ||
        old.rawHideNew !== v.rawHideNew ||
        old.rawFavorite !== v.rawFavorite
      );
    }) ?? [];
  const normalized = preview
    ? c.rawHideNew.flatMap((v, i) =>
        v === preview.result.rawHideNew[i] &&
        c.rawFavorite[i] === preview.result.rawFavorite[i]
          ? []
          : [i],
      )
    : [];
  return (
    <div className="save-ug8b-body">
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
      <div className="save-ug8b-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>{w.type}</th>
              <th>{w.name}</th>
              <th>{w.count}</th>
              <th>{w.new}</th>
              <th>{w.favorite}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const d = draft[v.index] ?? {
                count: String(v.count),
                new: v.new,
                favorite: v.favorite,
              };
              function change(p: Partial<typeof d>) {
                setDraft((old) => ({ ...old, [v.index]: { ...d, ...p } }));
              }
              return (
                <tr key={v.index}>
                  <td>{String(v.index).padStart(3, "0")}</td>
                  <td>{typeName(v.type)}</td>
                  <th scope="row">{v.name[lang]}</th>
                  <td>
                    <input
                      aria-label={`${v.name[lang]} ${w.count}`}
                      inputMode="text"
                      disabled={locked}
                      value={d.count}
                      onChange={(e) => change({ count: e.target.value })}
                    />
                  </td>
                  {(["new", "favorite"] as const).map((k) => (
                    <td key={k}>
                      <label className="save-ug8b-check">
                        <input
                          type="checkbox"
                          aria-label={`${v.name[lang]} ${w[k]}`}
                          disabled={locked}
                          checked={d[k]}
                          onChange={(e) => change({ [k]: e.target.checked })}
                        />
                      </label>
                    </td>
                  ))}
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
            {w.changed}: {preview.changedOffsets.length}
          </p>
          <p>
            {w.count} / {w.raw}
          </p>
          <div className="save-ug8b-table">
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
                        {old.count} / {old.rawHideNew} / {old.rawFavorite}
                      </td>
                      <td>
                        {v.count} / {v.rawHideNew} / {v.rawFavorite}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!!normalized.length && (
            <details>
              <summary>
                {w.raw} ({normalized.length})
              </summary>
              <p>
                {normalized
                  .map(
                    (i) =>
                      `${String(i).padStart(3, "0")}: ${c.rawHideNew[i]}/${c.rawFavorite[i]} → ${preview.result.rawHideNew[i]}/${preview.result.rawFavorite[i]}`,
                  )
                  .join(", ")}
              </p>
            </details>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onApply(ug8bFrozen(c, preview));
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

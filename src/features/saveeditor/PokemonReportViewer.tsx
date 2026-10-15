import { useEffect, useRef, useState } from "react";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { Select } from "../shared/Select";
import { PokemonSprite } from "./PokemonSprite";
import {
  reportLabel,
  reportTable,
  reportWords,
  type PokemonReportActions,
  type PokemonReportCatalog,
  type PokemonReportData,
  type PokemonReportQuery,
} from "./pokemonReport";
import "./PokemonReportViewer.css";
import {
  loadReportSettings,
  reportHiddenIndices,
} from "./programExportSettings";
import { settingsWords } from "./settingsLabels";

export function PokemonReportViewer({
  revision,
  lang,
  busy,
  actions,
  onOpenSettings,
}: {
  revision: number;
  lang: "zh" | "en" | "ja";
  busy: boolean;
  actions: PokemonReportActions;
  onOpenSettings?(): void;
}) {
  const w = reportWords[lang];
  const [defaults] = useState(loadReportSettings);
  const [catalog, setCatalog] = useState<PokemonReportCatalog>();
  const [result, setResult] = useState<{
    revision: number;
    lang: string;
    data: PokemonReportData;
    query: PokemonReportQuery;
  }>();
  const [extra, setExtra] = useState<string[]>(defaults.extra),
    [candidate, setCandidate] = useState("");
  const [hidden, setHidden] = useState<number[]>([]),
    [column, setColumn] = useState(0);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const [selection, setSelection] = useState<{
    startRow: number;
    endRow: number;
    startColumn: number;
    endColumn: number;
  }>();
  const life = useRef({ alive: true, epoch: 0 });
  useEffect(() => {
    const l = life.current;
    l.alive = true;
    l.epoch++;
    return () => {
      l.alive = false;
      l.epoch++;
    };
  }, [revision, lang]);
  const current =
    result?.revision === revision && result.lang === lang ? result : undefined;
  const locked = busy || pending;
  async function load(sortIndex: number | null = null, descending = false) {
    if (locked) return;
    const ticket = life.current.epoch;
    const query: PokemonReportQuery = {
      language: lang === "zh" ? "zh-Hans" : lang,
      extra: sortIndex !== null && current ? current.query.extra : [...extra],
      hidden:
        sortIndex !== null && current
          ? current.query.hidden
          : [...defaults.hidden],
      sortIndex,
      descending,
    };
    setPending(true);
    setMessage("");
    try {
      const nextCatalog = catalog ?? (await actions.catalog());
      const data = await actions.read(query);
      if (!life.current.alive || life.current.epoch !== ticket) return;
      if (!data || !nextCatalog) {
        setMessage(w.failed);
        return;
      }
      setCatalog(nextCatalog);
      setResult({ revision, lang, data, query });
      if (sortIndex === null || !current)
        setHidden(reportHiddenIndices(data.columns));
      setColumn(0);
      setSelection(undefined);
    } catch {
      if (life.current.alive && life.current.epoch === ticket)
        setMessage(w.failed);
    } finally {
      if (life.current.alive && life.current.epoch === ticket)
        setPending(false);
    }
  }
  async function copy(markdown: boolean) {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(
        reportTable(
          {
            ...current.data,
            columns: current.data.columns.map((c, i) => ({
              ...c,
              visible: !hidden.includes(i),
            })),
          },
          lang,
          markdown,
          selection,
        ),
      );
      setMessage(w.copied);
    } catch {
      setMessage(w.failed);
    }
  }
  async function csv() {
    if (!current || locked) return;
    const ticket = life.current.epoch;
    setPending(true);
    try {
      const text = await actions.csv(current.query);
      if (!life.current.alive || ticket !== life.current.epoch) return;
      if (text === undefined) {
        setMessage(w.failed);
        return;
      }
      const url = URL.createObjectURL(
        new Blob([text], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "Box Data Dump.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      if (life.current.alive && ticket === life.current.epoch)
        setMessage(w.failed);
    } finally {
      if (life.current.alive && ticket === life.current.epoch)
        setPending(false);
    }
  }
  const columns =
    current?.data.columns
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => !hidden.includes(i)) ?? [];
  return (
    <section className="save-pokemon-report" aria-label={w.title}>
      <div className="save-editor-toolbar">
        {onOpenSettings && (
          <button type="button" disabled={locked} onClick={onOpenSettings}>
            {settingsWords[lang].title}
          </button>
        )}
        <button type="button" disabled={locked} onClick={() => void load()}>
          {pending ? w.pending : w.read}
        </button>
        <button
          type="button"
          disabled={locked || !current}
          onClick={() => void csv()}
        >
          {w.csv}
        </button>
        <button
          type="button"
          disabled={locked || !current}
          onClick={() => void copy(false)}
        >
          {w.clipboard}
        </button>
        <button
          type="button"
          disabled={locked || !current}
          onClick={() => void copy(true)}
        >
          {w.markdown}
        </button>
      </div>
      <p className="save-editor-hint">
        {w.all} · {w.exported}
      </p>
      <details>
        <summary>{w.extra}</summary>
        <div className="save-editor-toolbar">
          <label className="field">
            <span>{w.properties}</span>
            <AutoCompleteComboBox
              label={w.properties}
              value={candidate}
              inputValue={candidate}
              options={(catalog?.extra ?? []).map((p) => ({
                value: p,
                label: p,
              }))}
              onInputChange={setCandidate}
              onValueChange={setCandidate}
              disabled={locked}
            />
          </label>
          <button
            type="button"
            disabled={
              locked ||
              !candidate ||
              extra.length >= 256 ||
              !(catalog?.extra ?? []).includes(candidate)
            }
            onClick={() => setExtra([...extra, candidate])}
          >
            {w.add}
          </button>
        </div>
        <ul>
          {extra.map((p, i) => (
            <li key={i}>
              {p}{" "}
              <button
                type="button"
                disabled={locked}
                aria-label={`${w.remove} ${p}`}
                onClick={() => setExtra(extra.filter((_, j) => j !== i))}
              >
                {w.remove}
              </button>
            </li>
          ))}
        </ul>
      </details>
      {current && (
        <div className="save-editor-toolbar">
          <label className="field">
            <span>{w.columns}</span>
            <Select
              aria-label={w.columns}
              value={String(column)}
              disabled={locked}
              onChange={(e) => setColumn(Number(e.target.value))}
            >
              {current.data.columns.map((c, i) => (
                <option key={i} value={i}>
                  {reportLabel(c.name, lang)}
                </option>
              ))}
            </Select>
          </label>
          <label className="save-report-visible">
            <input
              type="checkbox"
              checked={!hidden.includes(column)}
              disabled={locked}
              onChange={(e) =>
                setHidden(
                  e.target.checked
                    ? hidden.filter((i) => i !== column)
                    : [...hidden, column],
                )
              }
            />
            {reportLabel(current.data.columns[column]?.name ?? "", lang)}
          </label>
          <button type="button" disabled={locked} onClick={() => setHidden([])}>
            {w.restore}
          </button>
        </div>
      )}
      <output aria-live="polite">
        {message || (current ? `${current.data.rows.length} ${w.rows}` : "")}
      </output>
      {current && (
        <div
          className="save-report-scroll"
          tabIndex={0}
          onKeyDown={(e) => {
            if (
              (e.ctrlKey || e.metaKey) &&
              e.key.toLowerCase() === "c" &&
              selection
            ) {
              e.preventDefault();
              void copy(false);
            }
          }}
        >
          <table>
            <thead>
              <tr>
                {columns.map(({ c, i }) => (
                  <th
                    key={i}
                    scope="col"
                    aria-sort={
                      current.query.sortIndex === i
                        ? current.query.descending
                          ? "descending"
                          : "ascending"
                        : undefined
                    }
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          void load(
                            i,
                            current.query.sortIndex === i
                              ? !current.query.descending
                              : false,
                          )
                        }
                      >
                        {reportLabel(c.name, lang)}
                        {current.query.sortIndex === i
                          ? current.query.descending
                            ? " ↓"
                            : " ↑"
                          : ""}
                      </button>
                    ) : (
                      reportLabel(c.name, lang)
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.data.rows.map((r, index) => (
                <tr key={index}>
                  {columns.map(({ i }) => (
                    <td
                      key={i}
                      tabIndex={i > 0 ? 0 : undefined}
                      aria-selected={Boolean(
                        selection &&
                        index >=
                          Math.min(selection.startRow, selection.endRow) &&
                        index <=
                          Math.max(selection.startRow, selection.endRow) &&
                        i >=
                          Math.min(
                            selection.startColumn,
                            selection.endColumn,
                          ) &&
                        i <=
                          Math.max(selection.startColumn, selection.endColumn),
                      )}
                      onClick={(e) => {
                        if (i === 0) return;
                        setSelection(
                          e.shiftKey && selection
                            ? { ...selection, endRow: index, endColumn: i }
                            : {
                                startRow: index,
                                endRow: index,
                                startColumn: i,
                                endColumn: i,
                              },
                        );
                      }}
                      onKeyDown={(e) => {
                        if (i > 0 && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          setSelection(
                            e.shiftKey && selection
                              ? { ...selection, endRow: index, endColumn: i }
                              : {
                                  startRow: index,
                                  endRow: index,
                                  startColumn: i,
                                  endColumn: i,
                                },
                          );
                        }
                      }}
                    >
                      {i === 0 ? (
                        <PokemonSprite
                          loading="lazy"
                          pokemon={
                            r.artwork ?? { sprite: r.sprite, species: 0 }
                          }
                          width={40}
                          height={32}
                          alt={
                            r.cells[
                              current.data.columns.findIndex(
                                (c) => c.name === "Species",
                              ) - 1
                            ] ?? ""
                          }
                        />
                      ) : (
                        r.cells[i - 1]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!current.data.rows.length && <p>{w.empty}</p>}
        </div>
      )}
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage, typeWideImage } from "./art";
import {
  chartColumns,
  chartRows,
  chartValue,
  chartWords,
  moveChartColumn,
  type ChartColumn,
  type ChartLanguage,
  type PersonalChartCatalog,
  type PersonalChartRow,
} from "./personalChart";
import "./PersonalChartViewer.css";

export function PersonalChartViewer({
  revision,
  lang,
  busy,
  onRead,
}: {
  revision: number;
  lang: ChartLanguage;
  busy: boolean;
  onRead(): Promise<PersonalChartCatalog | undefined>;
}) {
  const w = chartWords[lang];
  const [result, setResult] = useState<{
    revision: number;
    retry: number;
    catalog?: PersonalChartCatalog;
    failed: boolean;
  }>();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{
    column: ChartColumn;
    descending: boolean;
  }>({ column: "number", descending: false });
  const [order, setOrder] = useState<ChartColumn[]>([...chartColumns]);
  const [selected, setSelected] = useState<ChartColumn>("number");
  const [retry, setRetry] = useState(0);
  const current =
    result?.revision === revision && result.retry === retry
      ? result
      : undefined;
  const catalog = current?.catalog;
  const failed = current?.failed;
  const reader = useRef(onRead);
  const request = useRef<
    | {
        revision: number;
        retry: number;
        promise: Promise<PersonalChartCatalog | undefined>;
      }
    | undefined
  >(undefined);
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let active = true;
    if (
      request.current?.revision !== revision ||
      request.current.retry !== retry
    )
      request.current = { revision, retry, promise: reader.current() };
    void request.current.promise.then(
      (value) => {
        if (active) {
          setResult({ revision, retry, catalog: value, failed: !value });
        }
      },
      () => {
        if (active) setResult({ revision, retry, failed: true });
      },
    );
    return () => {
      active = false;
    };
  }, [revision, retry]);
  const columns = useMemo(
    () =>
      catalog?.hasAlphaMove
        ? [...order, "alphaMove" as const].filter(
            (v, i, all) => all.indexOf(v) === i,
          )
        : order.filter((v) => v !== "alphaMove"),
    [catalog, order],
  );
  const rows = useMemo(
    () =>
      chartRows(catalog?.rows ?? [], query, sort.column, sort.descending, lang),
    [catalog, query, sort, lang],
  );
  const label = (column: ChartColumn) =>
    column === "alphaMove"
      ? w.alphaMove
      : w.columns[chartColumns.indexOf(column)];
  function cell(row: PersonalChartRow, column: ChartColumn) {
    if (column === "sprite")
      return (
        <img
          className="save-chart-sprite"
          src={pokemonImage(row)}
          alt={row.name[lang]}
          loading="lazy"
        />
      );
    if (column === "native") return row.native ? w.yes : w.no;
    if (column === "type1" || column === "type2") {
      const value = row[column];
      if (!value) return null;
      return (
        <span className="save-chart-type">
          <img src={typeWideImage(value.id)} alt="" />
          {value.name[lang]}
        </span>
      );
    }
    const value = chartValue(row, column, lang);
    return typeof value === "number" ? String(value).padStart(3, "0") : value;
  }
  const palette = (row: PersonalChartRow, column: ChartColumn) =>
    column === "bst"
      ? row.bstColor
      : row.statColors[
          ["hp", "atk", "def", "spa", "spd", "spe"].indexOf(column)
        ];
  return (
    <section className="save-personal-chart" aria-label={w.title}>
      <div className="save-editor-toolbar">
        <label className="field save-chart-search">
          <span>{w.search}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span role="status">
          {catalog
            ? `${rows.length} ${w.count}`
            : failed
              ? w.failed
              : w.loading}
        </span>
        <button
          type="button"
          disabled={busy || (!catalog && !failed)}
          onClick={() => setRetry((v) => v + 1)}
        >
          {w.retry}
        </button>
      </div>
      {catalog && (
        <details>
          <summary>{w.columnsLabel}</summary>
          <div className="save-editor-toolbar">
            <label className="field">
              <span>{w.columnsLabel}</span>
              <Select
                value={selected}
                onChange={(e) => setSelected(e.target.value as ChartColumn)}
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {label(c)}
                  </option>
                ))}
              </Select>
            </label>
            <button
              type="button"
              disabled={columns.indexOf(selected) <= 0}
              onClick={() => setOrder(moveChartColumn(columns, selected, -1))}
            >
              {w.left}
            </button>
            <button
              type="button"
              disabled={columns.indexOf(selected) >= columns.length - 1}
              onClick={() => setOrder(moveChartColumn(columns, selected, 1))}
            >
              {w.right}
            </button>
            <button type="button" onClick={() => setOrder([...chartColumns])}>
              {w.reset}
            </button>
          </div>
        </details>
      )}
      {catalog && (
        <div className="save-chart-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    aria-sort={
                      sort.column === column
                        ? sort.descending
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSort((previous) => ({
                          column,
                          descending:
                            previous.column === column && !previous.descending,
                        }))
                      }
                    >
                      {label(column)}
                      {sort.column === column
                        ? sort.descending
                          ? " ↓"
                          : " ↑"
                        : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.number}>
                  {columns.map((column) => (
                    <td
                      key={column}
                      style={
                        palette(row, column)
                          ? {
                              backgroundColor: palette(row, column),
                              color: "#000",
                            }
                          : undefined
                      }
                    >
                      {cell(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p>{w.empty}</p>}
        </div>
      )}
    </section>
  );
}

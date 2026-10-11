import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import type { Br4Lang } from "./br4";
import {
  raid8Request,
  raid8Frozen,
  raid8Properties,
  type Raid8Catalog,
  type Raid8Edit,
  type Raid8Preview,
  type Raid8Operation,
} from "./raid8";
import { raid8Words } from "./raid8Words";
import "./Raid8Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Raid8Catalog | undefined>;
  onPreview(e: Raid8Edit): Promise<Raid8Preview | undefined>;
  onApply(e: Raid8Edit): Promise<void>;
};
export function Raid8Editor(p: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Raid8Catalog }>();
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
      <h3>{raid8Words[p.lang].title}</h3>
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
          {raid8Words[p.lang].read}
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
}: Props & { c: Raid8Catalog }) {
  const w = raid8Words[lang];
  const [origin, setOrigin] = useState(
      c.regions.find((r) => r.available)?.origin ?? 0,
    ),
    [index, setIndex] = useState(0),
    [property, setProperty] = useState<string>("seed"),
    [value, setValue] = useState(""),
    [preview, setPreview] = useState<Raid8Preview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [denInput, setDenInput] = useState<string>();
  const display = preview?.result ?? c,
    region = display.regions.find((r) => r.origin === origin),
    row = region?.entries.find((r) => r.index === index),
    operations = preview?.request.operations ?? [],
    locked = busy || pending || !c.canEdit;
  const boolean = ["rare", "wishingPiece", "wattsHarvested", "event"].includes(
    property,
  );
  const changes =
    preview?.result.regions.flatMap((r) =>
      r.entries.flatMap((after) => {
        const before = c.regions
          .find((old) => old.origin === r.origin)
          ?.entries.find((old) => old.index === after.index);
        return before && before.raw !== after.raw
          ? [{ origin: r.origin, before, after }]
          : [];
      }),
    ) ?? [];
  async function run(ops: Raid8Operation[]) {
    setPending(true);
    setError("");
    try {
      const p = await onPreview(raid8Request(c, ops));
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="save-raid8-body">
      <p>{w.sequence}</p>
      <p>{w.limits}</p>
      <div className="save-raid8-fields">
        <label>
          <span>{w.region}</span>
          <Select
            value={String(origin)}
            onChange={(v) => {
              setOrigin(Number(v.target.value));
              setIndex(0);
              setDenInput(undefined);
            }}
            disabled={locked}
          >
            {c.regions.map((r) => (
              <option
                key={r.origin}
                value={String(r.origin)}
                disabled={!r.available}
              >
                {w.regions[r.origin]}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span>{w.den}</span>
          <AutoCompleteComboBox
            value={index}
            options={
              region?.entries.map((r) => ({
                value: r.index,
                label: `${w.den} ${String(r.index + 1).padStart(3, "0")}`,
              })) ?? []
            }
            inputValue={
              denInput ?? `${w.den} ${String(index + 1).padStart(3, "0")}`
            }
            label={w.den}
            onInputChange={setDenInput}
            onValueChange={(v) => {
              setIndex(v);
              setDenInput(undefined);
            }}
            disabled={locked}
          />
        </label>
        <label>
          <span>{w.property}</span>
          <Select
            value={property}
            onChange={(v) => {
              setProperty(v.target.value);
              setValue(
                ["rare", "wishingPiece", "wattsHarvested", "event"].includes(
                  v.target.value,
                )
                  ? "true"
                  : "",
              );
            }}
            disabled={locked}
          >
            {raid8Properties.map((p) => (
              <option key={p} value={p}>
                {w.properties[p]}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span>{w.value}</span>
          {boolean ? (
            <Select
              value={value || "true"}
              onChange={(e) => setValue(e.target.value)}
              disabled={locked}
            >
              <option value="true">{w.yes}</option>
              <option value="false">{w.no}</option>
            </Select>
          ) : (
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={locked}
              inputMode="text"
            />
          )}
        </label>
      </div>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || !row || operations.length >= 4096}
          onClick={() =>
            void run([
              ...operations,
              {
                origin,
                index,
                property,
                value: boolean ? value || "true" : value,
              },
            ])
          }
        >
          {w.add}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => void run(operations)}
        >
          {w.resave}
        </button>
        {preview && (
          <>
            <button
              type="button"
              disabled={locked || !operations.length}
              onClick={() => void run(operations.slice(0, -1))}
            >
              {w.undo}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => setPreview(undefined)}
            >
              {w.cancel}
            </button>
          </>
        )}
      </div>
      {row && (
        <div className="save-raid8-values">
          <table>
            <tbody>
              {raid8Properties.map((p) => (
                <tr key={p}>
                  <th scope="row">{w.properties[p]}</th>
                  <td>
                    {p === "denType"
                      ? `${w.types[row.denType] ?? row.denType} (${row.denType})`
                      : p === "wishingPiece"
                        ? row.wishingPiece
                          ? w.yes
                          : w.no
                        : typeof row[p as keyof typeof row] === "boolean"
                          ? row[p as keyof typeof row]
                            ? w.yes
                            : w.no
                          : String(row[p as keyof typeof row])}
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">{w.active}</th>
                <td>{row.active ? w.yes : w.no}</td>
              </tr>
              <tr>
                <th scope="row">{w.raw}</th>
                <td>
                  <code>{row.raw}</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section aria-live="polite">
          <div className="save-raid8-values">
            <table>
              <thead>
                <tr>
                  <th>{w.den}</th>
                  <th>{w.before}</th>
                  <th>{w.after}</th>
                </tr>
              </thead>
              <tbody>
                {changes.map(({ origin: changedOrigin, before, after }) => (
                  <tr key={`${changedOrigin}.${after.index}`}>
                    <th scope="row">
                      {w.regions[changedOrigin]} {w.den} {after.index + 1}
                    </th>
                    <td>
                      <code>{before.raw}</code>
                    </td>
                    <td>
                      <code>{after.raw}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          <ol>
            {operations.map((op, i) => (
              <li key={i}>
                {w.regions[op.origin]} {w.den} {op.index + 1} ·{" "}
                {w.properties[op.property as keyof typeof w.properties]}:{" "}
                {op.value}
              </li>
            ))}
          </ol>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked}
              onClick={async () => {
                setPending(true);
                try {
                  await onApply(raid8Frozen(c, preview));
                } catch {
                  setError(w.invalid);
                } finally {
                  setPending(false);
                }
              }}
            >
              {w.apply}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

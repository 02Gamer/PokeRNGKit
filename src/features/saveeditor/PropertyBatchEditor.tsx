import { useEffect, useId, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { SaveEditorResult, SaveReport } from "./domain";
import type {
  PropertyBatchConfirmation,
  PropertyBatchTicket,
  PropertyBatchCatalog,
} from "./propertyBatch";

import { propertyBatchWords } from "./propertyBatch";
export function PropertyBatchEditor({
  report,
  busy,
  lang,
  onRead,
  onApply,
  onDiscard,
}: {
  report: SaveReport;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(
    kind: "propertyCatalog" | "propertyPreview",
    payload?: string,
  ): Promise<SaveEditorResult | undefined>;
  onApply(values: PropertyBatchConfirmation): Promise<void>;
  onDiscard(token: string): void;
}) {
  const words = propertyBatchWords[lang],
    listId = useId();
  const [catalog, setCatalog] = useState<PropertyBatchCatalog>();
  const [ticket, setTicket] = useState<PropertyBatchTicket>();
  const [scope, setScope] = useState("box"),
    [box, setBox] = useState(0);
  const [property, setProperty] = useState("IV_HP"),
    [operator, setOperator] = useState("."),
    [value, setValue] = useState("31");
  const [text, setText] = useState("");
  const [allowErrors, setErrors] = useState(false),
    [allowEmpty, setEmpty] = useState(false),
    [allowIgnored, setIgnored] = useState(false);
  const [page, setPage] = useState(0);
  const token = useRef<string | undefined>(undefined),
    mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (token.current) onDiscard(token.current);
    };
  }, [onDiscard]);
  const clear = () => {
    if (token.current) onDiscard(token.current);
    token.current = undefined;
    setTicket(undefined);
    setErrors(false);
    setEmpty(false);
    setIgnored(false);
    setPage(0);
  };
  const preview = async () => {
    clear();
    const response = await onRead(
      "propertyPreview",
      JSON.stringify({ text, scope, box, language: lang }),
    );
    const next = response?.propertyPreview;
    if (!next) return;
    if (!mounted.current) {
      onDiscard(next.token);
      return;
    }
    token.current = next.token;
    setTicket(next);
  };
  const summary = ticket?.summary;
  const errors = summary?.outcomes.some((o) => o.error) ?? false;
  return (
    <section className="save-property-batch" aria-label={words.title}>
      <p className="save-editor-note">{words.note}</p>
      <fieldset disabled={busy}>
        <legend>{words.title}</legend>
        <div className="save-editor-fields">
          <label className="field">
            <span>{words.scope}</span>
            <Select
              value={scope}
              onChange={(e) => {
                clear();
                setScope(e.target.value);
              }}
            >
              {["box", "boxes", "party"].map((s, i) => (
                <option key={s} value={s}>
                  {words.scopes[i]}
                </option>
              ))}
            </Select>
          </label>
          {scope === "box" && (
            <label className="field">
              <span>{words.box}</span>
              <Select
                value={box}
                onChange={(e) => {
                  clear();
                  setBox(Number(e.target.value));
                }}
              >
                {report.boxes.map((b) => (
                  <option key={b.index} value={b.index}>
                    {b.index + 1} · {b.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
        <button
          type="button"
          onClick={async () => {
            const r = await onRead("propertyCatalog");
            if (mounted.current) setCatalog(r?.propertyCatalog);
          }}
        >
          {words.load}
        </button>
        <div className="save-editor-fields">
          <label className="field">
            <span>
              {words.property} {catalog?.format}
            </span>
            <input
              list={listId}
              value={property}
              onChange={(e) => setProperty(e.target.value)}
            />
            <datalist id={listId}>
              {catalog?.fields.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.type}
                </option>
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>{words.operator}</span>
            <Select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            >
              {[
                ".",
                "=",
                "!",
                ">",
                "<",
                "≥",
                "≤",
                "+",
                "-",
                "*",
                "/",
                "%",
                "&",
                "|",
                "^",
                "«",
                "»",
              ].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{words.value}</span>
            <input value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          disabled={!property.trim()}
          onClick={() => {
            clear();
            setText(
              (t) => `${t}${t ? "\n" : ""}${operator}${property}=${value}`,
            );
          }}
        >
          {words.add}
        </button>
        <label className="field">
          <span>{words.text}</span>
          <textarea
            rows={7}
            value={text}
            spellCheck={false}
            onChange={(e) => {
              clear();
              setText(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => void preview()}
        >
          {words.preview}
        </button>
        {summary && ticket && (
          <>
            <p role="status">
              {words.group}: {summary.groups} · {words.filters}:{" "}
              {summary.filters} · {words.instructions}: {summary.instructions} ·{" "}
              {words.changed}: {summary.changedSlots}
            </p>
            {errors && (
              <label className="save-pokedex-check">
                <input
                  type="checkbox"
                  checked={allowErrors}
                  onChange={(e) => setErrors(e.target.checked)}
                />
                {words.errors}
              </label>
            )}
            {summary.emptyValues && (
              <label className="save-pokedex-check">
                <input
                  type="checkbox"
                  checked={allowEmpty}
                  onChange={(e) => setEmpty(e.target.checked)}
                />
                {words.empty}
              </label>
            )}
            {summary.ignoredLines.length > 0 && (
              <label className="save-pokedex-check">
                <input
                  type="checkbox"
                  checked={allowIgnored}
                  onChange={(e) => setIgnored(e.target.checked)}
                />
                {words.ignored}: {summary.ignoredLines.join(", ")}
              </label>
            )}
            <div className="save-pokedex-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{words.group}</th>
                    <th>{words.box}</th>
                    <th>{words.slot}</th>
                    <th>{words.result}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.outcomes
                    .slice(page * 50, page * 50 + 50)
                    .map((o, i) => (
                      <tr key={i}>
                        <td>{o.group + 1}</td>
                        <td>{o.box < 0 ? words.scopes[2] : o.box + 1}</td>
                        <td>{o.slot + 1}</td>
                        <td>
                          {words.states[
                            o.result as keyof typeof words.states
                          ] ?? o.result}
                          {o.error ? ` · ${words.failure}` : ""}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                {words.previous}
              </button>
              <span>
                {page + 1} /{" "}
                {Math.max(1, Math.ceil(summary.outcomes.length / 50))}
              </span>
              <button
                type="button"
                disabled={(page + 1) * 50 >= summary.outcomes.length}
                onClick={() => setPage((p) => p + 1)}
              >
                {words.next}
              </button>
            </div>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={
                  !summary.changedSlots ||
                  !summary.instructions ||
                  (errors && !allowErrors) ||
                  (summary.emptyValues && !allowEmpty) ||
                  (summary.ignoredLines.length > 0 && !allowIgnored)
                }
                onClick={() =>
                  void onApply({
                    token: ticket.token,
                    allowErrors,
                    allowEmpty,
                    allowIgnored,
                  })
                }
              >
                {words.apply}
              </button>
              <button type="button" onClick={clear}>
                {words.cancel}
              </button>
            </div>
          </>
        )}
      </fieldset>
    </section>
  );
}

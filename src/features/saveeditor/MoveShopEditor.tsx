// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  moveShopConfirmation,
  moveShopEdit,
  moveShopWords,
  validateMoveShopCatalog,
  sortMoveShopRows,
  type MoveShopSortKey,
  type MoveShopAction,
  type MoveShopCatalog,
  type MoveShopConfirmation,
  type MoveShopEdit,
  type MoveShopTarget,
  type MoveShopTicket,
} from "./moveShop";
import { typeIconImage } from "./art";
import "./MoveShopEditor.css";

export interface MoveShopActions {
  onRead(target: MoveShopTarget): Promise<MoveShopCatalog | undefined>;
  onPreview(request: {
    sourceHash: string;
    target: MoveShopTarget;
    edit: MoveShopEdit;
  }): Promise<MoveShopTicket | undefined>;
  onApply(confirmation: MoveShopConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
}
type Props = MoveShopActions & {
  target: MoveShopTarget;
  lang: "zh" | "en" | "ja";
  busy: boolean;
};
export function MoveShopEditor({
  target,
  lang,
  busy,
  onRead,
  onPreview,
  onApply,
  onDiscard,
}: Props) {
  const w = moveShopWords[lang];
  const [catalog, setCatalog] = useState<MoveShopCatalog>();
  const [rows, setRows] = useState<MoveShopCatalog["rows"]>([]);
  const [ticket, setTicket] = useState<MoveShopTicket>();
  const [action, setAction] = useState<MoveShopAction>("save");
  const [sort, setSort] = useState<{
    key: MoveShopSortKey;
    descending: boolean;
  }>({ key: "index", descending: false });
  const [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const flight = useRef(false),
    life = useRef({
      alive: true,
      ticket: undefined as MoveShopTicket | undefined,
      discard: onDiscard,
    });
  useEffect(() => {
    life.current.discard = onDiscard;
  }, [onDiscard]);
  useEffect(() => {
    const current = life.current;
    current.alive = true;
    return () => {
      current.alive = false;
      if (current.ticket) void current.discard(current.ticket.token);
    };
  }, []);
  const locked = busy || pending;
  async function run(work: () => Promise<void>) {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setError(false);
    try {
      await work();
    } catch {
      if (life.current.alive) setError(true);
    } finally {
      flight.current = false;
      if (life.current.alive) setPending(false);
    }
  }
  const read = () =>
    run(async () => {
      const value = await onRead(target);
      if (!life.current.alive) return;
      if (!value) throw new Error("Missing catalog");
      setCatalog(validateMoveShopCatalog(value));
      setRows(structuredClone(value.rows));
    });
  const preview = () =>
    run(async () => {
      if (!catalog) return;
      const edit = moveShopEdit(
        catalog,
        action,
        action === "encounterReset"
          ? []
          : rows.map(({ index, purchased, mastered }) => ({
              index,
              purchased,
              mastered,
            })),
      );
      const result = await onPreview({
        sourceHash: catalog.sourceHash,
        target,
        edit,
      });
      if (!result) throw new Error("Missing preview");
      if (!life.current.alive) {
        await onDiscard(result.token);
        return;
      }
      try {
        moveShopConfirmation(catalog, target, result);
      } catch (cause) {
        await onDiscard(result.token);
        throw cause;
      }
      life.current.ticket = result;
      setTicket(result);
    });
  const cancel = () =>
    run(async () => {
      if (ticket) await onDiscard(ticket.token);
      life.current.ticket = undefined;
      if (life.current.alive) setTicket(undefined);
    });
  const apply = () =>
    run(async () => {
      if (!catalog || !ticket) return;
      const applied = await onApply(
        moveShopConfirmation(catalog, target, ticket),
      );
      if (!applied) throw new Error("Not applied");
      life.current.ticket = undefined;
    });
  function sortBy(key: typeof sort.key) {
    setSort({
      key,
      descending:
        key === "type"
          ? false
          : sort.key === key
            ? !sort.descending
            : key === "purchased" || key === "mastered",
    });
  }
  const display = sortMoveShopRows(
    ticket?.result.rows ?? rows,
    sort.key,
    sort.descending,
    lang,
  );
  return (
    <details className="save-pokemon-editor save-move-shop">
      <summary>{w.title}</summary>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || !!ticket}
          onClick={() => void read()}
        >
          {pending && !catalog ? w.loading : w.read}
        </button>
      </div>
      {catalog && (
        <>
          <p className="save-editor-note">{w.note}</p>
          <div className="save-editor-fields">
            <label className="field">
              <span>{w.action}</span>
              <Select
                value={action}
                disabled={locked || !!ticket}
                onChange={(event) =>
                  setAction(event.target.value as MoveShopAction)
                }
              >
                {(
                  [
                    "save",
                    "current",
                    "all",
                    "clearCurrent",
                    "none",
                    "encounterReset",
                  ] as const
                ).map((value) => (
                  <option key={value} value={value}>
                    {w[value]}
                  </option>
                ))}
              </Select>
            </label>
            <div className="save-editor-toolbar">
              <button
                type="button"
                className="primary"
                disabled={locked || !!ticket}
                onClick={() => void preview()}
              >
                {w.preview}
              </button>
            </div>
          </div>
          {action === "encounterReset" && (
            <p className="save-editor-note">{w.resetNote}</p>
          )}
          <div
            className="save-move-shop-table"
            tabIndex={0}
            role="region"
            aria-label={w.title}
          >
            <table>
              <thead>
                <tr>
                  {(
                    [
                      ["index", w.index],
                      ["type", w.type],
                      ["name", w.move],
                      ["purchased", w.purchased],
                      ["mastered", w.mastered],
                    ] as const
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      aria-sort={
                        sort.key === key
                          ? sort.descending
                            ? "descending"
                            : "ascending"
                          : "none"
                      }
                    >
                      <button type="button" onClick={() => sortBy(key)}>
                        {label}
                      </button>
                    </th>
                  ))}
                  <th>{w.permitted}</th>
                </tr>
              </thead>
              <tbody>
                {display.map((row) => (
                  <tr
                    key={row.index}
                    data-changed={
                      ticket?.changedRows.includes(row.index) || undefined
                    }
                  >
                    <td>{row.index + 1}</td>
                    <td>
                      <img
                        src={typeIconImage(row.type)}
                        alt={row.typeName[lang]}
                        title={row.typeName[lang]}
                        width={24}
                        height={24}
                      />
                    </td>
                    <td>{row.name[lang]}</td>
                    {(["purchased", "mastered"] as const).map((key) => (
                      <td key={key}>
                        <label className="save-move-shop-toggle">
                          <input
                            type="checkbox"
                            checked={row[key]}
                            aria-label={`${row.name[lang]} · ${w[key]}`}
                            disabled={locked || !!ticket}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setRows((previous) =>
                                previous.map((r) =>
                                  r.index === row.index
                                    ? { ...r, [key]: checked }
                                    : r,
                                ),
                              );
                            }}
                          />
                        </label>
                      </td>
                    ))}
                    <td>{row.permitted ? w.permitted : w.unavailable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ticket && (
            <section aria-live="polite">
              <p>
                {w.changed}: {ticket.changedRows.length} ·{" "}
                {ticket.changedBytes
                  ? `${w.bytes}: ${ticket.changedBytes}`
                  : w.noChange}
              </p>
              <ul className="save-move-shop-differences">
                {ticket.changedRows.map((index) => {
                  const before = ticket.before.rows.find(
                    (row) => row.index === index,
                  )!;
                  const after = ticket.result.rows.find(
                    (row) => row.index === index,
                  )!;
                  return (
                    <li key={index}>
                      {after.name[lang]} · {w.purchased}:{" "}
                      {before.purchased ? w.yes : w.no} →{" "}
                      {after.purchased ? w.yes : w.no} · {w.mastered}:{" "}
                      {before.mastered ? w.yes : w.no} →{" "}
                      {after.mastered ? w.yes : w.no}
                    </li>
                  );
                })}
              </ul>
              <dl className="save-editor-summary">
                <div>
                  <dt>
                    {w.before} · {w.purchased} / {w.mastered}
                  </dt>
                  <dd>
                    <code>
                      {ticket.before.purchasedRaw} / {ticket.before.masteredRaw}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt>
                    {w.after} · {w.purchased} / {w.mastered}
                  </dt>
                  <dd>
                    <code>
                      {ticket.result.purchasedRaw} / {ticket.result.masteredRaw}
                    </code>
                  </dd>
                </div>
              </dl>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={locked || !ticket.changedBytes}
                  onClick={() => void apply()}
                >
                  {w.confirm}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void cancel()}
                >
                  {w.cancel}
                </button>
              </div>
            </section>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {w.failed}
        </p>
      )}
    </details>
  );
}

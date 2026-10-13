// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { plusRecordWords } from "./plusRecordWords";
import {
  plusRecordEdit,
  plusRecordConfirmation,
  validatePlusRecordCatalog,
  type PlusRecordAction,
  type PlusRecordCatalog,
  type PlusRecordConfirmation,
  type PlusRecordEdit,
  type PlusRecordTarget,
  type PlusRecordTicket,
} from "./plusRecord";
import { typeIconImage } from "./art";
// Both record editors use the same established 44px controls and scroll region.
import "./MoveShopEditor.css";
export interface PlusRecordActions {
  onRead(target: PlusRecordTarget): Promise<PlusRecordCatalog | undefined>;
  onPreview(request: {
    sourceHash: string;
    target: PlusRecordTarget;
    edit: PlusRecordEdit;
  }): Promise<PlusRecordTicket | undefined>;
  onApply(confirmation: PlusRecordConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
}
type Props = PlusRecordActions & {
  target: PlusRecordTarget;
  lang: "zh" | "en" | "ja";
  busy: boolean;
};
export function PlusRecordEditor({
  target,
  lang,
  busy,
  onRead,
  onPreview,
  onApply,
  onDiscard,
}: Props) {
  const w = plusRecordWords[lang];
  const [catalog, setCatalog] = useState<PlusRecordCatalog>(),
    [rows, setRows] = useState<PlusRecordCatalog["rows"]>([]),
    [ticket, setTicket] = useState<PlusRecordTicket>();
  const [action, setAction] = useState<PlusRecordAction>("save"),
    [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const [sort, setSort] = useState<{
    key: "index" | "type" | "name" | "flag";
    descending: boolean;
  }>({ key: "index", descending: false });
  const flight = useRef(false),
    life = useRef({
      alive: true,
      ticket: undefined as PlusRecordTicket | undefined,
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
      setCatalog(validatePlusRecordCatalog(value));
      setRows(structuredClone(value.rows));
    });
  const preview = () =>
    run(async () => {
      if (!catalog) return;
      const edit = plusRecordEdit(
        catalog,
        action,
        action === "none" || action === "parentCurrent"
          ? []
          : rows.map(({ index, flag }) => ({ index, flag })),
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
        plusRecordConfirmation(catalog, target, result);
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
      if (!(await onApply(plusRecordConfirmation(catalog, target, ticket))))
        throw new Error("Not applied");
      life.current.ticket = undefined;
    });
  const display = (ticket?.result.rows ?? rows).slice().sort((a, b) => {
    const compared =
      sort.key === "name"
        ? a.name[lang].localeCompare(b.name[lang])
        : sort.key === "type"
          ? a.type - b.type ||
            Number(b.currentMove || b.learnable) -
              Number(a.currentMove || a.learnable) ||
            a.name[lang].localeCompare(b.name[lang])
          : Number(a[sort.key]) - Number(b[sort.key]);
    return (sort.descending ? -compared : compared) || a.index - b.index;
  });
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
                  setAction(event.target.value as PlusRecordAction)
                }
              >
                {(
                  [
                    "save",
                    "legalCurrentTM",
                    "legalSeedTM",
                    "legalCurrent",
                    "clearAfterSave",
                    "none",
                    "parentCurrent",
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
          {(action === "none" || action === "parentCurrent") && (
            <p className="save-editor-note">{w.ignoresDraft}</p>
          )}
          {catalog.hasImpossibleFlags && (
            <p className="save-editor-note">{w.extraNote}</p>
          )}
          <div
            className="save-move-shop-table"
            role="region"
            tabIndex={0}
            aria-label={w.title}
          >
            <table>
              <thead>
                <tr>
                  {(
                    [
                      ["flag", w.flag],
                      ["index", w.number],
                      ["type", w.type],
                      ["name", w.move],
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
                      <button
                        type="button"
                        onClick={() =>
                          setSort({
                            key,
                            descending:
                              key === "type"
                                ? false
                                : sort.key === key
                                  ? !sort.descending
                                  : false,
                          })
                        }
                      >
                        {label}
                      </button>
                    </th>
                  ))}
                  <th>{w.permission}</th>
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
                    <td>
                      <label className="save-move-shop-toggle">
                        <input
                          type="checkbox"
                          checked={row.flag}
                          disabled={locked || !!ticket}
                          aria-label={`${row.name[lang]} · ${w.flag}`}
                          onChange={(event) => {
                            const flag = event.target.checked;
                            setRows((previous) =>
                              previous.map((r) =>
                                r.index === row.index ? { ...r, flag } : r,
                              ),
                            );
                          }}
                        />
                      </label>
                    </td>
                    <td>{String(row.index).padStart(3, "0")}</td>
                    <td>
                      <img
                        src={typeIconImage(row.type)}
                        alt={row.typeName[lang]}
                        title={row.typeName[lang]}
                        width={24}
                        height={24}
                      />
                    </td>
                    <td>
                      {row.name[lang]}
                      {row.currentMove && (
                        <span className="save-editor-note">
                          {" "}
                          · {w.currentMove}
                        </span>
                      )}
                    </td>
                    <td>
                      {row.currentMove
                        ? w.current
                        : row.learnable
                          ? w.learnable
                          : w.suspect}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ticket && (
            <section aria-live="polite">
              <p>
                {w.changed}: {ticket.changedRows.length} · {w.extra}:{" "}
                {
                  ticket.changedFlags.filter((i) => i >= catalog.rows.length)
                    .length
                }{" "}
                · {w.bytes}: {ticket.changedBytes || w.noChange}
              </p>
              <ul className="save-move-shop-differences">
                {ticket.changedRows.map((index) => {
                  const before = ticket.before.rows.find(
                    (r) => r.index === index,
                  )!;
                  const after = ticket.result.rows.find(
                    (r) => r.index === index,
                  )!;
                  return (
                    <li key={index}>
                      {after.name[lang]}: {before.flag ? w.yes : w.no} →{" "}
                      {after.flag ? w.yes : w.no}
                    </li>
                  );
                })}
              </ul>
              <dl className="save-editor-summary">
                <div>
                  <dt>{w.before}</dt>
                  <dd>
                    <code>{ticket.before.raw}</code>
                  </dd>
                </div>
                <div>
                  <dt>{w.after}</dt>
                  <dd>
                    <code>{ticket.result.raw}</code>
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

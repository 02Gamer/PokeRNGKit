// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { PokemonSelect as Select } from "./PokemonSelect";
import { pokemonSuperTrainingWords } from "./pokemonSuperTrainingWords";
import { superTrainingSourceLabels } from "./superTrainingSourceLabels";
import {
  superTrainingDraft,
  superTrainingConfirmation,
  validateSuperTrainingCatalog,
  type SuperTrainingCatalog,
  type SuperTrainingEvent,
  type SuperTrainingRequest,
  type SuperTrainingTarget,
  type SuperTrainingTicket,
  type SuperTrainingConfirmation,
} from "./pokemonSuperTraining";
import "./MoveShopEditor.css";
export interface PokemonSuperTrainingActions {
  onRead(
    target: SuperTrainingTarget,
  ): Promise<SuperTrainingCatalog | undefined>;
  onPreview(
    request: SuperTrainingRequest,
  ): Promise<SuperTrainingTicket | undefined>;
  onApply(confirmation: SuperTrainingConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
}
type Props = PokemonSuperTrainingActions & {
  target: SuperTrainingTarget;
  lang: "zh" | "en" | "ja";
  busy: boolean;
};
export function PokemonSuperTrainingEditor({
  target,
  lang,
  busy,
  onRead,
  onPreview,
  onApply,
  onDiscard,
}: Props) {
  const w = pokemonSuperTrainingWords[lang],
    label = (key: keyof typeof superTrainingSourceLabels) =>
      superTrainingSourceLabels[key][lang];
  const [catalog, setCatalog] = useState<SuperTrainingCatalog>(),
    [events, setEvents] = useState<SuperTrainingEvent[]>([]),
    [ticket, setTicket] = useState<SuperTrainingTicket>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const flight = useRef(false),
    life = useRef({
      alive: true,
      ticket: undefined as SuperTrainingTicket | undefined,
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
  const locked = busy || pending,
    editingLocked = locked || !!ticket;
  const draft = catalog ? superTrainingDraft(catalog, events) : undefined;
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
  function append(event: SuperTrainingEvent) {
    if (!catalog || editingLocked) return;
    try {
      superTrainingDraft(catalog, [...events, event]);
      setEvents((current) => [...current, event]);
      setError(false);
    } catch {
      setError(true);
    }
  }
  const read = () =>
    run(async () => {
      const value = await onRead(target);
      if (!life.current.alive) return;
      if (!value) throw Error("Missing catalog");
      setCatalog(validateSuperTrainingCatalog(value));
      setEvents([]);
    });
  const preview = () =>
    run(async () => {
      if (!catalog) return;
      superTrainingDraft(catalog, events);
      const value = await onPreview({
        sourceHash: catalog.sourceHash,
        target,
        edit: { events: structuredClone(events) },
      });
      if (!value) throw Error("Missing preview");
      if (!life.current.alive) {
        await onDiscard(value.token);
        return;
      }
      try {
        superTrainingConfirmation(catalog, target, value);
      } catch (cause) {
        await onDiscard(value.token);
        throw cause;
      }
      life.current.ticket = value;
      setTicket(value);
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
      if (!(await onApply(superTrainingConfirmation(catalog, target, ticket))))
        throw Error("Not applied");
      life.current.ticket = undefined;
    });
  const shown = ticket?.result.draft ?? draft,
    yes = (v: boolean) => (v ? w.yes : w.no);
  const fieldValue = (
    key: "unlocked" | "complete" | "bag" | "hits",
    value: boolean | number | null,
  ) =>
    typeof value === "boolean"
      ? yes(value)
      : key === "bag"
        ? (catalog?.bags.find((b) => b.index === value)?.name[lang] ??
          String(value))
        : String(value);
  return (
    <details className="save-pokemon-editor save-move-shop">
      <summary>{label("SuperTrainingEditor")}</summary>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={editingLocked || events.length > 0}
          onClick={() => void read()}
        >
          {pending && !catalog ? w.loading : w.read}
        </button>
      </div>
      {catalog && shown && (
        <>
          <p className="save-editor-note">{w.note}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={editingLocked}
              onClick={() => append({ kind: "all", index: 0, value: 0 })}
            >
              {label("SuperTrainingEditor.B_All")}
            </button>
            <button
              type="button"
              disabled={editingLocked}
              onClick={() => append({ kind: "none", index: 0, value: 0 })}
            >
              {label("SuperTrainingEditor.B_None")}
            </button>
            <button
              type="button"
              disabled={editingLocked || !events.length}
              onClick={() => setEvents([])}
            >
              {w.reset}
            </button>
            <span className="save-editor-note">
              {w.events}: {events.length}/512
            </span>
          </div>
          {catalog.hasBag && (
            <div className="save-editor-fields">
              <label className="save-editor-checkbox">
                <input
                  type="checkbox"
                  checked={shown.unlocked}
                  disabled={editingLocked}
                  onChange={(e) =>
                    append({
                      kind: "unlocked",
                      index: 0,
                      value: Number(e.target.checked),
                    })
                  }
                />
                {label("SuperTrainingEditor.CHK_SecretUnlocked")}
              </label>
              <label className="save-editor-checkbox">
                <input
                  type="checkbox"
                  checked={shown.complete}
                  disabled={editingLocked || !shown.unlocked}
                  onChange={(e) =>
                    append({
                      kind: "complete",
                      index: 0,
                      value: Number(e.target.checked),
                    })
                  }
                />
                {label("SuperTrainingEditor.CHK_SecretComplete")}
              </label>
              <label className="field">
                <span>{label("SuperTrainingEditor.L_Bag")}</span>
                <Select
                  value={shown.bag ?? 0}
                  disabled={editingLocked}
                  onChange={(e) =>
                    append({
                      kind: "bag",
                      index: 0,
                      value: Number(e.target.value),
                    })
                  }
                >
                  {catalog.bags.map((b) => (
                    <option key={b.index} value={b.index}>
                      {b.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{label("SuperTrainingEditor.L_Hits")}</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  step={1}
                  value={shown.hits ?? 0}
                  disabled={editingLocked}
                  onChange={(e) =>
                    append({
                      kind: "hits",
                      index: 0,
                      value:
                        e.target.value === "" ? NaN : Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
          )}
          {([false, true] as const).map((distribution) => (
            <section key={String(distribution)}>
              <h3>{distribution ? w.distribution : w.regular}</h3>
              <div
                className="save-move-shop-table"
                role="region"
                tabIndex={0}
                aria-label={distribution ? w.distribution : w.regular}
              >
                <table>
                  <thead>
                    <tr>
                      <th>{w.draft}</th>
                      <th>{w.stored}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.rows
                      .filter((r) => r.distribution === distribution)
                      .map((row) => {
                        const flat = row.distribution
                            ? 30 + row.index
                            : row.index,
                          checked = row.distribution
                            ? shown.distribution[row.index]
                            : shown.regular[row.index];
                        return (
                          <tr
                            key={row.index}
                            data-changed={
                              ticket?.changedRows.includes(flat) || undefined
                            }
                          >
                            <td>
                              <label className="save-editor-checkbox">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={
                                    editingLocked ||
                                    (catalog.hasBag &&
                                      !distribution &&
                                      row.index >= 18 &&
                                      !shown.unlocked)
                                  }
                                  onChange={(e) =>
                                    append({
                                      kind: distribution
                                        ? "distribution"
                                        : "regular",
                                      index: row.index,
                                      value: Number(e.target.checked),
                                    })
                                  }
                                />
                                {row.name[lang]}
                              </label>
                            </td>
                            <td>{yes(row.storedFlag)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          {!ticket && (
            <div className="save-editor-toolbar">
              <button
                type="button"
                className="primary"
                disabled={locked}
                onClick={() => void preview()}
              >
                {w.preview}
              </button>
            </div>
          )}
          {ticket && (
            <section aria-live="polite">
              <p>
                {w.changed}:{" "}
                {ticket.changedRows.length + ticket.changedFields.length} ·{" "}
                {w.bytes}: {ticket.changedBytes || w.noChange}
              </p>
              <ul className="save-move-shop-differences">
                {ticket.changedRows.map((i) => (
                  <li key={i}>
                    {ticket.before.rows[i].name[lang]}:{" "}
                    {yes(ticket.before.rows[i].storedFlag)} →{" "}
                    {yes(ticket.result.rows[i].storedFlag)}
                  </li>
                ))}
                {ticket.changedFields.map((key) => (
                  <li key={key}>
                    {w[key]}: {fieldValue(key, ticket.before.stored[key])} →{" "}
                    {fieldValue(key, ticket.result.stored[key])}
                  </li>
                ))}
              </ul>
              <dl className="save-editor-summary">
                <div>
                  <dt>
                    {w.before} · {w.raw}
                  </dt>
                  <dd>
                    <code>{ticket.before.raw}</code>
                  </dd>
                </div>
                <div>
                  <dt>
                    {w.after} · {w.raw}
                  </dt>
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
        <p className="save-editor-error" role="alert">
          {w.failed}
        </p>
      )}
    </details>
  );
}

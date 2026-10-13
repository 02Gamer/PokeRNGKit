// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { textTrashWords, textTrashCharacterLabel } from "./textTrashWords";
import {
  textTrashConfirmation,
  validateTextTrashCatalog,
  validateTextTrashDraft,
  validateTextTrashRequest,
  type TextTrashCatalog,
  type TextTrashConfirmation,
  type TextTrashDraft,
  type TextTrashEvent,
  type TextTrashField,
  type TextTrashRequest,
  type TextTrashTarget,
  type TextTrashTicket,
} from "./textTrash";
import "./MoveShopEditor.css";

export interface TextTrashActions {
  onRead(target: TextTrashTarget): Promise<TextTrashCatalog | undefined>;
  onDraft(request: TextTrashRequest): Promise<TextTrashDraft | undefined>;
  onPreview(request: TextTrashRequest): Promise<TextTrashTicket | undefined>;
  onApply(confirmation: TextTrashConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
}
type Props = TextTrashActions & {
  target: Omit<TextTrashTarget, "field">;
  fields: TextTrashField[];
  lang: "zh" | "en" | "ja";
  busy: boolean;
};
export function TextTrashEditor({
  target,
  fields,
  lang,
  busy,
  onRead,
  onDraft,
  onPreview,
  onApply,
  onDiscard,
}: Props) {
  const w = textTrashWords[lang];
  const [field, setField] = useState<TextTrashField>(fields[0] ?? "nickname"),
    [catalog, setCatalog] = useState<TextTrashCatalog>(),
    [draft, setDraft] = useState<TextTrashDraft>(),
    [events, setEvents] = useState<TextTrashEvent[]>([]),
    [ticket, setTicket] = useState<TextTrashTicket>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const [input, setInput] = useState(""),
    [offset, setOffset] = useState(0),
    [byteInput, setByteInput] = useState(""),
    [species, setSpecies] = useState(0),
    [language, setLanguage] = useState(1),
    [generation, setGeneration] = useState(0);
  const lastGeneration = useRef(0),
    root = useRef<HTMLDetailsElement>(null),
    previewButton = useRef<HTMLButtonElement>(null),
    previewWasOpen = useRef(false),
    flight = useRef(false),
    life = useRef({
      alive: true,
      ticket: undefined as TextTrashTicket | undefined,
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
  useEffect(() => {
    if (!ticket && previewWasOpen.current && root.current?.open)
      previewButton.current?.focus();
    previewWasOpen.current = !!ticket;
  }, [ticket]);
  const locked = busy || pending,
    editingLocked = locked || !!ticket || !catalog?.canEdit;
  const textDirty = !!draft && input !== draft.text,
    byteDirty =
      !!draft &&
      !!draft.hex &&
      byteInput.toUpperCase() !== draft.hex.slice(offset * 2, offset * 2 + 2),
    localDirty = textDirty || byteDirty;
  const targetWithField = { ...target, field };
  function showDraft(value: TextTrashDraft) {
    setDraft(value);
    setInput(value.text);
    setByteInput(value.hex.slice(offset * 2, offset * 2 + 2));
  }
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
  const read = (nextField = field) =>
    run(async () => {
      const value = await onRead({ ...target, field: nextField });
      if (!life.current.alive) return;
      if (!value) throw Error("Missing name catalog");
      validateTextTrashCatalog(value);
      if (value.field !== nextField) throw Error("Name field mismatch");
      setField(nextField);
      setCatalog(value);
      setDraft(value.draft);
      setEvents([]);
      setOffset(0);
      setInput(value.draft.text);
      setByteInput(value.draft.hex.slice(0, 2));
      setSpecies(value.species[0]?.id ?? 0);
      setLanguage(value.languages[0]?.id ?? 1);
      setGeneration(value.generation);
      lastGeneration.current = value.generation;
    });
  const append = (event: TextTrashEvent) =>
    run(async () => {
      if (!catalog || !draft || editingLocked) return;
      const next = [...events, event],
        request = validateTextTrashRequest(
          catalog,
          targetWithField,
          catalog.draft.initialText,
          next,
        );
      const value = await onDraft(request);
      if (!life.current.alive) return;
      if (!value) throw Error("Missing name draft");
      validateTextTrashDraft(value, catalog.storedHex.length);
      if (value.field !== field || value.initialText !== request.initialText)
        throw Error("Name draft target mismatch");
      setEvents(next);
      showDraft(value);
    });
  const preview = () =>
    run(async () => {
      if (!catalog || !draft || editingLocked || localDirty) return;
      const value = await onPreview(
        validateTextTrashRequest(
          catalog,
          targetWithField,
          catalog.draft.initialText,
          events,
        ),
      );
      if (!value) throw Error("Missing name preview");
      if (!life.current.alive || !root.current?.open) {
        await onDiscard(value.token);
        return;
      }
      try {
        textTrashConfirmation(catalog, targetWithField, value);
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
      const accepted = await onApply(
        textTrashConfirmation(catalog, targetWithField, ticket),
      );
      if (!accepted) throw Error("Name output not applied");
      life.current.ticket = undefined;
      if (life.current.alive) {
        setTicket(undefined);
        setCatalog(undefined);
        setDraft(undefined);
        setEvents([]);
      }
    });
  const reset = () => {
    if (catalog && !locked && !ticket) {
      setEvents([]);
      showDraft(catalog.draft);
      setError(false);
    }
  };
  const selectByte = (index: number) => {
    if (draft && !locked && !ticket && !localDirty) {
      setOffset(index);
      setByteInput(draft.hex.slice(index * 2, index * 2 + 2));
    }
  };
  const byteValid = /^[\da-f]{1,2}$/i.test(byteInput);
  return (
    <details
      ref={root}
      className="save-pokemon-editor save-move-shop"
      onToggle={(e) => {
        if (e.target !== e.currentTarget || e.currentTarget.open) return;
        const current = life.current;
        if (current.ticket) {
          void current.discard(current.ticket.token);
          current.ticket = undefined;
          setTicket(undefined);
        }
      }}
    >
      <summary>{w.title}</summary>
      <div className="save-editor-fields">
        <label className="field">
          <span>{w.field}</span>
          <Select
            value={field}
            disabled={locked || !!ticket || events.length > 0 || localDirty}
            onChange={(e) => {
              const next = e.target.value as TextTrashField;
              if (catalog) void read(next);
              else setField(next);
            }}
          >
            {fields.map((v) => (
              <option key={v} value={v}>
                {w[v]}
              </option>
            ))}
          </Select>
        </label>
        <button
          type="button"
          disabled={locked || !!ticket || events.length > 0 || localDirty}
          onClick={() => void read()}
        >
          {pending && !catalog ? w.loading : w.read}
        </button>
      </div>
      {catalog && draft && (
        <>
          <p className="save-editor-note">{w.note}</p>
          {!catalog.canEdit && <p className="save-editor-note">{w.readonly}</p>}
          <div className="save-editor-fields">
            <label className="field">
              <span>{w.text}</span>
              <input
                value={input}
                maxLength={draft.maxLength}
                disabled={editingLocked || byteDirty}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={editingLocked || !textDirty || byteDirty}
              onClick={() => void append({ kind: "text", text: input })}
            >
              {w.updateText}
            </button>
          </div>
          {!!draft.characters.length && (
            <section>
              <h3>{w.characters}</h3>
              <div className="save-editor-toolbar">
                {draft.characters.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={`U+${c.toString(16).toUpperCase()}`}
                    disabled={
                      editingLocked ||
                      localDirty ||
                      draft.text.length >= draft.maxLength
                    }
                    onClick={() => void append({ kind: "character", value: c })}
                  >
                    {textTrashCharacterLabel(c, catalog.generation, lang)}
                  </button>
                ))}
              </div>
            </section>
          )}
          {draft.hex.length ? (
            <details>
              <summary>{w.bytes}</summary>
              <div className="save-editor-fields">
                <label className="field">
                  <span>{w.offset}</span>
                  <Select
                    value={offset}
                    disabled={locked || !!ticket || localDirty}
                    onChange={(e) => selectByte(Number(e.target.value))}
                  >
                    {Array.from({ length: draft.hex.length / 2 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString(16).toUpperCase().padStart(2, "0")}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="field">
                  <span>{w.value}</span>
                  <input
                    value={byteInput}
                    maxLength={2}
                    spellCheck={false}
                    autoComplete="off"
                    disabled={editingLocked || textDirty}
                    aria-invalid={byteDirty && !byteValid}
                    onChange={(e) => setByteInput(e.target.value)}
                    onBlur={() => {
                      if (byteInput === "")
                        setByteInput(
                          draft.hex.slice(offset * 2, offset * 2 + 2),
                        );
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    editingLocked || textDirty || !byteDirty || !byteValid
                  }
                  onClick={() =>
                    void append({
                      kind: "byte",
                      index: offset,
                      value: parseInt(byteInput, 16),
                    })
                  }
                >
                  {w.updateByte}
                </button>
              </div>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={editingLocked || localDirty}
                  onClick={() =>
                    void append({ kind: "byte", index: offset, value: 255 })
                  }
                >
                  FF
                </button>
                <button
                  type="button"
                  disabled={editingLocked || localDirty}
                  onClick={() =>
                    void append({ kind: "byte", index: offset, value: 0 })
                  }
                >
                  00
                </button>
                <button
                  type="button"
                  disabled={editingLocked || localDirty}
                  onClick={() => void append({ kind: "clear" })}
                >
                  {w.clear}
                </button>
              </div>
              <div
                className="save-move-shop-table"
                role="region"
                tabIndex={0}
                aria-label={w.bytes}
              >
                <table>
                  <thead>
                    <tr>
                      <th>{w.offset}</th>
                      <th>{w.stored}</th>
                      <th>{w.draft}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: draft.hex.length / 2 }, (_, i) => {
                      const old = catalog.storedHex.slice(i * 2, i * 2 + 2),
                        next = draft.hex.slice(i * 2, i * 2 + 2);
                      return (
                        <tr key={i} data-changed={old !== next || undefined}>
                          <td>
                            <button
                              type="button"
                              disabled={locked || !!ticket || localDirty}
                              aria-pressed={offset === i}
                              onClick={() => selectByte(i)}
                            >
                              {i.toString(16).toUpperCase().padStart(2, "0")}
                            </button>
                          </td>
                          <td>
                            <code>{old}</code>
                          </td>
                          <td>
                            <code>{next}</code>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <details>
                <summary>{w.layer}</summary>
                <div className="save-editor-fields">
                  <label className="field">
                    <span>{w.species}</span>
                    <Select
                      value={species}
                      disabled={editingLocked}
                      onChange={(e) => setSpecies(Number(e.target.value))}
                    >
                      {catalog.species.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name[lang]}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="field">
                    <span>{w.language}</span>
                    <Select
                      value={language}
                      disabled={editingLocked}
                      onChange={(e) => setLanguage(Number(e.target.value))}
                    >
                      {catalog.languages.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name[lang]}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="field">
                    <span>{w.generation}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Number.isNaN(generation) ? "" : generation}
                      disabled={editingLocked}
                      onChange={(e) =>
                        setGeneration(
                          e.target.value === "" ? NaN : Number(e.target.value),
                        )
                      }
                      onBlur={() => {
                        const next = Number.isFinite(generation)
                          ? Math.min(100, Math.max(0, Math.trunc(generation)))
                          : lastGeneration.current;
                        lastGeneration.current = next;
                        setGeneration(next);
                      }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={
                    editingLocked ||
                    localDirty ||
                    !Number.isInteger(generation) ||
                    generation < 0 ||
                    generation > 100
                  }
                  onClick={() =>
                    void append({
                      kind: "layer",
                      species,
                      language,
                      generation,
                      uiLanguage: lang,
                    })
                  }
                >
                  {w.applyLayer}
                </button>
              </details>
            </details>
          ) : (
            <p className="save-editor-note">{w.empty}</p>
          )}
          {localDirty && <p className="save-editor-note">{w.pendingInput}</p>}
          <div className="save-editor-toolbar">
            <button
              type="button"
              ref={previewButton}
              disabled={editingLocked || localDirty}
              onClick={() => void preview()}
            >
              {w.preview}
            </button>
            <button
              type="button"
              disabled={locked || !!ticket || (!events.length && !localDirty)}
              onClick={reset}
            >
              {w.reset}
            </button>
          </div>
          {ticket && (
            <section aria-label={w.preview}>
              <p className="save-editor-note">
                {w.changed}: {ticket.changedBytes}
              </p>
              <div className="save-editor-fields">
                <label className="field">
                  <span>{w.before}</span>
                  <input readOnly value={ticket.before.storedText} />
                </label>
                <label className="field">
                  <span>{w.after}</span>
                  <input readOnly value={ticket.result.storedText} />
                </label>
              </div>
              <code>{ticket.before.storedHex}</code>
              <br />
              <code>{ticket.result.storedHex}</code>
              {ticket.changedNameBytes.length > 0 && (
                <ul className="save-move-shop-differences">
                  {ticket.changedNameBytes.map((i) => (
                    <li key={i}>
                      <code>
                        {i.toString(16).toUpperCase().padStart(2, "0")}:{" "}
                        {ticket.before.storedHex.slice(i * 2, i * 2 + 2)} →{" "}
                        {ticket.result.storedHex.slice(i * 2, i * 2 + 2)}
                      </code>
                    </li>
                  ))}
                </ul>
              )}
              {!ticket.changedBytes && (
                <p className="save-editor-note">{w.none}</p>
              )}
              <div className="save-editor-toolbar">
                <button
                  type="button"
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
        <p className="error" role="alert">
          {w.failed}
        </p>
      )}
    </details>
  );
}

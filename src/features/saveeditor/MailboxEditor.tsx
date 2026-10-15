import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { playSaveSound } from "./saveSound";
import {
  mailConfirmation,
  mailDeleteNeedsQuestion,
  mailDraft,
  mailRequest,
  mailType,
  mailTypeChoice,
  mailboxWords,
  mailIssue,
  type MailAction,
  type MailCatalog,
  type MailChoice,
  type MailConfirmation,
  type MailEntry,
  type MailRequest,
  type MailTicket,
} from "./mailbox";
import "./MailboxEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<MailCatalog | undefined>;
  onPreview(request: MailRequest): Promise<MailTicket | undefined>;
  onApply(confirmation: MailConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
};
export function MailboxEditor(props: Props) {
  return <Form key={props.revision} {...props} />;
}
function Form({ busy, lang, onRead, onPreview, onApply, onDiscard }: Props) {
  const w = mailboxWords[lang];
  const [catalog, setCatalog] = useState<MailCatalog>(),
    [ticket, setTicket] = useState<MailTicket>(),
    [selected, setSelected] = useState(0),
    [draft, setDraft] = useState<MailEntry>(),
    [actions, setActions] = useState<MailAction[]>([]),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [accept, setAccept] = useState(false),
    [linked, setLinked] = useState(false);
  const [dirty, setDirty] = useState(false);
  const lifecycle = useRef({
      alive: true,
      epoch: 0,
      onRead,
      onDiscard,
      lang,
      ticket: undefined as MailTicket | undefined,
    }),
    request = useRef<Promise<MailCatalog | undefined>>(undefined),
    flight = useRef(false);
  useEffect(() => {
    Object.assign(lifecycle.current, { onRead, onDiscard, lang });
  }, [onRead, onDiscard, lang]);
  useEffect(() => {
    const life = lifecycle.current;
    life.alive = true;
    const epoch = life.epoch;
    request.current ??= life.onRead();
    void request.current
      .then((c) => {
        if (life.alive && epoch === life.epoch && c) {
          setCatalog(c);
          setSelected(0);
          if (c.entries[0]) setDraft(mailDraft(c, c.entries[0]));
        }
      })
      .catch(() => {
        if (life.alive && epoch === life.epoch)
          setError(mailboxWords[life.lang].invalid);
      });
    return () => {
      life.alive = false;
      life.epoch++;
      if (life.ticket) void life.onDiscard(life.ticket.token);
    };
  }, []);
  const frame = ticket?.result ?? catalog,
    locked = busy || pending;
  function update(patch: Partial<MailEntry>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setAccept(false);
    setDirty(true);
  }
  async function readAgain() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const life = lifecycle.current,
      epoch = life.epoch;
    try {
      const c = await onRead();
      if (c && life.alive && epoch === life.epoch) {
        setCatalog(c);
        setSelected(0);
        setDraft(c.entries[0] ? mailDraft(c, c.entries[0]) : undefined);
        setError("");
      }
    } catch {
      if (life.alive && epoch === life.epoch) setError(w.invalid);
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  function withDraft() {
    return draft
      ? [
          ...actions,
          {
            kind: "edit" as const,
            index: draft.index,
            entry: structuredClone(draft),
          },
        ]
      : actions;
  }
  async function preview(next: MailAction[], index = selected) {
    if (!catalog || locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setError("");
    setAccept(false);
    setActions(next);
    setTicket(undefined);
    lifecycle.current.ticket = undefined;
    const life = lifecycle.current,
      epoch = life.epoch;
    try {
      const t = await onPreview(mailRequest(catalog, next));
      if (!life.alive || epoch !== life.epoch) {
        if (t) await onDiscard(t.token);
        return;
      }
      if (t) {
        mailConfirmation(catalog, t, true);
        life.ticket = t;
        setTicket(t);
        setSelected(index);
        const e = t.result.entries[index];
        setDraft(e ? mailDraft(t.result, e) : undefined);
        setDirty(false);
      }
    } catch {
      if (life.alive) setError(w.invalid);
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  async function select(index: number) {
    if (index === selected || locked) return;
    if (catalog && !catalog.canEdit) {
      setSelected(index);
      const entry = frame?.entries[index];
      setDraft(entry ? mailDraft(catalog, entry) : undefined);
      return;
    }
    await preview(withDraft(), index);
  }
  async function discard() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const life = lifecycle.current;
    try {
      if (life.ticket) await onDiscard(life.ticket.token);
      if (life.alive) {
        life.ticket = undefined;
        setTicket(undefined);
        setActions([]);
        setDirty(false);
        setAccept(false);
        setError("");
        const e = catalog?.entries[selected];
        setDraft(e && catalog ? mailDraft(catalog, e) : undefined);
      }
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  async function apply() {
    if (!catalog || !ticket || locked || flight.current || dirty) return;
    flight.current = true;
    setPending(true);
    const life = lifecycle.current;
    try {
      if (
        (await onApply(mailConfirmation(catalog, ticket, accept))) &&
        life.alive
      ) {
        life.ticket = undefined;
        setTicket(undefined);
        setActions([]);
      }
    } catch {
      if (life.alive) setError(w.stale);
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  function choose(
    label: string,
    value: number,
    choices: MailChoice[],
    change: (value: number) => void,
    disabled = false,
  ) {
    return (
      <ChoiceField
        label={label}
        value={value}
        choices={choices}
        change={change}
        disabled={locked || disabled}
        lang={lang}
      />
    );
  }
  function number(
    label: string,
    value: number,
    change: (value: number) => void,
    min = 0,
    max = 65535,
  ) {
    return (
      <NumberField
        label={label}
        value={value}
        change={change}
        min={min}
        max={max}
        disabled={locked || !catalog?.canEdit}
      />
    );
  }
  return (
    <section className="save-mailbox-editor" aria-label={w.title}>
      <h3>{w.title}</h3>
      {!catalog || !frame ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={locked}
            onClick={() => void readAgain()}
          >
            {w.read}
          </button>
        </div>
      ) : (
        <>
          <div className="save-mailbox-navigation">
            <ChoiceField
              label={w.slot}
              value={selected}
              choices={frame.entries
                .filter(
                  (e) => e.held || e.index < frame.heldCount + frame.boxCount,
                )
                .map((e) => {
                  const label = `${e.held ? w.held : w.box} ${e.held ? e.index + 1 : e.index - frame.heldCount + 1} · ${e.empty === true ? w.empty : e.authorName}`;
                  return {
                    id: e.index,
                    name: { zh: label, en: label, ja: label },
                  };
                })}
              change={(index) => void select(index)}
              disabled={locked}
              lang={lang}
            />
            {catalog.generation === 2 && (
              <NumberField
                label={w.count}
                value={frame.boxCount}
                change={(value) =>
                  void preview(
                    [...withDraft(), { kind: "boxCount", index: 0, value }],
                    Math.min(selected, frame.heldCount + value - 1),
                  )
                }
                min={0}
                max={frame.boxMaximum}
                disabled={locked || !catalog.canEdit}
              />
            )}
          </div>
          {draft && (
            <>
              <div className="save-editor-fields save-mailbox-fields">
                <label className="field">
                  <span>{w.author}</span>
                  <input
                    value={draft.authorName}
                    maxLength={7}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) => update({ authorName: e.target.value })}
                  />
                </label>
                {number(w.tid, draft.tid, (tid) => update({ tid }))}
                {catalog.generation > 2 &&
                  number(w.sid, draft.sid, (sid) => update({ sid }))}
                {choose(
                  w.language,
                  draft.language,
                  catalog.languages,
                  (language) => update({ language }),
                  !catalog.canEdit ||
                    (catalog.generation === 2 &&
                      [1, 8].includes(draft.language)),
                )}
                {choose(
                  w.type,
                  mailTypeChoice(catalog, draft.type),
                  catalog.types,
                  (value) => update({ type: mailType(catalog, value) }),
                  !catalog.canEdit,
                )}
                {catalog.generation <= 3 &&
                  choose(
                    w.species,
                    draft.species,
                    catalog.species,
                    (species) => update({ species }),
                    !catalog.canEdit,
                  )}
                {catalog.generation >= 4 && (
                  <>
                    {choose(
                      w.version,
                      draft.version,
                      catalog.versions,
                      (version) => update({ version }),
                      !catalog.canEdit,
                    )}
                    {choose(
                      w.gender,
                      draft.gender,
                      [
                        { id: 0, name: { zh: w.male, en: w.male, ja: w.male } },
                        {
                          id: 1,
                          name: { zh: w.female, en: w.female, ja: w.female },
                        },
                      ],
                      (gender) => update({ gender }),
                      !catalog.canEdit,
                    )}
                  </>
                )}
              </div>
              <div className="save-mailbox-messages">
                {catalog.generation === 2 ? (
                  <>
                    {draft.lines.map((line, i) => (
                      <label className="field" key={i}>
                        <span>
                          {w.message} {i + 1}
                        </span>
                        <input
                          value={line}
                          maxLength={32}
                          disabled={locked || !catalog.canEdit}
                          onChange={(e) =>
                            update({
                              lines: draft.lines.map((v, j) =>
                                j === i ? e.target.value : v,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    <label className="save-editor-review">
                      <input
                        type="checkbox"
                        checked={draft.userEntered}
                        disabled={locked || !catalog.canEdit}
                        onChange={(e) =>
                          update({ userEntered: e.target.checked })
                        }
                      />
                      {w.userEntered}
                    </label>
                  </>
                ) : (
                  draft.message.map((value, i) => (
                    <div key={i}>
                      {number(
                        `${w.message} ${Math.floor(i / (catalog.generation === 3 ? 3 : 4)) + 1} / ${(i % (catalog.generation === 3 ? 3 : 4)) + 1}`,
                        value,
                        (v) =>
                          update({
                            message: draft.message.map((x, j) =>
                              j === i ? v : x,
                            ),
                          }),
                      )}
                    </div>
                  ))
                )}
              </div>
              {catalog.generation === 4 && (
                <div className="save-editor-fields">
                  {draft.appear.map((value, i) => (
                    <div key={i}>
                      {choose(
                        `${w.species} ${i + 1}`,
                        value,
                        catalog.species,
                        (v) =>
                          update({
                            appear: draft.appear.map((x, j) =>
                              j === i ? v : x,
                            ),
                          }),
                        !catalog.canEdit,
                      )}
                    </div>
                  ))}
                </div>
              )}
              {catalog.generation === 5 && (
                <details>
                  <summary>{w.misc}</summary>
                  <div className="save-editor-fields">
                    {draft.misc.map((value, i) => (
                      <div key={i}>
                        {number(`${w.misc} ${i + 1}`, value, (v) =>
                          update({
                            misc: draft.misc.map((x, j) => (j === i ? v : x)),
                          }),
                        )}
                      </div>
                    ))}
                    {number(w.ending, draft.ending, (ending) =>
                      update({ ending }),
                    )}
                  </div>
                </details>
              )}
              <div className="save-editor-toolbar">
                {catalog.generation <= 3 && (
                  <>
                    <button
                      type="button"
                      disabled={
                        locked ||
                        !catalog.canEdit ||
                        selected ===
                          (selected < frame.heldCount ? 0 : frame.heldCount) ||
                        (catalog.party.length === 0 &&
                          selected < frame.heldCount)
                      }
                      onClick={() =>
                        void preview(
                          [...actions, { kind: "up", index: selected }],
                          selected - 1,
                        )
                      }
                    >
                      {w.up}
                    </button>
                    <button
                      type="button"
                      disabled={
                        locked ||
                        !catalog.canEdit ||
                        selected ===
                          (selected < frame.heldCount
                            ? frame.heldCount - 1
                            : frame.heldCount + frame.boxCount - 1) ||
                        (catalog.party.length === 0 &&
                          selected < frame.heldCount)
                      }
                      onClick={() =>
                        void preview(
                          [...actions, { kind: "down", index: selected }],
                          selected + 1,
                        )
                      }
                    >
                      {w.down}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() => {
                    if (locked || flight.current || !catalog.canEdit) return;
                    if (mailDeleteNeedsQuestion(frame, selected))
                      playSaveSound("other", "question");
                    void preview([
                      ...actions,
                      {
                        kind: "delete",
                        index: selected,
                        modifyHeldItem: linked,
                      },
                    ]);
                  }}
                >
                  {w.delete}
                </button>
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() => void preview(withDraft())}
                >
                  {w.preview}
                </button>
                <button
                  type="button"
                  disabled={locked || (!actions.length && !dirty)}
                  onClick={() => void discard()}
                >
                  {w.cancel}
                </button>
              </div>
              <label className="save-editor-review">
                <input
                  type="checkbox"
                  checked={linked}
                  disabled={locked || selected >= catalog.party.length}
                  onChange={(e) => setLinked(e.target.checked)}
                />
                {w.linked}
              </label>
            </>
          )}
          {catalog.generation === 3 && catalog.party.length > 0 && (
            <details>
              <summary>{w.party}</summary>
              <div className="save-editor-fields">
                {frame.party.map((p) => (
                  <div key={p.index}>
                    <NumberField
                      label={`${p.index + 1} · ${p.pokemon.nickname}`}
                      value={p.heldMailId}
                      change={(value) =>
                        void preview([
                          ...actions,
                          { kind: "heldId", index: p.index, value },
                        ])
                      }
                      min={-1}
                      max={5}
                      disabled={locked || !catalog.canEdit}
                    />
                  </div>
                ))}
              </div>
            </details>
          )}
          {ticket && (
            <section className="save-mailbox-preview">
              <h4>
                {w.changes}: {ticket.changedOffsets.length}
              </h4>
              {ticket.issues.length > 0 && (
                <>
                  <p>{w.issues}</p>
                  <ul>
                    {ticket.issues.map((issue, i) => (
                      <li key={i}>{mailIssue(issue, lang)}</li>
                    ))}
                  </ul>
                  <label className="save-editor-review">
                    <input
                      type="checkbox"
                      checked={accept}
                      disabled={locked}
                      onChange={(e) => setAccept(e.target.checked)}
                    />
                    {w.accept}
                  </label>
                </>
              )}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={
                    locked ||
                    dirty ||
                    !ticket.changedOffsets.length ||
                    (ticket.issues.length > 0 && !accept)
                  }
                  onClick={() => void apply()}
                >
                  {w.apply}
                </button>
              </div>
            </section>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
    </section>
  );
}

function ChoiceField({
  label,
  value,
  choices,
  change,
  disabled,
  lang,
}: {
  label: string;
  value: number;
  choices: MailChoice[];
  change: (value: number) => void;
  disabled: boolean;
  lang: "zh" | "en" | "ja";
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select
        value={value}
        disabled={disabled}
        onChange={(e) => change(Number(e.target.value))}
      >
        {!choices.some((v) => v.id === value) && (
          <option value={value}>{value}</option>
        )}
        {choices.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name[lang]}
          </option>
        ))}
      </Select>
    </label>
  );
}
function NumberField({
  label,
  value,
  change,
  min,
  max,
  disabled,
}: {
  label: string;
  value: number;
  change: (value: number) => void;
  min: number;
  max: number;
  disabled: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => change(Number(e.target.value))}
      />
    </label>
  );
}

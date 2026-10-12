import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { pokemonImage } from "./art";
import { festivalPhrases } from "./festivalPhrases";
import { festivalTypes, festivalNpc, festivalRewards } from "./festivalOptions";
import {
  festaConfirmation,
  festaDraft,
  festaRequest,
  festaWords,
  type FestaAction,
  type FestaCatalog,
  type FestaConfirmation,
  type FestaFacility,
  type FestaRequest,
  type FestaTicket,
} from "./festivalPlaza";
import "./FestivalPlazaEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<FestaCatalog | undefined>;
  onPreview(request: FestaRequest): Promise<FestaTicket | undefined>;
  onApply(confirm: FestaConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
};
export function FestivalPlazaEditor(props: Props) {
  return <Form key={props.revision} {...props} />;
}
function Form({ busy, lang, onRead, onPreview, onApply, onDiscard }: Props) {
  const w = festaWords[lang];
  const [catalog, setCatalog] = useState<FestaCatalog>(),
    [ticket, setTicket] = useState<FestaTicket>(),
    [tab, setTab] = useState("general"),
    [selected, setSelected] = useState(0),
    [facility, setFacility] = useState<FestaFacility>(),
    [actions, setActions] = useState<FestaAction[]>([]),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [allowGlasses, setAllowGlasses] = useState(false);
  const life = useRef({
    alive: true,
    epoch: 0,
    onRead,
    onDiscard,
    lang,
    ticket: undefined as FestaTicket | undefined,
    urls: new Map<string, ReturnType<typeof setTimeout>>(),
  });
  const request = useRef<Promise<FestaCatalog | undefined>>(undefined),
    flight = useRef(false);
  useEffect(() => {
    Object.assign(life.current, { onRead, onDiscard, lang });
  }, [onRead, onDiscard, lang]);
  useEffect(() => {
    const current = life.current;
    current.alive = true;
    const epoch = current.epoch;
    request.current ??= current.onRead();
    void request.current
      .then((c) => {
        if (c && current.alive && epoch === current.epoch) {
          setCatalog(c);
          setFacility(festaDraft(c, c.facilities[0]));
        }
      })
      .catch(() => {
        if (current.alive && epoch === current.epoch)
          setError(festaWords[current.lang].invalid);
      });
    return () => {
      current.alive = false;
      current.epoch++;
      if (current.ticket) void current.onDiscard(current.ticket.token);
      for (const [url, timer] of current.urls) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      current.urls.clear();
    };
  }, []);
  const frame = ticket?.result ?? catalog,
    locked = busy || pending;
  function queue(action: FestaAction) {
    setActions((a) => [...a, action]);
    setDirty(true);
  }
  async function eventPreview(action: FestaAction) {
    await preview([...actions, action]);
  }
  function changeFacility(patch: Partial<FestaFacility>, action?: FestaAction) {
    setFacility((f) => (f ? { ...f, ...patch } : f));
    if (action) queue(action);
    else setDirty(true);
  }
  async function preview(
    next = actions,
    index = selected,
    currentFacility = facility,
  ) {
    if (!catalog || !currentFacility || locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setError("");
    setTicket(undefined);
    life.current.ticket = undefined;
    const current = life.current,
      epoch = current.epoch;
    try {
      const result = await onPreview(
        festaRequest(catalog, next, index, currentFacility),
      );
      if (!current.alive || epoch !== current.epoch) {
        if (result) await onDiscard(result.token);
        return;
      }
      if (result) {
        festaConfirmation(catalog, result);
        current.ticket = result;
        setTicket(result);
        setActions(next);
        setDirty(false);
        setSelected(index);
        setFacility(festaDraft(result.result, result.result.facilities[index]));
      }
    } catch {
      if (current.alive) setError(w.invalid);
    } finally {
      flight.current = false;
      if (current.alive) setPending(false);
    }
  }
  async function selectFacility(index: number) {
    if (index === selected || locked || !frame || !facility) return;
    if (!catalog?.canEdit) {
      setSelected(index);
      setFacility(festaDraft(frame, frame.facilities[index]));
      return;
    }
    const next = [
      ...actions,
      {
        kind: "facilitySave",
        index: selected,
        facility: structuredClone(facility),
      },
    ];
    await preview(next, index, festaDraft(frame, frame.facilities[index]));
  }
  async function discard() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const current = life.current;
    try {
      if (current.ticket) await onDiscard(current.ticket.token);
      if (current.alive) {
        current.ticket = undefined;
        setTicket(undefined);
        setActions([]);
        setDirty(false);
        setError("");
        if (catalog)
          setFacility(festaDraft(catalog, catalog.facilities[selected]));
      }
    } finally {
      flight.current = false;
      if (current.alive) setPending(false);
    }
  }
  async function apply() {
    if (!catalog || !ticket || dirty || locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const current = life.current;
    try {
      if (
        (await onApply(festaConfirmation(catalog, ticket))) &&
        current.alive
      ) {
        current.ticket = undefined;
        setTicket(undefined);
        setActions([]);
      }
    } catch {
      if (current.alive) setError(w.stale);
    } finally {
      flight.current = false;
      if (current.alive) setPending(false);
    }
  }
  async function readAgain() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const current = life.current,
      epoch = current.epoch;
    try {
      const c = await onRead();
      if (c && current.alive && epoch === current.epoch) {
        setCatalog(c);
        setFacility(festaDraft(c, c.facilities[0]));
        setSelected(0);
      }
    } catch {
      if (current.alive) setError(w.invalid);
    } finally {
      flight.current = false;
      if (current.alive) setPending(false);
    }
  }
  function value(kind: string, fallback: number, index = 0) {
    return (
      [...actions].reverse().find((a) => a.kind === kind && a.index === index)
        ?.value ?? fallback
    );
  }
  function flag(kind: string, fallback: boolean, index = 0) {
    return (
      [...actions].reverse().find((a) => a.kind === kind && a.index === index)
        ?.flag ?? fallback
    );
  }
  function text(kind: string, fallback: string, index = 0) {
    return (
      [...actions].reverse().find((a) => a.kind === kind && a.index === index)
        ?.text ?? fallback
    );
  }
  function download(index: number, encrypted: boolean) {
    if (!ticket || dirty || locked) return;
    const file = ticket.files.find(
      (f) => f.index === index && f.encrypted === encrypted,
    );
    if (!file) return;
    const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(
      new Blob([bytes], { type: "application/octet-stream" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    const current = life.current;
    current.urls.set(
      url,
      setTimeout(() => {
        URL.revokeObjectURL(url);
        current.urls.delete(url);
      }, 30000),
    );
  }
  const field = (
    label: string,
    current: number,
    kind: string,
    max: number,
    index = 0,
  ) => (
    <NumberField
      label={label}
      value={value(kind, current, index)}
      max={max}
      disabled={locked || !catalog?.canEdit}
      change={(v) => queue({ kind, index, value: v })}
    />
  );
  const toggle = (label: string, current: boolean, kind: string, index = 0) => (
    <label className="save-editor-review">
      <input
        type="checkbox"
        checked={flag(kind, current, index)}
        disabled={locked || !catalog?.canEdit}
        onChange={(e) => queue({ kind, index, flag: e.target.checked })}
      />
      {label}
    </label>
  );
  return (
    <section className="save-festa-editor" aria-label={w.title}>
      <h3>{w.title}</h3>
      {!catalog || !frame || !facility ? (
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
          <div className="save-editor-toolbar" role="tablist">
            {(
              [
                "general",
                "facility",
                "phrases",
                "rewards",
                ...(frame.usum ? ["agency"] : []),
              ] as const
            ).map((key) => (
              <button
                type="button"
                role="tab"
                key={key}
                aria-selected={tab === key}
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
              >
                {
                  w[
                    key as
                      "general" | "facility" | "phrases" | "rewards" | "agency"
                  ]
                }
              </button>
            ))}
          </div>
          {tab === "general" && (
            <div className="save-editor-fields">
              <label className="field">
                <span>{w.name}</span>
                <input
                  value={text("name", frame.name)}
                  maxLength={20}
                  disabled={locked || !catalog.canEdit || !frame.usum}
                  onChange={(e) =>
                    queue({ kind: "name", index: 0, text: e.target.value })
                  }
                />
                {!frame.usum && <small>{w.smName}</small>}
              </label>
              {field(w.coins, frame.coins, "coins", 9999999)}
              {field(w.usedCoins, frame.usedCoins, "usedCoins", 9999999)}
              <div className="field">
                <span>{w.totalCoins}</span>
                <output>{frame.totalCoins}</output>
              </div>
              {field(w.rank, frame.rank, "rank", 999)}
              <label className="field">
                <span>{w.date}</span>
                <input
                  type="datetime-local"
                  step={1}
                  min="2000-01-01T00:00:00"
                  max="2050-12-31T23:59:59"
                  value={text("date", frame.date ?? "2000-01-01T00:00:00")}
                  disabled={locked || !catalog.canEdit}
                  onChange={(e) =>
                    queue({
                      kind: "date",
                      index: 0,
                      text:
                        e.target.value.length === 16
                          ? e.target.value + ":00"
                          : e.target.value,
                    })
                  }
                />
              </label>
              {frame.messages.map((v, i) => (
                <div key={i}>
                  {field(`${w.message} ${i + 1}`, v, "ownMessage", 9999, i)}
                </div>
              ))}
            </div>
          )}
          {tab === "facility" && (
            <>
              <label className="field">
                <span>{w.facility}</span>
                <Select
                  value={selected}
                  disabled={locked}
                  onChange={(e) => void selectFacility(Number(e.target.value))}
                >
                  {frame.facilities.map((f) => (
                    <option key={f.index} value={f.index}>
                      {f.index + 1} · {f.trainerName || w.none}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="save-editor-fields">
                <label className="field">
                  <span>{w.type}</span>
                  <Select
                    value={facility.type}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) => {
                      const type = Number(e.target.value);
                      void preview(
                        [
                          ...actions,
                          { kind: "type", index: selected, value: type },
                        ],
                        selected,
                        { ...facility, type },
                      );
                    }}
                  >
                    {festivalTypes(frame.usum, lang).map((name, index) => (
                      <option key={index} value={index}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </label>
                <NumberField
                  label={w.color}
                  value={facility.color}
                  max={facility.colorMaximum}
                  disabled={locked || !catalog.canEdit}
                  change={(v) =>
                    changeFacility(
                      { color: v },
                      { kind: "color", index: selected, value: v },
                    )
                  }
                />
                <label className="field">
                  <span>{w.npc}</span>
                  <Select
                    value={facility.npc}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) =>
                      changeFacility({ npc: Number(e.target.value) })
                    }
                  >
                    {festivalNpc[lang].map((name, index) => (
                      <option key={index} value={index}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="field">
                  <span>{w.trainer}</span>
                  <input
                    maxLength={12}
                    value={facility.trainerName}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) =>
                      changeFacility(
                        { trainerName: e.target.value },
                        {
                          kind: "facilityName",
                          index: selected,
                          text: e.target.value,
                        },
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>{w.gender}</span>
                  <Select
                    value={facility.gender}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) =>
                      changeFacility(
                        { gender: Number(e.target.value) },
                        {
                          kind: "gender",
                          index: selected,
                          value: Number(e.target.value),
                        },
                      )
                    }
                  >
                    <option value={0}>{w.male}</option>
                    <option value={1}>{w.female}</option>
                  </Select>
                </label>
                <label className="save-editor-review">
                  <input
                    type="checkbox"
                    checked={facility.introduced}
                    disabled={locked || !catalog.canEdit}
                    onChange={(e) =>
                      changeFacility(
                        { introduced: e.target.checked },
                        {
                          kind: "introduced",
                          index: selected,
                          flag: e.target.checked,
                        },
                      )
                    }
                  />
                  {w.introduced}
                </label>
                {facility.messages.map((v, i) => (
                  <NumberField
                    key={i}
                    label={`${w.message} ${i + 1}`}
                    value={v}
                    max={9999}
                    disabled={locked || !catalog.canEdit}
                    change={(n) =>
                      changeFacility(
                        {
                          messages: facility.messages.map((x, j) =>
                            j === i ? n : x,
                          ),
                        },
                        {
                          kind: "facilityMessage",
                          index: selected,
                          value: n,
                          text: String(i),
                        },
                      )
                    }
                  />
                ))}
                <NumberField
                  label={w.exchange}
                  value={facility.exchangeLeft}
                  max={255}
                  disabled={
                    locked || !catalog.canEdit || facility.category !== 7
                  }
                  change={(v) =>
                    changeFacility(
                      { exchangeLeft: v },
                      { kind: "exchange", index: selected, value: v },
                    )
                  }
                />
                <NumberField
                  label={w.lucky}
                  value={
                    facility.luckyPlace > 0
                      ? facility.luckyPlace * 3 + facility.luckyRank - 3
                      : 0
                  }
                  max={21}
                  disabled={
                    locked || !catalog.canEdit || facility.category !== 5
                  }
                  change={(v) =>
                    changeFacility(
                      {
                        luckyRank: v === 0 ? 0 : ((v - 1) % 3) + 1,
                        luckyPlace: v === 0 ? 0 : Math.floor((v - 1) / 3) + 1,
                      },
                      { kind: "lucky", index: selected, value: v },
                    )
                  }
                />
              </div>
              <details>
                <summary>{w.raw}</summary>
                <div className="save-editor-fields">
                  {(["usedFlags", "usedStats", "trainerId"] as const).map(
                    (key) => (
                      <label className="field" key={key}>
                        <span>
                          {key === "usedFlags"
                            ? w.flags
                            : key === "usedStats"
                              ? w.stats
                              : w.id}
                        </span>
                        <input
                          maxLength={key === "trainerId" ? 24 : 8}
                          value={text(
                            key,
                            key === "trainerId"
                              ? facility.trainerId
                              : facility[key]
                                  .toString(16)
                                  .toUpperCase()
                                  .padStart(8, "0"),
                            selected,
                          )}
                          disabled={locked || !catalog.canEdit}
                          onChange={(e) =>
                            queue({
                              kind: key,
                              index: selected,
                              text: e.target.value,
                            })
                          }
                        />
                      </label>
                    ),
                  )}
                </div>
              </details>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() => {
                    queue({ kind: "deleteVisitor", index: selected });
                    changeFacility({
                      trainerName: "",
                      introduced: false,
                      gender: 0,
                      messages: [0, 0, 0, 0],
                    });
                  }}
                >
                  {w.delete}
                </button>
              </div>
            </>
          )}
          {tab === "phrases" && (
            <>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() =>
                    void eventPreview({ kind: "allPhrases", index: 0 })
                  }
                >
                  {w.allPhrases}
                </button>
              </div>
              <div className="save-festa-list">
                {frame.phrases.map((v, i) => (
                  <label className="save-editor-review" key={i}>
                    <input
                      type="checkbox"
                      checked={actions.reduce(
                        (current, a) =>
                          a.kind === "allPhrases"
                            ? true
                            : a.kind === "phrase" && a.index === i
                              ? (a.flag ?? current)
                              : current,
                        v,
                      )}
                      disabled={locked || !catalog.canEdit}
                      onChange={(e) =>
                        queue({
                          kind: "phrase",
                          index: i,
                          flag: e.target.checked,
                        })
                      }
                    />
                    {festivalPhrases[lang][i]}
                  </label>
                ))}
              </div>
            </>
          )}
          {tab === "rewards" && (
            <>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() =>
                    void eventPreview({
                      kind: "allRewards",
                      index: 0,
                      value: 2,
                    })
                  }
                >
                  {w.ready}
                </button>
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() =>
                    void eventPreview({
                      kind: "allRewards",
                      index: 0,
                      value: 1,
                    })
                  }
                >
                  {w.received}
                </button>
              </div>
              <div className="save-editor-fields">
                {frame.rewards.map((v, i) => (
                  <label className="field" key={i}>
                    <span>{festivalRewards[lang][i]}</span>
                    <Select
                      value={actions.reduce(
                        (current, a) =>
                          a.kind === "allRewards"
                            ? (a.value ?? current)
                            : a.kind === "reward" && a.index === i
                              ? (a.value ?? current)
                              : current,
                        v,
                      )}
                      disabled={locked || !catalog.canEdit}
                      onChange={(e) =>
                        queue({
                          kind: "reward",
                          index: i,
                          value: Number(e.target.value),
                        })
                      }
                    >
                      <option value={0}>{w.rewardNone}</option>
                      <option value={2}>{w.rewardReady}</option>
                      <option value={1}>{w.rewardReceived}</option>
                    </Select>
                  </label>
                ))}
              </div>
            </>
          )}
          {tab === "agency" && frame.agency && (
            <>
              <div className="save-editor-fields">
                <NumberField
                  label={w.grade}
                  value={value("agencyGrade", frame.agency.grade)}
                  max={50}
                  disabled={locked || !catalog.canEdit}
                  change={(v) =>
                    void eventPreview({
                      kind: "agencyGrade",
                      index: 0,
                      value: v,
                    })
                  }
                />
                {field(
                  w.defeated,
                  frame.agency.defeated,
                  "agencyDefeated",
                  frame.agency.defeatedMaximum,
                )}
                {field(
                  w.defeatedPokemon,
                  frame.agency.defeatedPokemon,
                  "agencyPokemon",
                  65535,
                )}
                {toggle(w.chosen, frame.agency.chosen, "agencyChosen")}
                {toggle(w.invited, frame.agency.invited, "agencyInvited")}
                {frame.agency.trainers.map((v, i) => (
                  <div key={i}>
                    {field(
                      `${w.agencyTrainer} ${i + 1}`,
                      v,
                      "agencyTrainer",
                      210,
                      i,
                    )}
                  </div>
                ))}
              </div>
              <div className="save-festa-agency">
                {frame.agency.pokemon.map((p, i) => (
                  <div key={i}>
                    <img src={pokemonImage(p)} alt={p.speciesName[lang]} />
                    <span>{p.nickname || p.speciesName[lang]}</span>
                    <div className="save-editor-toolbar">
                      <button
                        type="button"
                        disabled={locked || dirty || !ticket}
                        onClick={() => download(i, false)}
                      >
                        {w.export}
                      </button>
                      <button
                        type="button"
                        disabled={locked || dirty || !ticket}
                        onClick={() => download(i, true)}
                      >
                        {w.encrypted}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <label className="save-editor-review">
                <input
                  type="checkbox"
                  checked={allowGlasses}
                  onChange={(e) => setAllowGlasses(e.target.checked)}
                  disabled={locked}
                />
                {w.allowGlasses}
              </label>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked || !catalog.canEdit}
                  onClick={() => queue({ kind: "importParty", index: 0 })}
                >
                  {w.import}
                </button>
                <button
                  type="button"
                  disabled={
                    locked || !catalog.canEdit || frame.agency.hasGlasses
                  }
                  onClick={() =>
                    queue({ kind: "glasses", index: 0, flag: allowGlasses })
                  }
                >
                  {w.glasses}
                </button>
              </div>
            </>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || !catalog.canEdit}
              onClick={() => void preview()}
            >
              {w.preview}
            </button>
            <button
              type="button"
              disabled={locked || (!dirty && !ticket)}
              onClick={() => void discard()}
            >
              {w.cancel}
            </button>
            {ticket && (
              <button
                type="button"
                className="primary"
                disabled={locked || dirty || !ticket.changedOffsets.length}
                onClick={() => void apply()}
              >
                {w.apply}
              </button>
            )}
          </div>
          {ticket && (
            <p>
              {w.changes}: {ticket.changedOffsets.length}
            </p>
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
function NumberField({
  label,
  value,
  max,
  disabled,
  change,
}: {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  change: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => change(Number(e.target.value))}
      />
    </label>
  );
}

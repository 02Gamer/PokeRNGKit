import { useGenderLabel } from "./useGenderLabel";
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { pokemonImage } from "./art";
import { saveRecordName } from "./recordNames";
import type { Br4Lang } from "./br4";
import type { Hall6Trash } from "./hall6";
import type { TrGGField } from "./trainerGG";
import {
  tr8Request,
  tr8Frozen,
  type Tr8Catalog,
  type Tr8Edit,
  type Tr8Preview,
} from "./trainer8";
import { trainer8Words } from "./trainer8Words";
import "./Trainer8Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Tr8Catalog | undefined>;
  onPreview(e: Tr8Edit): Promise<Tr8Preview | undefined>;
  onApply(e: Tr8Edit): Promise<void>;
};
export function Trainer8Editor(p: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Tr8Catalog }>();
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
      <h3>{trainer8Words[p.lang].title}</h3>
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
          {trainer8Words[p.lang].read}
        </button>
      )}
    </section>
  );
}
type Group =
  | "basic"
  | "card"
  | "ids"
  | "position"
  | "records"
  | "cardTeam"
  | "titleTeam"
  | "appearance"
  | "trash";
const groupOf = (key: string): Group =>
  key.startsWith("record")
    ? "records"
    : ["cardName", "number", "cardId", "rally"].includes(key)
      ? "card"
      : key === "skin"
        ? "appearance"
        : "basic";
const rawKeys = [
  "nameTrash",
  "cardTrash",
  "statusRaw",
  "cardRaw",
  "coordinateRaw",
  "playedRaw",
  "recordRaw",
  "fashionRaw",
] as const;
function Form({
  c,
  busy,
  lang,
  onPreview,
  onApply,
}: Props & { c: Tr8Catalog }) {
  const genderLabel = useGenderLabel();
  const w = trainer8Words[lang];
  const [group, setGroup] = useState<Group>("basic"),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<Tr8Preview>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [slot, setSlot] = useState(0),
    [tid, setTid] = useState(String(c.ids.tid)),
    [sid, setSid] = useState(String(c.ids.sid)),
    [fashion, setFashion] = useState<"base" | "legal" | "all">("legal"),
    [target, setTarget] = useState<"name" | "cardName">("name"),
    [text, setText] = useState(""),
    [hex, setHex] = useState<string>(),
    [species, setSpecies] = useState(c.trashSpecies[0]?.id ?? 1),
    [speciesInput, setSpeciesInput] = useState<string>(),
    [trashLanguage, setTrashLanguage] = useState(c.trashLanguages[0]?.id ?? 2),
    [generation, setGeneration] = useState("8");
  const locked = busy || pending || !!preview || !c.canEdit;
  const previewOrigin = useRef<HTMLElement | null>(null);
  const fieldName = (f: TrGGField) =>
    f.key.startsWith("record")
      ? `${saveRecordName(f.name.en, lang)} (${f.key.slice(6)})`
      : f.name[lang];
  const groupName = (g: Group) => (g === "cardTeam" ? w.cardTeam : w[g]);
  const team = group === "titleTeam" ? "title" : "card";
  const members = team === "card" ? c.cardTeam : c.titleTeam;
  const teamName = (t: "card" | "title") =>
    t === "card" ? w.cardTeam : w.titleTeam;
  const propertyName = (key: string) =>
    w.teamField[key as keyof typeof w.teamField] ?? key;
  function change(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function start(e: Omit<Tr8Edit, "sourceHash">) {
    previewOrigin.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setError("");
    setPending(true);
    try {
      const p = await onPreview(tr8Request(c, e));
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  function submit() {
    if (group === "ids")
      void start({
        action: "ids",
        fields: [
          { key: "tid", value: tid },
          { key: "sid", value: sid },
        ],
      });
    else if (group === "position")
      void start({
        action: "position",
        uiLanguage: lang,
        fields: Object.entries(draft)
          .filter(([key]) => key.startsWith("pos."))
          .map(([key, value]) => ({ key: key.slice(4), value })),
      });
    else if (group === "cardTeam" || group === "titleTeam")
      void start({
        action: "team",
        team,
        uiLanguage: lang,
        members: Object.entries(draft)
          .filter(([key]) => key.startsWith(team + "."))
          .map(([key, value]) => {
            const [, index, property] = key.split(".");
            return { index: Number(index), property, value };
          }),
      });
    else
      void start({
        action: "patch",
        fields: Object.entries(draft)
          .filter(([key]) => groupOf(key) === group && !key.includes("."))
          .map(([key, value]) => ({ key, value })),
      });
  }
  const fields = c.fields.filter(
    (f) =>
      groupOf(f.key) === group &&
      (!query ||
        group !== "records" ||
        fieldName(f).toLocaleLowerCase().includes(query.toLocaleLowerCase())),
  );
  const dirty =
    group === "ids"
      ? tid !== String(c.ids.tid) || sid !== String(c.ids.sid)
      : Object.keys(draft).some((key) =>
          group === "position"
            ? key.startsWith("pos.")
            : group === "cardTeam" || group === "titleTeam"
              ? key.startsWith(team + ".")
              : !key.includes(".") && groupOf(key) === group,
        );
  const oldHex = target === "name" ? c.nameTrash : c.cardTrash;
  function trash(e: Hall6Trash) {
    void start({ action: "trash", nameTarget: target, trash: e });
  }
  function field(f: TrGGField) {
    const value =
      draft[f.key] ??
      (f.key === "bp" ? String(Math.min(Number(f.value), 9999)) : f.value);
    return (
      <label key={f.key}>
        <span>{fieldName(f)}</span>
        {f.kind === "choice" ? (
          <Select
            value={value}
            disabled={locked}
            onChange={(e) => change(f.key, e.target.value)}
          >
            {!f.choices.some((v) => String(v.id) === f.value) && (
              <option value={f.value}>{f.value}</option>
            )}
            {f.choices.map((v) => (
              <option key={v.id} value={v.id}>
                {f.key === "gender"
                  ? genderLabel(v.id, v.name[lang])
                  : v.name[lang]}
              </option>
            ))}
          </Select>
        ) : (
          <input
            type={
              f.kind === "date"
                ? f.key === "started"
                  ? "date"
                  : "datetime-local"
                : "text"
            }
            step={f.kind === "date" ? 60 : undefined}
            min={f.kind === "date" ? f.min : undefined}
            max={f.kind === "date" ? f.max : undefined}
            value={value}
            maxLength={f.maxLength}
            inputMode={f.kind === "number" ? "numeric" : undefined}
            disabled={locked || !f.editable}
            onChange={(e) => change(f.key, e.target.value)}
          />
        )}{" "}
        {f.kind === "number" && (
          <small>
            {f.min}–{f.max}
            {f.key === "bp" && Number(f.value) > 9999
              ? ` · ${w.before}: ${f.value}`
              : ""}
          </small>
        )}
      </label>
    );
  }
  return (
    <div className="save-tr8-body" data-group={group}>
      <label>
        <span>{w.group}</span>
        <Select
          value={group}
          disabled={busy || pending || !!preview}
          onChange={(e) => {
            setGroup(e.target.value as Group);
            setQuery("");
          }}
        >
          {(
            [
              "basic",
              "card",
              "ids",
              "position",
              "records",
              "cardTeam",
              "titleTeam",
              "appearance",
              "trash",
            ] as Group[]
          ).map((g) => (
            <option key={g} value={g}>
              {groupName(g)}
            </option>
          ))}
        </Select>
      </label>
      {group === "basic" ||
      group === "card" ||
      group === "records" ||
      group === "appearance" ? (
        <>
          {group === "basic" && (
            <>
              <p>{w.linkHint}</p>
              <p>{w.dateHint}</p>
              {!c.fields.some((f) => f.key === "saved") && (
                <p>
                  {w.savedValue}: {c.savedValue || w.unavailable}
                </p>
              )}
            </>
          )}
          {group === "records" && (
            <label>
              <span>{w.recordSearch}</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={busy || pending}
              />
            </label>
          )}
          <div className="save-tr8-fields">{fields.map(field)}</div>
          {group === "basic" && (
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={locked}
                onClick={() => change("money", "9999999")}
              >
                {w.maxMoney}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => change("watt", "9999999")}
              >
                {w.maxWatt}
              </button>
              {c.revision > 0 && (
                <button
                  type="button"
                  disabled={locked || !c.canDiglett}
                  onClick={() => void start({ action: "diglett" })}
                >
                  {w.diglett}
                </button>
              )}
              {c.revision > 0 && !c.canDiglett && <p>{w.diglettUnavailable}</p>}
            </div>
          )}
          {group === "appearance" && (
            <>
              <button
                type="button"
                disabled={
                  locked ||
                  !c.fields
                    .find((f) => f.key === "skin")
                    ?.choices.some(
                      (v) =>
                        String(v.id) ===
                        c.fields.find((f) => f.key === "skin")?.value,
                    )
                }
                onClick={() => void start({ action: "resetAppearance" })}
              >
                {w.resetAppearance}
              </button>
              <label>
                <span>{w.fashion}</span>
                <Select
                  value={fashion}
                  disabled={locked}
                  onChange={(e) => setFashion(e.target.value as typeof fashion)}
                >
                  {(["base", "legal", "all"] as const).map((mode) => (
                    <option key={mode} value={mode}>
                      {w[mode]}
                    </option>
                  ))}
                </Select>
              </label>
              <p>{w.fashionHint}</p>
              <button
                type="button"
                disabled={locked}
                onClick={() => void start({ action: "fashion", fashion })}
              >
                {w.fashionApply}
              </button>
            </>
          )}
        </>
      ) : group === "ids" ? (
        <>
          <p>{w.idHint}</p>
          <div className="save-tr8-fields">
            <label>
              <span>{w.tid}</span>
              <input
                maxLength={6}
                inputMode="numeric"
                value={tid}
                disabled={locked}
                onChange={(e) => setTid(e.target.value)}
              />
            </label>
            <label>
              <span>{w.sid}</span>
              <input
                maxLength={4}
                inputMode="numeric"
                value={sid}
                disabled={locked}
                onChange={(e) => setSid(e.target.value)}
              />
            </label>
          </div>
          <p>
            ID32: {c.ids.id32} · TSV: {c.ids.tsv}
          </p>
        </>
      ) : group === "position" ? (
        <>
          <p>{w.mapHint}</p>
          <div className="save-tr8-fields">
            {c.position.fields.map((f) => (
              <label key={f.key}>
                <span>
                  {w.placeNames[f.key as keyof typeof w.placeNames] ?? f.key}
                </span>
                <input
                  inputMode={f.key === "map" ? "numeric" : "decimal"}
                  maxLength={32767}
                  value={draft["pos." + f.key] ?? f.value}
                  disabled={locked || !c.position.canEdit}
                  onChange={(e) => change("pos." + f.key, e.target.value)}
                />
                <small>
                  {f.min}–{f.max}
                </small>
              </label>
            ))}
          </div>
        </>
      ) : group === "cardTeam" || group === "titleTeam" ? (
        <>
          <p>{w.teamHint}</p>
          <div className="save-tr8-slots" aria-label={teamName(team)}>
            {members.map((m) => (
              <button
                type="button"
                key={m.index}
                aria-pressed={slot === m.index}
                disabled={busy || pending || !!preview}
                onClick={() => setSlot(m.index)}
              >
                <img src={pokemonImage(m)} alt="" width={48} height={40} />
                <span>
                  {m.index + 1}. {m.name[lang]}
                </span>
              </button>
            ))}
          </div>
          <h4>
            {w.slot} {slot + 1} · {members[slot]?.name[lang]}
          </h4>
          <div className="save-tr8-fields">
            {members[slot]?.fields.map((f) => (
              <label key={f.key}>
                <span>{propertyName(f.key)}</span>
                {f.kind === "bool" ? (
                  <Select
                    value={draft[`${team}.${slot}.${f.key}`] ?? f.value}
                    disabled={locked}
                    onChange={(e) =>
                      change(`${team}.${slot}.${f.key}`, e.target.value)
                    }
                  >
                    <option value="True">{w.yes}</option>
                    <option value="False">{w.no}</option>
                  </Select>
                ) : (
                  <input
                    value={draft[`${team}.${slot}.${f.key}`] ?? f.value}
                    maxLength={32767}
                    disabled={locked}
                    onChange={(e) =>
                      change(`${team}.${slot}.${f.key}`, e.target.value)
                    }
                  />
                )}
                <small>
                  {f.min}–{f.max}
                </small>
              </label>
            ))}
          </div>
          <details>
            <summary>{w.hex}</summary>
            <code>{members[slot]?.raw}</code>
          </details>
          <button
            type="button"
            disabled={locked}
            onClick={() => void start({ action: "copyParty", team })}
          >
            {w.copyParty}
          </button>
        </>
      ) : (
        <>
          <div className="save-tr8-fields">
            <label>
              <span>{w.target}</span>
              <Select
                value={target}
                disabled={locked}
                onChange={(e) => {
                  setTarget(e.target.value as typeof target);
                  setHex(undefined);
                }}
              >
                <option value="name">{w.name}</option>
                <option value="cardName">{w.cardName}</option>
              </Select>
            </label>
            <label>
              <span>{w.text}</span>
              <input
                maxLength={12}
                value={text}
                disabled={locked}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <label className="save-tr8-wide">
              <span>{w.hex}</span>
              <input
                maxLength={52}
                value={hex ?? oldHex}
                disabled={locked}
                onChange={(e) => setHex(e.target.value)}
              />
            </label>
            <label>
              <span>{w.species}</span>
              <AutoCompleteComboBox
                value={species}
                inputValue={
                  speciesInput ??
                  c.trashSpecies.find((v) => v.id === species)?.name[lang] ??
                  ""
                }
                label={w.species}
                options={c.trashSpecies.map((v) => ({
                  value: v.id,
                  label: v.name[lang],
                }))}
                onInputChange={setSpeciesInput}
                onValueChange={(v) => {
                  setSpecies(v);
                  setSpeciesInput(undefined);
                }}
                disabled={locked}
              />
            </label>
            <label>
              <span>{w.language}</span>
              <Select
                value={String(trashLanguage)}
                disabled={locked}
                onChange={(e) => setTrashLanguage(Number(e.target.value))}
              >
                {c.trashLanguages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.generation}</span>
              <input
                maxLength={3}
                inputMode="numeric"
                value={generation}
                disabled={locked}
                onChange={(e) => setGeneration(e.target.value)}
              />
            </label>
          </div>
          <div className="save-tr8-characters">
            {c.characters.map((n) => (
              <button
                type="button"
                key={n}
                disabled={locked}
                onClick={() =>
                  setText((v) =>
                    v.length < 12 ? v + String.fromCodePoint(n) : v,
                  )
                }
              >
                {String.fromCodePoint(n)}
              </button>
            ))}
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked}
              onClick={() => trash({ action: "prepare" })}
            >
              {w.prepare}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => trash({ action: "clear" })}
            >
              {w.clear}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => trash({ action: "text", text })}
            >
              {w.writeText}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => trash({ action: "hex", hex: hex ?? oldHex })}
            >
              {w.writeHex}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                trash({
                  action: "layer",
                  species,
                  language: trashLanguage,
                  generation: Number(generation),
                  uiLanguage: lang,
                })
              }
            >
              {w.layer}
            </button>
          </div>
        </>
      )}
      <div className="save-editor-toolbar">
        {group !== "trash" && (
          <button
            type="button"
            disabled={
              locked || !dirty || (group === "position" && !c.position.canEdit)
            }
            onClick={submit}
          >
            {w.preview}
          </button>
        )}
        <button
          type="button"
          disabled={locked}
          onClick={() => void start({ action: "resave" })}
        >
          {w.resave}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <Preview
          c={c}
          p={preview}
          lang={lang}
          busy={busy || pending}
          onCancel={() => {
            setPreview(undefined);
            requestAnimationFrame(() => previewOrigin.current?.focus());
          }}
          onApply={async () => {
            setPending(true);
            setError("");
            try {
              await onApply(tr8Frozen(c, preview));
            } catch {
              setError(w.invalid);
            } finally {
              setPending(false);
            }
          }}
        />
      )}
    </div>
  );
}
function Preview({
  c,
  p,
  lang,
  busy,
  onCancel,
  onApply,
}: {
  c: Tr8Catalog;
  p: Tr8Preview;
  lang: Br4Lang;
  busy: boolean;
  onCancel(): void;
  onApply(): Promise<void>;
}) {
  const genderLabel = useGenderLabel();
  const w = trainer8Words[lang];
  const fields = p.result.fields.filter(
    (f) => f.value !== c.fields.find((o) => o.key === f.key)?.value,
  );
  const value = (f: TrGGField, text: string | undefined) =>
    f.key === "gender" && text !== undefined
      ? genderLabel(
          Number(text),
          f.choices.find((v) => String(v.id) === text)?.name[lang],
        )
      : f.kind === "choice"
        ? (f.choices.find((v) => String(v.id) === text)?.name[lang] ?? text)
        : text;
  const changes: {
    key: string;
    name: string;
    before: string | undefined;
    after: string | undefined;
  }[] = fields.map((f) => ({
    key: f.key,
    name: f.key.startsWith("record")
      ? `${saveRecordName(f.name.en, lang)} (${f.key.slice(6)})`
      : f.name[lang],
    before: value(f, c.fields.find((o) => o.key === f.key)?.value),
    after: value(f, f.value),
  }));
  for (const f of p.result.position.fields) {
    const old = c.position.fields.find((o) => o.key === f.key);
    if (f.value !== old?.value)
      changes.push({
        key: "pos." + f.key,
        name: w.placeNames[f.key as keyof typeof w.placeNames] ?? f.key,
        before: old?.value,
        after: f.value,
      });
  }
  if (c.savedValue !== p.result.savedValue)
    changes.push({
      key: "savedValue",
      name: w.savedValue,
      before: c.savedValue,
      after: p.result.savedValue,
    });
  if (JSON.stringify(c.ids) !== JSON.stringify(p.result.ids))
    changes.push({
      key: "ids",
      name: w.ids,
      before: `${c.ids.tid} / ${c.ids.sid} / ${c.ids.id32}`,
      after: `${p.result.ids.tid} / ${p.result.ids.sid} / ${p.result.ids.id32}`,
    });
  const teams = (["cardTeam", "titleTeam"] as const).flatMap((t) =>
    p.result[t]
      .filter((m) => m.raw !== c[t].find((o) => o.index === m.index)?.raw)
      .map((m) => ({
        team: t,
        member: m,
        old: c[t].find((o) => o.index === m.index),
      })),
  );
  for (const f of p.result.appearance ?? []) {
    const old = c.appearance?.find((o) => o.key === f.key);
    if (old && old.value !== f.value)
      changes.push({
        key: "appearance." + f.key,
        name: f.name[lang],
        before: old.value,
        after: f.value,
      });
  }
  return (
    <section className="save-tr8-preview" aria-label={w.preview}>
      <h4>{w.preview}</h4>
      <p>
        {w.changed}: {p.changedOffsets.length}
        {p.changedOffsets.length === 0 ? ` · ${w.noChanges}` : ""}
      </p>
      {p.ignoredFields.length > 0 && (
        <p>
          {w.ignored}:{" "}
          {p.ignoredFields
            .map((k) => w.placeNames[k as keyof typeof w.placeNames] ?? k)
            .join(" / ")}
        </p>
      )}
      {changes.length > 0 && (
        <div className="save-tr8-table">
          <table>
            <thead>
              <tr>
                <th>{w.field}</th>
                <th>{w.before}</th>
                <th>{w.after}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.name}</th>
                  <td>{row.before}</td>
                  <td>{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {teams.map(({ team, member, old }) => (
        <details key={team + member.index} open>
          <summary>
            {team === "cardTeam" ? w.cardTeam : w.titleTeam} {member.index + 1}
          </summary>
          <div className="save-tr8-team-preview">
            <figure>
              <img
                src={old ? pokemonImage(old) : undefined}
                alt=""
                width={48}
                height={40}
              />
              <figcaption>
                {w.before}: {old?.name[lang]}
              </figcaption>
            </figure>
            <figure>
              <img src={pokemonImage(member)} alt="" width={48} height={40} />
              <figcaption>
                {w.after}: {member.name[lang]}
              </figcaption>
            </figure>
          </div>
          <div className="save-tr8-table">
            <table>
              <thead>
                <tr>
                  <th>{w.field}</th>
                  <th>{w.before}</th>
                  <th>{w.after}</th>
                </tr>
              </thead>
              <tbody>
                {member.fields
                  .filter(
                    (f) =>
                      f.value !==
                      old?.fields.find((o) => o.key === f.key)?.value,
                  )
                  .map((f) => (
                    <tr key={f.key}>
                      <th scope="row">
                        {w.teamField[f.key as keyof typeof w.teamField] ??
                          f.key}
                      </th>
                      <td>{old?.fields.find((o) => o.key === f.key)?.value}</td>
                      <td>{f.value}</td>
                    </tr>
                  ))}
                <tr>
                  <th scope="row">{w.hex}</th>
                  <td>
                    <code>{old?.raw}</code>
                  </td>
                  <td>
                    <code>{member.raw}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      ))}
      {rawKeys
        .filter((k) => c[k] !== p.result[k])
        .map((k) => (
          <details key={k}>
            <summary>{w[k]}</summary>
            <div className="save-tr8-raw">
              <span>{w.before}</span>
              <code>{c[k]}</code>
              <span>{w.after}</span>
              <code>{p.result[k]}</code>
            </div>
          </details>
        ))}
      {c.statusRaw.slice(0, 288) !== p.result.statusRaw.slice(0, 288) && (
        <p>{w.appearanceChanged}</p>
      )}
      {(p.blocks?.length ?? 0) > 0 && (
        <details>
          <summary>
            {w.changedBlocks} ({p.blocks!.length})
          </summary>
          {p.blocks!.map((b) => (
            <details key={b.key}>
              <summary>
                {b.key} · {b.beforeType} → {b.afterType}
              </summary>
              <div className="save-tr8-raw">
                <span>{w.before}</span>
                <code>{b.before || b.beforeType}</code>
                <span>{w.after}</span>
                <code>{b.after || b.afterType}</code>
              </div>
            </details>
          ))}
        </details>
      )}
      <div className="save-editor-toolbar">
        <button type="button" disabled={busy} onClick={() => void onApply()}>
          {w.apply}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          {w.cancel}
        </button>
      </div>
    </section>
  );
}

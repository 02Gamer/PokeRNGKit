import { useEffect, useRef, useState } from "react";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { pokemonImage } from "./art";
import type { Br4Lang } from "./br4";
import {
  h7Frozen,
  h7Patch,
  h7Resave,
  type Hall7Catalog,
  type Hall7Edit,
  type Hall7Preview,
} from "./hall7";
import { hall7Words } from "./hall7Words";
import "./Hall7Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(): Promise<Hall7Catalog | undefined>;
  onPreview(e: Hall7Edit): Promise<Hall7Preview | undefined>;
  onApply(e: Hall7Edit): Promise<void>;
};
export function Hall7Editor(props: Props) {
  const [loaded, setLoaded] = useState<{ revision: number; c: Hall7Catalog }>();
  const reader = useRef(props.onRead);
  useEffect(() => {
    reader.current = props.onRead;
  }, [props.onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((c) => {
      if (active && c) setLoaded({ revision: props.revision, c });
    });
    return () => {
      active = false;
    };
  }, [props.revision]);
  return (
    <section className="save-record-editor save-hall7-editor">
      <h3>{hall7Words[props.lang].title}</h3>
      {loaded?.revision === props.revision ? (
        <Form key={props.revision} {...props} c={loaded.c} />
      ) : (
        <button
          type="button"
          disabled={props.busy}
          onClick={() =>
            void props.onRead().then((c) => {
              if (c) setLoaded({ revision: props.revision, c });
            })
          }
        >
          {hall7Words[props.lang].read}
        </button>
      )}
    </section>
  );
}
function Candidate({
  c,
  value,
  lang,
  disabled,
  onChange,
}: {
  c: Hall7Catalog;
  value: number;
  lang: Br4Lang;
  disabled: boolean;
  onChange(value: number): void;
}) {
  const options = c.species.map((v) => ({
    value: v.id,
    label: `${v.name[lang]} (${v.id})`,
  }));
  const [text, setText] = useState(
    options.find((v) => v.value === value)?.label ??
      `${hall7Words[lang].unknown} (${value})`,
  );
  return (
    <AutoCompleteComboBox
      value={value}
      inputValue={text}
      label={hall7Words[lang].species}
      disabled={disabled}
      options={options}
      onInputChange={setText}
      onValueChange={onChange}
    />
  );
}
function Form({
  c,
  busy,
  lang,
  onPreview,
  onApply,
}: Props & { c: Hall7Catalog }) {
  const w = hall7Words[lang];
  const [member, setMember] = useState(0);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [ec, setEc] = useState(c.ec ?? "");
  const [preview, setPreview] = useState<Hall7Preview>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const dirty = Object.keys(draft).length > 0 || ec !== (c.ec ?? "");
  const locked = busy || pending || !!preview;
  const writable = c.canEdit && !locked;
  function discard() {
    setDraft({});
    setEc(c.ec ?? "");
    setPreview(undefined);
    setError("");
  }
  async function start(build: () => Hall7Edit) {
    setPending(true);
    setError("");
    try {
      const p = await onPreview(build());
      if (p) setPreview(p);
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  const species = draft[member] ?? c.members[member].species;
  function name(id: number) {
    return (
      c.species.find((v) => v.id === id)?.name[lang] ?? `${w.unknown} (${id})`
    );
  }
  return (
    <div className="save-hall7-body">
      <p>{w.note}</p>
      {[0, 1].map((team) => (
        <div key={team} className="save-hall7-team">
          <h4>{team === 0 ? w.first : w.current}</h4>
          <div className="save-hall7-roster">
            {c.members.slice(team * 6, team * 6 + 6).map((p) => {
              const id = draft[p.index] ?? p.species;
              return (
                <button
                  key={p.index}
                  type="button"
                  aria-pressed={member === p.index}
                  disabled={locked}
                  onClick={() => setMember(p.index)}
                  aria-label={`${team === 0 ? w.first : w.current} ${(p.index % 6) + 1}: ${id === 0 ? w.empty : name(id)}`}
                >
                  {id !== 0 && c.species.some((v) => v.id === id) ? (
                    <img
                      width={64}
                      height={56}
                      alt=""
                      src={pokemonImage({
                        species: id,
                        sprite: id === p.species ? p.sprite : `b_${id}`,
                      })}
                    />
                  ) : (
                    <span className="save-hall7-empty">
                      {id === 0 ? w.empty : "?"}
                    </span>
                  )}
                  <span>
                    {(p.index % 6) + 1} · {id === 0 ? w.empty : name(id)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <label>
        <span>
          {member < 6 ? w.first : w.current} {(member % 6) + 1} · {w.species}
        </span>
        <Candidate
          key={`${member}:${lang}`}
          c={c}
          value={species}
          lang={lang}
          disabled={!writable}
          onChange={(value) => {
            const next = { ...draft };
            if (value === c.members[member].species) delete next[member];
            else next[member] = value;
            setDraft(next);
          }}
        />
      </label>
      {c.ec !== null && (
        <label>
          <span>{w.ec}</span>
          <input
            value={ec}
            maxLength={8}
            spellCheck={false}
            autoComplete="off"
            disabled={!writable}
            onChange={(e) => setEc(e.target.value)}
          />
          <span className="save-hall7-note">{w.ecNote}</span>
        </label>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!writable || !dirty}
          onClick={() =>
            void start(() =>
              h7Patch(
                c,
                Object.keys(draft).length
                  ? Object.entries(draft).map(([index, id]) => ({
                      index: Number(index),
                      species: id,
                    }))
                  : undefined,
                ec === (c.ec ?? "") ? undefined : ec,
              ),
            )
          }
        >
          {w.preview}
        </button>
        <button type="button" disabled={locked || !dirty} onClick={discard}>
          {w.cancel}
        </button>
        <button
          type="button"
          disabled={!writable || dirty}
          onClick={() => void start(() => h7Resave(c))}
        >
          {w.resave}
        </button>
      </div>
      <p className="save-hall7-note">{dirty ? w.draftNote : w.resaveNote}</p>
      {preview && (
        <div className="save-hall7-preview">
          <h4>{w.preview}</h4>
          <p>
            {w.changed}: {preview.changedOffsets.length}
          </p>
          <ul>
            {preview.result.members
              .filter((p) => p.species !== c.members[p.index].species)
              .map((p) => (
                <li key={p.index}>
                  {p.index < 6 ? w.first : w.current} {(p.index % 6) + 1}:{" "}
                  {name(c.members[p.index].species)} → {p.name[lang]}
                </li>
              ))}
          </ul>
          {preview.result.ec !== c.ec && (
            <p>
              {w.ec}: {c.ec} → {preview.result.ec}
            </p>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={busy || pending}
              onClick={() => {
                setPending(true);
                void (async () => {
                  try {
                    await onApply(h7Frozen(c, preview));
                    discard();
                  } catch {
                    setError(w.invalid);
                  } finally {
                    setPending(false);
                  }
                })();
              }}
            >
              {w.apply}
            </button>
            <button type="button" disabled={busy || pending} onClick={discard}>
              {w.cancel}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
    </div>
  );
}

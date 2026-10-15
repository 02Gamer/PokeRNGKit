import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import {
  appendSearchInstruction,
  changePokemonSearch,
  newPokemonSearch,
  orderSearchChoices,
  searchCandidateInput,
  type PokemonSearchActions,
  type PokemonSearchCatalog,
  type PokemonSearchQuery,
  type SearchChoice,
} from "./pokemonSearch";
import { pokemonSearchWords, searchSourceLabel } from "./pokemonSearchWords";
import type { PokemonPosition } from "./domain";
import type { pokemonSearchSourceLabels } from "./pokemonSearchSourceLabels";
import "./PokemonSearchEditor.css";
import { playSaveSound } from "./saveSound";

export function SearchCandidate({
  title,
  choices,
  value,
  lang,
  disabled,
  onValue,
  emptyValue = 0,
}: {
  title: string;
  choices: SearchChoice[];
  value: number;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  onValue(value: number): void;
  emptyValue?: number;
}) {
  const [input, setInput] = useState<{
    value: number;
    lang: string;
    index: number;
    text: string;
  }>();
  const index =
    input?.value === value && input.index === -1
      ? -1
      : input?.value === value &&
          input.lang === lang &&
          choices[input.index]?.id === value
        ? input.index
        : Math.max(
            0,
            choices.findIndex((c) => c.id === value),
          );
  const text =
    input?.value === value && input.index === -1 && input.lang !== lang
      ? ""
      : input?.value === value && input.lang === lang
        ? input.text
        : (choices[index]?.name[lang] ?? "");
  return (
    <label className="field">
      <span>{title}</span>
      <AutoCompleteComboBox
        key={lang}
        label={title}
        disabled={disabled}
        value={String(index)}
        inputValue={text}
        options={choices.map((choice, i) => ({
          value: String(i),
          label: choice.name[lang],
        }))}
        onInputChange={(text) => {
          const next = searchCandidateInput(choices, lang, text, emptyValue);
          setInput({ ...next, lang });
          onValue(next.value);
        }}
        onValueChange={(v) => {
          const next = Number(v),
            choice = choices[next];
          if (!choice) return;
          setInput({
            value: choice.id,
            lang,
            index: next,
            text: choice.name[lang],
          });
          onValue(choice.id);
        }}
      />
    </label>
  );
}

export function PokemonSearchEditor({
  revision,
  position,
  box,
  busy,
  lang,
  actions,
  onMatches,
  onLocate,
}: {
  revision: number;
  position?: PokemonPosition;
  box: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  actions: PokemonSearchActions;
  onMatches(positions?: PokemonPosition[]): void;
  onLocate(position: PokemonPosition): void;
}) {
  const w = pokemonSearchWords[lang];
  const label = (key: keyof typeof pokemonSearchSourceLabels) =>
    searchSourceLabel(key, lang);
  const [query, setQuery] = useState(newPokemonSearch);
  const [catalogState, setCatalog] = useState<{
    revision: number;
    position: string;
    catalog: PokemonSearchCatalog;
  }>();
  const [applied, setApplied] = useState<{
    revision: number;
    query: PokemonSearchQuery;
    count: number;
  }>();
  const [last, setLast] = useState<PokemonPosition>();
  const [resetIndex, setResetIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<"failed" | "noMatch" | "">("");
  const [format, setFormat] = useState(0),
    [property, setProperty] = useState<string>(),
    [prefix, setPrefix] = useState("=");
  const flight = useRef(false),
    lifecycle = useRef({ alive: true, epoch: 0 });
  useEffect(() => {
    const life = lifecycle.current;
    life.alive = true;
    life.epoch++;
    return () => {
      life.alive = false;
      life.epoch++;
    };
  }, [revision]);
  const positionKey = JSON.stringify(position ?? {});
  // Requests carry the caller's revision; render never displays data from another save revision.
  const catalog =
    catalogState?.revision === revision ? catalogState.catalog : undefined;
  const current = applied?.revision === revision ? applied : undefined;
  const locked = busy || pending || Boolean(applied && !current);
  const latest = useRef({ actions, onMatches });
  useEffect(() => {
    latest.current = { actions, onMatches };
  }, [actions, onMatches]);
  useEffect(() => {
    if (!applied || applied.revision === revision || pending || flight.current)
      return;
    const ticket = lifecycle.current.epoch;
    flight.current = true;
    void latest.current.actions
      .search(applied.query)
      .then(
        (result) => {
          if (!lifecycle.current.alive || ticket !== lifecycle.current.epoch)
            return;
          if (result) {
            setApplied({
              revision,
              query: applied.query,
              count: result.matches.length,
            });
            latest.current.onMatches(result.matches);
            setMessage(result.matches.length ? "" : "noMatch");
          } else {
            setApplied(undefined);
            latest.current.onMatches(undefined);
            setMessage("failed");
          }
        },
        () => {
          if (!lifecycle.current.alive || ticket !== lifecycle.current.epoch)
            return;
          setApplied(undefined);
          latest.current.onMatches(undefined);
          setMessage("failed");
        },
      )
      .finally(() => {
        flight.current = false;
      });
  }, [revision, applied, pending]);
  const fields = catalog?.formats.find((f) => f.index === format)?.fields ?? [];
  const field =
    property === undefined
      ? fields[0]
      : fields.find((f) => f.name === property);
  function update<K extends keyof PokemonSearchQuery>(
    key: K,
    value: PokemonSearchQuery[K],
  ) {
    setQuery((previous) => ({ ...previous, [key]: value }));
  }
  async function read() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setMessage("");
    const atRevision = revision,
      atPosition = positionKey,
      ticket = lifecycle.current.epoch;
    try {
      const value = await actions.catalog(position);
      if (!lifecycle.current.alive || ticket !== lifecycle.current.epoch)
        return;
      if (value)
        setCatalog({
          revision: atRevision,
          position: atPosition,
          catalog: value,
        });
      else setMessage("failed");
    } catch {
      if (lifecycle.current.alive && ticket === lifecycle.current.epoch)
        setMessage("failed");
    } finally {
      flight.current = false;
      if (lifecycle.current.alive) setPending(false);
    }
  }
  async function search() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setMessage("");
    const filters = structuredClone(query),
      atRevision = revision,
      ticket = lifecycle.current.epoch;
    try {
      const result = await actions.search(filters);
      if (!lifecycle.current.alive || ticket !== lifecycle.current.epoch)
        return;
      if (!result) {
        setMessage("failed");
        return;
      }
      setApplied({
        revision: atRevision,
        query: filters,
        count: result.matches.length,
      });
      setLast(undefined);
      onMatches(result.matches);
      if (!result.matches.length) setMessage("noMatch");
      playSaveSound("other");
    } catch {
      if (lifecycle.current.alive && ticket === lifecycle.current.epoch)
        setMessage("failed");
    } finally {
      flight.current = false;
      if (lifecycle.current.alive) setPending(false);
    }
  }
  async function seek(reverse: boolean) {
    if (locked || flight.current || !current) return;
    flight.current = true;
    setPending(true);
    setMessage("");
    const ticket = lifecycle.current.epoch;
    try {
      const result = await actions.seek(
        current.query,
        last?.box ?? Math.max(box, 0),
        last?.slot ?? -1,
        reverse,
      );
      if (!lifecycle.current.alive || ticket !== lifecycle.current.epoch)
        return;
      if (result === undefined) setMessage("failed");
      else if (result === null) {
        setMessage("noMatch");
        playSaveSound("other", "exclamation");
      } else {
        setLast(result);
        onLocate(result);
        playSaveSound("other");
      }
    } catch {
      if (lifecycle.current.alive && ticket === lifecycle.current.epoch)
        setMessage("failed");
    } finally {
      flight.current = false;
      if (lifecycle.current.alive) setPending(false);
    }
  }
  function reset() {
    setResetIndex((v) => v + 1);
    setQuery(newPokemonSearch());
    setApplied(undefined);
    setLast(undefined);
    setMessage("");
    onMatches(undefined);
    playSaveSound("other");
  }
  function choice(
    key:
      "species" | "ability" | "nature" | "item" | "version" | "hiddenPowerType",
    title: string,
    choices: SearchChoice[],
    any: number,
  ) {
    return (
      <SearchCandidate
        key={`${key}:${resetIndex}`}
        title={title}
        value={query[key]}
        lang={lang}
        disabled={locked}
        choices={[
          { id: any, name: { zh: w.any, en: w.any, ja: w.any } },
          ...(key === "version"
            ? choices
            : orderSearchChoices(choices, lang, key === "item")),
        ]}
        onValue={(value) =>
          key === "version"
            ? setQuery((q) => changePokemonSearch(q, key, value))
            : update(key, value)
        }
      />
    );
  }
  return (
    <details
      className="save-pokemon-search"
      onToggle={(e) => {
        if (e.currentTarget.open && !catalog && !locked) void read();
      }}
      onKeyDown={(e) => {
        if (e.key.toLowerCase() === "w" && e.ctrlKey) {
          e.preventDefault();
          e.currentTarget.open = false;
          e.currentTarget.querySelector<HTMLElement>("summary")?.focus();
        } else if (
          e.key === "Enter" &&
          !e.defaultPrevented &&
          !(e.target instanceof HTMLTextAreaElement) &&
          !(e.target as HTMLElement).closest("button,[role=combobox],summary")
        ) {
          e.preventDefault();
          if (catalog) void search();
        }
      }}
    >
      <summary>{label("EntitySearchSetup")}</summary>
      <div className="save-editor-toolbar">
        <button type="button" disabled={locked} onClick={() => void read()}>
          {pending ? w.loading : w.load}
        </button>
        <span className="save-editor-note">{w.readonly}</span>
      </div>
      {catalog && (
        <>
          <div className="save-search-fields">
            {choice(
              "species",
              label("EntitySearchSetup.Label_Species"),
              catalog.species,
              0,
            )}
            <label className="field">
              <span>{label("EntitySearchSetup.Label_Nickname")}</span>
              <input
                value={query.nickname}
                maxLength={32767}
                disabled={locked}
                onChange={(e) => update("nickname", e.target.value)}
              />
            </label>
            {choice(
              "nature",
              label("EntitySearchSetup.Label_Nature"),
              catalog.natures,
              25,
            )}
            {choice(
              "item",
              label("EntitySearchSetup.Label_HeldItem"),
              catalog.items,
              -1,
            )}
            {choice(
              "ability",
              label("EntitySearchSetup.Label_Ability"),
              catalog.abilities,
              -1,
            )}
            {choice(
              "hiddenPowerType",
              label("EntitySearchSetup.Label_HiddenPowerPrefix"),
              catalog.hiddenPowerTypes,
              -1,
            )}
            <label className="field">
              <span>{label("EntitySearchSetup.Label_CurLevel")}</span>
              <Select
                disabled={locked}
                value={query.levelComparison}
                onChange={(e) =>
                  setQuery((q) =>
                    changePokemonSearch(
                      q,
                      "levelComparison",
                      Number(e.target.value),
                    ),
                  )
                }
              >
                {[w.any, "=", "≥", "≤"].map((v, i) => (
                  <option key={i} value={i}>
                    {v}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{label("EntitySearchSetup.Label_CurLevel")}</span>
              <input
                inputMode="numeric"
                maxLength={3}
                disabled={locked}
                value={query.level}
                onChange={(e) => {
                  if (/^[0-9 ]{0,3}$/.test(e.target.value))
                    update("level", e.target.value);
                }}
              />
            </label>
            <label className="field">
              <span>{label("EntitySearchSetup.L_Potential")}</span>
              <Select
                disabled={locked}
                value={query.ivType}
                onChange={(e) => update("ivType", Number(e.target.value))}
              >
                {w.iv.map((v, i) => (
                  <option key={i} value={i}>
                    {v}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{label("EntitySearchSetup.L_EVTraining")}</span>
              <Select
                disabled={locked}
                value={query.evType}
                onChange={(e) => update("evType", Number(e.target.value))}
              >
                {w.ev.map((v, i) => (
                  <option key={i} value={i}>
                    {v}
                  </option>
                ))}
              </Select>
            </label>
            {["shiny", "egg"].map((key) => (
              <label className="field" key={key}>
                <span>
                  {label(
                    key === "egg"
                      ? "EntitySearchSetup.CHK_IsEgg"
                      : "EntitySearchSetup.CHK_Shiny",
                  )}
                </span>
                <Select
                  disabled={locked}
                  value={
                    query[key as "shiny" | "egg"] === null
                      ? "any"
                      : String(query[key as "shiny" | "egg"])
                  }
                  onChange={(e) =>
                    update(
                      key as "shiny" | "egg",
                      e.target.value === "any"
                        ? null
                        : e.target.value === "true",
                    )
                  }
                >
                  <option value="any">{w.any}</option>
                  <option value="true">{w.yes}</option>
                  <option value="false">{w.no}</option>
                </Select>
              </label>
            ))}
            {query.egg === true && (
              <label className="field">
                <span>{label("EntitySearchSetup.L_ESV")}</span>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  disabled={locked}
                  value={query.esv}
                  onChange={(e) => {
                    if (/^[0-9 ]{0,4}$/.test(e.target.value))
                      update("esv", e.target.value);
                  }}
                />
              </label>
            )}
            {choice(
              "version",
              label("EntitySearchSetup.L_Version"),
              catalog.games,
              -1,
            )}
            <label className="field">
              <span>{label("EntitySearchSetup.L_Generation")}</span>
              <Select
                disabled={locked}
                value={query.generation}
                onChange={(e) =>
                  setQuery((q) =>
                    changePokemonSearch(
                      q,
                      "generation",
                      Number(e.target.value),
                    ),
                  )
                }
              >
                {w.generation.map((v, i) => (
                  <option key={i} value={i}>
                    {v}
                  </option>
                ))}
              </Select>
            </label>
            {query.moves.map((move, index) => (
              <SearchCandidate
                key={`${index}:${resetIndex}`}
                title={label(
                  `EntitySearchSetup.L_Move${index + 1}` as keyof typeof pokemonSearchSourceLabels,
                )}
                choices={[
                  { id: 0, name: { zh: w.any, en: w.any, ja: w.any } },
                  ...orderSearchChoices(catalog.moves, lang),
                ]}
                value={move}
                lang={lang}
                disabled={locked}
                onValue={(value) =>
                  update(
                    "moves",
                    query.moves.map((v, i) => (i === index ? value : v)),
                  )
                }
              />
            ))}
          </div>
          <details>
            <summary>{label("EntitySearchSetup.Tab_Advanced")}</summary>
            <div className="save-search-fields">
              <label className="field">
                <span>{w.format}</span>
                <Select
                  disabled={locked}
                  value={format}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setFormat(next);
                    setProperty(
                      catalog.formats.find((f) => f.index === next)?.fields[0]
                        ?.name ?? "",
                    );
                  }}
                >
                  {catalog.formats.map((f) => (
                    <option key={f.index} value={f.index}>
                      {f.name === "any"
                        ? w.any
                        : f.name === "all"
                          ? w.all
                          : f.name}
                    </option>
                  ))}
                </Select>
              </label>
              <SearchCandidate
                key={`property:${format}:${resetIndex}`}
                emptyValue={-1}
                title={w.property}
                disabled={locked}
                lang={lang}
                choices={fields.map((f, i) => ({
                  id: i,
                  name: { zh: f.name, en: f.name, ja: f.name },
                }))}
                value={fields.findIndex((f) => f.name === field?.name)}
                onValue={(index) => setProperty(fields[index]?.name ?? "")}
              />
              <label className="field">
                <span>{w.prefix}</span>
                <Select
                  disabled={locked}
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                >
                  {catalog.prefixes.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{w.type}</span>
                <output>{field?.type ?? ""}</output>
              </label>
              <label className="field">
                <span>{w.value}</span>
                <output>
                  {catalogState?.position !== positionKey
                    ? w.load
                    : field?.present
                      ? field.value
                      : w.unavailable}
                </output>
              </label>
            </div>
            <button
              type="button"
              disabled={locked || !field}
              onClick={() => {
                try {
                  update(
                    "instructions",
                    appendSearchInstruction(
                      query.instructions,
                      catalog,
                      format,
                      field?.name ?? "",
                      prefix,
                    ),
                  );
                } catch {
                  setMessage("failed");
                }
              }}
            >
              {label("EntitySearchSetup.B_Add")}
            </button>
            <label className="field">
              <span>{w.instructions}</span>
              <textarea
                rows={5}
                maxLength={32767}
                disabled={locked}
                value={query.instructions}
                onChange={(e) => update("instructions", e.target.value)}
              />
            </label>
            <p className="save-editor-note">{w.ignored}</p>
          </details>
        </>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || !catalog}
          onClick={() => void search()}
        >
          {label("EntitySearchSetup.B_Search")}
        </button>
        <button type="button" disabled={locked} onClick={reset}>
          {label("EntitySearchSetup.B_Reset")}
        </button>
        {current && (
          <>
            <button
              type="button"
              disabled={locked}
              onClick={() => void seek(true)}
            >
              {label("EntitySearchSetup.B_Previous")}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => void seek(false)}
            >
              {label("EntitySearchSetup.B_Next")}
            </button>
            <span role="status">
              {current.count} {w.matched}
            </span>
          </>
        )}
      </div>
      {applied && !current && <p role="status">{w.stale}</p>}
      {message && <p role="status">{w[message]}</p>}
    </details>
  );
}

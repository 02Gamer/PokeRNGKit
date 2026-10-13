import { useState } from "react";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { SearchCandidate } from "./PokemonSearchEditor";
import {
  appendSearchInstruction,
  changePokemonSearch,
  newPokemonSearch,
  orderSearchChoices,
  type PokemonSearchQuery,
  type SearchChoice,
} from "./pokemonSearch";
import { pokemonSearchWords, searchSourceLabel } from "./pokemonSearchWords";
import type { DatabaseCatalog, DatabaseQuery } from "./databaseProtocol";

export function DatabaseFilters({
  catalog,
  query,
  lang,
  disabled,
  onChange,
  onSearch,
}: {
  catalog: DatabaseCatalog;
  query: DatabaseQuery;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  onChange(query: DatabaseQuery): void;
  onSearch(): void;
}) {
  const w = pokemonSearchWords[lang],
    c = catalog.search,
    q = query.filters;
  const [format, setFormat] = useState(0),
    [property, setProperty] = useState<string>(),
    [prefix, setPrefix] = useState("=");
  const [reset, setReset] = useState(0);
  const label = (key: Parameters<typeof searchSourceLabel>[0]) =>
    searchSourceLabel(key, lang);
  const update = <K extends keyof PokemonSearchQuery>(
    key: K,
    value: PokemonSearchQuery[K],
  ) => onChange({ ...query, filters: { ...q, [key]: value } });
  const choice = (
    key:
      "species" | "ability" | "nature" | "item" | "version" | "hiddenPowerType",
    title: string,
    choices: SearchChoice[],
    any: number,
  ) => (
    <SearchCandidate
      key={`${key}:${reset}`}
      title={title}
      value={q[key]}
      choices={[
        { id: any, name: { zh: w.any, en: w.any, ja: w.any } },
        ...(key === "version"
          ? choices
          : orderSearchChoices(choices, lang, key === "item")),
      ]}
      lang={lang}
      disabled={disabled}
      onValue={(value) =>
        key === "version"
          ? onChange({ ...query, filters: changePokemonSearch(q, key, value) })
          : update(key, value)
      }
    />
  );
  const tri = (key: "shiny" | "egg", title: string) => (
    <label className="field">
      <span>{title}</span>
      <Select
        disabled={disabled}
        value={q[key] === null ? "any" : String(q[key])}
        onChange={(e) =>
          update(
            key,
            e.target.value === "any" ? null : e.target.value === "true",
          )
        }
      >
        <option value="any">{w.any}</option>
        <option value="true">{w.yes}</option>
        <option value="false">{w.no}</option>
      </Select>
    </label>
  );
  const fields = c.formats.find((f) => f.index === format)?.fields ?? [],
    selected =
      property === undefined
        ? fields[0]
        : fields.find((f) => f.name === property);
  return (
    <details
      className="save-pokemon-search"
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          !e.defaultPrevented &&
          !(e.target instanceof HTMLTextAreaElement) &&
          !(e.target as HTMLElement).closest("button,[role=combobox],summary")
        ) {
          e.preventDefault();
          if (!disabled) onSearch();
        }
      }}
    >
      <summary>{label("EntitySearchSetup")}</summary>
      <div className="save-search-fields">
        {choice(
          "species",
          label("EntitySearchSetup.Label_Species"),
          c.species,
          0,
        )}
        <label className="field">
          <span>{label("EntitySearchSetup.Label_Nickname")}</span>
          <input
            value={q.nickname}
            maxLength={32767}
            disabled={disabled}
            onChange={(e) => update("nickname", e.target.value)}
          />
        </label>
        {choice(
          "nature",
          label("EntitySearchSetup.Label_Nature"),
          c.natures,
          25,
        )}
        {choice("item", label("EntitySearchSetup.Label_HeldItem"), c.items, -1)}
        {choice(
          "ability",
          label("EntitySearchSetup.Label_Ability"),
          c.abilities,
          -1,
        )}
        {choice(
          "hiddenPowerType",
          label("EntitySearchSetup.Label_HiddenPowerPrefix"),
          c.hiddenPowerTypes,
          -1,
        )}
        <label className="field">
          <span>{label("EntitySearchSetup.Label_CurLevel")}</span>
          <Select
            value={q.levelComparison}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...query,
                filters: changePokemonSearch(
                  q,
                  "levelComparison",
                  Number(e.target.value),
                ),
              })
            }
          >
            {[w.any, "=", "≥", "≤"].map((s, i) => (
              <option key={i} value={i}>
                {s}
              </option>
            ))}
          </Select>
          <input
            aria-label={label("EntitySearchSetup.Label_CurLevel")}
            inputMode="numeric"
            maxLength={3}
            value={q.level}
            disabled={disabled || !q.levelComparison}
            onChange={(e) => update("level", e.target.value)}
          />
        </label>
        <label className="field">
          <span>{label("EntitySearchSetup.L_Potential")}</span>
          <Select
            value={q.ivType}
            disabled={disabled}
            onChange={(e) => update("ivType", Number(e.target.value))}
          >
            {w.iv.map((s, i) => (
              <option key={i} value={i}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{label("EntitySearchSetup.L_EVTraining")}</span>
          <Select
            value={q.evType}
            disabled={disabled}
            onChange={(e) => update("evType", Number(e.target.value))}
          >
            {w.ev.map((s, i) => (
              <option key={i} value={i}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        {tri("shiny", label("EntitySearchSetup.CHK_Shiny"))}
        {tri("egg", label("EntitySearchSetup.CHK_IsEgg"))}
        {q.egg !== null && (
          <label className="field">
            <span>{label("EntitySearchSetup.L_ESV")}</span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={q.esv}
              disabled={disabled}
              onChange={(e) => update("esv", e.target.value)}
            />
          </label>
        )}
        {q.moves.map((value, i) => (
          <SearchCandidate
            key={`move:${i}:${reset}`}
            title={label(
              (
                [
                  "EntitySearchSetup.L_Move1",
                  "EntitySearchSetup.L_Move2",
                  "EntitySearchSetup.L_Move3",
                  "EntitySearchSetup.L_Move4",
                ] as const
              )[i],
            )}
            value={value}
            choices={[
              { id: 0, name: { zh: w.any, en: w.any, ja: w.any } },
              ...orderSearchChoices(c.moves, lang),
            ]}
            lang={lang}
            disabled={disabled}
            onValue={(v) =>
              update(
                "moves",
                q.moves.map((m, j) => (j === i ? v : m)),
              )
            }
          />
        ))}
        {choice("version", label("EntitySearchSetup.L_Version"), c.games, -1)}
        <label className="field">
          <span>{label("EntitySearchSetup.L_Generation")}</span>
          <Select
            value={q.generation}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...query,
                filters: changePokemonSearch(
                  q,
                  "generation",
                  Number(e.target.value),
                ),
              })
            }
          >
            {w.generation.map((s, i) => (
              <option key={i} value={i}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{w.format}</span>
          <Select
            value={query.comparison ?? catalog.comparison}
            disabled={disabled}
            onChange={(e) => {
              const comparison = Number(e.target.value);
              onChange({
                ...query,
                comparison,
                context: comparison ? catalog.context : 0,
              });
            }}
          >
            {[w.any, "=", "≥", "≤"].map((s, i) => (
              <option key={i} value={i}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            aria-label={w.format}
            value={query.context ?? catalog.context}
            disabled={disabled || query.comparison === 0}
            onChange={(e) =>
              onChange({ ...query, context: Number(e.target.value) })
            }
          >
            {catalog.contexts.map((f) => (
              <option key={f.id} value={f.id}>
                {f.id ? f.name : w.any}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <details>
        <summary>{w.instructions}</summary>
        <div className="save-search-fields">
          <label className="field">
            <span>{w.format}</span>
            <Select
              value={format}
              disabled={disabled}
              onChange={(e) => {
                setFormat(Number(e.target.value));
                setProperty(undefined);
              }}
            >
              {c.formats.map((f) => (
                <option key={f.index} value={f.index}>
                  {f.name === "any" ? w.any : f.name === "all" ? w.all : f.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{w.property}</span>
            <AutoCompleteComboBox
              label={w.property}
              value={selected?.name ?? ""}
              inputValue={selected?.name ?? property ?? ""}
              options={fields.map((f) => ({ value: f.name, label: f.name }))}
              disabled={disabled}
              onInputChange={setProperty}
              onValueChange={setProperty}
            />
          </label>
          <label className="field">
            <span>{w.prefix}</span>
            <Select
              value={prefix}
              disabled={disabled}
              onChange={(e) => setPrefix(e.target.value)}
            >
              {c.prefixes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </label>
          <p>
            {w.type}: {selected?.type ?? ""}
            <br />
            {w.value}: {selected?.value ?? ""}
          </p>
        </div>
        <button
          type="button"
          disabled={
            disabled ||
            !selected ||
            q.instructions.length +
              (selected?.name.length ?? 0) +
              prefix.length +
              1 +
              (q.instructions && !q.instructions.endsWith("\n") ? 1 : 0) >
              32767
          }
          onClick={() => {
            if (selected)
              update(
                "instructions",
                appendSearchInstruction(
                  q.instructions,
                  c,
                  format,
                  selected.name,
                  prefix,
                ),
              );
          }}
        >
          {label("EntitySearchSetup.B_Add")}
        </button>
        <label className="field">
          <span>{w.instructions}</span>
          <textarea
            value={q.instructions}
            maxLength={32767}
            disabled={disabled}
            onChange={(e) => update("instructions", e.target.value)}
          />
        </label>
        <p className="save-editor-note">{w.ignored}</p>
      </details>
      <div className="save-editor-toolbar">
        <button type="button" disabled={disabled} onClick={onSearch}>
          {label("EntitySearchSetup.B_Search")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onChange({ ...query, filters: newPokemonSearch() });
            setReset(reset + 1);
          }}
        >
          {label("EntitySearchSetup.B_Reset")}
        </button>
      </div>
    </details>
  );
}

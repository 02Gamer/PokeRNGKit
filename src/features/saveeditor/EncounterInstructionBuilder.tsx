// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from "react";
import { Select } from "../shared/Select";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { pokemonSearchWords, searchSourceLabel } from "./pokemonSearchWords";
import type { EncounterCatalog } from "./encounterProtocol";
export function EncounterInstructionBuilder({
  catalog,
  lang,
  disabled,
  value,
  onChange,
}: {
  catalog: Pick<EncounterCatalog, "formats" | "prefixes">;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  value: string;
  onChange(value: string): void;
}) {
  const w = pokemonSearchWords[lang];
  const [format, setFormat] = useState(0),
    [property, setProperty] = useState<string>(),
    [prefix, setPrefix] = useState("=");
  const fields = catalog.formats.find((v) => v.index === format)?.fields ?? [],
    selected =
      property === undefined
        ? fields[0]
        : fields.find((v) => v.name === property);
  const text = selected ? `${prefix}${selected.name}=` : "";
  const next = value + (value && !value.endsWith("\n") ? "\n" : "") + text;
  return (
    <>
      <div className="save-encounter-fields">
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
            {catalog.formats.map((v) => (
              <option key={v.index} value={v.index}>
                {v.name === "any" ? w.any : v.name === "all" ? w.all : v.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{w.property}</span>
          <AutoCompleteComboBox
            label={w.property}
            value={selected?.name ?? ""}
            inputValue={property ?? selected?.name ?? ""}
            options={fields.map((v) => ({ value: v.name, label: v.name }))}
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
            {catalog.prefixes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </label>
        <p>
          {w.type}: {selected?.type}
          <br />
          {w.value}: {selected?.value}
          <br />
          {selected && !selected.present ? w.unavailable : ""}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled || !selected || next.length > 32767}
        onClick={() => onChange(next)}
      >
        {searchSourceLabel("EntitySearchSetup.B_Add", lang)}
      </button>
    </>
  );
}

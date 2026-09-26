import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { LocalizedText, SaveReport } from "./domain";
import type { saveEditorResources } from "./locales";

export function SavePokemonBrowser({ report }: { report: SaveReport }) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const name = (value: LocalizedText) => value[lang];
  const [box, setBox] = useState(-1);
  const [slot, setSlot] = useState<number>();
  const entries = report.pokemon.filter((p) => p.box === box);
  const selected = entries.find((p) => p.slot === slot) ?? entries[0];
  const stats = [
    words.hp,
    words.attack,
    words.defense,
    words.spAttack,
    words.spDefense,
    words.speed,
  ];
  return (
    <section className="save-pokemon-browser" aria-label={words.pokemon}>
      <h3>{words.pokemon}</h3>
      <p className="save-editor-note">{words.readPokemon}</p>
      <label className="field">
        <span>
          {words.party} / {words.box}
        </span>
        <Select
          value={box}
          onChange={(e) => {
            setBox(Number(e.target.value));
            setSlot(undefined);
          }}
        >
          <option value={-1}>
            {words.party} ({report.pokemon.filter((p) => p.box === -1).length})
          </option>
          {Array.from({ length: report.boxCount }, (_, i) => (
            <option key={i} value={i}>
              {words.box} {i + 1} (
              {report.pokemon.filter((p) => p.box === i).length})
            </option>
          ))}
        </Select>
      </label>
      {entries.length === 0 ? (
        <p>{words.empty}</p>
      ) : (
        <>
          <div className="save-pokemon-slots" aria-label={words.slot}>
            {entries.map((p) => (
              <button
                type="button"
                key={p.slot}
                aria-pressed={selected?.slot === p.slot}
                onClick={() => setSlot(p.slot)}
              >
                <span>
                  {p.slot + 1}. {name(p.speciesName)} {p.shiny ? "★" : ""}
                </span>
                <small>
                  {words.level} {p.level}
                  {p.egg ? ` · ${words.egg}` : ""}
                </small>
              </button>
            ))}
          </div>
          {selected && (
            <>
              {!selected.valid && (
                <p role="alert" className="save-editor-error">
                  {words.invalidPokemon}
                </p>
              )}
              <dl className="save-editor-summary">
                {[
                  [
                    words.species,
                    `${name(selected.speciesName)} #${selected.species}`,
                  ],
                  [words.nickname, selected.nickname || "—"],
                  [words.level, selected.level],
                  [words.form, selected.form],
                  [
                    words.gender,
                    [words.male, words.female, words.genderless][
                      selected.gender
                    ] ?? "—",
                  ],
                  [words.shiny, selected.shiny ? words.yes : words.no],
                  [words.egg, selected.egg ? words.yes : words.no],
                  [words.nature, name(selected.nature)],
                  [words.ability, name(selected.ability)],
                  [words.item, name(selected.item)],
                  [words.originalTrainer, selected.ot],
                  [words.tid, selected.tid],
                  [words.sid, selected.sid],
                  [
                    "PID",
                    selected.pid.toString(16).toUpperCase().padStart(8, "0"),
                  ],
                  [words.experience, selected.experience],
                  [words.friendship, selected.friendship],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <h4>{words.moves}</h4>
              <ul className="save-pokemon-moves">
                {selected.moves.map((move, i) => (
                  <li key={i}>
                    {name(move)} · PP {selected.movePp[i]}
                  </li>
                ))}
              </ul>
              <div className="save-pokemon-stats">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{words.pokemon}</th>
                      {stats.map((s) => (
                        <th scope="col" key={s}>
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">{words.ivs}</th>
                      {selected.ivs.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">{words.evs}</th>
                      {selected.evs.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

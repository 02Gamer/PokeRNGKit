// SPDX-License-Identifier: GPL-3.0-or-later
import { PokemonSprite } from "./PokemonSprite";
import { PokemonBoostRows } from "./PokemonAdvancedStatsEditor";
import { useSavePrivacy } from "./useSavePrivacy";
import { useGenderLabel } from "./useGenderLabel";
import { saveEditorResources } from "./locales";
import { standaloneWords } from "./standaloneWords";
import type { PokemonEntry } from "./domain";
export function PokemonReadOnlySummary({
  pokemon: p,
  generation,
  lang,
}: {
  pokemon: PokemonEntry;
  generation: number;
  lang: "zh" | "en" | "ja";
}) {
  const privacy = useSavePrivacy();
  const genderLabel = useGenderLabel();
  const w = saveEditorResources[lang],
    gb = generation < 3,
    indices = gb ? [0, 1, 2, 5, 3] : [0, 1, 2, 3, 4, 5];
  const labels = gb
    ? [w.hp, w.attack, w.defense, w.speed, standaloneWords[lang].special]
    : [w.hp, w.attack, w.defense, w.spAttack, w.spDefense, w.speed];
  return (
    <>
      <div className="save-pokemon-identity">
        <PokemonSprite pokemon={p} alt="" width={68} height={56} />
        <h4>
          {p.nickname} · {p.speciesName[lang]}
        </h4>
      </div>
      <dl className="save-editor-summary">
        {[
          [w.species, `${p.speciesName[lang]} #${p.species}`],
          [w.originalTrainer, p.ot],
          [w.level, p.level],
          [w.form, p.form],
          ...((p.vitals?.showGender ?? generation !== 1)
            ? [
                [
                  w.gender,
                  genderLabel(
                    p.gender,
                    [w.male, w.female, w.genderless][p.gender],
                  ),
                ],
              ]
            : []),
          [w.shiny, p.shiny ? w.yes : w.no],
          [w.egg, p.egg ? w.yes : w.no],
          [w.tid, p.tid],
          [w.sid, p.sid],
          ...(privacy.hideSecretDetails
            ? []
            : [["PID", p.pid.toString(16).toUpperCase().padStart(8, "0")]]),
          [w.nature, p.nature[lang]],
          [w.ability, p.ability[lang]],
          [w.item, p.item[lang]],
          [w.experience, p.experience],
          [p.egg ? w.hatchCounter : w.friendship, p.friendship],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <ul className="save-pokemon-moves">
        {p.moves.map((move, i) => (
          <li key={i}>
            {move[lang]} · PP {p.movePp[i]}
          </li>
        ))}
      </ul>
      <div className="save-pokemon-stats">
        <table>
          <thead>
            <tr>
              <th scope="col">{w.pokemon}</th>
              {labels.map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{gb ? standaloneWords[lang].dvs : w.ivs}</th>
              {indices.map((i) => (
                <td key={i}>{p.ivs[i]}</td>
              ))}
            </tr>
            {!p.advancedStats?.awakening && (
              <tr>
                <th scope="row">
                  {gb ? standaloneWords[lang].statExperience : w.evs}
                </th>
                {indices.map((i) => (
                  <td key={i}>{p.evs[i]}</td>
                ))}
              </tr>
            )}
            <PokemonBoostRows info={p.advancedStats} lang={lang} />
          </tbody>
        </table>
      </div>
    </>
  );
}

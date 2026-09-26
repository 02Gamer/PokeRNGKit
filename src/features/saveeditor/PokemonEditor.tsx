import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { MoveChoice, PokemonEntry, SaveReport } from "./domain";
import type { saveEditorResources } from "./locales";

export interface PokemonEdit {
  box: number;
  slot: number;
  nickname: string;
  level: number;
  friendship: number;
  ot: string;
  tid: number;
  sid: number;
  ivs: number[];
  evs: number[];
  moves: number[];
  movePp: number[];
  movePpUps: number[];
  nature: number | null;
  statAlignment: number | null;
  abilityIndex: number | null;
  heldItem: number | null;
  identity: {
    species: number;
    form: number;
    gender: number;
    useSpeciesName: boolean;
  } | null;
}

export function PokemonEditor({
  pokemon,
  moveChoices,
  attributeChoices,
  disabled,
  onApply,
}: {
  pokemon: PokemonEntry;
  moveChoices: MoveChoice[];
  attributeChoices: SaveReport["attributeChoices"];
  disabled: boolean;
  onApply(edit: PokemonEdit): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [values, setValues] = useState({
    nickname: pokemon.nickname,
    species: String(pokemon.species),
    form: String(pokemon.form),
    gender: String(pokemon.gender),
    useSpeciesName: !pokemon.isNicknamed,
    nature: String(pokemon.natureId),
    statAlignment: String(pokemon.statAlignment),
    abilityIndex: String(pokemon.abilityIndex),
    heldItem: String(pokemon.heldItem),
    ot: pokemon.ot,
    level: String(pokemon.level),
    friendship: String(pokemon.friendship),
    tid: String(pokemon.tid),
    sid: String(pokemon.sid),
    ivs: pokemon.ivs.map(String),
    evs: pokemon.evs.map(String),
    moves: pokemon.moveIds.map(String),
    movePp: pokemon.movePp.map(String),
    movePpUps: pokemon.movePpUps.map(String),
  });
  const [error, setError] = useState("");
  const speciesChoice = attributeChoices.species.find(
    (choice) => choice.id === Number(values.species),
  );
  const formChoice = speciesChoice?.forms[Number(values.form)];
  const identityChanged =
    Number(values.species) !== pokemon.species ||
    Number(values.form) !== pokemon.form ||
    Number(values.gender) !== pokemon.gender ||
    values.useSpeciesName !== !pokemon.isNicknamed;
  const abilityChoices = identityChanged
    ? (formChoice?.abilities ?? pokemon.abilityChoices)
    : pokemon.abilityChoices;
  const changeIdentity = (species: string, form: string) => {
    const target = attributeChoices.species.find(
      (choice) => choice.id === Number(species),
    )?.forms[Number(form)];
    setValues({
      ...values,
      species,
      form,
      gender: String(
        target?.genders.includes(Number(values.gender))
          ? Number(values.gender)
          : (target?.genders[0] ?? 2),
      ),
      abilityIndex: String(
        Math.max(
          0,
          Math.min(
            Number(values.abilityIndex),
            (target?.abilities.length ?? 1) - 1,
          ),
        ),
      ),
    });
  };
  const statNames = [
    words.hp,
    words.attack,
    words.defense,
    words.spAttack,
    words.spDefense,
    words.speed,
  ];
  const integer = (value: string, max: number, min = 0) => {
    if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max)
      throw Error(words.pokemonValueError);
    return Number(value);
  };
  const submit = async () => {
    setError("");
    try {
      const evs = values.evs.map((value) => integer(value, pokemon.limits.ev));
      if (evs.reduce((a, b) => a + b, 0) > 510)
        throw Error(words.pokemonValueError);
      await onApply({
        box: pokemon.box,
        slot: pokemon.slot,
        nickname: values.nickname,
        identity: identityChanged
          ? {
              species: integer(
                values.species,
                attributeChoices.species.at(-1)?.id ?? 0,
                1,
              ),
              form: integer(
                values.form,
                (speciesChoice?.forms.length ?? 1) - 1,
              ),
              gender: integer(values.gender, 2),
              useSpeciesName: values.useSpeciesName,
            }
          : null,
        nature:
          Number(values.nature) === pokemon.natureId
            ? null
            : integer(values.nature, 24),
        statAlignment:
          !pokemon.canStatAlignment ||
          Number(values.statAlignment) === pokemon.statAlignment
            ? null
            : integer(values.statAlignment, 24),
        abilityIndex:
          !identityChanged &&
          Number(values.abilityIndex) === pokemon.abilityIndex
            ? null
            : integer(values.abilityIndex, abilityChoices.length - 1),
        heldItem:
          Number(values.heldItem) === pokemon.heldItem
            ? null
            : integer(values.heldItem, attributeChoices.items.length - 1),
        ot: values.ot,
        level: integer(values.level, 100, 1),
        friendship: integer(values.friendship, 255),
        tid: integer(values.tid, 65535),
        sid: integer(values.sid, 65535),
        ivs: values.ivs.map((value) => integer(value, pokemon.limits.iv)),
        evs,
        moves: values.moves.map((value) => integer(value, pokemon.limits.move)),
        movePpUps: values.movePpUps.map((value) => integer(value, 3)),
        movePp: values.movePp.map((value, index) =>
          integer(
            value,
            moveChoices[Number(values.moves[index])]?.maxPp[
              Number(values.movePpUps[index])
            ] ?? 0,
          ),
        ),
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : words.pokemonValueError,
      );
    }
  };
  return (
    <details className="save-pokemon-editor">
      <summary>{words.editPokemon}</summary>
      <fieldset disabled={disabled} className="save-editor-fields">
        <legend>{words.basicPokemonEdit}</legend>
        <label className="field">
          <span>{words.species}</span>
          <Select
            disabled={disabled}
            value={values.species}
            onChange={(e) => changeIdentity(e.target.value, "0")}
          >
            {!speciesChoice && (
              <option value={values.species}>#{values.species}</option>
            )}
            {attributeChoices.species.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.name[lang]}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{words.formChoice}</span>
          <Select
            disabled={disabled}
            value={values.form}
            onChange={(e) => changeIdentity(values.species, e.target.value)}
          >
            {!formChoice && <option value={values.form}>#{values.form}</option>}
            {speciesChoice?.forms.map((choice, id) => (
              <option key={id} value={id}>
                {choice.name[lang] || words.defaultForm}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{words.gender}</span>
          <Select
            disabled={disabled}
            value={values.gender}
            onChange={(e) => setValues({ ...values, gender: e.target.value })}
          >
            {Array.from(
              new Set([Number(values.gender), ...(formChoice?.genders ?? [])]),
            ).map((gender) => (
              <option
                disabled={!formChoice?.genders.includes(gender)}
                key={gender}
                value={gender}
              >
                {[words.male, words.female, words.genderless][gender] ??
                  `#${gender}`}
              </option>
            ))}
          </Select>
        </label>
        <label className="field save-editor-checkbox">
          <span>{words.useSpeciesName}</span>
          <input
            type="checkbox"
            checked={values.useSpeciesName}
            onChange={(e) =>
              setValues({ ...values, useSpeciesName: e.target.checked })
            }
          />
        </label>
        <p className="save-editor-note">{words.identityNote}</p>
        {(
          [
            ["nickname", words.nickname, pokemon.limits.nickname],
            ["ot", words.originalTrainer, pokemon.limits.trainerName],
          ] as const
        ).map(([key, label, max]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input
              value={values[key]}
              disabled={key === "nickname" && values.useSpeciesName}
              maxLength={max}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
          </label>
        ))}
        {(
          [
            ["level", words.level, 100],
            [
              "friendship",
              pokemon.egg ? words.hatchCounter : words.friendship,
              255,
            ],
            ["tid", words.tid, 65535],
            ["sid", words.sid, 65535],
          ] as const
        ).map(([key, label, max]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input
              inputMode="numeric"
              type="number"
              min={key === "level" ? 1 : 0}
              max={max}
              step={1}
              value={values[key]}
              maxLength={String(max).length}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
          </label>
        ))}
      </fieldset>
      <fieldset disabled={disabled} className="save-editor-fields">
        <legend>
          {words.ivs} / {words.evs}
        </legend>
        {(
          [
            ["nature", words.nature, attributeChoices.natures],
            ...(pokemon.canStatAlignment
              ? [
                  [
                    "statAlignment",
                    words.statNature,
                    attributeChoices.natures,
                  ] as const,
                ]
              : []),
            ["abilityIndex", words.ability, abilityChoices],
            ["heldItem", words.item, attributeChoices.items],
          ] as const
        ).map(([key, label, choices]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <Select
              disabled={disabled}
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            >
              {!choices[Number(values[key])] && (
                <option value={values[key]}>#{values[key]}</option>
              )}
              {choices.map((choice, id) => (
                <option key={id} value={id}>
                  {choice[lang]}
                  {key === "abilityIndex" ? ` (${id + 1})` : ""}
                </option>
              ))}
            </Select>
          </label>
        ))}
        <p className="save-editor-note">{words.pidChangeNote}</p>
        {statNames.flatMap((stat, index) =>
          (["ivs", "evs"] as const).map((key) => (
            <label className="field" key={`${key}-${index}`}>
              <span>
                {stat} · {words[key]}
              </span>
              <input
                inputMode="numeric"
                type="number"
                min={0}
                max={key === "ivs" ? pokemon.limits.iv : pokemon.limits.ev}
                step={1}
                value={values[key][index]}
                maxLength={3}
                onChange={(e) =>
                  setValues({
                    ...values,
                    [key]: values[key].map((value, i) =>
                      i === index ? e.target.value : value,
                    ),
                  })
                }
              />
            </label>
          )),
        )}
      </fieldset>
      <fieldset disabled={disabled} className="save-editor-fields">
        <legend>{words.moves}</legend>
        {values.moves.map((_, index) => (
          <div className="save-pokemon-move-edit" key={index}>
            <label className="field">
              <span>
                {words.moves} {index + 1}
              </span>
              <Select
                disabled={disabled}
                value={values.moves[index]}
                onChange={(e) =>
                  setValues({
                    ...values,
                    moves: values.moves.map((value, i) =>
                      i === index ? e.target.value : value,
                    ),
                    movePp: values.movePp.map((value, i) =>
                      i === index ? "0" : value,
                    ),
                    movePpUps: values.movePpUps.map((value, i) =>
                      i === index && e.target.value === "0" ? "0" : value,
                    ),
                  })
                }
              >
                {moveChoices.map((move, id) => (
                  <option key={id} value={id}>
                    {move.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>PP</span>
              <input
                type="number"
                min={0}
                max={
                  moveChoices[Number(values.moves[index])]?.maxPp[
                    Number(values.movePpUps[index])
                  ] ?? 0
                }
                step={1}
                inputMode="numeric"
                value={values.movePp[index]}
                maxLength={3}
                onChange={(e) =>
                  setValues({
                    ...values,
                    movePp: values.movePp.map((value, i) =>
                      i === index ? e.target.value : value,
                    ),
                  })
                }
              />
            </label>
            <label className="field">
              <span>{words.ppUps}</span>
              <Select
                disabled={disabled || values.moves[index] === "0"}
                value={values.movePpUps[index]}
                onChange={(e) => {
                  const ups = e.target.value;
                  const maximum =
                    moveChoices[Number(values.moves[index])]?.maxPp[
                      Number(ups)
                    ] ?? 0;
                  setValues({
                    ...values,
                    movePpUps: values.movePpUps.map((value, i) =>
                      i === index ? ups : value,
                    ),
                    movePp: values.movePp.map((value, i) =>
                      i === index
                        ? String(Math.min(Number(value) || 0, maximum))
                        : value,
                    ),
                  });
                }}
              >
                {[0, 1, 2, 3].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </label>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                setValues({
                  ...values,
                  movePp: values.movePp.map((value, i) =>
                    i === index
                      ? String(
                          moveChoices[Number(values.moves[index])]?.maxPp[
                            Number(values.movePpUps[index])
                          ] ?? 0,
                        )
                      : value,
                  ),
                })
              }
            >
              {words.healPp}
            </button>
          </div>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
      <p className="save-editor-note">{words.workingCopyNote}</p>
      <div className="save-editor-toolbar">
        <button type="button" disabled={disabled} onClick={() => void submit()}>
          {words.applyPokemon}
        </button>
      </div>
    </details>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { saveEditorResources } from "./locales";
import { standaloneWords } from "./standaloneWords";
import type {
  GbPokemonEdit,
  StandalonePokemonReport,
} from "./standalonePokemon";

export function StandaloneGbEditor({
  report,
  disabled,
  onApply,
}: {
  report: StandalonePokemonReport;
  disabled: boolean;
  onApply(edit: GbPokemonEdit): Promise<void>;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = standaloneWords[lang],
    common = saveEditorResources[lang],
    p = report.pokemon;
  const [draft, setDraft] = useState({
    species: String(p.species),
    nickname: p.nickname,
    ot: p.ot,
    tid: String(p.tid),
    level: String(p.level),
    friendship: String(p.friendship),
    heldItem: String(p.heldItem),
    dvs: [1, 2, 5, 3].map((i) => String(p.ivs[i])),
    statExperience: [0, 1, 2, 5, 3].map((i) => String(p.evs[i])),
    moves: p.moveIds.map(String),
    movePp: p.movePp.map(String),
    movePpUps: p.movePpUps.map(String),
  });
  const [error, setError] = useState(false);
  const integer = (value: string, max: number, min = 0) => {
    if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max)
      throw Error("range");
    return Number(value);
  };
  const statNames = [
    common.hp,
    common.attack,
    common.defense,
    common.speed,
    words.special,
  ];
  const submit = async () => {
    setError(false);
    try {
      for (const [name, max] of [
        [draft.nickname, p.limits.nickname],
        [draft.ot, p.limits.trainerName],
      ] as const)
        if (!name.length || name.length > max || /\p{Cc}/u.test(name))
          throw Error("name");
      const moves = draft.moves.map((v) => integer(v, p.limits.move));
      const movePpUps = draft.movePpUps.map((v) => integer(v, 3));
      const movePp = draft.movePp.map((v, i) =>
        integer(
          v,
          Math.min(63, report.moveChoices[moves[i]]?.maxPp[movePpUps[i]] ?? 0),
        ),
      );
      if (
        moves.some(
          (move, i) => move === 0 && (movePp[i] !== 0 || movePpUps[i] !== 0),
        )
      )
        throw Error("move");
      await onApply({
        species: integer(
          draft.species,
          report.attributeChoices.species.at(-1)?.id ?? 0,
          1,
        ),
        nickname: draft.nickname,
        ot: draft.ot,
        tid: integer(draft.tid, 65535),
        level: integer(draft.level, 100, 1),
        dvs: draft.dvs.map((v) => integer(v, 15)),
        statExperience: draft.statExperience.map((v) => integer(v, 65535)),
        moves,
        movePp,
        movePpUps,
        friendship:
          report.generation === 2 ? integer(draft.friendship, 255) : null,
        heldItem:
          report.generation === 2
            ? integer(draft.heldItem, report.attributeChoices.items.length - 1)
            : null,
      });
    } catch {
      setError(true);
    }
  };
  return (
    <details className="save-pokemon-editor">
      <summary>{common.editPokemon}</summary>
      <p className="save-editor-note">{words.gbNote}</p>
      <div className="save-editor-fields">
        <label className="field">
          <span>{common.species}</span>
          <Select
            disabled={disabled}
            value={draft.species}
            onChange={(e) => setDraft({ ...draft, species: e.target.value })}
          >
            {report.attributeChoices.species.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.name[lang]}
              </option>
            ))}
          </Select>
        </label>
        {(
          [
            ["nickname", common.nickname, p.limits.nickname],
            ["ot", common.trainerName, p.limits.trainerName],
          ] as const
        ).map(([key, label, max]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input
              disabled={disabled}
              value={draft[key]}
              maxLength={max}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </label>
        ))}
        {(
          [
            ["level", common.level, 1, 100],
            ["tid", "TID", 0, 65535],
            ...(report.generation === 2
              ? ([
                  [
                    "friendship",
                    p.egg ? common.hatchCounter : common.friendship,
                    0,
                    255,
                  ],
                ] as const)
              : []),
          ] as const
        ).map(([key, label, min, max]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input
              type="number"
              disabled={disabled}
              min={min}
              max={max}
              step={1}
              value={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </label>
        ))}
        {report.generation === 2 && (
          <label className="field">
            <span>{common.item}</span>
            <Select
              disabled={disabled}
              value={draft.heldItem}
              onChange={(e) => setDraft({ ...draft, heldItem: e.target.value })}
            >
              {report.attributeChoices.items.map((name, id) => (
                <option key={id} value={id}>
                  {name[lang]}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
      {(["dvs", "statExperience"] as const).map((key) => (
        <div key={key}>
          <h4>{key === "dvs" ? words.dvs : words.statExperience}</h4>
          <div className="save-editor-fields">
            {draft[key].map((value, i) => (
              <label className="field" key={i}>
                <span>{statNames[key === "dvs" ? i + 1 : i]}</span>
                <input
                  type="number"
                  disabled={disabled}
                  min={0}
                  max={key === "dvs" ? 15 : 65535}
                  step={1}
                  value={value}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [key]: draft[key].map((old, index) =>
                        index === i ? e.target.value : old,
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <h4>{common.moves}</h4>
      {draft.moves.map((move, i) => (
        <div className="save-editor-fields" key={i}>
          <label className="field">
            <span>
              {common.moves} {i + 1}
            </span>
            <Select
              disabled={disabled}
              value={move}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  moves: draft.moves.map((old, index) =>
                    index === i ? e.target.value : old,
                  ),
                })
              }
            >
              {report.moveChoices.map((choice, id) => (
                <option key={id} value={id}>
                  {choice.name[lang]}
                </option>
              ))}
            </Select>
          </label>
          {(["movePp", "movePpUps"] as const).map((key) => (
            <label className="field" key={key}>
              <span>
                {key === "movePp" ? "PP" : common.ppUps} {i + 1}
              </span>
              <input
                type="number"
                disabled={disabled}
                min={0}
                max={
                  key === "movePp"
                    ? Math.min(
                        63,
                        report.moveChoices[Number(move)]?.maxPp[
                          Number(draft.movePpUps[i])
                        ] ?? 0,
                      )
                    : 3
                }
                step={1}
                value={draft[key][i]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    [key]: draft[key].map((old, index) =>
                      index === i ? e.target.value : old,
                    ),
                  })
                }
              />
            </label>
          ))}
        </div>
      ))}
      {error && (
        <p className="save-editor-error" role="alert">
          {words.gbValueError}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button type="button" disabled={disabled} onClick={() => void submit()}>
          {common.applyPokemon}
        </button>
      </div>
    </details>
  );
}

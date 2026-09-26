import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PokemonEntry, PokemonPosition, PokemonRawEdit } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonTrainingEditor({
  training,
  generation,
  position,
  disabled,
  onApply,
}: {
  training: PokemonEntry["training"];
  generation: number;
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { t } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [contest, setContest] = useState((training.contest ?? []).map(String));
  const [hyper, setHyper] = useState(training.hyper ?? []);
  const contestChanged =
    training.canEditContest &&
    contest.some((v, i) => v !== String(training.contest?.[i]));
  const hyperChanged = hyper.some((v, i) => v !== training.hyper?.[i]);
  const valid =
    !contestChanged ||
    contest.every((v) => /^\d+$/.test(v) && Number(v) <= 255);
  const statNames = [
    words.hp,
    words.attack,
    words.defense,
    words.spAttack,
    words.spDefense,
    words.speed,
  ];
  const contestNames = [
    words.contestCool,
    words.contestBeauty,
    words.contestCute,
    generation <= 5 ? words.contestSmart : words.contestClever,
    words.contestTough,
    words.contestSheen,
  ];
  if (!training.contest && !training.hyper) return null;
  return (
    <details className="save-pokemon-editor">
      <summary>{words.trainingTitle}</summary>
      {training.contest && (
        <>
          <fieldset
            className="save-editor-fields"
            disabled={disabled || !training.canEditContest}
          >
            <legend>{words.contestTitle}</legend>
            {contest.map((value, index) => (
              <label className="field" key={index}>
                <span>{contestNames[index]}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={255}
                  step={1}
                  value={value}
                  onChange={(e) =>
                    setContest((previous) =>
                      previous.map((v, i) =>
                        i === index ? e.target.value : v,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </fieldset>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={disabled || !training.canEditContest}
              onClick={() => setContest(Array(6).fill("255"))}
            >
              {words.maxContest}
            </button>
            <button
              type="button"
              disabled={disabled || !training.canEditContest}
              onClick={() => setContest(Array(6).fill("0"))}
            >
              {words.clearContest}
            </button>
          </div>
        </>
      )}
      {training.hyper && (
        <>
          <p className="save-editor-note">{words.hyperNote}</p>
          <fieldset className="save-editor-fields" disabled={disabled}>
            <legend>{words.hyperTitle}</legend>
            {hyper.map((value, index) => (
              <label className="field save-editor-checkbox" key={index}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setHyper((previous) =>
                      previous.map((v, i) =>
                        i === index ? e.target.checked : v,
                      ),
                    )
                  }
                />
                <span>{statNames[index]}</span>
              </label>
            ))}
          </fieldset>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setHyper(Array(6).fill(true))}
            >
              {words.allHyper}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setHyper(Array(6).fill(false))}
            >
              {words.clearHyper}
            </button>
          </div>
        </>
      )}
      {!valid && (
        <p className="save-editor-error" role="alert">
          {words.pokemonValueError}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled || (!contestChanged && !hyperChanged)}
          onClick={() => {
            setContest((training.contest ?? []).map(String));
            setHyper(training.hyper ?? []);
          }}
        >
          {words.revertTraining}
        </button>
        <button
          type="button"
          disabled={disabled || !valid || (!contestChanged && !hyperChanged)}
          onClick={() =>
            void onApply({
              ...position,
              action: "training",
              training: {
                contest: contestChanged ? contest.map(Number) : undefined,
                hyper: hyperChanged ? hyper : undefined,
              },
            })
          }
        >
          {words.applyTraining}
        </button>
      </div>
    </details>
  );
}

// SPDX-License-Identifier: GPL-3.0-or-later
import { useContext, useMemo, type ComponentProps } from "react";
import type { MoveChoice } from "./domain";
import { PokemonSelect } from "./PokemonSelect";
import { PokemonLiveHintsContext } from "./pokemonLiveHintsContext";
import { moveCandidates } from "./pokemonMoveCandidates";
import { moveHintWords } from "./pokemonHintsPreview";
export function PokemonMoveSelect({
  choices,
  lang,
  ...props
}: Omit<ComponentProps<typeof PokemonSelect>, "children"> & {
  choices: MoveChoice[];
  lang: "zh" | "en" | "ja";
}) {
  const live = useContext(PokemonLiveHintsContext);
  const learned =
    live.status === "ready" && live.hints?.parsed
      ? (live.hints.learnableMoves ?? undefined)
      : undefined;
  const candidates = useMemo(
    () => moveCandidates(choices, String(props.value ?? ""), lang, learned),
    [choices, props.value, lang, learned],
  );
  const highlighted = useMemo(
    () =>
      new Set(candidates.filter((v) => v.learnable).map((v) => String(v.id))),
    [candidates],
  );
  const option = (v: (typeof candidates)[number]) => (
    <option
      key={v.id}
      value={v.id}
      disabled={v.choice.selectable === false}
      data-source-invalid={v.choice.selectable === false || undefined}
    >
      {v.choice.name[lang]}
    </option>
  );
  return (
    <PokemonSelect {...props} highlightedValues={highlighted}>
      {learned ? (
        <optgroup label={moveHintWords[lang].learnable}>
          {candidates.filter((v) => v.learnable).map(option)}
        </optgroup>
      ) : null}
      {learned ? (
        <optgroup label={moveHintWords[lang].other}>
          {candidates.filter((v) => !v.learnable).map(option)}
        </optgroup>
      ) : (
        candidates.map(option)
      )}
    </PokemonSelect>
  );
}

// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from "react";
import type { PokemonEntry, PokemonRawEdit } from "./domain";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { markingColors, nextMarking } from "./drawSettings";
import "./PokemonMarkingsEditor.css";
const words = {
  zh: {
    title: "宝可梦标记",
    apply: "应用标记",
    reset: "还原标记",
    none: "无",
    on: "已标记",
    blue: "蓝色",
    pink: "粉色",
    invalid: "原始保留值",
    failed: "标记设置不可用",
    note: "点击形状切换标记状态，应用后写入工作副本。",
    circle: "圆形",
    triangle: "三角形",
    square: "正方形",
    heart: "心形",
    star: "星形",
    diamond: "菱形",
  },
  en: {
    title: "Pokémon markings",
    apply: "Apply markings",
    reset: "Reset markings",
    none: "None",
    on: "Marked",
    blue: "Blue",
    pink: "Pink",
    invalid: "Original reserved value",
    failed: "Marking settings unavailable",
    note: "Click a shape to cycle its state, then apply to the working copy.",
    circle: "Circle",
    triangle: "Triangle",
    square: "Square",
    heart: "Heart",
    star: "Star",
    diamond: "Diamond",
  },
  ja: {
    title: "ポケモンのマーキング",
    apply: "マーキングを適用",
    reset: "マーキングを戻す",
    none: "なし",
    on: "マーク済み",
    blue: "青",
    pink: "ピンク",
    invalid: "元の予約値",
    failed: "マーキング設定を使用できません",
    note: "図形をクリックして状態を切り替え、作業用コピーに適用します。",
    circle: "丸",
    triangle: "三角",
    square: "四角",
    heart: "ハート",
    star: "星",
    diamond: "ひし形",
  },
};
const symbols: Record<string, string> = {
  circle: "●",
  triangle: "▲",
  square: "■",
  heart: "♥",
  star: "★",
  diamond: "◆",
};
export function PokemonMarkingsEditor({
  pokemon,
  lang,
  disabled,
  onApply,
}: {
  pokemon: PokemonEntry;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const info = pokemon.markings;
  const [values, setValues] = useState(() => info?.values.slice() ?? []);
  const json = useSaveSettingsJson();
  let colors: ReturnType<typeof markingColors> | undefined;
  try {
    colors = markingColors(json);
  } catch {
    /* Core also rejects invalid settings. */
  }
  if (!info) return null;
  const w = words[lang];
  const changed = values.some((value, index) => value !== info.values[index]);
  return (
    <details className="save-pokemon-editor">
      <summary>{w.title}</summary>
      <p className="save-editor-note">{w.note}</p>
      {!colors ? <p role="alert">{w.failed}</p> : null}
      <fieldset className="save-markings" disabled={disabled || !colors}>
        <legend>{w.title}</legend>
        {info.shapes.map((shape, index) => {
          const value = values[index];
          const name = w[shape as keyof typeof w] ?? shape;
          const state =
            value === 0
              ? w.none
              : !info.colored
                ? w.on
                : value === 1
                  ? w.blue
                  : value === 2
                    ? w.pink
                    : w.invalid;
          return (
            <button
              type="button"
              key={shape}
              aria-label={`${name}: ${state}`}
              aria-pressed={value !== 0}
              onClick={() =>
                setValues((previous) =>
                  previous.map((current, i) =>
                    i === index ? nextMarking(current, info.colored) : current,
                  ),
                )
              }
            >
              <span
                aria-hidden="true"
                className="save-marking-symbol"
                data-active={value !== 0}
                style={{
                  color:
                    info.colored && value === 1
                      ? colors?.blue
                      : info.colored && value === 2
                        ? colors?.pink
                        : undefined,
                }}
              >
                {symbols[shape]}
              </span>
              <span>{name}</span>
              <span className="save-marking-state">{state}</span>
            </button>
          );
        })}
      </fieldset>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled || !colors || !changed}
          onClick={() =>
            void onApply({
              box: pokemon.box,
              slot: pokemon.slot,
              action: "markings",
              markings: values.slice(),
            })
          }
        >
          {w.apply}
        </button>
        <button
          type="button"
          disabled={disabled || !changed}
          onClick={() => setValues(info.values.slice())}
        >
          {w.reset}
        </button>
      </div>
    </details>
  );
}

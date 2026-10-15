// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText, OriginCatalog } from "./domain";

export interface BallBrowserCatalog {
  legalFirst: boolean;
  currentBall: number;
  pokeBall: number;
  colorBall: number;
  choices: {
    id: number;
    name: LocalizedText;
    legal: boolean;
    storedValue: number;
  }[];
}

const integer = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const localized = (v: unknown) =>
  object(v) &&
  ["zh", "en", "ja"].every(
    (lang) => typeof v[lang] === "string" && v[lang].length > 0,
  );

export function originPreviewBall(
  previous: { version: number; ball: number },
  requested: { version: number; ball: number },
  storedValue: number,
) {
  // Reading a directory must retain an existing unlisted/raw value. A deliberate
  // ball or version change follows the Core setter's actual result instead.
  return previous.version === requested.version &&
    previous.ball === requested.ball
    ? previous.ball
    : storedValue;
}

export function parseOriginCatalog(value: unknown): OriginCatalog {
  if (!object(value) || !integer(value.version, 255))
    throw new Error("Invalid origin catalog.");
  for (const [key, max] of [
    ["games", 255],
    ["balls", 255],
    ["metLocations", 65535],
    ["eggLocations", 65535],
  ] as const) {
    const list = value[key];
    if (
      !Array.isArray(list) ||
      list.length > max + 1 ||
      list.some(
        (c) => !object(c) || !integer(c.id, max) || !localized(c.name),
      ) ||
      new Set(list.map((c) => c.id)).size !== list.length
    )
      throw new Error("Invalid origin choices.");
  }
  const browser = value.ballBrowser;
  if (
    !object(browser) ||
    typeof browser.legalFirst !== "boolean" ||
    !integer(browser.currentBall, 255) ||
    !integer(browser.pokeBall, 255) ||
    !integer(browser.colorBall, 255) ||
    !Array.isArray(browser.choices) ||
    browser.choices.length > 255
  )
    throw new Error("Invalid ball browser.");
  const ids = new Set<number>();
  let previous = 0;
  let unverified = false;
  for (const choice of browser.choices) {
    if (
      !object(choice) ||
      !integer(choice.id, browser.choices.length) ||
      choice.id === 0 ||
      ids.has(choice.id) ||
      !localized(choice.name) ||
      typeof choice.legal !== "boolean" ||
      !integer(choice.storedValue, 255)
    )
      throw new Error("Invalid ball browser choice.");
    if (browser.legalFirst) {
      if (unverified && choice.legal)
        throw new Error("Invalid legal ball order.");
      if (!choice.legal && !unverified) previous = 0;
      unverified ||= !choice.legal;
    }
    if (choice.id <= previous) throw new Error("Invalid ball ID order.");
    previous = choice.id;
    ids.add(choice.id);
  }
  return value as unknown as OriginCatalog;
}

export const ballBrowserWords = {
  zh: {
    title: "图示选择球种",
    legal: "球种检查通过",
    other: "球种检查未通过",
    note: "按当前来源版本和球种检查，可选择任意球种。此结果不代表整只宝可梦合法；应用后写入工作副本。",
    poke: "恢复精灵球",
    color: "按颜色推荐",
    loading: "正在检查球种…",
    error: "球种读取失败，请重新读取。",
  },
  en: {
    title: "Choose a ball by image",
    legal: "Ball check passed",
    other: "Ball check did not pass",
    note: "Checked against the current origin and ball. Every ball remains selectable. This does not establish full Pokémon legality. Apply to update the working copy.",
    poke: "Reset to Poké Ball",
    color: "Suggest by color",
    loading: "Checking balls…",
    error: "Could not read balls. Read again.",
  },
  ja: {
    title: "画像からボールを選ぶ",
    legal: "ボール判定に適合",
    other: "ボール判定に不適合",
    note: "現在の出身バージョンとボールに基づく判定です。すべて選択できます。ポケモン全体の合法性を保証するものではありません。適用すると作業用コピーを更新します。",
    poke: "モンスターボールに戻す",
    color: "色から提案",
    loading: "ボールを確認中…",
    error: "ボールを読み込めませんでした。再読み込みしてください。",
  },
};

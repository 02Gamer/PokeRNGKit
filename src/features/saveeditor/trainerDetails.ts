// SPDX-License-Identifier: GPL-3.0-or-later
import type { OriginChoice } from "./domain";

export interface TrainerDetailsCatalog {
  language: number;
  originalGender: number;
  languages: OriginChoice[];
  maxNameLength: number;
  handlingName: string | null;
  handlingGender: number | null;
  handler: number | null;
  handlingLanguage: number | null;
  handlingLanguages: OriginChoice[];
  originRegion: {
    country: number;
    region: number;
    consoleRegion: number;
    countries: OriginChoice[];
    regions: { country: number; choices: OriginChoice[] }[];
    consoles: OriginChoice[];
  } | null;
  battleVersion: number | null;
  battleVersions: OriginChoice[];
  obedienceLevel: number | null;
  suggestedObedienceLevel: number | null;
}
export interface TrainerDetailsEdit {
  action: "values" | "suggestObedience";
  language?: number;
  originalGender?: number;
  handlingName?: string;
  handlingGender?: number;
  handler?: number;
  handlingLanguage?: number;
  country?: number;
  region?: number;
  consoleRegion?: number;
  battleVersion?: number;
  obedienceLevel?: number;
}
export function trainerDetailsDraft(c: TrainerDetailsCatalog) {
  return {
    language: String(c.language),
    originalGender: String(c.originalGender),
    handlingName: c.handlingName ?? "",
    handlingGender: String(c.handlingGender ?? 0),
    handler: String(c.handler ?? 0),
    handlingLanguage: String(c.handlingLanguage ?? 0),
    country: String(c.originRegion?.country ?? 0),
    region: String(c.originRegion?.region ?? 0),
    consoleRegion: String(c.originRegion?.consoleRegion ?? 0),
    battleVersion: String(c.battleVersion ?? 0),
    obedienceLevel: String(c.obedienceLevel ?? 0),
  };
}
export type TrainerDetailsDraft = ReturnType<typeof trainerDetailsDraft>;
export function trainerDetailsValues(
  c: TrainerDetailsCatalog,
  d: TrainerDetailsDraft,
): TrainerDetailsEdit | undefined {
  const original = trainerDetailsDraft(c);
  const edit: TrainerDetailsEdit = { action: "values" };
  const choices = {
    language: c.languages,
    originalGender: [0, 1],
    handlingGender: c.handlingGender === null ? [] : [0, 1],
    handler: c.handler === null ? [] : [0, 1],
    handlingLanguage: c.handlingLanguages,
    country: c.originRegion?.countries ?? [],
    region:
      c.originRegion?.regions.find((r) => r.country === Number(d.country))
        ?.choices ?? [],
    consoleRegion: c.originRegion?.consoles ?? [],
    battleVersion: c.battleVersions,
  };
  for (const key of Object.keys(choices) as (keyof typeof choices)[]) {
    if (d[key] === original[key]) continue;
    const value = Number(d[key]);
    if (
      !/^\d+$/.test(d[key]) ||
      !choices[key].some(
        (choice) => (typeof choice === "number" ? choice : choice.id) === value,
      )
    )
      throw Error("Invalid trainer detail selection");
    edit[key] = value;
  }
  if (
    d.country !== original.country &&
    !choices.region.some((choice) => choice.id === Number(d.region))
  )
    throw Error("Invalid original subregion");
  if (d.handlingName !== original.handlingName) {
    if (
      c.handlingName === null ||
      d.handlingName.length > c.maxNameLength ||
      d.handlingName.includes("\0")
    )
      throw Error("Invalid handling trainer name");
    edit.handlingName = d.handlingName;
    if (!d.handlingName.trim()) {
      edit.handler = 0;
      edit.handlingGender = 0;
    }
  }
  if (
    d.handler !== original.handler &&
    d.handler === "1" &&
    !d.handlingName.trim()
  )
    throw Error("Handling trainer requires a name");
  if (d.obedienceLevel !== original.obedienceLevel) {
    if (c.obedienceLevel === null || !/^[\d ]{0,3}$/.test(d.obedienceLevel))
      throw Error("Invalid obedience mask");
    edit.obedienceLevel = Number(d.obedienceLevel.replaceAll(" ", "") || "0");
  }
  return Object.keys(edit).length > 1 ? edit : undefined;
}
export const trainerDetailsWords = {
  zh: {
    title: "训练家与来源信息",
    load: "读取训练家信息",
    language: "宝可梦语言",
    originalGender: "原训练家性别",
    handlingName: "其他训练家姓名",
    handlingGender: "其他训练家性别",
    handler: "当前持有者",
    original: "原训练家",
    handling: "其他训练家",
    handlingLanguage: "其他训练家语言",
    country: "原始国家／地区",
    region: "原始省／州",
    consoleRegion: "原始主机地区",
    battleVersion: "对战版本",
    obedienceLevel: "服从等级",
    suggested: "使用建议服从等级",
    male: "男",
    female: "女",
    note: "修改后请应用到工作副本。切换语言会重新编码姓名，早期格式中不支持的字符可能被截断。清空其他训练家姓名会恢复为原训练家持有。服从等级沿用 PKHeX 的三位十进制输入，保存为一字节。",
    apply: "应用训练家信息",
    revert: "还原输入",
    error: "训练家信息无效或无法写入，请检查输入。",
  },
  en: {
    title: "Trainer and origin details",
    load: "Read trainer details",
    language: "Pokémon language",
    originalGender: "Original trainer gender",
    handlingName: "Handling trainer name",
    handlingGender: "Handling trainer gender",
    handler: "Current handler",
    original: "Original trainer",
    handling: "Handling trainer",
    handlingLanguage: "Handling trainer language",
    country: "Origin country",
    region: "Origin subregion",
    consoleRegion: "Origin console region",
    battleVersion: "Battle version",
    obedienceLevel: "Obedience level",
    suggested: "Use suggested obedience level",
    male: "Male",
    female: "Female",
    note: "Apply edits to the working copy. Changing language re-encodes names; unsupported characters in early formats may be truncated. Clearing the handling trainer name restores the original handler. Obedience uses PKHeX's three-digit decimal input and is saved as one byte.",
    apply: "Apply trainer details",
    revert: "Revert inputs",
    error:
      "Trainer details are invalid or could not be written. Check the inputs.",
  },
  ja: {
    title: "トレーナーと出身情報",
    load: "トレーナー情報を読み込む",
    language: "ポケモンの言語",
    originalGender: "親の性別",
    handlingName: "他のトレーナーの名前",
    handlingGender: "他のトレーナーの性別",
    handler: "現在の持ち主",
    original: "親",
    handling: "別のトレーナー",
    handlingLanguage: "他のトレーナーの言語",
    country: "出身の国・地域",
    region: "出身の地方",
    consoleRegion: "出身の本体地域",
    battleVersion: "対戦バージョン",
    obedienceLevel: "服従レベル",
    suggested: "推奨の服従レベルを使用",
    male: "男",
    female: "女",
    note: "変更を作業コピーに適用してください。言語変更時に名前を再エンコードするため、古い形式で扱えない文字は切り詰められる場合があります。持ち主の名前を空にすると親が現在の持ち主になります。服従レベルは PKHeX と同じ3桁の10進入力を1バイトで保存します。",
    apply: "トレーナー情報を適用",
    revert: "入力を元に戻す",
    error: "トレーナー情報が無効か、書き込めません。入力を確認してください。",
  },
};

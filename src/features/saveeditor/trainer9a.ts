import type { OriginChoice } from "./domain";
import type { Hall6Trash } from "./hall6";
import { tr9Words, type Tr9Image } from "./trainer9";
export interface Tr9aCatalog {
  canEdit: boolean;
  sourceHash: string;
  revision: number;
  name: string;
  nameTrash: string;
  id: number;
  tid: number;
  sid: number;
  tsv: number;
  gender: number;
  language: number;
  money: number;
  royaleRegular: number;
  royaleInfinite: number;
  hours: number;
  minutes: number;
  seconds: number;
  saved: string;
  map: {
    editable: boolean;
    name: string;
    x: string;
    y: string;
    z: string;
    rotation: string;
    quaternion: number[];
  };
  dlc: { surveyPoints: number; streetName: string } | null;
  images: { fileName: string; image: Tr9Image }[];
  remainingScrews: { fieldItem: string; x: number; y: number; z: number }[];
  screwQuantity: number;
  fashion: string[];
  languages: OriginChoice[];
  trashSpecies: OriginChoice[];
  trashLanguages: OriginChoice[];
  specialChars: number[];
}
export interface Tr9aRequest {
  sourceHash: string;
  name: string;
  id: number;
  gender: number;
  language: number;
  money: string;
  royaleRegular: string;
  royaleInfinite: string;
  hours: string;
  minutes: string;
  seconds: string;
  saved: string;
  mapUpdated: boolean;
  mapName: string;
  map: string[];
  surveyPoints?: string;
  streetName?: string;
  operations?: string[];
  idEvents?: { tid: string; sid: string }[];
  nameEvents?: Hall6Trash[];
}
export interface Tr9aConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export interface Tr9aTicket extends Tr9aConfirmation {
  before: Tr9aCatalog;
  result: Tr9aCatalog;
  changedOffsets: number[];
  operations: { key: string; count: number }[];
}
export function supportsTrainer9a(format: string) {
  return format === "SAV9ZA";
}
export function tr9aDraft(c: Tr9aCatalog): Tr9aRequest {
  return {
    sourceHash: c.sourceHash,
    name: c.name,
    id: c.id,
    gender: c.gender,
    language: c.language,
    money: String(c.money),
    royaleRegular: String(c.royaleRegular),
    royaleInfinite: String(c.royaleInfinite),
    hours: String(c.hours),
    minutes: String(c.minutes),
    seconds: String(c.seconds),
    saved: c.saved,
    mapUpdated: false,
    mapName: c.map.name,
    map: [c.map.x, c.map.y, c.map.z, c.map.rotation],
    ...(c.dlc
      ? {
          surveyPoints: String(c.dlc.surveyPoints),
          streetName: c.dlc.streetName,
        }
      : {}),
    operations: [],
  };
}
export function tr9aRequest(c: Tr9aCatalog, d: Tr9aRequest): Tr9aRequest {
  if (
    !c.canEdit ||
    d.sourceHash !== c.sourceHash ||
    d.name.length > 12 ||
    !Number.isInteger(d.id) ||
    d.id < 0 ||
    d.id > 0xffffffff ||
    ![0, 1].includes(d.gender) ||
    !c.languages.some((v) => v.id === d.language)
  )
    throw new Error("Invalid Trainer9a fields");
  for (const [value, width] of [
    [d.money, 7],
    [d.royaleRegular, 7],
    [d.royaleInfinite, 7],
    [d.hours, 5],
    [d.minutes, 2],
    [d.seconds, 2],
  ] as const)
    if (!new RegExp(`^[0-9]{0,${width}}$`).test(value))
      throw new Error("Invalid Trainer9a numeric text");
  if (
    d.hours.length === 0 ||
    Number(d.hours) > 65535 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(d.saved) ||
    d.saved < "1753-01-01T00:00:00" ||
    d.saved > "4095-12-31T23:59:59"
  )
    throw new Error("Invalid Trainer9a time");
  if (
    d.mapUpdated &&
    (!c.map.editable ||
      d.mapName.length > 32 ||
      d.map.length !== 4 ||
      d.map.some(
        (v) =>
          !/^[-+]?\d+(?:\.\d{1,6})?$/.test(v) ||
          !Number.isFinite(Number(v)) ||
          Math.abs(Number(v)) > 99999999,
      ))
  )
    throw new Error("Invalid Trainer9a map");
  if (
    c.dlc
      ? d.surveyPoints === undefined ||
        !/^\d{0,7}$/.test(d.surveyPoints) ||
        d.streetName === undefined ||
        d.streetName.length > 18
      : d.surveyPoints !== undefined || d.streetName !== undefined
  )
    throw new Error("Invalid Trainer9a DLC");
  if (
    (d.operations?.length ?? 0) > 32 ||
    d.operations?.some(
      (v) =>
        !["technicalMachines", "screws", "resetAndCollectScrews"].includes(v),
    ) ||
    (d.idEvents?.length ?? 0) > 512 ||
    (d.nameEvents?.length ?? 0) > 512
  )
    throw new Error("Invalid Trainer9a operations");
  for (const event of d.idEvents ?? []) {
    if (!/^\d{0,6}$/.test(event.tid) || !/^\d{0,4}$/.test(event.sid))
      throw new Error("Invalid Trainer9a ID event");
  }
  for (const event of d.nameEvents ?? []) {
    if (
      !event ||
      !["prepare", "clear", "text", "hex", "layer"].includes(event.action)
    )
      throw new Error("Invalid Trainer9a name action");
    if (
      event.action === "layer" &&
      (event.species === undefined ||
        !c.trashSpecies.some((v) => v.id === event.species) ||
        event.language === undefined ||
        !c.trashLanguages.some((v) => v.id === event.language) ||
        event.generation === undefined ||
        !Number.isInteger(event.generation) ||
        event.generation < 0 ||
        event.generation > 100 ||
        !["zh", "en", "ja"].includes(event.uiLanguage ?? ""))
    )
      throw new Error("Invalid Trainer9a name layer");
    if (
      (event.action === "text" &&
        (event.text === undefined || event.text.length > 12)) ||
      (event.action === "hex" && !/^[a-fA-F0-9]{52}$/.test(event.hex ?? ""))
    )
      throw new Error("Invalid Trainer9a name bytes");
  }
  return structuredClone(d);
}
export function tr9aConfirmation(
  c: Tr9aCatalog,
  t: Tr9aTicket,
): Tr9aConfirmation {
  if (
    !/^trainer9a:\d+$/.test(t.token) ||
    t.sourceHash !== c.sourceHash ||
    t.before.sourceHash !== c.sourceHash ||
    t.result.sourceHash !== t.targetHash ||
    !/^[A-F0-9]{64}$/.test(t.targetHash)
  )
    throw new Error("Stale Trainer9a preview");
  return { token: t.token, sourceHash: t.sourceHash, targetHash: t.targetHash };
}
export function tr9aScrewText(c: Tr9aCatalog) {
  return c.remainingScrews
    .map((v) => `${v.fieldItem} at (${v.x}, ${v.y}, ${v.z})`)
    .join("\n");
}
export const tr9aWords = {
  zh: {
    ...tr9Words.zh,
    title: "传说 Z-A 训练家",
    specialChars: "特殊字符",
    map: "位置、地图与旋转",
    dlc: "异次元 DLC",
    images: "训练家图片",
    unlocks: "收集操作",
    royaleRegular: "Z-A 对战入场券点数",
    royaleInfinite: "无限 Z-A 对战入场券点数",
    surveyPoints: "异次元调查点数",
    streetName: "街道名称",
    mapName: "地图名称",
    current: "当前图片",
    sbc: "剧情纪念照片",
    initial: "初始图片",
    technicalMachines: "收集全部地面招式机",
    screws: "收集剩余彩色螺丝",
    resetAndCollectScrews: "重置全部螺丝后收集",
    remaining: "剩余彩色螺丝",
    locations: "导出剩余位置",
    quantity: "背包螺丝数量",
    genderReset: "切换性别会重置服装、上身和下身。",
    max: "填入快捷值",
    count: "本次收集数量",
    fashion: "服装原始值",
    invalid: "无法处理 Z-A 训练家信息，请检查字段和预览。",
    stale: "Z-A 训练家预览已失效，请重新预览。",
  },
  en: {
    ...tr9Words.en,
    title: "Legends: Z-A trainer",
    specialChars: "Special characters",
    map: "Position, map and rotation",
    dlc: "Mega Dimension DLC",
    images: "Trainer images",
    unlocks: "Collection operations",
    royaleRegular: "Z-A Royale ticket points",
    royaleInfinite: "Infinite Z-A Royale ticket points",
    surveyPoints: "Hyperspace Survey Points",
    streetName: "Street name",
    mapName: "Map name",
    current: "Current image",
    sbc: "Story photo (SBC)",
    initial: "Initial image",
    technicalMachines: "Collect all overworld TMs",
    screws: "Collect remaining Colorful Screws",
    resetAndCollectScrews: "Reset all screws and collect",
    remaining: "Remaining Colorful Screws",
    locations: "Export remaining locations",
    quantity: "Screws in inventory",
    genderReset: "Changing gender resets clothing, upper body and lower body.",
    max: "Use shortcut value",
    count: "Collected by this operation",
    fashion: "Raw fashion values",
    invalid: "Unable to process the Z-A trainer. Check the fields and preview.",
    stale: "The Z-A trainer preview is stale. Preview again.",
  },
  ja: {
    ...tr9Words.ja,
    title: "Pokémon LEGENDS Z-A のトレーナー",
    specialChars: "特殊文字",
    map: "位置・マップ・回転",
    dlc: "M次元ラッシュ DLC",
    images: "トレーナーの画像",
    unlocks: "収集操作",
    royaleRegular: "Z-A ロワイヤル参加券ポイント",
    royaleInfinite: "無限 Z-A ロワイヤル参加券ポイント",
    surveyPoints: "異次元調査ポイント",
    streetName: "通りの名前",
    mapName: "マップ名",
    current: "現在の画像",
    sbc: "ストーリーの記念写真",
    initial: "初期の画像",
    technicalMachines: "地面のわざマシンをすべて集める",
    screws: "残りのカラフルなネジを集める",
    resetAndCollectScrews: "すべてのネジをリセットして集める",
    remaining: "残りのカラフルなネジ",
    locations: "残りの位置を書き出す",
    quantity: "バッグ内のネジ",
    genderReset: "性別を変更すると服装・上半身・下半身がリセットされます。",
    max: "ショートカット値を設定",
    count: "今回の収集数",
    fashion: "服装の元の値",
    invalid:
      "Z-A のトレーナー情報を処理できません。項目と確認内容を見直してください。",
    stale: "Z-A の確認内容が古くなりました。再度確認してください。",
  },
};

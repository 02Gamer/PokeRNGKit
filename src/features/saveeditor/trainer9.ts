// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
export interface Tr9Choice {
  id: number;
  name: LocalizedText;
}
export interface Tr9Image {
  key: string;
  available: boolean;
  width: number;
  height: number;
  pixels: string | null;
  error: string | null;
}
export interface Tr9Catalog {
  nameTrash?: string;
  tid?: number;
  sid?: number;
  tsv?: number;
  trashSpecies?: Tr9Choice[];
  trashLanguages?: Tr9Choice[];
  canEdit: boolean;
  sourceHash: string;
  revision: number;
  name: string;
  id: number;
  gender: number;
  language: number;
  version: string;
  money: number;
  leaguePoints: number;
  hours: number;
  minutes: number;
  seconds: number;
  enrollment: string;
  saved: string;
  map: {
    editable: boolean;
    x: string;
    y: string;
    z: string;
    rotation: string;
    quaternion: number[];
  };
  blueberry: {
    points: number;
    solo: number;
    group: number;
    throwStyle: number;
    throwStyles: Tr9Choice[];
  } | null;
  images: Tr9Image[];
  languages: Tr9Choice[];
}
export interface Tr9Request {
  idEvents?: { tid: string; sid: string }[];
  nameEvents?: import("./hall6").Hall6Trash[];
  sourceHash: string;
  name: string;
  id: number;
  gender: number;
  language: number;
  version: string;
  money: string;
  leaguePoints: string;
  blueberryPoints: string;
  hours: string;
  minutes: string;
  seconds: string;
  enrollment: string;
  saved: string;
  mapUpdated: boolean;
  map: string[];
  solo?: number;
  group?: number;
  throwStyle?: number;
  operations: string[];
}
export interface Tr9Confirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export interface Tr9Ticket {
  token: string;
  sourceHash: string;
  targetHash: string;
  before: Tr9Catalog;
  result: Tr9Catalog;
  changedOffsets: number[];
  operations: string[];
}
export const supportsTrainer9 = (format: string) => format === "SAV9SV";
export function tr9Draft(c: Tr9Catalog): Tr9Request {
  return {
    sourceHash: c.sourceHash,
    name: c.name,
    id: c.id,
    gender: c.gender,
    language: c.language,
    version: c.version,
    money: String(c.money),
    leaguePoints: String(c.leaguePoints),
    blueberryPoints: String(c.blueberry?.points ?? 0),
    hours: String(c.hours),
    minutes: String(c.minutes),
    seconds: String(c.seconds),
    enrollment: c.enrollment,
    saved: c.saved,
    mapUpdated: false,
    map: [c.map.x, c.map.y, c.map.z, c.map.rotation],
    ...(c.blueberry
      ? {
          solo: c.blueberry.solo,
          group: c.blueberry.group,
          throwStyle: c.blueberry.throwStyle,
        }
      : {}),
    operations: [],
  };
}
export function tr9Request(c: Tr9Catalog, d: Tr9Request): Tr9Request {
  if (
    !c.canEdit ||
    d.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(c.sourceHash) ||
    d.name.length > 12 ||
    !Number.isInteger(d.id) ||
    d.id < 0 ||
    d.id > 0xffffffff ||
    d.gender < 0 ||
    d.gender > 1 ||
    d.operations.length > 32
  )
    throw Error("Invalid Trainer9 fields.");
  for (const [value, width] of [
    [d.money, 7],
    [d.leaguePoints, 7],
    [d.blueberryPoints, 7],
    [d.hours, 5],
    [d.minutes, 2],
    [d.seconds, 2],
  ] as const)
    if (value.length > width || !/^[0-9]*$/.test(value))
      throw Error("Invalid Trainer9 numeric text.");
  return structuredClone(d);
}
export function tr9Confirmation(c: Tr9Catalog, t: Tr9Ticket): Tr9Confirmation {
  if (
    !c.canEdit ||
    t.sourceHash !== c.sourceHash ||
    t.before.sourceHash !== t.sourceHash ||
    t.result.sourceHash !== t.targetHash ||
    !/^[0-9A-F]{64}$/.test(t.targetHash) ||
    !/^trainer9:\d+$/.test(t.token)
  )
    throw Error("Trainer9 preview is stale.");
  return { token: t.token, sourceHash: t.sourceHash, targetHash: t.targetHash };
}
export function tr9Pixels(image: Tr9Image) {
  if (
    !image.available ||
    !image.pixels ||
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0 ||
    image.width * image.height > 4194304
  )
    throw Error("Invalid Trainer9 image.");
  const data = Uint8ClampedArray.from(atob(image.pixels), (c) =>
    c.charCodeAt(0),
  );
  if (data.length !== image.width * image.height * 4)
    throw Error("Invalid Trainer9 pixels.");
  return data;
}
export function tr9Bmp(image: Tr9Image) {
  const pixels = tr9Pixels(image),
    stride = Math.ceil((image.width * 3) / 4) * 4,
    size = 54 + stride * image.height,
    bytes = new Uint8Array(size),
    view = new DataView(bytes.buffer);
  bytes[0] = 66;
  bytes[1] = 77;
  view.setUint32(2, size, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, image.width, true);
  view.setInt32(22, image.height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, stride * image.height, true);
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const source = (y * image.width + x) * 4,
        target = 54 + (image.height - 1 - y) * stride + x * 3;
      bytes[target] = pixels[source + 2];
      bytes[target + 1] = pixels[source + 1];
      bytes[target + 2] = pixels[source];
    }
  return bytes;
}
export const tr9Words = {
  zh: {
    tid: "训练家 ID",
    sid: "秘密 ID",
    trash: "姓名原始字节",
    hex: "原始十六进制",
    clear: "清理尾部字节",
    prepare: "准备姓名字节",
    text: "姓名文本",
    layer: "叠加种类名称",
    species: "宝可梦种类",
    generation: "世代",
    title: "朱／紫训练家",
    read: "读取训练家",
    general: "训练家信息",
    map: "位置与旋转",
    blueberry: "蓝莓学园",
    images: "照片与图标",
    unlocks: "解锁操作",
    name: "训练家姓名",
    id: "完整训练家 ID",
    gender: "性别",
    male: "男",
    female: "女",
    language: "语言",
    game: "游戏",
    money: "金钱",
    lp: "联盟支付点",
    bp: "蓝莓点数",
    hours: "游玩小时",
    minutes: "分钟",
    seconds: "秒",
    enrollment: "入学日期",
    saved: "最后保存日期",
    rotation: "旋转角度",
    solo: "单人任务",
    group: "组队任务",
    throwStyle: "投球风格",
    photo: "当前照片",
    icon: "当前图标",
    initialIcon: "初始图标",
    unavailable: "图片无法显示",
    export: "导出图片",
    clothing: "解锁基础服饰",
    bike: "解锁坐骑能力",
    stakes: "拔除全部封印木桩",
    tm: "解锁全部招式机配方",
    fly: "解锁飞行点",
    throwStyles: "解锁投球风格",
    coaches: "解锁教练",
    legendaries: "激活点心传说宝可梦",
    preview: "预览修改",
    apply: "确认应用",
    cancel: "取消修改",
    changes: "变化文件字节",
    invalid: "无法处理训练家信息，请检查字段和预览。",
    stale: "训练家预览已失效，请重新预览。",
    mapDisabled: "当前坐标无法用上游控件表示，保留原位置。",
  },
  en: {
    tid: "Trainer ID",
    sid: "Secret ID",
    trash: "Name raw bytes",
    hex: "Raw hexadecimal",
    clear: "Clear trailing bytes",
    prepare: "Prepare name bytes",
    text: "Name text",
    layer: "Layer species name",
    species: "Species",
    generation: "Generation",
    title: "Scarlet / Violet trainer",
    read: "Read trainer",
    general: "Trainer",
    map: "Position and rotation",
    blueberry: "Blueberry Academy",
    images: "Photo and icons",
    unlocks: "Unlock operations",
    name: "Trainer name",
    id: "Full Trainer ID",
    gender: "Gender",
    male: "Male",
    female: "Female",
    language: "Language",
    game: "Game",
    money: "Money",
    lp: "League Points",
    bp: "Blueberry Points",
    hours: "Played hours",
    minutes: "Minutes",
    seconds: "Seconds",
    enrollment: "Enrollment date",
    saved: "Last saved date",
    rotation: "Rotation",
    solo: "Solo quests",
    group: "Group quests",
    throwStyle: "Throw style",
    photo: "Current photo",
    icon: "Current icon",
    initialIcon: "Initial icon",
    unavailable: "Image unavailable",
    export: "Export image",
    clothing: "Unlock base clothing",
    bike: "Unlock ride abilities",
    stakes: "Collect all stakes",
    tm: "Unlock all TM recipes",
    fly: "Unlock fly locations",
    throwStyles: "Unlock throw styles",
    coaches: "Unlock coaches",
    legendaries: "Activate Snacksworth legendaries",
    preview: "Preview changes",
    apply: "Apply preview",
    cancel: "Discard changes",
    changes: "Changed save bytes",
    invalid:
      "Unable to process trainer information. Check the fields and preview.",
    stale: "The trainer preview is stale. Preview again.",
    mapDisabled:
      "These coordinates cannot be represented by the source controls. Preserve the original position.",
  },
  ja: {
    tid: "トレーナー ID",
    sid: "裏 ID",
    trash: "名前の元のバイト",
    hex: "元の十六進数",
    clear: "末尾のバイトを消去",
    prepare: "名前のバイトを準備",
    text: "名前の文字列",
    layer: "種族名を重ねる",
    species: "ポケモンの種類",
    generation: "世代",
    title: "スカーレット／バイオレットのトレーナー",
    read: "トレーナーを読み込む",
    general: "トレーナー情報",
    map: "位置と回転",
    blueberry: "ブルーベリー学園",
    images: "写真とアイコン",
    unlocks: "解放操作",
    name: "トレーナー名",
    id: "完全なトレーナー ID",
    gender: "性別",
    male: "男",
    female: "女",
    language: "言語",
    game: "ゲーム",
    money: "お金",
    lp: "リーグペイ",
    bp: "ブルーベリーポイント",
    hours: "プレイ時間",
    minutes: "分",
    seconds: "秒",
    enrollment: "入学日",
    saved: "最終保存日時",
    rotation: "回転角度",
    solo: "ソロクエスト",
    group: "グループクエスト",
    throwStyle: "ボールの投げ方",
    photo: "現在の写真",
    icon: "現在のアイコン",
    initialIcon: "初期アイコン",
    unavailable: "画像を表示できません",
    export: "画像を書き出す",
    clothing: "基本の服を解放",
    bike: "ライド能力を解放",
    stakes: "全ての杭を抜く",
    tm: "全てのわざマシンのレシピを解放",
    fly: "空を飛ぶ地点を解放",
    throwStyles: "投げ方を解放",
    coaches: "講師を解放",
    legendaries: "おやつの伝説ポケモンを有効化",
    preview: "変更を確認",
    apply: "確認した変更を適用",
    cancel: "変更を破棄",
    changes: "変更したセーブのバイト数",
    invalid:
      "トレーナー情報を処理できません。項目と確認内容を見直してください。",
    stale: "確認内容が古くなりました。再度確認してください。",
    mapDisabled: "元のコントロールで表せない座標です。現在の位置を保持します。",
  },
};

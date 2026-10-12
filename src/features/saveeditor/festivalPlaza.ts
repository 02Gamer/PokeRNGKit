// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonEntry } from "./domain";
export interface FestaFacility {
  index: number;
  type: number;
  category: number;
  color: number;
  colorMaximum: number;
  introduced: boolean;
  rawIntroduced: number;
  gender: number;
  trainerName: string;
  messages: number[];
  luckyRank: number;
  luckyPlace: number;
  usedFlags: number;
  usedStats: number;
  npc: number;
  trainerId: string;
  exchangeLeft: number;
}
export interface FestaAgency {
  chosen: boolean;
  invited: boolean;
  packed: number;
  grade: number;
  defeated: number;
  defeatedMaximum: number;
  defeatedPokemon: number;
  trainers: number[];
  hasGlasses: boolean;
  pokemon: PokemonEntry[];
}
export interface FestaCatalog {
  canEdit: boolean;
  sourceHash: string;
  usum: boolean;
  name: string;
  coins: number;
  usedCoins: number;
  totalCoins: number;
  rank: number;
  date: string | null;
  messages: number[];
  phrases: boolean[];
  rewards: number[];
  facilities: FestaFacility[];
  agency: FestaAgency | null;
}
export interface FestaAction {
  kind: string;
  index: number;
  value?: number;
  flag?: boolean;
  text?: string;
  facility?: FestaFacility;
}
export interface FestaRequest {
  sourceHash: string;
  actions: FestaAction[];
  selected: number;
  facility: FestaFacility;
}
export interface FestaConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export interface FestaFile {
  index: number;
  encrypted: boolean;
  name: string;
  data: string;
}
export interface FestaTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  before: FestaCatalog;
  result: FestaCatalog;
  changedOffsets: number[];
  files: FestaFile[];
}
export const supportsFestivalPlaza = (format: string) =>
  ["SAV7SM", "SAV7USUM"].includes(format);
export function festaDraft(c: FestaCatalog, f: FestaFacility): FestaFacility {
  return {
    ...structuredClone(f),
    type: f.type <= (c.usum ? 127 : 124) ? f.type : 0,
    color: Math.min(f.color, f.colorMaximum),
    npc: f.npc < 8 ? f.npc : 0,
    gender: f.gender & 1,
    luckyRank: f.luckyRank >= 1 && f.luckyRank <= 3 ? f.luckyRank : 0,
    luckyPlace: f.luckyPlace >= 1 && f.luckyPlace <= 7 ? f.luckyPlace : 0,
  };
}
export function festaRequest(
  c: FestaCatalog,
  actions: readonly FestaAction[],
  selected: number,
  facility: FestaFacility,
): FestaRequest {
  if (
    !c.canEdit ||
    !/^[0-9A-F]{64}$/.test(c.sourceHash) ||
    actions.length > 1024 ||
    !Number.isInteger(selected) ||
    selected < 0 ||
    selected > 6 ||
    facility.index !== selected ||
    facility.trainerName.length > 12
  )
    throw Error("Invalid Festival Plaza request.");
  return {
    sourceHash: c.sourceHash,
    actions: structuredClone([...actions]),
    selected,
    facility: structuredClone(facility),
  };
}
export function festaConfirmation(
  c: FestaCatalog,
  t: FestaTicket,
): FestaConfirmation {
  if (
    !c.canEdit ||
    t.sourceHash !== c.sourceHash ||
    t.before.sourceHash !== t.sourceHash ||
    t.result.sourceHash !== t.targetHash ||
    !/^[0-9A-F]{64}$/.test(t.targetHash) ||
    !/^festa:\d+$/.test(t.token)
  )
    throw Error("Festival Plaza preview is stale.");
  return { token: t.token, sourceHash: t.sourceHash, targetHash: t.targetHash };
}
export const festaWords = {
  zh: {
    title: "圆庆广场",
    read: "读取圆庆广场",
    general: "广场信息",
    facility: "设施",
    phrases: "短语",
    rewards: "等级奖励",
    agency: "对战代理人",
    name: "广场名称",
    coins: "当前圆庆币",
    usedCoins: "已用圆庆币",
    totalCoins: "累计圆庆币",
    rank: "等级",
    date: "开始日期",
    message: "消息",
    type: "设施类型",
    color: "颜色编号",
    npc: "设施工作人员",
    introduced: "已介绍设施",
    trainer: "访客训练家姓名",
    gender: "访客性别",
    male: "男",
    female: "女",
    exchange: "剩余交换次数",
    lucky: "占卜结果",
    none: "无",
    flags: "使用标记",
    stats: "使用统计",
    id: "访客设施 ID",
    delete: "删除访客",
    allPhrases: "解锁全部短语",
    ready: "全部奖励可领取",
    received: "全部奖励已领取",
    rewardNone: "未就绪",
    rewardReady: "可领取",
    rewardReceived: "已领取",
    chosen: "已选宝可梦",
    invited: "已邀请训练家",
    grade: "代理人等级",
    defeated: "击败训练家",
    defeatedPokemon: "击败宝可梦",
    agencyTrainer: "训练家编号",
    import: "导入当前队伍",
    export: "导出宝可梦",
    encrypted: "导出加密宝可梦",
    glasses: "领取代理人墨镜",
    allowGlasses: "允许等级低于 30 时领取墨镜",
    preview: "预览修改",
    apply: "确认应用",
    cancel: "取消修改",
    changes: "变化文件字节",
    invalid: "无法处理圆庆广场，请检查字段与预览。",
    stale: "圆庆广场预览已失效，请重新预览。",
    smName: "此版本上游名称框没有保存路径。",
    raw: "原始字段",
  },
  en: {
    title: "Festival Plaza",
    read: "Read Festival Plaza",
    general: "Plaza",
    facility: "Facilities",
    phrases: "Phrases",
    rewards: "Rank rewards",
    agency: "Battle Agency",
    name: "Plaza name",
    coins: "Current Festival Coins",
    usedCoins: "Used Festival Coins",
    totalCoins: "Collected Festival Coins",
    rank: "Rank",
    date: "Start date",
    message: "Message",
    type: "Facility type",
    color: "Color index",
    npc: "Facility staff",
    introduced: "Introduced",
    trainer: "Visitor trainer name",
    gender: "Visitor gender",
    male: "Male",
    female: "Female",
    exchange: "Exchanges left",
    lucky: "Fortune result",
    none: "None",
    flags: "Used flags",
    stats: "Used statistics",
    id: "Visitor festival ID",
    delete: "Delete visitor",
    allPhrases: "Unlock all phrases",
    ready: "Make all rewards ready",
    received: "Mark all rewards received",
    rewardNone: "Not ready",
    rewardReady: "Ready",
    rewardReceived: "Received",
    chosen: "Pokémon chosen",
    invited: "Trainer invited",
    grade: "Agency grade",
    defeated: "Trainers defeated",
    defeatedPokemon: "Pokémon defeated",
    agencyTrainer: "Trainer ID",
    import: "Import current party",
    export: "Export Pokémon",
    encrypted: "Export encrypted Pokémon",
    glasses: "Receive Agent Sunglasses",
    allowGlasses: "Allow sunglasses below grade 30",
    preview: "Preview changes",
    apply: "Apply preview",
    cancel: "Discard changes",
    changes: "Changed save bytes",
    invalid: "Unable to process Festival Plaza. Check the fields and preview.",
    stale: "The Festival Plaza preview is stale. Preview again.",
    smName: "The upstream name field has no save path in this version.",
    raw: "Raw fields",
  },
  ja: {
    title: "フェスサークル",
    read: "フェスサークルを読み込む",
    general: "サークル情報",
    facility: "お店",
    phrases: "台詞",
    rewards: "ランク報酬",
    agency: "バトルエージェント",
    name: "サークル名",
    coins: "現在のフェスコイン",
    usedCoins: "使用したフェスコイン",
    totalCoins: "獲得したフェスコイン",
    rank: "ランク",
    date: "開始日時",
    message: "メッセージ",
    type: "お店の種類",
    color: "色番号",
    npc: "店員",
    introduced: "紹介済み",
    trainer: "訪問者のトレーナー名",
    gender: "訪問者の性別",
    male: "男",
    female: "女",
    exchange: "残り交換回数",
    lucky: "占い結果",
    none: "なし",
    flags: "使用フラグ",
    stats: "使用統計",
    id: "訪問者のフェス ID",
    delete: "訪問者を削除",
    allPhrases: "全ての台詞を解放",
    ready: "全ての報酬を受取可能にする",
    received: "全ての報酬を受取済みにする",
    rewardNone: "未準備",
    rewardReady: "受取可能",
    rewardReceived: "受取済み",
    chosen: "ポケモン選択済み",
    invited: "トレーナー招待済み",
    grade: "エージェントのグレード",
    defeated: "倒したトレーナー",
    defeatedPokemon: "倒したポケモン",
    agencyTrainer: "トレーナー番号",
    import: "現在の手持ちを取り込む",
    export: "ポケモンを書き出す",
    encrypted: "暗号化ポケモンを書き出す",
    glasses: "エージェントサングラスを受け取る",
    allowGlasses: "グレード 30 未満でも受け取る",
    preview: "変更を確認",
    apply: "確認した変更を適用",
    cancel: "変更を破棄",
    changes: "変更したセーブのバイト数",
    invalid:
      "フェスサークルを処理できません。項目と確認内容を見直してください。",
    stale: "確認内容が古くなりました。再度確認してください。",
    smName: "このバージョンの元の名前欄には保存処理がありません。",
    raw: "元の項目",
  },
};

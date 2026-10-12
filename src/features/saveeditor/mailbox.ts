// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText, PokemonEntry } from "./domain";
export interface MailChoice {
  id: number;
  name: LocalizedText;
}
export interface MailEntry {
  index: number;
  held: boolean;
  empty: boolean | null;
  authorName: string;
  tid: number;
  sid: number;
  language: number;
  version: number;
  gender: number;
  type: number;
  species: number;
  appear: number[];
  message: number[];
  lines: string[];
  userEntered: boolean;
  misc: number[];
  ending: number;
}
export interface MailCatalog {
  canEdit: boolean;
  sourceHash: string;
  generation: number;
  heldCount: number;
  boxCount: number;
  boxMaximum: number;
  entries: MailEntry[];
  party: {
    index: number;
    pokemon: PokemonEntry;
    heldMailId: number;
    itemIsMail: boolean;
  }[];
  types: MailChoice[];
  species: MailChoice[];
  languages: MailChoice[];
  versions: MailChoice[];
  issues: string[];
}
export type MailAction =
  | { kind: "edit"; index: number; entry: MailEntry }
  | { kind: "boxCount" | "heldId"; index: number; value: number }
  | { kind: "delete"; index: number; modifyHeldItem: boolean }
  | { kind: "up" | "down"; index: number };
export interface MailRequest {
  sourceHash: string;
  actions: MailAction[];
}
export interface MailTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  before: MailCatalog;
  result: MailCatalog;
  changedOffsets: number[];
  issues: string[];
}
export interface MailConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  acceptIssues: boolean;
}
export const supportsMailbox = (format: string) =>
  [
    "SAV2",
    "SAV2Stadium",
    "SAV3RS",
    "SAV3E",
    "SAV3FRLG",
    "SAV4DP",
    "SAV4Pt",
    "SAV4HGSS",
    "SAV5BW",
    "SAV5B2W2",
  ].includes(format);
export function mailType(c: MailCatalog, choice: number) {
  return choice === 0
    ? c.generation <= 3
      ? 0
      : 255
    : c.generation === 2
      ? [158, 181, 182, 183, 184, 185, 186, 187, 188, 189][choice - 1]
      : c.generation === 3
        ? 120 + choice
        : choice - 1;
}
export function mailIssue(issue: string, lang: "zh" | "en" | "ja") {
  const [kind, index, reason] = issue.split(":");
  const slot = Number(index) + 1;
  const labels = {
    zh: {
      party: "队伍",
      mail: "信件",
      mailId: "信件编号与持有道具不匹配",
      type: "信件类型与持有道具不匹配",
      duplicate: "多个宝可梦引用同一信件",
      unreferenced: "没有宝可梦引用此信件",
    },
    en: {
      party: "Party",
      mail: "Mail",
      mailId: "Mail ID does not match the held item",
      type: "Mail type or held item mismatch",
      duplicate: "Multiple Pokémon reference this mail",
      unreferenced: "No Pokémon references this mail",
    },
    ja: {
      party: "手持ち",
      mail: "メール",
      mailId: "メール番号と持ち物が一致しません",
      type: "メールの種類または持ち物が一致しません",
      duplicate: "複数のポケモンが同じメールを参照しています",
      unreferenced: "このメールを参照するポケモンがいません",
    },
  }[lang];
  return `${labels[kind as "party" | "mail"] ?? kind} ${slot}: ${labels[reason as "mailId" | "type" | "duplicate" | "unreferenced"] ?? reason}`;
}
export function mailTypeChoice(c: MailCatalog, type: number) {
  return c.types.find((v) => mailType(c, v.id) === type)?.id ?? -1;
}
export function mailDraft(c: MailCatalog, e: MailEntry): MailEntry {
  return {
    ...structuredClone(e),
    gender: e.gender & 1,
    authorName: e.authorName,
    language: c.languages.some((v) => v.id === e.language) ? e.language : 2,
    version: c.versions.some((v) => v.id === e.version) ? e.version : 0,
    appear: e.appear.map((v) => (c.species.some((s) => s.id === v) ? v : 0)),
  };
}
export function mailRequest(
  c: MailCatalog,
  actions: readonly MailAction[],
): MailRequest {
  if (
    !c.canEdit ||
    !/^[0-9A-F]{64}$/.test(c.sourceHash) ||
    actions.length > 512
  )
    throw Error("Invalid Mailbox request.");
  for (const a of actions) {
    if (!Number.isInteger(a.index) || a.index < 0)
      throw Error("Invalid Mailbox index.");
    if (a.kind === "edit") {
      const e = a.entry;
      if (
        e.index !== a.index ||
        e.authorName.length > 7 ||
        [e.tid, e.sid, e.ending, ...e.message, ...e.misc].some(
          (v) => !Number.isInteger(v) || v < 0 || v > 65535,
        ) ||
        e.lines.some((v) => v.length > 32)
      )
        throw Error("Invalid Mailbox fields.");
    } else if (a.kind === "boxCount" || a.kind === "heldId") {
      if (
        !Number.isInteger(a.value) ||
        a.value < (a.kind === "heldId" ? -1 : 0) ||
        a.value > (a.kind === "heldId" ? 5 : c.boxMaximum)
      )
        throw Error("Invalid Mailbox numeric value.");
    }
  }
  return { sourceHash: c.sourceHash, actions: structuredClone([...actions]) };
}
export function mailConfirmation(
  c: MailCatalog,
  t: MailTicket,
  acceptIssues: boolean,
): MailConfirmation {
  if (
    !c.canEdit ||
    t.sourceHash !== c.sourceHash ||
    t.before.sourceHash !== t.sourceHash ||
    t.result.sourceHash !== t.targetHash ||
    !/^[0-9A-F]{64}$/.test(t.targetHash) ||
    !/^mailbox:\d+$/.test(t.token) ||
    (t.issues.length > 0 && !acceptIssues)
  )
    throw Error("Mailbox preview is stale or issues require acceptance.");
  return {
    token: t.token,
    sourceHash: t.sourceHash,
    targetHash: t.targetHash,
    acceptIssues,
  };
}
export const mailboxWords = {
  zh: {
    title: "邮箱",
    read: "读取邮箱",
    held: "持有信件",
    box: "邮箱信件",
    count: "邮箱数量",
    slot: "信件",
    empty: "空信件",
    invalid: "无法处理邮箱，请检查字段和修改预览。",
    stale: "邮箱预览已失效，请重新预览。",
    author: "寄信人姓名",
    tid: "寄信人训练家 ID",
    sid: "寄信人秘密 ID",
    language: "寄信人语言",
    version: "寄信人游戏",
    gender: "寄信人性别",
    male: "男",
    female: "女",
    type: "信件类型",
    species: "图案宝可梦",
    message: "消息",
    userEntered: "用户输入消息",
    misc: "杂项",
    ending: "消息结尾",
    up: "上移",
    down: "下移",
    delete: "删除信件",
    linked: "同时清除关联宝可梦的持有道具",
    preview: "预览修改",
    apply: "确认应用",
    cancel: "取消修改",
    issues: "信件关联问题",
    accept: "仍然保存这些关联问题",
    changes: "变化文件字节",
    party: "队伍信件编号",
    note: "信件消息编码和保存行为由 PKHeX Core 处理。",
  },
  en: {
    title: "Mailbox",
    read: "Read mailbox",
    held: "Held mail",
    box: "Mailbox mail",
    count: "Mailbox count",
    slot: "Mail",
    empty: "Empty mail",
    invalid: "Unable to process the mailbox. Check the fields and preview.",
    stale: "The mailbox preview is stale. Preview again.",
    author: "Author name",
    tid: "Author Trainer ID",
    sid: "Author Secret ID",
    language: "Author language",
    version: "Author game",
    gender: "Author gender",
    male: "Male",
    female: "Female",
    type: "Mail type",
    species: "Pokémon artwork",
    message: "Message",
    userEntered: "User-entered message",
    misc: "Miscellaneous",
    ending: "Message ending",
    up: "Move up",
    down: "Move down",
    delete: "Delete mail",
    linked: "Also clear linked Pokémon held items",
    preview: "Preview changes",
    apply: "Apply preview",
    cancel: "Discard changes",
    issues: "Mail association issues",
    accept: "Save with these association issues",
    changes: "Changed save bytes",
    party: "Party mail IDs",
    note: "PKHeX Core handles message encoding and save behavior.",
  },
  ja: {
    title: "メールボックス",
    read: "メールを読み込む",
    held: "持たせたメール",
    box: "ボックスのメール",
    count: "メール数",
    slot: "メール",
    empty: "空のメール",
    invalid: "メールを処理できません。項目と変更内容を確認してください。",
    stale: "確認内容が古くなりました。再度確認してください。",
    author: "差出人の名前",
    tid: "差出人のトレーナー ID",
    sid: "差出人の裏 ID",
    language: "差出人の言語",
    version: "差出人のゲーム",
    gender: "差出人の性別",
    male: "男",
    female: "女",
    type: "メールの種類",
    species: "ポケモンの絵柄",
    message: "メッセージ",
    userEntered: "ユーザー入力メッセージ",
    misc: "その他",
    ending: "メッセージの末尾",
    up: "上へ",
    down: "下へ",
    delete: "メールを削除",
    linked: "関連ポケモンの持ち物も解除",
    preview: "変更を確認",
    apply: "確認した変更を適用",
    cancel: "変更を破棄",
    issues: "メールの関連付けの問題",
    accept: "関連付けの問題を残して保存",
    changes: "変更したセーブのバイト数",
    party: "手持ちのメール番号",
    note: "メッセージの文字コードと保存処理には PKHeX Core を使用します。",
  },
};

// SPDX-License-Identifier: GPL-3.0-or-later
// Ordering and levels: PKHeX.WinForms SAV_FestivalPlaza.cs (26.08.26).
const levels = [
  [5, 5, 5],
  [5, 5, 5],
  [3, 5, 3, 3, 3],
  [5, 4, 5, 5],
  [5, 5, 5],
  [4, 4, 4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 4, 4],
  [3],
];
const groups = {
  zh: ["彩票", "恐怖屋", "商店", "餐饮", "游乐场", "占卜", "染色", "交换"],
  en: [
    "Lottery",
    "Haunted",
    "Goody",
    "Food",
    "Bouncy",
    "Fortune",
    "Dye",
    "Exchange",
  ],
  ja: [
    "くじ屋",
    "ホラーハウス",
    "ショップ",
    "キッチン",
    "アスレチック",
    "うらない",
    "そめもの",
    "すりかえ",
  ],
};
const names = {
  zh: [
    ["梦想", "黄金热潮", "寻宝"],
    ["幽灵巢穴", "戏法空间", "奇异之光"],
    ["精灵球", "综合", "对战", "饮料", "药品"],
    ["稀有", "对战", "亲密咖啡馆", "亲密沙龙"],
    ["怦怦", "铿铿", "踏踏"],
    ["关都", "城都", "丰缘", "神奥", "合众", "卡洛斯", "宝可梦"],
    ["红", "黄", "绿", "蓝", "橙", "深蓝", "紫", "粉"],
    ["调换"],
  ],
  en: [
    ["BigDream", "GoldRush", "TreasureHunt"],
    ["GhostsDen", "TrickRoom", "ConfuseRay"],
    ["Ball", "General", "Battle", "SoftDrink", "Pharmacy"],
    ["Rare", "Battle", "FriendshipCafé", "FriendshipParlor"],
    ["Thump", "Clink", "Stomp"],
    ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Pokémon"],
    ["Red", "Yellow", "Green", "Blue", "Orange", "NavyBlue", "Purple", "Pink"],
    ["Switcheroo"],
  ],
  ja: [
    ["ビッグドリーム", "ゴールドラッシュ", "トレジャーハント"],
    ["ゴーストのあな", "トリックルーム", "あやしいひかり"],
    ["ボール", "よろず", "バトル", "ドリンク", "くすり"],
    ["レア", "バトル", "なつきカフェ", "なつきパーラー"],
    ["ドタドタ", "カチカチ", "バタバタ"],
    [
      "カントー",
      "ジョウト",
      "ホウエン",
      "シンオウ",
      "イッシュ",
      "カロス",
      "ポケモン",
    ],
    [
      "レッド",
      "イエロー",
      "グリーン",
      "ブルー",
      "オレンジ",
      "ネイビー",
      "パープル",
      "ピンク",
    ],
    ["すりかえ"],
  ],
};
export function festivalTypes(usum: boolean, lang: "zh" | "en" | "ja") {
  return levels
    .slice(0, usum ? 8 : 7)
    .flatMap((group, k) =>
      group.flatMap((count, j) =>
        (count === 4
          ? [1, 3, 5]
          : Array.from({ length: count }, (_, i) => i + 1)
        ).map((level) => `${groups[lang][k]} ${names[lang][k][j]} ${level}`),
      ),
    );
}
export const festivalNpc = {
  zh: [
    "精英训练家 女",
    "精英训练家 男",
    "资深训练家 女",
    "资深训练家 男",
    "上班族 男",
    "上班族 女",
    "朋克青年",
    "少女",
  ],
  en: [
    "Ace Trainer ♀",
    "Ace Trainer ♂",
    "Veteran ♀",
    "Veteran ♂",
    "Office Worker ♂",
    "Office Worker ♀",
    "Punk Guy",
    "Lass",
  ],
  ja: [
    "エリートトレーナー 女",
    "エリートトレーナー 男",
    "ベテラントレーナー 女",
    "ベテラントレーナー 男",
    "会社員 男",
    "会社員 女",
    "不良",
    "ミニスカート",
  ],
};
export const festivalRewards = {
  zh: [
    "等级 4：任务",
    "等级 8：设施",
    "等级 10：服饰",
    "等级 20：改名",
    "等级 30：特别菜单",
    "等级 40：背景音乐",
    "等级 50：奢华主题",
    "等级 60：童话主题",
    "等级 70：音调主题",
    "等级 100：短语",
    "当前等级",
  ],
  en: [
    "Rank 4: missions",
    "Rank 8: facility",
    "Rank 10: fashion",
    "Rank 20: rename",
    "Rank 30: special menu",
    "Rank 40: BGM",
    "Rank 50: theme Glitz",
    "Rank 60: theme Fairy",
    "Rank 70: theme Tone",
    "Rank 100: phrase",
    "Current Rank",
  ],
  ja: [
    "ランク 4：ミッション",
    "ランク 8：お店",
    "ランク 10：ファッション",
    "ランク 20：名前変更",
    "ランク 30：特別メニュー",
    "ランク 40：BGM",
    "ランク 50：ゴージャス",
    "ランク 60：メルヘン",
    "ランク 70：モノトーン",
    "ランク 100：台詞",
    "現在のランク",
  ],
};

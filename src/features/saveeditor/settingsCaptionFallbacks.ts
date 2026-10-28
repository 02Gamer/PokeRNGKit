// SPDX-License-Identifier: GPL-3.0-or-later
// Compact Web captions for known API190 paths without upstream PropertyGrid names.
// Meanings follow PKHeX 26.08.26 Core setting descriptions. Existing source
// translations retain priority; unrelated future paths keep their own names.
type Language = "zh" | "en" | "ja";
const captions: Readonly<Record<string, Readonly<Record<Language, string>>>> = {
  "battleTemplate.export.includeChampionsStatPoints": {
    zh: "包含 Champions 能力点",
    en: "Include Champions Stat Points",
    ja: "Champions の能力ポイントを含める",
  },
  "battleTemplate.export.statsCustom": {
    zh: "自定义能力值格式",
    en: "Custom Stat Format",
    ja: "能力値の独自書式",
  },
  "battleTemplate.export.statsCustom.alwaysShow": {
    zh: "始终显示默认值",
    en: "Always Show Default Values",
    ja: "既定値も常に表示",
  },
  "battleTemplate.export.statsCustom.isLeft": {
    zh: "名称置于数值左侧",
    en: "Names Before Values",
    ja: "名前を数値の前に表示",
  },
  "battleTemplate.export.statsCustom.minimumDigits": {
    zh: "最少数字位数",
    en: "Minimum Digits",
    ja: "最小桁数",
  },
  "battleTemplate.export.statsCustom.names": {
    zh: "能力值名称",
    en: "Stat Names",
    ja: "能力値の名前",
  },
  "battleTemplate.export.statsCustom.separator": {
    zh: "能力值分隔符",
    en: "Stat Separator",
    ja: "能力値の区切り",
  },
  "battleTemplate.export.statsCustom.valueGap": {
    zh: "名称与数值间隔",
    en: "Label/Value Gap",
    ja: "名前と数値の区切り",
  },
  "battleTemplate.export.styleMove": {
    zh: "招式显示格式",
    en: "Move Display Style",
    ja: "技の表示形式",
  },
  "battleTemplate.export.styleStatEVs": {
    zh: "努力值显示格式",
    en: "EV Display Style",
    ja: "努力値の表示形式",
  },
  "battleTemplate.export.styleStatIVs": {
    zh: "个体值显示格式",
    en: "IV Display Style",
    ja: "個体値の表示形式",
  },
  "battleTemplate.export.styleStatOther": {
    zh: "其他能力值显示格式",
    en: "Other Stat Display Style",
    ja: "その他の能力値の表示形式",
  },
  "battleTemplate.export.styleStatSPs": {
    zh: "能力点显示格式",
    en: "Stat Point Display Style",
    ja: "能力ポイントの表示形式",
  },
  "battleTemplate.export.tokenOrder": {
    zh: "模板内容布局",
    en: "Template Layout",
    ja: "テンプレートの表示形式",
  },
  "battleTemplate.export.tokenOrderCustom": {
    zh: "自定义项目顺序",
    en: "Custom Item Order",
    ja: "項目の独自の順序",
  },
  "battleTemplate.hover.includeChampionsStatPoints": {
    zh: "包含 Champions 能力点",
    en: "Include Champions Stat Points",
    ja: "Champions の能力ポイントを含める",
  },
  "battleTemplate.hover.statsCustom": {
    zh: "自定义能力值格式",
    en: "Custom Stat Format",
    ja: "能力値の独自書式",
  },
  "battleTemplate.hover.statsCustom.alwaysShow": {
    zh: "始终显示默认值",
    en: "Always Show Default Values",
    ja: "既定値も常に表示",
  },
  "battleTemplate.hover.statsCustom.isLeft": {
    zh: "名称置于数值左侧",
    en: "Names Before Values",
    ja: "名前を数値の前に表示",
  },
  "battleTemplate.hover.statsCustom.minimumDigits": {
    zh: "最少数字位数",
    en: "Minimum Digits",
    ja: "最小桁数",
  },
  "battleTemplate.hover.statsCustom.names": {
    zh: "能力值名称",
    en: "Stat Names",
    ja: "能力値の名前",
  },
  "battleTemplate.hover.statsCustom.separator": {
    zh: "能力值分隔符",
    en: "Stat Separator",
    ja: "能力値の区切り",
  },
  "battleTemplate.hover.statsCustom.valueGap": {
    zh: "名称与数值间隔",
    en: "Label/Value Gap",
    ja: "名前と数値の区切り",
  },
  "battleTemplate.hover.styleMove": {
    zh: "招式显示格式",
    en: "Move Display Style",
    ja: "技の表示形式",
  },
  "battleTemplate.hover.styleStatEVs": {
    zh: "努力值显示格式",
    en: "EV Display Style",
    ja: "努力値の表示形式",
  },
  "battleTemplate.hover.styleStatIVs": {
    zh: "个体值显示格式",
    en: "IV Display Style",
    ja: "個体値の表示形式",
  },
  "battleTemplate.hover.styleStatOther": {
    zh: "其他能力值显示格式",
    en: "Other Stat Display Style",
    ja: "その他の能力値の表示形式",
  },
  "battleTemplate.hover.styleStatSPs": {
    zh: "能力点显示格式",
    en: "Stat Point Display Style",
    ja: "能力ポイントの表示形式",
  },
  "battleTemplate.hover.tokenOrder": {
    zh: "模板内容布局",
    en: "Template Layout",
    ja: "テンプレートの表示形式",
  },
  "battleTemplate.hover.tokenOrderCustom": {
    zh: "自定义项目顺序",
    en: "Custom Item Order",
    ja: "項目の独自の順序",
  },
  "hover.previewCursorShift.x": {
    zh: "水平偏移（X）",
    en: "Horizontal Offset (X)",
    ja: "横方向のオフセット（X）",
  },
  "hover.previewCursorShift.y": {
    zh: "垂直偏移（Y）",
    en: "Vertical Offset (Y)",
    ja: "縦方向のオフセット（Y）",
  },
  "legality.bulk.checkActiveHandler": {
    zh: "核对当前持有人",
    en: "Check Current Handler",
    ja: "現在の所持者を確認",
  },
  "legality.framePattern.eggRandomAnyType3": {
    zh: "允许第三世代蛋的任意个性值／个体值类型",
    en: "Allow Any Gen III Egg PID/IV Type",
    ja: "第3世代のタマゴで任意の性格値・個体値タイプを許可",
  },
  "legality.framePattern.eggRandomAnyType4": {
    zh: "允许第四世代蛋的任意个性值／个体值类型",
    en: "Allow Any Gen IV Egg PID/IV Type",
    ja: "第4世代のタマゴで任意の性格値・個体値タイプを許可",
  },
  "legality.framePattern.rngFrameNotFound3": {
    zh: "第三世代未匹配随机数帧",
    en: "Unmatched Gen III RNG Frame",
    ja: "第3世代の乱数フレーム不一致",
  },
  "legality.framePattern.rngFrameNotFound4": {
    zh: "第四世代未匹配随机数帧",
    en: "Unmatched Gen IV RNG Frame",
    ja: "第4世代の乱数フレーム不一致",
  },
  "legality.game.gen3": { zh: "第三世代", en: "Generation III", ja: "第3世代" },
  "legality.game.gen3.allowBattleTowerTeamSwap": {
    zh: "允许对战塔队伍替换漏洞",
    en: "Allow Battle Tower Team-Swap Exploit",
    ja: "バトルタワーの手持ち差し替えを許可",
  },
  "legality.game.gen7": { zh: "第七世代", en: "Generation VII", ja: "第7世代" },
  "legality.game.gen7.gen7TransferStarPID": {
    zh: "第一、二世代转移后的星形异色个性值",
    en: "Gen I/II Transfer Star-Shiny PID",
    ja: "第1・第2世代から転送した星形色違いの性格値",
  },
  "legality.game.gen8": {
    zh: "第八世代",
    en: "Generation VIII",
    ja: "第8世代",
  },
  "legality.game.gen8.gen8MemoryMissingHT": {
    zh: "第八世代缺少当前持有人回忆",
    en: "Missing Gen VIII Handler Memory",
    ja: "第8世代の所持者の思い出がない",
  },
  "legality.handler.checkActiveHandler": {
    zh: "核对当前持有人",
    en: "Check Current Handler",
    ja: "現在の所持者を確認",
  },
  "legality.handler.currentHandlerMismatch": {
    zh: "当前持有人不一致",
    en: "Current Handler Mismatch",
    ja: "現在の所持者の不一致",
  },
  "legality.handler.restrictions": {
    zh: "持有人限制",
    en: "Handling Restrictions",
    ja: "所持者の制限",
  },
  "legality.handler.restrictions.allowHandleOTGen6": {
    zh: "允许第六世代原训练家持有",
    en: "Allow Gen VI Original Trainer Handling",
    ja: "第6世代で元のトレーナーの所持を許可",
  },
  "legality.handler.restrictions.allowHandleOTGen7": {
    zh: "允许第七世代原训练家持有",
    en: "Allow Gen VII Original Trainer Handling",
    ja: "第7世代で元のトレーナーの所持を許可",
  },
  "legality.handler.restrictions.allowHandleOTGen7b": {
    zh: "允许 Let's Go 原训练家持有",
    en: "Allow Let's Go Original Trainer Handling",
    ja: "Let's Goで元のトレーナーの所持を許可",
  },
  "legality.handler.restrictions.allowHandleOTGen8": {
    zh: "允许第八世代原训练家持有",
    en: "Allow Gen VIII Original Trainer Handling",
    ja: "第8世代で元のトレーナーの所持を許可",
  },
  "legality.handler.restrictions.allowHandleOTGen8a": {
    zh: "允许阿尔宙斯原训练家持有",
    en: "Allow Legends: Arceus Original Trainer Handling",
    ja: "LEGENDS アルセウスで元のトレーナーの所持を許可",
  },
  "legality.handler.restrictions.allowHandleOTGen8b": {
    zh: "允许晶灿钻石／明亮珍珠原训练家持有",
    en: "Allow Brilliant Diamond / Shining Pearl Original Trainer Handling",
    ja: "ブリリアントダイヤモンド・シャイニングパールで元のトレーナーの所持を許可",
  },
  "legality.handler.restrictions.allowHandleOTGen9": {
    zh: "允许第九世代原训练家持有",
    en: "Allow Gen IX Original Trainer Handling",
    ja: "第9世代で元のトレーナーの所持を許可",
  },
  "legality.handler.restrictions.allowHandleOTGen9a": {
    zh: "允许 传说 Z-A 原训练家持有",
    en: "Allow Legends: Z-A Original Trainer Handling",
    ja: "LEGENDS Z-Aで元のトレーナーの所持を許可",
  },
  "legality.homeTransfer.homeTransferTrackerNotPresent": {
    zh: "缺少 HOME 追踪编号",
    en: "Missing HOME Tracker",
    ja: "HOMEトラッカーがない",
  },
  "legality.homeTransfer.zeroHeightWeight": {
    zh: "身高、体重均为零",
    en: "Zero Height and Weight",
    ja: "高さ・重さが両方ゼロ",
  },
  "legality.nickname.nickname12": {
    zh: "第一、二世代",
    en: "Generations I/II",
    ja: "第1・第2世代",
  },
  "legality.nickname.nickname12.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname12.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname3": {
    zh: "第三世代",
    en: "Generation III",
    ja: "第3世代",
  },
  "legality.nickname.nickname3.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname3.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname4": {
    zh: "第四世代",
    en: "Generation IV",
    ja: "第4世代",
  },
  "legality.nickname.nickname4.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname4.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname5": {
    zh: "第五世代",
    en: "Generation V",
    ja: "第5世代",
  },
  "legality.nickname.nickname5.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname5.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname6": {
    zh: "第六世代",
    en: "Generation VI",
    ja: "第6世代",
  },
  "legality.nickname.nickname6.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname6.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname7": {
    zh: "第七世代",
    en: "Generation VII",
    ja: "第7世代",
  },
  "legality.nickname.nickname7.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname7.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname7b": {
    zh: "Let's Go",
    en: "Let's Go",
    ja: "Let's Go",
  },
  "legality.nickname.nickname7b.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname7b.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname8": {
    zh: "第八世代",
    en: "Generation VIII",
    ja: "第8世代",
  },
  "legality.nickname.nickname8.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname8.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname8a": {
    zh: "阿尔宙斯",
    en: "Legends: Arceus",
    ja: "LEGENDS アルセウス",
  },
  "legality.nickname.nickname8a.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname8a.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname8b": {
    zh: "晶灿钻石／明亮珍珠",
    en: "Brilliant Diamond / Shining Pearl",
    ja: "ブリリアントダイヤモンド・シャイニングパール",
  },
  "legality.nickname.nickname8b.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname8b.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname9": {
    zh: "第九世代",
    en: "Generation IX",
    ja: "第9世代",
  },
  "legality.nickname.nickname9.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname9.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nickname9a": {
    zh: "传说 Z-A",
    en: "Legends: Z-A",
    ja: "LEGENDS Z-A",
  },
  "legality.nickname.nickname9a.nicknamedMysteryGift": {
    zh: "神秘礼物改名",
    en: "Renamed Mystery Gifts",
    ja: "ふしぎなおくりもののニックネーム変更",
  },
  "legality.nickname.nickname9a.nicknamedTrade": {
    zh: "游戏内交换改名",
    en: "Renamed In-Game Trades",
    ja: "ゲーム内交換のニックネーム変更",
  },
  "legality.nickname.nicknamedAnotherSpecies": {
    zh: "昵称与其他种类同名",
    en: "Nickname Matches Another Species",
    ja: "別の種類名と一致するニックネーム",
  },
  "legality.tradeback.allowGen1Tradeback": {
    zh: "允许第一世代回传招式",
    en: "Allow Gen II Tradeback Moves in Gen I",
    ja: "第1世代への戻し交換を許可",
  },
  "legality.wordFilter.checkWordFilter": {
    zh: "检查敏感词",
    en: "Check Word Filter",
    ja: "禁止ワードを確認",
  },
  "legality.wordFilter.disableWordFilterPastGen": {
    zh: "跳过旧世代敏感词检查",
    en: "Skip Word Filter for Earlier Formats",
    ja: "過去の世代の禁止ワード確認を無効化",
  },
};
export const settingsCaptionFallback = (
  path: string,
  language: Language,
): string | undefined => captions[path]?.[language];

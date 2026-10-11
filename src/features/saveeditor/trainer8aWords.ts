import { trainer8bWords } from "./trainer8bWords";
export const trainer8aWords = {
  en: {
    ...trainer8bWords.en,
    title: "Legends: Arceus Trainer Editor",
    map: "Map name",
    ignored: "Inputs not applied",
    mapHint:
      "A map-only change is ignored when all loaded numeric coordinates are zero. Nonzero loaded values or a numeric edit trigger map saving and rotation rebuilding.",
    dateHint:
      "Dates retain the game's wall-clock time, without timezone conversion.",
    clampHint:
      "Source Save clamps current/total Merit Points, team rank and satchel upgrades to 999999999.",
    invalid:
      "Could not edit the Legends: Arceus trainer. Check the save and input, then read again.",
    stale: "Trainer preview is out of date. Read and preview again.",
  },
  zh: {
    ...trainer8bWords.zh,
    title: "传说 阿尔宙斯训练家编辑器",
    map: "地图名称",
    ignored: "未应用的输入",
    mapHint:
      "加载的数值坐标全部为零时，单改地图名称不会保存；非零加载值或数值修改会触发地图保存和朝向重建。",
    dateHint: "日期保持游戏保存的当地时间，不进行时区转换。",
    clampHint:
      "原版保存会将当前／累计功勋、调查队等级及腰包次数钳制为最多 999999999。",
    invalid: "无法编辑阿尔宙斯训练家，请检查存档和输入后重新读取。",
    stale: "训练家预览已过期，请重新读取并预览。",
  },
  ja: {
    ...trainer8bWords.ja,
    title: "LEGENDS アルセウス トレーナー編集",
    map: "マップ名",
    ignored: "適用されなかった入力",
    mapHint:
      "読込時の数値座標が全て0なら、マップ名だけの変更は保存されません。読込値が0以外、または数値の変更でマップと回転を書き込みます。",
    dateHint: "ゲームに保存された時刻を保持し、タイムゾーン変換は行いません。",
    clampHint:
      "元の保存動作は現在／累計FP、団員ランク、ポーチ拡張を最大999999999に制限します。",
    invalid:
      "アルセウスのトレーナーを編集できません。保存データと入力を確認してください。",
    stale: "プレビューが古くなりました。再読込してください。",
  },
};

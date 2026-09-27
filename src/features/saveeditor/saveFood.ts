export interface SaveFoodCatalog {
  kind: "puffs" | "beans";
  values: number[];
  count: number | null;
  names: { zh: string; en: string; ja: string }[];
}
export interface SaveFoodEdit {
  action: "edit" | "fill" | "best" | "reset" | "sort" | "reverse" | "clear";
  values?: number[];
  count?: number;
}
export const supportsFood = (format: string) =>
  ["SAV6XY", "SAV6AO", "SAV7SM", "SAV7USUM"].includes(format);
export function validateFood(
  catalog: SaveFoodCatalog,
  values: string[],
  count: string,
): SaveFoodEdit {
  const numbers = values.map((v) => (/^\d{1,3}$/.test(v) ? Number(v) : NaN));
  const puffs = catalog.kind === "puffs";
  const quantity = /^-?\d{1,11}$/.test(count) ? Number(count) : NaN;
  if (
    numbers.length !== catalog.values.length ||
    numbers.some(
      (v, i) =>
        !Number.isInteger(v) ||
        v < 0 ||
        (v > (puffs ? 26 : 255) && v !== catalog.values[i]),
    ) ||
    (puffs &&
      (!Number.isInteger(quantity) ||
        ((quantity < 0 || quantity > 100) && quantity !== catalog.count)))
  )
    throw new Error("Invalid food values.");
  return {
    action: "edit",
    values: numbers,
    ...(puffs ? { count: quantity } : {}),
  };
}
export const foodWords = {
  zh: {
    title: "宝可梦食物",
    puffs: "宝芙蕾",
    beans: "宝可豆",
    slot: "格位",
    value: "宝芙蕾种类",
    count: "持有数量",
    apply: "应用修改",
    discard: "放弃修改",
    read: "读取食物",
    fill: "全部补满",
    best: "补满顶级宝芙蕾",
    reset: "恢复五种初始宝芙蕾",
    sort: "升序排列",
    reverse: "降序排列",
    clear: "全部清空",
    unknown: "未识别编号",
    invalid:
      "请填写有效整数：宝芙蕾编号 0–26、持有数量 0–100；宝可豆数量 0–255。",
    note: "批量操作作用于工作副本，可用上方撤销恢复。请先应用或放弃未保存的修改。",
    puffNote:
      "格位与持有数量分别保存；恢复默认会设置前五个格位并将持有数量设为 5。",
  },
  en: {
    title: "Pokémon food",
    puffs: "Poké Puffs",
    beans: "Poké Beans",
    slot: "Slot",
    value: "Puff type",
    count: "Held count",
    apply: "Apply changes",
    discard: "Discard changes",
    read: "Read food",
    fill: "Fill all",
    best: "Fill supreme puffs",
    reset: "Restore five starting puffs",
    sort: "Sort ascending",
    reverse: "Sort descending",
    clear: "Clear all",
    unknown: "Unknown ID",
    invalid:
      "Enter whole numbers: puff ID 0–26, held count 0–100; bean count 0–255.",
    note: "Bulk actions update the working copy and can be undone above. Apply or discard pending changes first.",
    puffNote:
      "Slots and held count are saved separately. Reset sets the first five slots and the held count to 5.",
  },
  ja: {
    title: "ポケモンの食べ物",
    puffs: "ポフレ",
    beans: "ポケマメ",
    slot: "スロット",
    value: "ポフレの種類",
    count: "所持数",
    apply: "変更を適用",
    discard: "変更を破棄",
    read: "食べ物を読み込む",
    fill: "すべて補充",
    best: "最高級ポフレを補充",
    reset: "初期のポフレ5種類に戻す",
    sort: "昇順に並べる",
    reverse: "降順に並べる",
    clear: "すべて消去",
    unknown: "不明な番号",
    invalid:
      "整数を入力してください：ポフレ番号 0–26、所持数 0–100、ポケマメ数 0–255。",
    note: "一括操作は作業用コピーに適用され、上部の操作で元に戻せます。先に編集中の変更を適用するか破棄してください。",
    puffNote:
      "スロットと所持数は別々に保存されます。初期化すると最初の5スロットが設定され、所持数が5になります。",
  },
};

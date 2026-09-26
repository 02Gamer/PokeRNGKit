export const saveEditorCopy = {
  zh: {
    intro:
      "在本机查看与编辑宝可梦、盒子和训练家信息，导出存档副本。原文件不会被覆盖。",
    choose:
      "选择已解密的游戏存档（最大 32 MiB）。首次使用会加载本地 PKHeX 核心。",
    loading: "正在处理存档…",
    valid: "校验通过",
    invalid: "校验未通过：仅供查看，不能编辑或联动。",
    readonly: "此存档格式尚未开放编辑。",
    ids: "TID16 / SID16 为原始 16 位 ID，范围 0–65535；与第七世代起的六位显示 ID 不同。",
    linked: "存档信息已保存并选中。",
    exported: "已生成通过重新读取校验的副本。",
    link: "联动使用当前打开的原存档信息，不使用尚未导出的编辑值。更新现有档案会保留 Seed、校准参数及未读取的标记。",
    defaults: "新档案的未知参数使用默认值；使用 RNG 前请在存档信息管理中复核。",
    acknowledge: "我会复核新档案的校准参数与标记",
    ambiguous: "该存档不能区分以下版本，请选择实际游戏。",
    unsupported: "当前 RNG 存档信息管理没有对应游戏。",
  },
  en: {
    intro:
      "View and edit Pokémon, boxes and trainer information locally, then export a save copy. The original file is never overwritten.",
    choose:
      "Choose decrypted save data (up to 32 MiB). PKHeX loads locally on first use.",
    loading: "Processing save…",
    valid: "Checksums valid",
    invalid:
      "Invalid checksums: viewing only; editing and profile linking are disabled.",
    readonly: "Editing is not enabled for this save format.",
    ids: "TID16 / SID16 are raw 16-bit IDs (0–65535), not the six-digit display IDs used since Generation VII.",
    linked: "Profile saved and selected.",
    exported: "A copy has been generated and verified by reopening it.",
    link: "Link the opened original save, not unexported edits. Updating preserves seeds, calibration and unread flags.",
    defaults:
      "Unknown values in new profiles use defaults. Review calibration and flags before running RNG.",
    acknowledge: "I will review the new profile's calibration and flags",
    ambiguous:
      "This save cannot distinguish these versions. Select the actual game.",
    unsupported: "No corresponding RNG profile is available for this game.",
  },
  ja: {
    intro:
      "ローカルでポケモン・ボックス・トレーナー情報を確認・編集し、セーブのコピーを出力します。元のファイルは上書きしません。",
    choose:
      "復号済みセーブを選択してください（最大32 MiB）。初回にローカルのPKHeXを読み込みます。",
    loading: "処理中…",
    valid: "チェックサム正常",
    invalid: "チェックサム不正：閲覧のみ。編集と連携はできません。",
    readonly: "この形式の編集にはまだ対応していません。",
    ids: "TID16 / SID16は16ビットID（0–65535）です。第7世代以降の6桁表示IDとは異なります。",
    linked: "プロファイルを保存して選択しました。",
    exported: "再読み込みで検証済みのコピーを作成しました。",
    link: "連携には開いた元のセーブを使用します。未出力の編集値は使用しません。既存のSeed・校正値・未取得フラグを保持します。",
    defaults:
      "新規プロファイルの不明な値は既定値です。RNG実行前に確認してください。",
    acknowledge: "新規プロファイルの校正値とフラグを確認します",
    ambiguous:
      "このセーブではバージョンを区別できません。実際のゲームを選択してください。",
    unsupported: "このゲームのRNGプロファイルはありません。",
  },
};

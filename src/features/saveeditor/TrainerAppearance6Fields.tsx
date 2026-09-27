import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { SaveReport, TrainerDraft } from "./domain";
import {
  resetAppearance,
  type TrainerAppearance6State,
} from "./trainerAppearance6";
import {
  appearanceFieldName,
  appearanceOptionName,
  type AppearanceLanguage,
} from "./trainerAppearance6Labels";

const text = {
  zh: {
    title: "XY 昵称与外观",
    nickname: "训练家昵称",
    nicknameNote: "最多 12 个字符；留空可清除昵称。",
    note: "按存档中的角色外观编辑。编号只表示存储值，不保证每种搭配都能在游戏中正常显示。",
    advanced: "高级外观属性",
    unknown: "未知和未使用字段保持原值；仅在了解其用途时修改。",
    reset: "重置昵称与外观草稿",
    stale: "角色性别已变化。请重置此处草稿，再按当前角色编辑。",
    gender:
      "本次外观修改使用载入时的性别布局。应用性别修改后，同一外观数据会按新性别重新解释。",
  },
  en: {
    title: "XY nickname and appearance",
    nickname: "Trainer nickname",
    nicknameNote: "Up to 12 characters; leave empty to clear the nickname.",
    note: "Edit the stored appearance. IDs describe stored values; some combinations may not display correctly in the game.",
    advanced: "Advanced appearance properties",
    unknown:
      "Keep unknown and unused fields unchanged unless you know their purpose.",
    reset: "Reset nickname and appearance draft",
    stale:
      "The trainer gender has changed. Reset this draft to edit the current appearance.",
    gender:
      "Appearance edits use the gender layout loaded with this draft. Applying the gender change reinterprets the same appearance data for the new gender.",
  },
  ja: {
    title: "XY ニックネームと外見",
    nickname: "トレーナーのニックネーム",
    nicknameNote: "12 文字まで。空欄にするとニックネームを消去します。",
    note: "保存された外見を編集します。番号は保存値を表し、組み合わせによってゲーム内で正常に表示されない場合があります。",
    advanced: "外見の詳細項目",
    unknown: "不明・未使用の項目は用途が分かる場合のみ変更してください。",
    reset: "ニックネームと外見の下書きをリセット",
    stale:
      "性別が変更されました。下書きをリセットして現在の外見を編集してください。",
    gender:
      "外見の編集には読み込み時の性別の形式を使用します。性別の変更を適用すると、同じデータを新しい性別の形式で読み直します。",
  },
};
export function TrainerAppearance6Fields({
  report,
  draft,
  disabled,
  onChange,
}: {
  report: SaveReport;
  draft: TrainerDraft;
  disabled: boolean;
  onChange(draft: TrainerDraft): void;
}) {
  const { i18n } = useTranslation();
  const language: AppearanceLanguage = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const state = report.trainer.appearance6;
  if (!state) return null;
  const words = text[language],
    stale = draft.fashionGender !== String(state.gender);
  const field = (f: TrainerAppearance6State["fields"][number]) => (
    <label className="field" key={f.key}>
      <span>
        {appearanceFieldName(f.key, language)}
        {!f.choices.length && ` · 0–${f.max}`}
      </span>
      {f.choices.length ? (
        <Select
          value={draft[`fashion.${f.key}`]}
          onChange={(e) =>
            onChange({ ...draft, [`fashion.${f.key}`]: e.target.value })
          }
        >
          {Array.from({ length: f.max + 1 }, (_, id) => {
            const raw = f.choices.find((c) => c.id === id)?.name;
            return (
              <option key={id} value={id}>
                {raw ? appearanceOptionName(raw, language) : `#${id}`} · {id}
              </option>
            );
          })}
        </Select>
      ) : (
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={String(f.max).length}
          value={draft[`fashion.${f.key}`]}
          onChange={(e) =>
            onChange({ ...draft, [`fashion.${f.key}`]: e.target.value })
          }
        />
      )}
    </label>
  );
  return (
    <details>
      <summary>{words.title}</summary>
      <p className="save-editor-note">{words.note}</p>
      {stale ? (
        <p role="status">{words.stale}</p>
      ) : (
        draft.gender !== draft.fashionGender && (
          <p className="save-editor-note">{words.gender}</p>
        )
      )}
      <fieldset className="save-editor-fields" disabled={disabled || stale}>
        <label className="field">
          <span>{words.nickname}</span>
          <input
            maxLength={Math.max(12, state.nickname.length)}
            value={draft.nickname}
            onChange={(e) => onChange({ ...draft, nickname: e.target.value })}
          />
          <span className="save-editor-note">{words.nicknameNote}</span>
        </label>
        {state.fields.filter((f) => f.choices.length).map(field)}
      </fieldset>
      <details>
        <summary>{words.advanced}</summary>
        <p className="save-editor-note">{words.unknown}</p>
        <fieldset className="save-editor-fields" disabled={disabled || stale}>
          {state.fields.filter((f) => !f.choices.length).map(field)}
        </fieldset>
      </details>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(resetAppearance(draft, state))}
      >
        {words.reset}
      </button>
    </details>
  );
}

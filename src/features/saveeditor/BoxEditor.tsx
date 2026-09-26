import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { boxWallpaper } from "./art";
import type { BoxEdit, SaveReport } from "./domain";
import type { saveEditorResources } from "./locales";

export function BoxEditor({
  report,
  box,
  busy,
  onApply,
}: {
  report: SaveReport;
  box: number;
  busy: boolean;
  onApply(edit: BoxEdit): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const entry = report.boxes.find((value) => value.index === box)!;
  const [name, setName] = useState(entry.name);
  const [wallpaper, setWallpaper] = useState(entry.wallpaper);
  const options = report.boxOptions;
  const changed =
    (options.canName && name !== entry.name) || wallpaper !== entry.wallpaper;
  const valid =
    name === entry.name ||
    (name.length <= options.nameLength && !/\p{Cc}/u.test(name));
  const preview = boxWallpaper(
    { ...report, boxes: [{ ...entry, wallpaper }] },
    box,
  );
  if (!options.canName && !options.wallpapers.length) return null;
  return (
    <details className="save-pokemon-editor">
      <summary>{words.boxSettings}</summary>
      <div className="save-editor-fields">
        {options.canName && (
          <label className="field">
            <span>{words.boxName}</span>
            <input
              value={name}
              maxLength={options.nameLength}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
        {!!options.wallpapers.length && (
          <label className="field">
            <span>{words.wallpaper}</span>
            <Select
              value={wallpaper}
              disabled={busy}
              onChange={(event) => setWallpaper(Number(event.target.value))}
            >
              {!options.wallpapers[wallpaper] && (
                <option value={wallpaper}>#{wallpaper}</option>
              )}
              {options.wallpapers.map((value, index) => (
                <option key={index} value={index}>
                  {value[lang]}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
      {!!options.wallpapers.length && (
        <img
          className="save-box-wallpaper-preview"
          src={preview}
          alt={words.wallpaper}
        />
      )}
      {!valid && (
        <p role="alert" className="save-editor-error">
          {words.boxValueError}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy || !changed || !valid}
          onClick={() =>
            void onApply({
              box,
              name: options.canName && name !== entry.name ? name : null,
              wallpaper: wallpaper !== entry.wallpaper ? wallpaper : null,
            })
          }
        >
          {words.applyPokemon}
        </button>
      </div>
    </details>
  );
}

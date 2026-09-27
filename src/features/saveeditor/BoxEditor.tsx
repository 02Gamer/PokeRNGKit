import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { boxWallpaper } from "./art";
import type { BoxEdit, SaveReport } from "./domain";
import type { saveEditorResources } from "./locales";
import { boxFlags, boxLayoutLabels } from "./boxLayout";

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
  const labels = boxLayoutLabels[lang];
  const [unlocked, setUnlocked] = useState(options.unlocked);
  const [flags, setFlags] = useState(
    options.flags.map((v) => v.toString(16).toUpperCase().padStart(2, "0")),
  );
  const [target, setTarget] = useState(box === 0 ? 1 : 0);
  let parsedFlags: number[] | undefined;
  try {
    parsedFlags = boxFlags(flags, options);
  } catch {
    /* Invalid draft stays editable. */
  }
  const flagsChanged =
    !parsedFlags || parsedFlags.some((v, i) => v !== options.flags[i]);
  const layoutValid =
    !!parsedFlags &&
    (unlocked === options.unlocked ||
      (unlocked !== null &&
        Number.isInteger(unlocked) &&
        unlocked >= 0 &&
        unlocked <= report.boxCount));
  const changed =
    (options.canName && name !== entry.name) ||
    wallpaper !== entry.wallpaper ||
    unlocked !== options.unlocked ||
    flagsChanged;
  const valid =
    name === entry.name ||
    (name.length <= options.nameLength && !/\p{Cc}/u.test(name));
  const preview = boxWallpaper(
    { ...report, boxes: [{ ...entry, wallpaper }] },
    box,
  );
  if (
    !options.canName &&
    !options.wallpapers.length &&
    options.unlocked === null &&
    !options.flags.length &&
    !options.canSwap
  )
    return null;
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
      <div className="save-editor-fields">
        {options.unlocked !== null && (
          <label className="field">
            <span>{labels.unlocked}</span>
            <Select
              value={unlocked!}
              disabled={busy}
              onChange={(e) => setUnlocked(Number(e.target.value))}
            >
              {options.unlocked > report.boxCount && (
                <option value={options.unlocked}>{options.unlocked}</option>
              )}
              {Array.from({ length: report.boxCount + 1 }, (_, n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
        )}
        {flags.map((value, i) => (
          <label className="field" key={i}>
            <span>
              {labels.flags}
              {flags.length > 1 ? ` ${i + 1}` : ""} · {labels.max}{" "}
              {options.flagMaximum.toString(16).toUpperCase()}
            </span>
            <input
              value={value}
              maxLength={2}
              disabled={busy}
              onChange={(e) =>
                setFlags(
                  flags.map((v, n) =>
                    n === i ? e.target.value.toUpperCase() : v,
                  ),
                )
              }
            />
          </label>
        ))}
      </div>
      {report.generation === 6 && options.unlocked !== null && (
        <p className="save-editor-note">{labels.flagsNote}</p>
      )}
      {!layoutValid && (
        <p role="alert" className="save-editor-error">
          {labels.error}
        </p>
      )}
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
          disabled={busy || !changed || !valid || !layoutValid}
          onClick={() =>
            void onApply({
              box,
              name: options.canName && name !== entry.name ? name : null,
              wallpaper: wallpaper !== entry.wallpaper ? wallpaper : null,
              unlocked:
                unlocked !== options.unlocked && unlocked !== null
                  ? unlocked
                  : undefined,
              flags: flagsChanged ? parsedFlags : undefined,
            })
          }
        >
          {words.applyPokemon}
        </button>
        <button
          type="button"
          disabled={busy || !changed}
          onClick={() => {
            setName(entry.name);
            setWallpaper(entry.wallpaper);
            setUnlocked(options.unlocked);
            setFlags(
              options.flags.map((v) =>
                v.toString(16).toUpperCase().padStart(2, "0"),
              ),
            );
          }}
        >
          {labels.reset}
        </button>
      </div>
      {options.canSwap && (
        <fieldset disabled={busy || changed}>
          <legend>{labels.swap}</legend>
          <label className="field">
            <span>{labels.target}</span>
            <Select
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            >
              {report.boxes
                .filter((b) => b.index !== box)
                .map((b) => (
                  <option key={b.index} value={b.index}>
                    {b.index + 1} · {b.name}
                  </option>
                ))}
            </Select>
          </label>
          <button
            type="button"
            onClick={() =>
              void onApply({
                box,
                name: null,
                wallpaper: null,
                swapWith: target,
              })
            }
          >
            {labels.swap}
          </button>
          <p className="save-editor-note">{labels.note}</p>
        </fieldset>
      )}
    </details>
  );
}

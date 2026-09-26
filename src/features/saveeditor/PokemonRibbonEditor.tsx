import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ribbonImage } from "./art";
import { Select } from "../shared/Select";
import type { PokemonPosition, PokemonRawEdit, RibbonCatalog } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonRibbonEditor({
  position,
  generation,
  disabled,
  readDisabled,
  onRead,
  onApply,
}: {
  position: PokemonPosition;
  generation: number;
  disabled: boolean;
  readDisabled: boolean;
  onRead(position: PokemonPosition): Promise<RibbonCatalog | undefined>;
  onApply(edit: PokemonRawEdit): Promise<void>;
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
  const [original, setOriginal] = useState<RibbonCatalog>();
  const [draft, setDraft] = useState<RibbonCatalog>();
  const [query, setQuery] = useState("");
  const [owned, setOwned] = useState(false);
  const request = useRef(0);
  useEffect(() => {
    const lifecycle = request;
    return () => {
      lifecycle.current++;
    };
  }, []);
  const load = async () => {
    const id = ++request.current;
    const result = await onRead(position);
    if (id !== request.current || !result) return;
    setOriginal(result);
    setDraft(result);
  };
  const changed =
    draft?.entries.filter((r, i) => r.value !== original?.entries[i].value) ??
    [];
  const affixedChanged = draft?.affixed !== original?.affixed;
  const valid = draft?.entries.every(
    (r, i) =>
      r.value === original?.entries[i].value ||
      (Number.isInteger(r.value) && r.value >= 0 && r.value <= r.max),
  );
  const update = (key: string, value: number) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          entries: current.entries.map((r) =>
            r.key === key ? { ...r, value } : r,
          ),
        },
    );
  return (
    <details className="save-pokemon-editor">
      <summary>{words.ribbonTitle}</summary>
      <p className="save-editor-note">{words.ribbonNote}</p>
      {!draft ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={readDisabled}
            onClick={() => void load()}
          >
            {words.loadRibbons}
          </button>
        </div>
      ) : (
        <>
          <fieldset disabled={readDisabled} className="save-editor-fields">
            <legend>{words.ribbonTitle}</legend>
            <label className="field">
              <span>{words.searchRibbons}</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="field save-editor-checkbox">
              <input
                type="checkbox"
                checked={owned}
                onChange={(e) => setOwned(e.target.checked)}
              />
              <span>{words.ownedRibbons}</span>
            </label>
            {draft.affixed !== null && (
              <label className="field">
                <span>{words.affixedRibbon}</span>
                <Select
                  disabled={disabled}
                  value={draft.affixed}
                  onChange={(e) =>
                    setDraft({ ...draft, affixed: Number(e.target.value) })
                  }
                >
                  <option value={-1}>{words.noAffixedRibbon}</option>
                  {draft.affixed < -1 ||
                  draft.affixed >= draft.affixedChoices.length ? (
                    <option value={draft.affixed}>#{draft.affixed}</option>
                  ) : null}
                  {draft.affixedChoices.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
            )}
          </fieldset>
          <p className="save-editor-note">{words.ribbonAnalysisNote}</p>
          <fieldset
            disabled={disabled}
            className="save-editor-fields save-ribbon-list"
          >
            <legend>{words.ribbonTitle}</legend>
            {draft.entries
              .filter(
                (r) =>
                  (!owned || r.value !== 0) &&
                  r.name[lang]
                    .toLocaleLowerCase()
                    .includes(query.trim().toLocaleLowerCase()),
              )
              .map((r) => (
                <label
                  key={r.key}
                  className={`field ${r.max === 1 ? "save-editor-checkbox" : ""}`}
                >
                  {r.max === 1 ? (
                    <>
                      <input
                        type="checkbox"
                        checked={r.value !== 0}
                        onChange={(e) =>
                          update(r.key, Number(e.target.checked))
                        }
                      />
                      <span>
                        <span className="save-ribbon-name">
                          <RibbonIcon entry={r} generation={generation} />
                          {r.name[lang]}
                        </span>
                        <span
                          className="save-ribbon-status"
                          data-status={r.status}
                        >
                          {words.ribbonStatuses[r.status]}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="save-ribbon-name">
                        <RibbonIcon entry={r} generation={generation} />
                        {r.name[lang]} (0–{r.max})
                      </span>
                      <span
                        className="save-ribbon-status"
                        data-status={r.status}
                      >
                        {words.ribbonStatuses[r.status]}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={r.max}
                        step={1}
                        value={Number.isNaN(r.value) ? "" : r.value}
                        onChange={(e) =>
                          update(
                            r.key,
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value),
                          )
                        }
                      />
                    </>
                  )}
                </label>
              ))}
          </fieldset>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                setDraft({
                  ...draft,
                  entries: draft.entries.map((r) => ({ ...r, value: r.max })),
                })
              }
            >
              {words.allRibbons}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                setDraft({
                  ...draft,
                  affixed: draft.affixed === null ? null : -1,
                  entries: draft.entries.map((r) => ({ ...r, value: 0 })),
                })
              }
            >
              {words.clearRibbons}
            </button>
            <button
              type="button"
              disabled={
                disabled || !valid || (!changed.length && !affixedChanged)
              }
              onClick={() =>
                void onApply({
                  ...position,
                  action: "ribbons",
                  ribbons: {
                    values: changed.map(({ key, value }) => ({ key, value })),
                    ...(affixedChanged && draft.affixed !== null
                      ? { affixed: draft.affixed }
                      : {}),
                  },
                })
              }
            >
              {words.applyRibbons}
            </button>
          </div>
          <p className="save-editor-note">{words.ribbonSuggestNote}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={disabled || (!changed.length && !affixedChanged)}
              onClick={() => setDraft(original)}
            >
              {words.revertRibbonDraft}
            </button>
            {(["suggest", "minimal"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={
                  disabled ||
                  !draft.analysisComplete ||
                  changed.length > 0 ||
                  affixedChanged
                }
                onClick={() =>
                  void onApply({
                    ...position,
                    action: "ribbons",
                    ribbons: { values: [], mode },
                  })
                }
              >
                {mode === "suggest" ? words.ribbonSuggest : words.ribbonMinimal}
              </button>
            ))}
          </div>
        </>
      )}
    </details>
  );
}

function RibbonIcon({
  entry,
  generation,
}: {
  entry: RibbonCatalog["entries"][number];
  generation: number;
}) {
  const src = ribbonImage(entry.key, entry.max, entry.value, generation);
  return src ? (
    <img
      className="save-ribbon-icon"
      src={src}
      alt=""
      width={32}
      height={32}
      loading="lazy"
    />
  ) : null;
}

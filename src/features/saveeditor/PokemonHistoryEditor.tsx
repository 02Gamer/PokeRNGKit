import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type {
  GeoValue,
  HistoryCatalog,
  OriginChoice,
  PokemonPosition,
  PokemonRawEdit,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonHistoryEditor({
  position,
  disabled,
  readDisabled,
  onRead,
  onApply,
}: {
  position: PokemonPosition;
  disabled: boolean;
  readDisabled: boolean;
  onRead(position: PokemonPosition): Promise<HistoryCatalog | undefined>;
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
  const [catalog, setCatalog] = useState<HistoryCatalog>();
  const [handler, setHandler] = useState(0);
  const [locations, setLocations] = useState<GeoValue[]>([]);
  const request = useRef(0);
  useEffect(() => {
    const lifecycle = request;
    return () => {
      lifecycle.current++;
    };
  }, []);
  const reset = (value: HistoryCatalog) => {
    setHandler(value.holder.current);
    setLocations(
      value.geo?.entries.map(({ index, country, region }) => ({
        index,
        country,
        region,
      })) ?? [],
    );
  };
  const load = async () => {
    const id = ++request.current;
    const value = await onRead(position);
    if (!value || id !== request.current) return;
    setCatalog(value);
    reset(value);
  };
  const changed = locations.filter((v) => {
    const original = catalog?.geo?.entries[v.index];
    return (
      original &&
      (original.country !== v.country || original.region !== v.region)
    );
  });
  const holderChanged =
    catalog !== undefined && handler !== catalog.holder.current;
  const hasChanges = holderChanged || changed.length > 0;
  const update = (index: number, country: number, region: number) =>
    setLocations((previous) =>
      previous.map((v) => (v.index === index ? { index, country, region } : v)),
    );
  const options = (choices: OriginChoice[], value: number) => (
    <>
      {!choices.some((c) => c.id === value) && (
        <option value={value}>#{value}</option>
      )}
      {choices.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name[lang] || "—"}
        </option>
      ))}
    </>
  );
  return (
    <details className="save-pokemon-editor">
      <summary>{words.historyTitle}</summary>
      <p className="save-editor-note">{words.historyNote}</p>
      {!catalog ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={readDisabled}
            onClick={() => void load()}
          >
            {words.loadHistory}
          </button>
        </div>
      ) : (
        <>
          <fieldset className="save-editor-fields" disabled={disabled}>
            <legend>{words.currentHolder}</legend>
            <label className="field">
              <span>{words.currentHolder}</span>
              <Select
                value={handler}
                disabled={
                  disabled ||
                  (!catalog.holder.handling && catalog.holder.current === 0)
                }
                onChange={(e) => setHandler(Number(e.target.value))}
              >
                {![0, 1].includes(handler) && (
                  <option value={handler}>#{handler}</option>
                )}
                <option value={0}>
                  {words.originalTrainer}: {catalog.holder.original}
                </option>
                <option value={1} disabled={!catalog.holder.handling}>
                  {words.handlingTrainer}: {catalog.holder.handling}
                </option>
              </Select>
            </label>
          </fieldset>
          {catalog.geo && (
            <details className="save-pokemon-editor">
              <summary>{words.residenceHistory}</summary>
              {locations.map((v) => {
                const canEdit = catalog.geo!.entries[v.index].canEdit;
                const regions =
                  catalog.geo!.regions.find((r) => r.country === v.country)
                    ?.choices ?? [];
                return (
                  <fieldset
                    key={v.index}
                    className="save-editor-fields"
                    disabled={disabled}
                  >
                    <legend>
                      {words.residenceHistory} {v.index + 1}
                    </legend>
                    <label className="field">
                      <span>{words.historyCountry}</span>
                      <Select
                        disabled={disabled || !canEdit}
                        value={v.country}
                        onChange={(e) => {
                          const country = Number(e.target.value);
                          update(
                            v.index,
                            country,
                            catalog.geo!.regions.find(
                              (r) => r.country === country,
                            )?.choices[0]?.id ?? 0,
                          );
                        }}
                      >
                        {options(catalog.geo!.countries, v.country)}
                      </Select>
                    </label>
                    <label className="field">
                      <span>{words.historyRegion}</span>
                      <Select
                        disabled={disabled || !canEdit || v.country === 0}
                        value={v.region}
                        onChange={(e) =>
                          update(v.index, v.country, Number(e.target.value))
                        }
                      >
                        {options(regions, v.region)}
                      </Select>
                    </label>
                    <button
                      type="button"
                      disabled={disabled || (v.country === 0 && v.region === 0)}
                      onClick={() => update(v.index, 0, 0)}
                    >
                      {words.clearResidence}
                    </button>
                  </fieldset>
                );
              })}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={
                    disabled ||
                    locations.every((v) => v.country === 0 && v.region === 0)
                  }
                  onClick={() =>
                    setLocations((previous) =>
                      previous.map((v) => ({ ...v, country: 0, region: 0 })),
                    )
                  }
                >
                  {words.clearAllResidences}
                </button>
              </div>
            </details>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={disabled || !hasChanges}
              onClick={() => reset(catalog)}
            >
              {words.revertHistory}
            </button>
            <button
              type="button"
              disabled={disabled || !hasChanges}
              onClick={() =>
                void onApply({
                  ...position,
                  action: "history",
                  history: {
                    handler: holderChanged ? handler : undefined,
                    locations: changed.length ? changed : undefined,
                  },
                })
              }
            >
              {words.applyHistory}
            </button>
          </div>
        </>
      )}
    </details>
  );
}

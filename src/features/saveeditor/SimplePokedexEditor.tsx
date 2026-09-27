import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  dexDraft,
  setAllDex,
  validateSimpleDex,
  type SimpleDexCatalog,
  type SimpleDexEdit,
  type SimpleDexFlag,
} from "./simplePokedex";
import { speciesImage } from "./art";
import { localizeSaveError, type saveEditorResources } from "./locales";

export function SimplePokedexEditor({
  revision,
  fileName,
  busy,
  onRead,
  onApply,
}: {
  revision: number;
  fileName: string;
  busy: boolean;
  onRead(): Promise<SimpleDexCatalog | undefined>;
  onApply(edit: SimpleDexEdit): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const language = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const [catalog, setCatalog] = useState<SimpleDexCatalog>();
  const [draft, setDraft] = useState<SimpleDexFlag[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const reader = useRef(onRead);
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  const accept = (value: SimpleDexCatalog | undefined) => {
    setCatalog(value);
    setDraft(value ? dexDraft(value) : []);
    setError("");
  };
  useEffect(() => {
    let active = true;
    void reader.current().then((value) => {
      if (active) accept(value);
    });
    return () => {
      active = false;
    };
  }, [revision]);
  const disabled = busy || !catalog?.canEdit;
  const query = search.trim().toLocaleLowerCase();
  const visible =
    catalog?.entries.filter(
      (entry) =>
        !query ||
        String(entry.species).includes(query) ||
        String(entry.species).padStart(3, "0").includes(query) ||
        Object.values(entry.name).some((n) =>
          n.toLocaleLowerCase().includes(query),
        ),
    ) ?? [];
  const bySpecies = new Map(draft.map((entry) => [entry.species, entry]));
  const apply = async () => {
    if (!catalog) return;
    setError("");
    try {
      await onApply(validateSimpleDex(fileName, draft, catalog));
    } catch (e) {
      setError(
        localizeSaveError(e instanceof Error ? e.message : String(e), words),
      );
    }
  };
  return (
    <section className="save-pokedex-editor">
      <h3>{words.pokedexTitle}</h3>
      {!catalog ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRead().then(accept)}
        >
          {words.pokedexRead}
        </button>
      ) : (
        <>
          <p className="save-editor-note">{words.pokedexNote}</p>
          {catalog.generation === 2 && (
            <p className="save-editor-note">{words.pokedexGen2}</p>
          )}
          {catalog.generation === 3 && (
            <p className="save-editor-note">{words.pokedexGen3}</p>
          )}
          {catalog.virtualConsole && (
            <p className="save-editor-note">{words.pokedexVc}</p>
          )}
          <label className="field">
            <span>{words.pokedexSearch}</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <p>
            {words.pokedexCounts
              .replace("{seen}", String(draft.filter((e) => e.seen).length))
              .replace("{caught}", String(draft.filter((e) => e.caught).length))
              .replace("{total}", String(draft.length))}
          </p>
          <div className="save-editor-toolbar">
            {(
              [
                ["seen", true, words.pokedexSeenAll],
                ["seen", false, words.pokedexSeenNone],
                ["caught", true, words.pokedexCaughtAll],
                ["caught", false, words.pokedexCaughtNone],
              ] as const
            ).map(([field, value, label]) => (
              <button
                key={`${field}:${value}`}
                type="button"
                disabled={disabled}
                onClick={() =>
                  setDraft((current) =>
                    setAllDex(current, catalog, field, value),
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="save-pokedex-table-wrap">
            <table className="save-inventory-table">
              <thead>
                <tr>
                  <th scope="col">{words.pokemon}</th>
                  <th scope="col">{words.pokedexSeen}</th>
                  <th scope="col">{words.pokedexCaught}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => {
                  const value = bySpecies.get(entry.species) ?? entry;
                  return (
                    <tr key={entry.species}>
                      <th scope="row">
                        <span className="save-inventory-item-label">
                          <img
                            width={32}
                            height={32}
                            loading="lazy"
                            alt=""
                            className="save-inventory-image"
                            src={speciesImage(entry.species)}
                          />
                          {String(entry.species).padStart(3, "0")} ·{" "}
                          {entry.name[language]}
                        </span>
                      </th>
                      {(["seen", "caught"] as const).map((field) => (
                        <td key={field}>
                          <label className="save-pokedex-check">
                            <input
                              type="checkbox"
                              checked={value[field]}
                              disabled={
                                disabled ||
                                (field === "caught" && !entry.canCatch)
                              }
                              aria-label={`${entry.name[language]} · ${field === "seen" ? words.pokedexSeen : words.pokedexCaught}`}
                              onChange={(e) =>
                                setDraft((current) =>
                                  current.map((row) =>
                                    row.species === entry.species
                                      ? { ...row, [field]: e.target.checked }
                                      : row,
                                  ),
                                )
                              }
                            />
                          </label>
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {!visible.length && (
                  <tr>
                    <td colSpan={3}>{words.pokedexNoMatches}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              className="primary"
              disabled={disabled}
              onClick={() => void apply()}
            >
              {words.pokedexApply}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setDraft(dexDraft(catalog))}
            >
              {words.pokedexReset}
            </button>
          </div>
          {error && (
            <p role="alert" className="save-editor-error">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}

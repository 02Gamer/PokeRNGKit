import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { boxArchiveWords, type BoxArchiveRequest } from "./boxArchive";

export function BoxArchiveEditor({
  box,
  busy,
  onExport,
}: {
  box: number;
  busy: boolean;
  onExport(request: BoxArchiveRequest): Promise<boolean>;
}) {
  const { i18n } = useTranslation();
  const words =
    boxArchiveWords[
      i18n.language.startsWith("zh")
        ? "zh"
        : i18n.language.startsWith("ja")
          ? "ja"
          : "en"
    ];
  const [all, setAll] = useState(box < 0);
  const [folderMode, setFolderMode] = useState(1);
  const [folderNaming, setFolderNaming] = useState(2);
  const [indexPrefix, setIndexPrefix] = useState(3);
  const [include, setInclude] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  return (
    <details className="save-pokemon-editor save-box-archive">
      <summary>{words.title}</summary>
      <p className="save-editor-note">{words.note}</p>
      <fieldset disabled={busy}>
        <div className="save-editor-fields">
          <label className="field">
            <span>{words.scope}</span>
            <Select
              value={all ? 1 : 0}
              onChange={(e) => {
                setAll(e.target.value === "1");
                setDownloaded(false);
              }}
            >
              {words.scopes.map((label, value) => (
                <option
                  key={value}
                  value={value}
                  disabled={value === 0 && box < 0}
                >
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{words.folders}</span>
            <Select
              value={folderMode}
              onChange={(e) => {
                setFolderMode(Number(e.target.value));
                setDownloaded(false);
              }}
            >
              {words.folderModes.map((label, value) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{words.naming}</span>
            <Select
              value={folderNaming}
              disabled={folderMode === 0}
              onChange={(e) => {
                setFolderNaming(Number(e.target.value));
                setDownloaded(false);
              }}
            >
              {words.names.map((label, value) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{words.prefix}</span>
            <Select
              value={indexPrefix}
              onChange={(e) => {
                setIndexPrefix(Number(e.target.value));
                setDownloaded(false);
              }}
            >
              {words.prefixes.map((label, value) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="save-pokedex-check">
          <input
            type="checkbox"
            checked={include}
            onChange={(e) => {
              setInclude(e.target.checked);
              setDownloaded(false);
            }}
          />{" "}
          {words.include}
        </label>
        {include && <p className="save-editor-note">{words.includeNote}</p>}
        <div className="save-editor-toolbar">
          <button
            type="button"
            onClick={async () => {
              setDownloaded(false);
              setDownloaded(
                await onExport({
                  box,
                  all,
                  folderMode,
                  folderNaming,
                  indexPrefix,
                  emptySlots: include ? 1 : 0,
                }),
              );
            }}
          >
            {words.download}
          </button>
        </div>
      </fieldset>
      {downloaded && <p role="status">{words.downloaded}</p>}
    </details>
  );
}

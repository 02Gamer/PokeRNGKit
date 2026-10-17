// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from "react";
import { Select } from "../shared/Select";
import { SaveEditorClient } from "./client";
import {
  saveDetectionWords,
  saveFormatName,
  saveHandlerName,
  unsupportedSaveChoice,
  saveDetectionPairError,
  type SaveDetectionCatalog,
  type SaveDetectionChoice,
} from "./saveDetection";

export function SaveDetectionEditor({
  lang,
  busy,
  onOpen,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
  onOpen(file: File, choice: SaveDetectionChoice): Promise<boolean>;
}) {
  const words = saveDetectionWords[lang];
  const [catalog, setCatalog] = useState<SaveDetectionCatalog>();
  const [type, setType] = useState(0);
  const [version, setVersion] = useState(0);
  const [language, setLanguage] = useState(2);
  const [handler, setHandler] = useState("Default");
  const [file, setFile] = useState<File>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const client = new SaveEditorClient();
    let active = true;
    void client
      .run(new Uint8Array(), undefined, "saveDetectionCatalog")
      .then((result) => {
        if (!active) return;
        const value = result.saveDetectionCatalog;
        if (!value || value.apiVersion !== 185 || !value.types.length)
          throw new Error("Invalid catalog");
        setCatalog(value);
        setType(value.types[0].id);
        setVersion(value.types[0].versions[0]?.id ?? 0);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      client.dispose();
    };
  }, []);
  const selected = catalog?.types.find((value) => value.id === type);
  const unsupported = unsupportedSaveChoice(selected, version, language);
  return (
    <fieldset className="save-food-fields" disabled={busy || !catalog}>
      <legend>{words.title}</legend>
      <p>{words.hint}</p>
      {failed && <p role="alert">{words.invalid}</p>}
      <div className="save-editor-fields">
        <label className="field">
          <span>{words.type}</span>
          <Select
            value={type}
            onChange={(event) => {
              const next = Number(event.target.value);
              setType(next);
              setVersion(
                catalog?.types.find((value) => value.id === next)?.versions[0]
                  ?.id ?? 0,
              );
            }}
          >
            {catalog?.types.map((value) => (
              <option key={value.id} value={value.id}>
                {saveFormatName(value.name, lang)}
              </option>
            ))}
          </Select>
        </label>
        {Boolean(selected?.versions.length) && (
          <label className="field">
            <span>{words.version}</span>
            <Select
              value={version}
              onChange={(event) => setVersion(Number(event.target.value))}
            >
              {selected?.versions.map((value) => (
                <option key={value.id} value={value.id}>
                  {value.name[lang]}
                </option>
              ))}
            </Select>
          </label>
        )}
        <label className="field">
          <span>{words.language}</span>
          <Select
            value={language}
            onChange={(event) => setLanguage(Number(event.target.value))}
          >
            {catalog?.languages.map((value) => (
              <option
                key={value.id}
                value={value.id}
                disabled={unsupportedSaveChoice(selected, version, value.id)}
              >
                {value.name[lang]}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{words.handler}</span>
          <Select
            value={handler}
            onChange={(event) => setHandler(event.target.value)}
          >
            {catalog?.handlers.map((value) => (
              <option key={value} value={value}>
                {saveHandlerName(value, lang)}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{words.file}</span>
          <input
            type="file"
            onChange={(event) => {
              setFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {unsupported && (
        <p role="alert" className="save-editor-error">
          {saveDetectionPairError[lang]}
        </p>
      )}
      {file && <p>{file.name}</p>}
      <button
        type="button"
        className="primary"
        disabled={busy || !catalog || !file || unsupported}
        onClick={() => {
          if (file)
            void onOpen(file, {
              type,
              subVersion: version,
              language,
              handler,
              fileName: file.name,
            });
        }}
      >
        {words.open}
      </button>
    </fieldset>
  );
}

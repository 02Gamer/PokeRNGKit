// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import {
  loadDatabaseFiles,
  replaceDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
import {
  trainerDirectory,
  trainerLibraryFiles,
  trainerFilePayload,
  readTrainerFiles,
  mergeTrainerFiles,
} from "./trainerLibrary";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { beginSaveRequest } from "./clientActivity";
import { trainerLibraryWords } from "./trainerLibraryWords";
import { readSaveSettings } from "./settingsRepository";
import "./TrainerLibraryWorkspace.css";
export function TrainerLibraryWorkspace({
  lang,
  busy,
  onChanged,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
  onChanged(): void;
}) {
  const json = useSaveSettingsJson(),
    w = trainerLibraryWords[lang];
  let directory = "";
  try {
    directory = trainerDirectory(json);
  } catch {
    /* Invalid settings keep imports locked. */
  }
  const [loaded, setLoaded] = useState<{
      directory: string;
      files: DatabaseLocalFile[];
      undo?: DatabaseLocalFile[];
    }>(),
    [reload, setReload] = useState(0),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState<"failed">();
  const life = useRef({ alive: true, epoch: 0 }),
    flight = useRef(false);
  useEffect(() => {
    const state = life.current;
    state.alive = true;
    const epoch = ++state.epoch;
    void loadDatabaseFiles()
      .then((files) => {
        if (state.alive && state.epoch === epoch) {
          setLoaded({ directory, files });
          setMessage(undefined);
        }
      })
      .catch(() => {
        if (state.alive && state.epoch === epoch) {
          setLoaded(undefined);
          setMessage("failed");
        }
      });
    return () => {
      state.alive = false;
      state.epoch++;
    };
  }, [directory, reload]);
  async function act(
    files?: File[],
    folder = false,
    remove?: string,
    undo = false,
  ) {
    if (busy || flight.current || !directory || loaded?.directory !== directory)
      return;
    const before = loaded,
      epoch = life.current.epoch,
      current = () =>
        life.current.alive &&
        life.current.epoch === epoch &&
        (readSaveSettings()?.json ?? "") === json;
    flight.current = true;
    setPending(true);
    setMessage(undefined);
    const finish = beginSaveRequest();
    try {
      const added = files
        ? await readTrainerFiles(files, directory, folder, current)
        : [];
      if (!added || !current()) return;
      const next =
        undo && before.undo
          ? before.undo
          : remove
            ? before.files.filter((f) => f.id !== remove)
            : mergeTrainerFiles(before.files, added);
      trainerFilePayload(next, directory);
      await replaceDatabaseFiles(before.files, next);
      if (current()) {
        setLoaded({ directory, files: next, undo: before.files });
        onChanged();
      }
    } catch {
      if (life.current.alive && life.current.epoch === epoch)
        setMessage("failed");
    } finally {
      finish();
      flight.current = false;
      if (life.current.alive) setPending(false);
    }
  }
  const locked =
    busy || pending || !directory || loaded?.directory !== directory;
  const files =
    loaded?.directory === directory
      ? trainerLibraryFiles(loaded.files, directory)
      : [];
  return (
    <details>
      <summary>{w.title}</summary>
      <p className="save-editor-note">{w.note}</p>
      <p>
        {w.directory}: {directory}
      </p>
      <div className="save-editor-toolbar">
        {[false, true].map((folder) => (
          <label className="field" key={String(folder)}>
            <span>{folder ? w.folder : w.files}</span>
            <input
              type="file"
              multiple
              disabled={locked}
              {...(folder ? { webkitdirectory: "", directory: "" } : {})}
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                event.target.value = "";
                if (selected.length) void act(selected, folder);
              }}
            />
          </label>
        ))}
        <button
          type="button"
          disabled={locked || !loaded?.undo}
          onClick={() => void act(undefined, false, undefined, true)}
        >
          {w.undo}
        </button>
        <button
          type="button"
          disabled={busy || pending}
          onClick={() => {
            setLoaded(undefined);
            setReload((v) => v + 1);
          }}
        >
          {w.reload}
        </button>
      </div>
      {message && <p role="alert">{w[message]}</p>}
      {!locked && !files.length && <p>{w.empty}</p>}
      {!!files.length && (
        <div
          className="save-trainer-library-files"
          role="list"
          aria-label={w.title}
          tabIndex={0}
        >
          {files.map((file) => (
            <div
              className="save-trainer-library-file"
              role="listitem"
              key={file.id}
            >
              <span>
                {file.directory}/{file.name}
              </span>
              <button
                type="button"
                disabled={locked}
                onClick={() => void act(undefined, false, file.id)}
              >
                {w.remove}
              </button>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

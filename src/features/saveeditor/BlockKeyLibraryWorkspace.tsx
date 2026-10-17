// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { blockKeyWords } from "./blockKeyDefaults";
import {
  blockKeyDirectory,
  loadBlockKeyLibrary,
  readBlockKeyFiles,
  replaceBlockKeyLibrary,
  mergeBlockKeyFiles,
  subscribeBlockKeyLibrary,
  type BlockKeyLibrary,
} from "./blockKeyLibrary";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { beginSaveRequest } from "./clientActivity";
export function BlockKeyLibraryWorkspace({
  lang,
  busy,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
}) {
  const json = useSaveSettingsJson(),
    w = blockKeyWords[lang];
  const [snapshot, setSnapshot] = useState<BlockKeyLibrary>(),
    [undo, setUndo] = useState<BlockKeyLibrary>(),
    [reload, setReload] = useState(0),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState<"failed" | "saved">();
  const flight = useRef(false),
    life = useRef(0),
    [origin] = useState(() => ({}));
  let directory = "";
  try {
    directory = blockKeyDirectory(json);
  } catch {
    /* Invalid settings lock imports. */
  }
  useEffect(() => {
    let active = true;
    const epoch = ++life.current;
    void loadBlockKeyLibrary(true)
      .then((v) => {
        if (active && epoch === life.current) {
          setSnapshot(v);
          setUndo(undefined);
        }
      })
      .catch(() => {
        if (active) {
          setUndo(undefined);
          setSnapshot(undefined);
          setMessage("failed");
        }
      });
    return () => {
      active = false;
      life.current = epoch + 1;
    };
  }, [reload, directory]);
  useEffect(
    () =>
      subscribeBlockKeyLibrary((o) => {
        if (o === origin) return;
        setSnapshot(undefined);
        setUndo(undefined);
        setReload((v) => v + 1);
      }),
    [origin],
  );
  async function act(
    files?: File[],
    folder = false,
    remove?: string,
    restore = false,
  ) {
    if (busy || flight.current || !snapshot || !directory) return;
    flight.current = true;
    setPending(true);
    setMessage(undefined);
    const epoch = life.current,
      before = snapshot,
      finish = beginSaveRequest();
    try {
      const added = files
        ? await readBlockKeyFiles(files, directory, folder)
        : undefined;
      if (epoch !== life.current) return;
      const next =
        restore && undo
          ? undo.files
          : remove
            ? before.files.filter((f) => f.id !== remove)
            : mergeBlockKeyFiles(before, added ?? []);
      const value = await replaceBlockKeyLibrary(before, next, origin);
      if (epoch === life.current) {
        setSnapshot(value);
        setUndo(before);
        setMessage("saved");
      }
    } catch {
      if (epoch === life.current) setMessage("failed");
    } finally {
      finish();
      flight.current = false;
      setPending(false);
    }
  }
  const locked = busy || pending || !snapshot || !directory;
  return (
    <details>
      <summary>{w.title}</summary>
      <p className="save-editor-note">{w.note}</p>
      <p>
        {w.loaded}: {directory}
      </p>
      <div className="save-editor-toolbar">
        {[false, true].map((folder) => (
          <label className="field" key={String(folder)}>
            <span>{folder ? w.folder : w.files}</span>
            <input
              type="file"
              accept=".txt"
              multiple
              disabled={locked}
              {...(folder ? { webkitdirectory: "", directory: "" } : {})}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length) void act(files, folder);
              }}
            />
          </label>
        ))}
        <button
          type="button"
          disabled={locked || !undo}
          onClick={() => void act(undefined, false, undefined, true)}
        >
          {w.undo}
        </button>
        <button
          type="button"
          disabled={busy || pending}
          onClick={() => {
            setSnapshot(undefined);
            setReload((v) => v + 1);
          }}
        >
          {w.reload}
        </button>
      </div>
      {message && (
        <p role={message === "failed" ? "alert" : "status"}>{w[message]}</p>
      )}
      {snapshot?.files.filter((f) => f.directory === directory).length ===
        0 && <p>{w.empty}</p>}
      {snapshot?.files
        .filter((f) => f.directory === directory)
        .map((f) => (
          <div className="save-editor-toolbar" key={f.id}>
            <span>{f.name}</span>
            <button
              type="button"
              disabled={locked}
              onClick={() => void act(undefined, false, f.id)}
            >
              {w.remove}
            </button>
          </div>
        ))}
    </details>
  );
}

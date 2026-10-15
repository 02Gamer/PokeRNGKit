// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { SaveEditorClient } from "./client";
import { decodeDatabaseBytes } from "./databaseProtocol";
import {
  loadSaveFolder,
  replaceSaveFolder,
  readSaveFolderFiles,
  type SaveFolderSnapshot,
} from "./saveFolderRepository";
import {
  applySaveFolderDelta,
  saveFolderPacket,
  saveFolderHash,
  type SaveFolderQuery,
  type SaveFolderTicket,
  type SaveFolderView,
  type SaveFolderRow,
} from "./saveFolderProtocol";
import { saveFolderWords } from "./saveFolderWords";
import {
  saveLibraryLocations,
  saveLibraryShortcuts,
  libraryFolderName,
  saveLocationWords,
} from "./saveLibraryLocations";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import "./SaveFolderViewer.css";
export function SaveFolderViewer({
  lang,
  busy,
  onOpen,
  onClose,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
  onOpen(file: File, sourceId?: string): Promise<boolean>;
  onClose(): void;
}) {
  const w = saveFolderWords[lang],
    client = useRef(new SaveEditorClient()),
    active = useRef(true),
    running = useRef(false),
    latestWords = useRef(w);
  const settingsJson = useSaveSettingsJson();
  const [snapshot, setSnapshot] = useState<SaveFolderSnapshot>(),
    [view, setView] = useState<SaveFolderView>(),
    [pending, setPending] = useState(true),
    [message, setMessage] = useState("");
  const [query, setQuery] = useState<SaveFolderQuery>({
    backup: false,
    column: -1,
    text: "",
    sort: -1,
    descending: false,
    culture: lang === "zh" ? "zh-CN" : lang === "ja" ? "ja-JP" : "en-US",
  });
  const [applied, setApplied] = useState<SaveFolderQuery>({ ...query });
  const [folders, setFolders] = useState(false),
    [selected, setSelected] = useState<string>(),
    [ticket, setTicket] = useState<SaveFolderTicket>(),
    [committed, setCommitted] =
      useState<import("./saveFolderProtocol").SaveFolderDelta>(),
    [undo, setUndo] = useState<SaveFolderSnapshot>();
  const [backupSelection, setBackupSelection] = useState(false),
    [deleteInvalid, setDeleteInvalid] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    folderInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    latestWords.current = w;
  }, [w]);
  useEffect(() => {
    const workerClient = client.current;
    active.current = true;
    let live = true;
    void (async () => {
      await Promise.resolve();
      if (!live) return;
      running.current = true;
      setPending(true);
      setView(undefined);
      setTicket(undefined);
      setCommitted(undefined);
      setSelected(undefined);
      try {
        const value = await loadSaveFolder();
        if (!live) return;
        const packet = saveFolderPacket(value.files);
        const result = await client.current.runSaveFolder(
          JSON.stringify({ files: packet.descriptors }),
          "saveFolderOpen",
          packet.bytes,
        );
        if (!live) return;
        if (!result.saveFolder) throw Error();
        setSnapshot(value);
        setView(result.saveFolder);
      } catch {
        if (live) setMessage(latestWords.current.failed);
      } finally {
        if (live) {
          running.current = false;
          setPending(false);
        }
      }
    })();
    return () => {
      live = false;
      active.current = false;
      running.current = false;
      workerClient.dispose();
    };
  }, [settingsJson]);
  const locked = busy || pending,
    blocked = locked || Boolean(ticket);
  async function run(task: () => Promise<void>) {
    if (running.current || busy) return;
    running.current = true;
    setPending(true);
    setMessage("");
    try {
      await task();
    } catch {
      if (active.current) setMessage(w.failed);
    } finally {
      if (active.current) {
        running.current = false;
        setPending(false);
      }
    }
  }
  async function open(value: SaveFolderSnapshot, q = query) {
    if (active.current) {
      setSnapshot(value);
      setView(undefined);
      setSelected(undefined);
      setTicket(undefined);
      setCommitted(undefined);
    }
    const packet = saveFolderPacket(value.files);
    const result = await client.current.runSaveFolder(
      JSON.stringify({ files: packet.descriptors }),
      "saveFolderOpen",
      packet.bytes,
    );
    if (!result.saveFolder) throw Error();
    if (!active.current) return;
    setSnapshot(value);
    setView(result.saveFolder);
    setSelected(undefined);
    setTicket(undefined);
    setCommitted(undefined);
    await read(q, 0);
  }
  async function read(q = query, offset = 0) {
    if (active.current) {
      setView(undefined);
      setSelected(undefined);
    }
    const result = await client.current.runSaveFolder(
      JSON.stringify({
        query: {
          ...q,
          culture: lang === "zh" ? "zh-CN" : lang === "ja" ? "ja-JP" : "en-US",
        },
        offset,
        limit: 50,
      }),
      "saveFolderRead",
    );
    if (!result.saveFolder) throw Error();
    if (active.current) {
      setView(result.saveFolder);
      setQuery(q);
      setApplied(q);
      setSelected(undefined);
    }
  }
  async function add(files: File[]) {
    const added = await readSaveFolderFiles(files, backupSelection),
      before = snapshot ?? (await loadSaveFolder());
    const next = await replaceSaveFolder(before, [...before.files, ...added]);
    if (active.current) {
      setUndo(before);
      await open(next);
    }
  }
  async function prepare(action: "remove" | "cleanup") {
    if (!snapshot) return;
    const packet = saveFolderPacket(snapshot.files);
    const result = await client.current.runSaveFolder(
      JSON.stringify({
        files: packet.descriptors,
        edit: {
          action,
          id: action === "remove" ? selected : undefined,
          deleteUnrecognized: deleteInvalid,
        },
      }),
      "saveFolderPreview",
      packet.bytes,
    );
    if (!result.saveFolderPreview) throw Error();
    if (active.current) {
      setTicket(result.saveFolderPreview);
      setCommitted(undefined);
    }
  }
  async function confirm() {
    if (!snapshot || !ticket) return;
    let delta = committed;
    if (!delta) {
      const packet = saveFolderPacket(snapshot.files);
      let result: import("./saveFolderProtocol").SaveFolderResult;
      try {
        result = await client.current.runSaveFolder(
          JSON.stringify({
            files: packet.descriptors,
            confirmation: ticket.confirmation,
          }),
          "saveFolderCommit",
          packet.bytes,
        );
      } catch {
        if (active.current) {
          setTicket(undefined);
          setCommitted(undefined);
        }
        throw Error();
      }
      if (!result.saveFolderDelta) throw Error();
      delta = result.saveFolderDelta;
      if (active.current) setCommitted(delta);
    }
    const after = applySaveFolderDelta(snapshot.files, delta);
    if (
      (await saveFolderHash(after)) !== delta.filesHash ||
      delta.filesHash !== ticket.confirmation.outputHash
    )
      throw Error();
    let next: SaveFolderSnapshot;
    try {
      next = await replaceSaveFolder(snapshot, after);
    } catch {
      if (active.current) setMessage(w.storage);
      return;
    }
    if (!active.current) return;
    setUndo(snapshot);
    await open(next);
    setMessage(w.saved);
  }
  async function discard() {
    if (ticket && !committed)
      await client.current.runSaveFolder(
        ticket.confirmation.token,
        "saveFolderDiscard",
      );
    if (active.current) {
      setTicket(undefined);
      setCommitted(undefined);
    }
  }
  async function openSelected() {
    if (!snapshot || !selected) return;
    const packet = saveFolderPacket(snapshot.files);
    const result = await client.current.runSaveFolder(
      JSON.stringify({ files: packet.descriptors, id: selected }),
      "saveFolderOpenFile",
      packet.bytes,
    );
    if (!result.saveFolderOpened) throw Error();
    const value = result.saveFolderOpened,
      source = snapshot.files.find((f) => f.id === value.id);
    if (!source) throw Error();
    const opened = await onOpen(
      new File([decodeDatabaseBytes(value.data)], value.name, {
        lastModified: source.modified,
      }),
      source.id,
    );
    if (!opened) throw Error();
    if (active.current) onClose();
  }
  function download() {
    const file = snapshot?.files.find((f) => f.id === selected);
    if (!file) return;
    const url = URL.createObjectURL(new Blob([file.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const cells = (row: SaveFolderRow) => [
    row.ot,
    String(row.generation),
    row.gameName[lang],
    row.played,
    row.fileTime,
    row.tid,
    row.sid,
    row.folder,
    row.name,
  ];
  let shortcuts: ReturnType<typeof saveLibraryShortcuts> = [];
  try {
    shortcuts = saveLibraryShortcuts(
      snapshot?.files ?? [],
      saveLibraryLocations(settingsJson),
    );
  } catch {
    /* The client reports invalid complete settings. */
  }
  const groups = [
    ...new Set(snapshot?.files.map((f) => libraryFolderName(f.folder)) ?? []),
  ];
  const locations = [
    ...new Set([...shortcuts.map((item) => item.path), ...groups]),
  ];
  return (
    <section
      className="save-folder-viewer"
      aria-label={w.title}
      aria-busy={locked}
    >
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={blocked}
          onClick={() => void run(async () => open(await loadSaveFolder()))}
        >
          {w.reload}
        </button>
        <label className="save-folder-check">
          <input
            type="checkbox"
            checked={backupSelection}
            disabled={blocked}
            onChange={(e) => setBackupSelection(e.target.checked)}
          />
          {w.backup}
        </label>
        <button
          type="button"
          disabled={blocked}
          onClick={() => fileInput.current?.click()}
        >
          {w.choose}
        </button>
        <button
          type="button"
          disabled={blocked}
          onClick={() => folderInput.current?.click()}
        >
          {w.chooseFolder}
        </button>
        <button
          type="button"
          disabled={blocked || !undo || !snapshot}
          onClick={() =>
            void run(async () => {
              if (!snapshot || !undo) return;
              const next = await replaceSaveFolder(snapshot, undo.files);
              setUndo(undefined);
              await open(next);
            })
          }
        >
          {w.undo}
        </button>
      </div>
      <input
        hidden
        type="file"
        multiple
        ref={fileInput}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void run(() => add(files));
        }}
      />
      <input
        hidden
        type="file"
        multiple
        ref={folderInput}
        {...{ webkitdirectory: "", directory: "" }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void run(() => add(files));
        }}
      />
      <div className="save-editor-toolbar">
        {(["recent", "backup", "folders"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            disabled={blocked}
            aria-pressed={
              tab === "folders"
                ? folders
                : !folders &&
                  !applied.folderRoot &&
                  applied.backup === (tab === "backup")
            }
            onClick={() =>
              void run(async () => {
                setFolders(tab === "folders");
                if (tab !== "folders")
                  await read({
                    ...query,
                    folderRoot: null,
                    backup: tab === "backup",
                  });
              })
            }
          >
            {w[tab]}
          </button>
        ))}
      </div>
      {folders ? (
        <>
          <p className="save-editor-note">{saveLocationWords[lang].note}</p>
          <ul
            className="save-folder-shortcuts"
            aria-label={saveLocationWords[lang].title}
          >
            {shortcuts.map((item) => (
              <li key={item.path}>
                <button
                  type="button"
                  disabled={blocked || !item.available}
                  title={item.path}
                  onClick={() =>
                    void run(async () => {
                      setFolders(false);
                      await read({ ...query, folderRoot: item.path });
                    })
                  }
                >
                  {item.backup ? `${w.backup} · ${item.path}` : item.path}
                </button>
              </li>
            ))}
          </ul>
          <ul className="save-folder-shortcuts">
            {groups.map((folder) => (
              <li key={folder}>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() =>
                    void run(async () => {
                      setFolders(false);
                      await read({ ...query, folderRoot: folder });
                    })
                  }
                >
                  {folder || w.path}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="save-folder-fields">
            <label className="field">
              <span>{saveLocationWords[lang].scope}</span>
              <Select
                disabled={blocked}
                value={query.folderRoot ?? ""}
                onChange={(event) =>
                  setQuery({ ...query, folderRoot: event.target.value || null })
                }
              >
                <option value="">{saveLocationWords[lang].all}</option>
                {locations.map((path) => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{w.filter}</span>
              <Select
                disabled={blocked}
                value={query.column}
                onChange={(e) =>
                  setQuery((q) => ({ ...q, column: Number(e.target.value) }))
                }
              >
                <option value={-1}>{w.any}</option>
                {w.columns.map((name, index) => (
                  <option key={index} value={index}>
                    {name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{w.text}</span>
              <input
                maxLength={32767}
                disabled={blocked || query.column < 0}
                value={query.text}
                onChange={(e) =>
                  setQuery((q) => ({ ...q, text: e.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>{w.sort}</span>
              <Select
                disabled={blocked}
                value={query.sort}
                onChange={(e) =>
                  setQuery((q) => ({ ...q, sort: Number(e.target.value) }))
                }
              >
                <option value={-1}>{w.any}</option>
                {w.columns.map((name, index) => (
                  <option key={index} value={index}>
                    {name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="save-folder-check">
              <input
                type="checkbox"
                checked={query.descending}
                disabled={blocked}
                onChange={(e) =>
                  setQuery((q) => ({ ...q, descending: e.target.checked }))
                }
              />
              {w.descending}
            </label>
            <button
              type="button"
              disabled={blocked || !view}
              onClick={() => void run(() => read())}
            >
              {w.search}
            </button>
          </div>
          <div className="save-editor-toolbar">
            <output>
              {w.count}: {view?.matches ?? 0}
            </output>
            <button
              type="button"
              disabled={blocked || !view || view.offset === 0}
              onClick={() =>
                void run(() =>
                  read(applied, Math.max(0, (view?.offset ?? 0) - 50)),
                )
              }
            >
              {w.previous}
            </button>
            <button
              type="button"
              disabled={
                blocked ||
                !view ||
                view.offset + view.rows.length >= view.matches
              }
              onClick={() =>
                void run(() => read(applied, (view?.offset ?? 0) + 50))
              }
            >
              {w.next}
            </button>
            <button
              type="button"
              disabled={blocked || !selected}
              onClick={() => void run(openSelected)}
            >
              {w.open}
            </button>
            <button
              type="button"
              disabled={blocked || !selected}
              onClick={download}
            >
              {w.download}
            </button>
            <button
              type="button"
              disabled={blocked || !selected}
              onClick={() => void run(() => prepare("remove"))}
            >
              {w.remove}
            </button>
          </div>
          <div className="save-folder-table">
            <table>
              <thead>
                <tr>
                  {w.columns.map((name) => (
                    <th key={name}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view?.rows.map((row) => (
                  <tr key={row.id} aria-selected={selected === row.id}>
                    {cells(row).map((value, index) => (
                      <td key={index}>
                        {index === 0 ? (
                          <button
                            type="button"
                            disabled={blocked}
                            aria-pressed={selected === row.id}
                            onClick={() => setSelected(row.id)}
                          >
                            {value || row.name}
                          </button>
                        ) : (
                          value
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {view?.rows.length === 0 && <p>{w.empty}</p>}
        </>
      )}
      <div className="save-editor-toolbar">
        <label className="save-folder-check">
          <input
            type="checkbox"
            checked={deleteInvalid}
            disabled={blocked}
            onChange={(e) => setDeleteInvalid(e.target.checked)}
          />
          {w.deleteInvalid}
        </label>
        <button
          type="button"
          disabled={blocked || !snapshot}
          onClick={() => void run(() => prepare("cleanup"))}
        >
          {w.cleanup}
        </button>
      </div>
      {view?.errors.length !== 0 && (
        <ul>
          {view?.errors.map((error) => (
            <li key={error.id}>
              {error.name}: {w.unrecognized}
            </li>
          ))}
        </ul>
      )}
      {ticket && (
        <section aria-label={w.preview}>
          <h3>{w.preview}</h3>
          <ul>
            {ticket.changes.map((change) => (
              <li key={change.id}>
                {change.action === "rename" ? w.rename : w.delete}:{" "}
                {snapshot?.files.find((f) => f.id === change.id)?.name} →{" "}
                {change.name}
              </li>
            ))}
          </ul>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked}
              onClick={() => void run(confirm)}
            >
              {w.confirm}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => void run(discard)}
            >
              {w.cancel}
            </button>
          </div>
        </section>
      )}
      <p>{w.hint}</p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

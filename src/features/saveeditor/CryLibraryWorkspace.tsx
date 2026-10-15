// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  cryDirectory,
  loadCryLibrary,
  readCryFiles,
  replaceCryLibrary,
  mergeCryFiles,
  subscribeCryLibrary,
  type CryLibrary,
} from "./cryLibrary";
import { cryPlayback, serverCryPlaybackState } from "./cryPlayback";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { beginSaveRequest } from "./clientActivity";
import "./CryLibraryWorkspace.css";
const words = {
  zh: {
    title: "本机叫声资料",
    reading: "正在读取叫声资料…",
    import: "导入 WAV",
    folder: "导入叫声目录",
    enable: "启用叫声",
    disable: "停用叫声",
    remove: "移除",
    undo: "撤销资料变更",
    reload: "重新读取",
    empty: "当前目录没有叫声资料。",
    failed: "叫声资料操作失败。请重新读取；同名文件需先明确移除再导入。",
    audio: "无法播放叫声，请重新启用或检查 WAV 文件。",
    note: "文件仅保存在此浏览器本机。目录根层按形态文件名匹配，再回退物种编号；不会扫描电脑。开启后在悬停时播放，离开即停止。",
    count: "个文件",
    saved: "叫声资料已保存。",
    none: "未找到命名匹配的 WAV 文件。",
  },
  en: {
    title: "Local cry files",
    reading: "Reading cry files…",
    import: "Import WAV",
    folder: "Import cry folder",
    enable: "Enable cries",
    disable: "Disable cries",
    remove: "Remove",
    undo: "Undo library change",
    reload: "Reload",
    empty: "No cry files in this folder.",
    failed:
      "Cry library operation failed. Reload it; explicitly remove a matching name before importing its replacement.",
    audio: "Cry playback failed. Enable audio again or check the WAV file.",
    note: "Files stay in this browser. Match form names in the folder root, then fall back to species numbers; computer folders are not scanned. After enabling audio, hovering plays a cry and leaving stops it.",
    count: "files",
    saved: "Cry files saved.",
    none: "No WAV files with matching names were found.",
  },
  ja: {
    title: "ローカルの鳴き声",
    reading: "鳴き声を読み込み中…",
    import: "WAV を取り込む",
    folder: "鳴き声フォルダーを取り込む",
    enable: "鳴き声を有効にする",
    disable: "鳴き声を無効にする",
    remove: "削除",
    undo: "資料の変更を元に戻す",
    reload: "再読み込み",
    empty: "このフォルダーに鳴き声はありません。",
    failed:
      "鳴き声資料の操作に失敗しました。再読み込みしてください。同名ファイルは削除してから置き換えてください。",
    audio:
      "鳴き声を再生できません。音声を再度有効にするか WAV を確認してください。",
    note: "ファイルはこのブラウザー内に保存されます。フォルダー直下で姿の名前、次に図鑑番号を検索し、PC は走査しません。有効にするとホバーで再生し、離れると停止します。",
    count: "ファイル",
    saved: "鳴き声資料を保存しました。",
    none: "名前が一致する WAV が見つかりませんでした。",
  },
};
export function CryLibraryWorkspace({
  lang,
  busy,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
}) {
  const w = words[lang],
    json = useSaveSettingsJson();
  let directory = "";
  try {
    directory = cryDirectory(json);
  } catch {
    /* Invalid settings lock the library. */
  }
  const [snapshot, setSnapshot] = useState<CryLibrary>(),
    [undo, setUndo] = useState<CryLibrary>(),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState<"failed" | "saved" | "none">();
  const [reload, setReload] = useState(0),
    [origin] = useState(() => ({})),
    input = useRef<HTMLInputElement>(null),
    folder = useRef<HTMLInputElement>(null),
    life = useRef({ epoch: 0 }),
    running = useRef(false),
    alive = useRef(true);
  const playback = useSyncExternalStore(
    cryPlayback.subscribe,
    cryPlayback.snapshot,
    serverCryPlaybackState,
  );
  useEffect(() => {
    const current = life.current;
    alive.current = true;
    return () => {
      alive.current = false;
      current.epoch++;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const current = life.current;
    const refresh = (source?: object) => {
      if (source === origin) return;
      setUndo(undefined);
      setReload((value) => value + 1);
    };
    const unsubscribe = subscribeCryLibrary(refresh);
    void loadCryLibrary(true).then(
      (value) => {
        if (active) setSnapshot(value);
      },
      () => {
        if (active) setMessage("failed");
      },
    );
    return () => {
      active = false;
      current.epoch++;
      unsubscribe();
    };
  }, [reload, origin]);
  const locked = busy || pending || !directory || !snapshot;
  async function run(task: () => Promise<void>) {
    if (running.current || busy) return;
    running.current = true;
    setPending(true);
    setMessage(undefined);
    const epoch = life.current.epoch,
      finish = beginSaveRequest();
    try {
      await task();
    } catch {
      if (alive.current && epoch === life.current.epoch) setMessage("failed");
    } finally {
      finish();
      running.current = false;
      if (alive.current) setPending(false);
    }
  }
  async function replace(files: CryLibrary["files"], restoring = false) {
    if (!snapshot || !alive.current) return;
    const before = snapshot,
      epoch = life.current.epoch;
    const next = await replaceCryLibrary(before, files, origin);
    if (!alive.current || epoch !== life.current.epoch) return;
    setSnapshot(next);
    setUndo(restoring ? undefined : before);
    setMessage("saved");
  }
  const visible =
    snapshot?.files.filter((file) => file.directory === directory) ?? [];
  return (
    <details className="save-cry-library">
      <summary>{w.title}</summary>
      <p className="save-editor-note">{w.note}</p>
      <p>
        {directory} · {visible.length} {w.count}
      </p>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked}
          onClick={() => input.current?.click()}
        >
          {w.import}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => folder.current?.click()}
        >
          {w.folder}
        </button>
        <button
          type="button"
          disabled={busy || pending}
          aria-pressed={playback.enabled}
          onClick={() => {
            if (playback.enabled) cryPlayback.disable();
            else void cryPlayback.enable();
          }}
        >
          {playback.enabled ? w.disable : w.enable}
        </button>
        <button
          type="button"
          disabled={locked || !undo}
          onClick={() => void run(() => replace(undo!.files, true))}
        >
          {w.undo}
        </button>
        <button
          type="button"
          disabled={busy || pending}
          onClick={() => setReload((value) => value + 1)}
        >
          {w.reload}
        </button>
      </div>
      {[false, true].map((isFolder) => (
        <input
          key={String(isFolder)}
          hidden
          ref={isFolder ? folder : input}
          type="file"
          accept=".wav,audio/wav"
          multiple
          {...(isFolder ? { webkitdirectory: "", directory: "" } : {})}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void run(async () => {
              const added = await readCryFiles(files, directory, isFolder);
              if (!added.length) {
                setMessage("none");
                return;
              }
              await replace(mergeCryFiles(snapshot!, added));
            });
          }}
        />
      ))}
      {visible.length ? (
        <ul>
          {visible.map((file) => (
            <li key={file.id}>
              <span>{file.name}</span>
              <button
                type="button"
                disabled={locked}
                aria-label={`${w.remove} ${file.name}`}
                onClick={() =>
                  void run(() =>
                    replace(
                      snapshot!.files.filter((value) => value.id !== file.id),
                    ),
                  )
                }
              >
                {w.remove}
              </button>
            </li>
          ))}
        </ul>
      ) : snapshot ? (
        <p>{w.empty}</p>
      ) : null}
      {pending || (!snapshot && !message) ? (
        <p role="status">{w.reading}</p>
      ) : null}
      {message ? <p role="status">{w[message]}</p> : null}
      {playback.failed ? (
        <p role="alert" className="save-editor-error">
          {w.audio}
        </p>
      ) : null}
    </details>
  );
}

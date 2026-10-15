// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, useSyncExternalStore } from "react";
import { Select } from "../shared/Select";
import {
  saveSoundPlayback,
  serverSaveSoundState,
  type SaveSoundCue,
} from "./saveSound";
const words = {
  zh: {
    title: "提示音",
    enable: "本页启用提示音",
    disable: "停用提示音",
    test: "试听",
    cue: "提示类型",
    cues: {
      asterisk: "提示",
      exclamation: "警告",
      hand: "错误",
      question: "询问",
    },
    note: "仅在本页启用后播放。浏览器使用短提示音对应系统提示；加载存档、合法性报告和已接入的其他操作分别按已保存的开关播放。",
    failed: "浏览器未能播放提示音，请重新启用。",
  },
  en: {
    title: "Notification sounds",
    enable: "Enable sounds for this page",
    disable: "Disable sounds",
    test: "Test sound",
    cue: "Cue type",
    cues: {
      asterisk: "Notice",
      exclamation: "Warning",
      hand: "Error",
      question: "Question",
    },
    note: "Sounds play only after enabling them on this page. Short browser tones replace system cues; save loading, legality reports and other connected operations follow their saved switches.",
    failed: "The browser could not play a sound. Enable it again.",
  },
  ja: {
    title: "通知音",
    enable: "このページで通知音を有効にする",
    disable: "通知音を無効にする",
    test: "試聴",
    cue: "通知の種類",
    cues: {
      asterisk: "通知",
      exclamation: "警告",
      hand: "エラー",
      question: "確認",
    },
    note: "このページで有効にした後だけ再生します。ブラウザーの短い通知音をシステム音に対応させ、セーブ読込、合法性レポート、接続済みのその他の操作は保存済み設定に従います。",
    failed: "通知音を再生できませんでした。もう一度有効にしてください。",
  },
};
export function SaveSoundControl({
  lang,
  busy,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
}) {
  const [cue, setCue] = useState<SaveSoundCue>("asterisk");
  const state = useSyncExternalStore(
      saveSoundPlayback.subscribe,
      saveSoundPlayback.snapshot,
      serverSaveSoundState,
    ),
    w = words[lang];
  return (
    <details className="save-pokemon-editor">
      <summary>{w.title}</summary>
      <p className="save-editor-note">{w.note}</p>
      <label className="field">
        <span>{w.cue}</span>
        <Select
          value={cue}
          disabled={busy}
          onChange={(e) => setCue(e.target.value as SaveSoundCue)}
        >
          {(Object.keys(w.cues) as SaveSoundCue[]).map((key) => (
            <option key={key} value={key}>
              {w.cues[key]}
            </option>
          ))}
        </Select>
      </label>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy}
          aria-pressed={state.enabled}
          onClick={() => {
            if (state.enabled) saveSoundPlayback.disable();
            else void saveSoundPlayback.enable();
          }}
        >
          {state.enabled ? w.disable : w.enable}
        </button>
        <button
          type="button"
          disabled={busy || !state.enabled}
          onClick={() => saveSoundPlayback.play(cue)}
        >
          {w.test}
        </button>
      </div>
      {state.failed ? (
        <p role="alert" className="save-editor-error">
          {w.failed}
        </p>
      ) : null}
    </details>
  );
}

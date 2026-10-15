// SPDX-License-Identifier: GPL-3.0-or-later
// Browser counterpart of SystemSounds.Asterisk; no Windows audio is bundled.
import { readSaveSettings, subscribeSaveSettings } from "./settingsRepository";
import { loadBoxExportDefaults } from "./programExportSettings";
export type SaveSoundEvent = "load" | "legality" | "other";
export type SaveSoundCue = "asterisk" | "exclamation" | "hand" | "question";
const cueNotes: Record<SaveSoundCue, readonly [number, number]> = {
  asterisk: [660, 880],
  exclamation: [440, 330],
  hand: [220, 165],
  question: [440, 660],
};
export function saveSoundEnabled(json: string, event: SaveSoundEvent) {
  if (!json) return true;
  const sounds = JSON.parse(json).sounds;
  const value =
    sounds?.[
      event === "load"
        ? "playSoundSAVLoad"
        : event === "legality"
          ? "playSoundLegalityCheck"
          : "playSoundOther"
    ];
  if (typeof value !== "boolean") throw new Error("Invalid sound settings.");
  return value;
}
const initial: Readonly<{ enabled: boolean; failed: boolean }> = Object.freeze({
  enabled: false,
  failed: false,
});
export class SaveSoundPlayback {
  private context?: AudioContext;
  private source?: OscillatorNode;
  private gain?: GainNode;
  private activation = 0;
  private state = initial;
  private listeners = new Set<() => void>();
  private cleanup?: () => void;
  constructor(
    private readonly createContext: () => AudioContext = () =>
      new AudioContext(),
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(enabled: boolean, failed = false) {
    if (this.state.enabled === enabled && this.state.failed === failed) return;
    this.state = Object.freeze({ enabled, failed });
    for (const listener of this.listeners) listener();
  }
  async enable() {
    const activation = ++this.activation;
    try {
      this.context ??= this.createContext();
      await this.context.resume();
      if (activation !== this.activation) return false;
      if (this.context.state !== "running")
        throw new Error("Audio is suspended.");
      if (!this.cleanup) {
        const hidden = () => {
          if (document.hidden) this.stop();
        };
        document.addEventListener("visibilitychange", hidden);
        window.addEventListener("blur", this.stop);
        const unsubscribe = subscribeSaveSettings(this.stop);
        this.cleanup = () => {
          document.removeEventListener("visibilitychange", hidden);
          window.removeEventListener("blur", this.stop);
          unsubscribe();
        };
      }
      this.update(true);
      return true;
    } catch {
      if (activation === this.activation) {
        this.stop();
        this.cleanup?.();
        this.cleanup = undefined;
        this.update(false, true);
      }
      return false;
    }
  }
  disable() {
    this.activation++;
    this.stop();
    this.cleanup?.();
    this.cleanup = undefined;
    this.update(false);
  }
  stop = () => {
    const source = this.source,
      gain = this.gain;
    this.source = undefined;
    this.gain = undefined;
    try {
      source?.stop();
    } catch {
      /* One-shot may already have ended. */
    }
    source?.disconnect();
    gain?.disconnect();
  };
  play(cue: SaveSoundCue = "asterisk") {
    const context = this.context;
    if (!this.state.enabled || !context || document.hidden) return;
    try {
      if (context.state !== "running") throw new Error("Audio is suspended.");
      this.stop();
      const source = context.createOscillator(),
        gain = context.createGain();
      this.source = source;
      this.gain = gain;
      source.type = "sine";
      const start = context.currentTime;
      const notes = cueNotes[cue];
      source.frequency.setValueAtTime(notes[0], start);
      source.frequency.setValueAtTime(notes[1], start + 0.08);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.035, start + 0.01);
      gain.gain.setValueAtTime(0.035, start + 0.12);
      gain.gain.linearRampToValueAtTime(0, start + 0.16);
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (this.source === source) {
          this.source = undefined;
          this.gain = undefined;
        }
      };
      source.start(start);
      source.stop(start + 0.17);
      this.update(true);
    } catch {
      this.stop();
      this.update(this.state.enabled, true);
    }
  }
}
export const saveSoundPlayback = new SaveSoundPlayback();
export const serverSaveSoundState = () => initial;
export function playSaveSound(
  event: SaveSoundEvent,
  cue: SaveSoundCue = "asterisk",
) {
  try {
    if (saveSoundEnabled(readSaveSettings()?.json ?? "", event))
      saveSoundPlayback.play(cue);
  } catch {
    /* Invalid or unavailable settings must not interrupt save work. */
  }
}
export function playSilentBoxExportSound() {
  try {
    if (loadBoxExportDefaults().notify === 1) playSaveSound("other");
  } catch {
    /* A display preference cannot turn an initiated download into failure. */
  }
}

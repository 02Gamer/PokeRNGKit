// SPDX-License-Identifier: GPL-3.0-or-later
import {
  findCryFile,
  loadCryLibrary,
  subscribeCryLibrary,
  type CryLibrary,
} from "./cryLibrary";
import { subscribeSaveSettings } from "./settingsRepository";
export interface CryPlaybackState {
  enabled: boolean;
  failed: boolean;
}
const initial: CryPlaybackState = Object.freeze({
  enabled: false,
  failed: false,
});
export class CryPlayback {
  private context?: AudioContext;
  private source?: AudioBufferSourceNode;
  private owner?: object;
  private generation = 0;
  private activation = 0;
  private state = initial;
  private listeners = new Set<() => void>();
  private cleanup?: () => void;
  private decoded = new Map<string, AudioBuffer>();
  constructor(
    private readonly library: () => Promise<CryLibrary> = loadCryLibrary,
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
        const changed = () => {
          this.stop();
          this.decoded.clear();
        };
        const a = subscribeCryLibrary(changed),
          b = subscribeSaveSettings(changed);
        this.cleanup = () => {
          a();
          b();
        };
      }
      this.update(true);
      return true;
    } catch {
      if (activation === this.activation) this.update(false, true);
      return false;
    }
  }
  disable() {
    this.activation++;
    this.stop();
    this.cleanup?.();
    this.cleanup = undefined;
    this.decoded.clear();
    this.update(false);
  }
  stop(owner?: object) {
    if (owner && owner !== this.owner) return;
    this.generation++;
    try {
      this.source?.stop();
    } catch {
      /* An ended one-shot source is already stopped. */
    }
    this.source?.disconnect();
    this.source = undefined;
    this.owner = undefined;
  }
  async play(owner: object, directory: string, names: readonly string[]) {
    if (!this.state.enabled || !this.context || !names.length) return;
    this.stop();
    this.owner = owner;
    const generation = this.generation,
      context = this.context;
    try {
      if (context.state !== "running") throw new Error("Audio is suspended.");
      const library = await this.library();
      if (generation !== this.generation) return;
      const file = findCryFile(library, directory, names);
      if (!file) return;
      const key = library.revision + ":" + file.id;
      let buffer = this.decoded.get(key);
      if (!buffer) {
        buffer = await context.decodeAudioData(await file.data.arrayBuffer());
        if (generation !== this.generation) return;
        if (
          buffer.duration > 120 ||
          buffer.length * buffer.numberOfChannels * 4 > 32 * 1024 * 1024
        )
          throw new Error("Decoded cry exceeds the playback limit.");
        this.decoded.set(key, buffer);
        const size = () =>
          [...this.decoded.values()].reduce(
            (sum, value) => sum + value.length * value.numberOfChannels * 4,
            0,
          );
        while (this.decoded.size > 8 || size() > 32 * 1024 * 1024) {
          const oldest = this.decoded.keys().next().value;
          if (oldest === undefined) break;
          this.decoded.delete(oldest);
        }
      }
      if (generation !== this.generation || !this.state.enabled) return;
      this.source = context.createBufferSource();
      const source = this.source;
      source.onended = () => {
        if (this.source === source) {
          source.disconnect();
          this.source = undefined;
          this.owner = undefined;
        }
      };
      this.source.buffer = buffer;
      this.source.connect(context.destination);
      this.source.start();
      this.update(true);
    } catch {
      if (generation === this.generation) {
        this.stop(owner);
        this.update(this.state.enabled, true);
      }
    }
  }
}
export const cryPlayback = new CryPlayback();
export const serverCryPlaybackState = () => initial;

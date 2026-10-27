// SPDX-License-Identifier: GPL-3.0-or-later
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  SaveSoundPlayback,
  saveSoundEnabled,
  playSaveSound,
  saveSoundPlayback,
  playSilentBoxExportSound,
} from "./saveSound";
const stored = vi.hoisted(() => ({ json: "" }));
vi.mock("./settingsRepository", () => ({
  readSaveSettings: () => (stored.json ? { json: stored.json } : undefined),
  subscribeSaveSettings: () => () => {},
}));
const players: SaveSoundPlayback[] = [];
it("uses the current export notification override before remembered defaults", () => {
  const play = vi.spyOn(saveSoundPlayback, "play").mockImplementation(() => {});
  stored.json = '{"sounds":{"playSoundOther":true}}';
  playSilentBoxExportSound(1);
  expect(play).toHaveBeenCalledOnce();
  playSilentBoxExportSound(0);
  expect(play).toHaveBeenCalledOnce();
});
beforeEach(() => {
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  vi.stubGlobal("window", new EventTarget());
  stored.json = "";
});
afterEach(() => {
  for (const player of players.splice(0)) player.disable();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function harness(resume = async () => {}) {
  const sources: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
  }[] = [];
  const param = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  });
  const context = {
    state: "running",
    currentTime: 10,
    resume: vi.fn(resume),
    destination: {},
    createOscillator: vi.fn(() => {
      const source = {
        type: "sine",
        frequency: param(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
      };
      sources.push(source);
      return source;
    }),
    createGain: vi.fn(() => ({
      gain: param(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
  };
  const factory = vi.fn(() => context as unknown as AudioContext);
  const player = new SaveSoundPlayback(factory);
  players.push(player);
  return { player, context, sources, factory };
}
it("retains independent source switches and strict boolean validation", () => {
  expect(saveSoundEnabled("", "load")).toBe(true);
  const json =
    '{"sounds":{"playSoundSAVLoad":false,"playSoundLegalityCheck":true,"playSoundOther":false}}';
  expect(saveSoundEnabled(json, "load")).toBe(false);
  expect(saveSoundEnabled(json, "legality")).toBe(true);
  expect(saveSoundEnabled(json, "other")).toBe(false);
  expect(() => saveSoundEnabled("{}", "load")).toThrow();
});
it("keeps Other independent and uses exclamation only for a completed unsuccessful seek", () => {
  const play = vi.spyOn(saveSoundPlayback, "play").mockImplementation(() => {});
  stored.json =
    '{"sounds":{"playSoundSAVLoad":false,"playSoundLegalityCheck":false,"playSoundOther":true}}';
  playSaveSound("other", "exclamation");
  expect(play).toHaveBeenCalledWith("exclamation");
  playSaveSound("load");
  playSaveSound("legality");
  expect(play).toHaveBeenCalledOnce();
});
it("emits a box export cue only for source Silent policy and never throws from preferences", () => {
  const play = vi.spyOn(saveSoundPlayback, "play").mockImplementation(() => {});
  const settings = {
    sounds: { playSoundOther: true },
    slotExport: {
      boxExport: {
        scope: 0,
        folderCreation: 0,
        folderPrefix: 0,
        emptySlots: 0,
        fileIndexPrefix: 0,
        notify: 0,
      },
    },
  };
  stored.json = JSON.stringify(settings);
  playSilentBoxExportSound();
  expect(play).not.toHaveBeenCalled();
  settings.slotExport.boxExport.notify = 1;
  stored.json = JSON.stringify(settings);
  playSilentBoxExportSound();
  expect(play).toHaveBeenCalledWith("asterisk");
  stored.json = '{"slotExport":{"boxExport":{"notify":9}}}';
  expect(() => playSilentBoxExportSound()).not.toThrow();
  expect(play).toHaveBeenCalledOnce();
});
it("keeps notice and unsuccessful-search tones distinct without increasing duration", async () => {
  const { player, sources } = harness();
  await player.enable();
  player.play("exclamation");
  expect(sources[0].frequency.setValueAtTime).toHaveBeenNthCalledWith(
    1,
    440,
    10,
  );
  expect(sources[0].frequency.setValueAtTime).toHaveBeenNthCalledWith(
    2,
    330,
    10.08,
  );
  expect(sources[0].stop).toHaveBeenCalledWith(10.17);
});
it.each([
  ["asterisk", 660, 880],
  ["exclamation", 440, 330],
  ["hand", 220, 165],
  ["question", 440, 660],
] as const)(
  "keeps the %s cue bounded, distinct and behind page activation",
  async (cue, first, last) => {
    const { player, sources } = harness();
    player.play(cue);
    expect(sources).toHaveLength(0);
    await player.enable();
    player.play(cue);
    expect(sources[0].frequency.setValueAtTime).toHaveBeenNthCalledWith(
      1,
      first,
      10,
    );
    expect(sources[0].frequency.setValueAtTime).toHaveBeenNthCalledWith(
      2,
      last,
      10.08,
    );
    expect(sources[0].stop).toHaveBeenCalledWith(10.17);
    player.disable();
    player.play(cue);
    expect(sources).toHaveLength(1);
  },
);
it("dispatches only the enabled operation and ignores corrupt settings", () => {
  const play = vi.spyOn(saveSoundPlayback, "play").mockImplementation(() => {});
  stored.json =
    '{"sounds":{"playSoundSAVLoad":false,"playSoundLegalityCheck":true}}';
  playSaveSound("load");
  expect(play).not.toHaveBeenCalled();
  playSaveSound("legality");
  expect(play).toHaveBeenCalledOnce();
  stored.json = "{}";
  expect(() => playSaveSound("load")).not.toThrow();
  expect(play).toHaveBeenCalledOnce();
});
it("creates no audio before explicit enable and produces a bounded one-shot afterward", async () => {
  const { player, factory, context, sources } = harness();
  player.play();
  expect(factory).not.toHaveBeenCalled();
  expect(await player.enable()).toBe(true);
  player.play();
  expect(context.createOscillator).toHaveBeenCalledOnce();
  expect(sources[0].start).toHaveBeenCalledWith(10);
  expect(sources[0].stop).toHaveBeenCalledWith(10.17);
});
it("stops on replacement, disable and hidden page and never revives a disabled activation", async () => {
  const { player, sources } = harness();
  await player.enable();
  player.play();
  player.play();
  expect(sources[0].disconnect).toHaveBeenCalled();
  Object.defineProperty(document, "hidden", {
    value: true,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
  expect(sources[1].disconnect).toHaveBeenCalled();
  player.play();
  expect(sources).toHaveLength(2);
  player.disable();
  expect(player.snapshot().enabled).toBe(false);
  let release!: () => void;
  const late = harness(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const enabled = late.player.enable();
  late.player.disable();
  release();
  expect(await enabled).toBe(false);
  expect(late.player.snapshot().enabled).toBe(false);
});
it("reports rejected audio activation without breaking callers", async () => {
  const { player } = harness(async () => {
    throw new Error("blocked");
  });
  expect(await player.enable()).toBe(false);
  expect(player.snapshot()).toEqual({ enabled: false, failed: true });
  expect(() => player.play()).not.toThrow();
});

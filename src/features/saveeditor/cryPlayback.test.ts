import { afterEach, expect, it, vi } from "vitest";
import { CryPlayback } from "./cryPlayback";
import { cryFileId, type CryLibrary } from "./cryLibrary";
const buffer = {
  length: 100,
  numberOfChannels: 1,
  duration: 0.01,
} as AudioBuffer;
const library: CryLibrary = {
  revision: "a",
  files: [
    {
      id: cryFileId("sounds", "25.wav"),
      directory: "sounds",
      name: "25.wav",
      data: new Blob([new Uint8Array(16)]),
      modified: 1,
    },
  ],
};
const players: CryPlayback[] = [];
function harness() {
  const sources: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    onended: ((event: Event) => void) | null;
  }[] = [];
  const context = {
    state: "running",
    resume: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async () => buffer),
    destination: {},
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      sources.push(source);
      return source;
    }),
  };
  const load = vi.fn(async () => library),
    make = vi.fn(() => context as unknown as AudioContext),
    player = new CryPlayback(load, make);
  players.push(player);
  return { player, context, sources, load, make };
}
afterEach(() => {
  for (const player of players.splice(0)) player.disable();
});
it("does not allocate audio or read files before explicit activation", async () => {
  const h = harness();
  await h.player.play({}, "sounds", ["25.wav"]);
  expect(h.make).not.toHaveBeenCalled();
  expect(h.load).not.toHaveBeenCalled();
});
it("plays the species fallback and stops only for its own hover scope", async () => {
  const h = harness(),
    owner = {};
  expect(await h.player.enable()).toBe(true);
  await h.player.play(owner, "sounds", ["25-1.wav", "25.wav"]);
  expect(h.sources[0].start).toHaveBeenCalledOnce();
  h.player.stop({});
  expect(h.sources[0].stop).not.toHaveBeenCalled();
  h.player.stop(owner);
  expect(h.sources[0].stop).toHaveBeenCalledOnce();
});
it("does not start a late decode after leaving the slot", async () => {
  const h = harness(),
    owner = {};
  let complete!: (value: AudioBuffer) => void;
  h.context.decodeAudioData.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  await h.player.enable();
  const play = h.player.play(owner, "sounds", ["25.wav"]);
  await vi.waitFor(() => expect(h.context.decodeAudioData).toHaveBeenCalled());
  h.player.stop(owner);
  complete(buffer);
  await play;
  expect(h.sources).toHaveLength(0);
});
it("cannot re-enable after a pending resume was explicitly disabled", async () => {
  const h = harness();
  let complete!: () => void;
  h.context.resume.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const enable = h.player.enable();
  h.player.disable();
  complete();
  expect(await enable).toBe(false);
  expect(h.player.snapshot().enabled).toBe(false);
});
it("reports blocked playback and rejects oversized decoded audio", async () => {
  const h = harness();
  h.context.state = "suspended";
  expect(await h.player.enable()).toBe(false);
  expect(h.player.snapshot().failed).toBe(true);
  h.context.state = "running";
  await h.player.enable();
  h.context.decodeAudioData.mockResolvedValueOnce({ ...buffer, duration: 121 });
  await h.player.play({}, "sounds", ["25.wav"]);
  expect(h.sources).toHaveLength(0);
  expect(h.player.snapshot().failed).toBe(true);
});

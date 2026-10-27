// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  programStartupSettings,
  localizeSaveStartupError,
  recordSaveStartup,
  SAVE_STARTUP_VERSION_KEY,
  SaveStartupSession,
  showSaveChangelog,
} from "./programStartup";
import { SAVE_STARTUP_RELEASE, saveStartupWords } from "./saveStartupRelease";
import {
  SaveStartupScreen,
  SaveStartupSettingsTools,
} from "./SaveStartupFeedback";
import { unavailableProgramSettings } from "./settingsAvailability";
import { SAVE_EDITOR_API_VERSION } from "./domain";

const defaults = { skipSplashScreen: false, showChangelogOnUpdate: true };
it.each(["zh", "en", "ja"] as const)(
  "displays a completed startup failure in the current UI language %s",
  (lang) => {
    for (const previous of ["zh", "en", "ja"] as const) {
      expect(
        localizeSaveStartupError(saveStartupWords[previous].failed, lang),
      ).toBe(saveStartupWords[lang].failed);
    }
    expect(
      localizeSaveStartupError("unrelated file error", lang),
    ).toBeUndefined();
  },
);
it("uses the source defaults and preserves the independent imported desktop version", () => {
  expect(programStartupSettings("")).toEqual(defaults);
  expect(programStartupSettings("{}")).toEqual(defaults);
  const input = JSON.stringify({ startup: { version: "26.8.26.0" } });
  expect(programStartupSettings(input)).toEqual(defaults);
  expect(JSON.parse(input).startup.version).toBe("26.8.26.0");
  expect(
    programStartupSettings(
      JSON.stringify({
        startup: { skipSplashScreen: true, showChangelogOnUpdate: false },
      }),
    ),
  ).toEqual({ skipSplashScreen: true, showChangelogOnUpdate: false });
});
it.each([
  "null",
  "[]",
  "1",
  '{"startup":null}',
  '{"startup":[]}',
  '{"startup":{"skipSplashScreen":"false"}}',
  '{"startup":{"showChangelogOnUpdate":0}}',
  "{",
])(
  "rejects corrupt launch policy without treating it as an unchecked setting: %s",
  (json) => {
    expect(() => programStartupSettings(json)).toThrow();
  },
);

// Expected ordering comes from StartupUtil: a parseable older run only;
// missing .NET Version build/revision components precede explicit zero.
it.each([
  [null, false],
  ["", false],
  ["not-a-version", false],
  ["0.189.99.99", true],
  ["0.190", true],
  ["0.190.1", true],
  ["0.190.0.9", true],
  ["0.190.1.0", false],
  ["0.190.1.1", false],
  ["0.191.0.0", false],
  ["1.0.0.0", false],
  ["0.-1.0.0", false],
  ["0.2147483648.0.0", false],
] as const)("compares the previous local version %s", (last, expected) => {
  expect(showSaveChangelog(last, "0.190.1.0", true)).toBe(expected);
  expect(showSaveChangelog(last, "0.190.1.0", false)).toBe(false);
});

function storage(initial?: string) {
  const values = new Map<string, string>([
    ["pokerngkit-save-settings-v1", '{"revision":"owner","json":"preserved"}'],
    ["owner-profile", "untouched"],
  ]);
  if (initial !== undefined) values.set(SAVE_STARTUP_VERSION_KEY, initial);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
it("records first/same/older/newer launches independently without writing settings, profiles or files", () => {
  for (const [previous, expected] of [
    [undefined, false],
    ["0.189.0.0", true],
    ["0.190.1.0", false],
    ["0.191.0.0", false],
  ] as const) {
    const port = storage(previous);
    const preserved = [...port.values.entries()];
    expect(recordSaveStartup("0.190.1.0", defaults, port)).toEqual({
      showChangelog: expected,
      stored: true,
    });
    expect(recordSaveStartup("0.190.1.0", defaults, port)).toEqual({
      showChangelog: false,
      stored: true,
    });
    for (const [key, value] of preserved) {
      if (key !== SAVE_STARTUP_VERSION_KEY)
        expect(port.values.get(key)).toBe(value);
    }
    expect(port.values.get(SAVE_STARTUP_VERSION_KEY)).toBe("0.190.1.0");
  }
});
it("remembers the current version even when automatic changelog display is disabled", () => {
  const port = storage("0.189.0.0");
  expect(
    recordSaveStartup(
      "0.190.1.0",
      { ...defaults, showChangelogOnUpdate: false },
      port,
    ),
  ).toEqual({ showChangelog: false, stored: true });
  expect(port.getItem(SAVE_STARTUP_VERSION_KEY)).toBe("0.190.1.0");
});
it("preserves an old record on quota failure and distinguishes it from an unreadable record", () => {
  const port = storage("0.189.0.0");
  const setItem = vi.fn(() => {
    throw Error("quota");
  });
  expect(
    recordSaveStartup("0.190.1.0", defaults, { ...port, setItem }),
  ).toEqual({ showChangelog: true, stored: false });
  expect(port.getItem(SAVE_STARTUP_VERSION_KEY)).toBe("0.189.0.0");
  setItem.mockClear();
  expect(
    recordSaveStartup("0.190.1.0", defaults, {
      getItem: () => {
        throw Error("denied");
      },
      setItem,
    }),
  ).toEqual({ showChangelog: false, stored: false });
  expect(setItem).not.toHaveBeenCalled();
});
it("rejects invalid release metadata before any storage access", () => {
  const port = { getItem: vi.fn(() => null), setItem: vi.fn() };
  expect(() => recordSaveStartup("invalid", defaults, port)).toThrow();
  expect(port.getItem).not.toHaveBeenCalled();
  expect(port.setItem).not.toHaveBeenCalled();
  expect(SAVE_STARTUP_RELEASE.version).toBe(`0.${SAVE_EDITOR_API_VERSION}.3.0`);
});

it("does not initialize a hidden workspace or the discarded StrictMode setup", async () => {
  const session = new SaveStartupSession();
  const initialize = vi.fn(async () => true);
  let firstActive = true;
  const first = session.run(() => firstActive, initialize);
  firstActive = false;
  await first;
  expect(initialize).not.toHaveBeenCalled();
  await session.run(() => true, initialize);
  await session.run(() => true, initialize);
  expect(initialize).toHaveBeenCalledTimes(1);
});
it("serializes rapid leave/return, retrying a cancelled bootstrap without replacing the running client", async () => {
  const session = new SaveStartupSession();
  let finish!: (value: boolean) => void;
  const first = session.run(
    () => true,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await Promise.resolve();
  const initialize = vi.fn(async () => true);
  const next = session.run(() => true, initialize);
  await Promise.resolve();
  expect(initialize).not.toHaveBeenCalled();
  finish(false);
  await Promise.all([first, next]);
  expect(initialize).toHaveBeenCalledTimes(1);
});
it("allows recovery after a failed initialization", async () => {
  const session = new SaveStartupSession();
  const initialize = vi.fn(async () => {
    throw Error("runtime unavailable");
  });
  await expect(session.run(() => true, initialize)).rejects.toThrow();
  await session.run(
    () => true,
    async () => true,
  );
  await session.run(() => true, initialize);
  expect(initialize).toHaveBeenCalledTimes(1);
});
it("retains a committed launch when the user navigates away during recent-file restore", async () => {
  const session = new SaveStartupSession();
  let active = true;
  const initialize = vi.fn(async () => {
    active = false;
    return true;
  });
  await session.run(() => active, initialize);
  active = true;
  await session.run(() => active, initialize);
  expect(initialize).toHaveBeenCalledTimes(1);
});
it.each(["zh", "en", "ja"] as const)(
  "provides launch feedback, local notes and enabled boolean settings in %s",
  (lang) => {
    const words = saveStartupWords[lang];
    const screen = renderToStaticMarkup(<SaveStartupScreen lang={lang} />);
    expect(screen).toContain('role="status"');
    expect(screen).toContain(words.starting);
    const tools = renderToStaticMarkup(
      <SaveStartupSettingsTools lang={lang} />,
    );
    expect(tools).toContain(words.scope);
    expect(tools).toContain(words.viewChangelog);
    expect(tools).not.toContain("disabled");
    const paths = ["startup.showChangelogOnUpdate", "startup.skipSplashScreen"];
    expect(
      unavailableProgramSettings(
        {
          groups: [
            {
              id: "startup",
              fields: paths.map((path) => ({
                path,
                name: path,
                kind: "boolean",
                minimum: null,
                maximum: null,
                choices: [],
              })),
            },
          ],
        },
        "pending",
        lang,
      ),
    ).toEqual({});
    expect(SAVE_STARTUP_RELEASE.changes[lang]).toHaveLength(5);
  },
);

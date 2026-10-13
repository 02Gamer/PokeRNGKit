import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  loadEncounterSettings,
  saveEncounterSettings,
  encounterDefaults,
} from "./encounterSettings";
import { PokemonEncounterViewer } from "./PokemonEncounterViewer";
import { encounterWords } from "./encounterWords";
import type { EncounterTrainer } from "./encounterProtocol";
import type { SaveReport } from "./domain";
const trainer: EncounterTrainer = {
  version: 3,
  name: "本机训练家",
  tid: 65535,
  sid: 0,
  gender: 1,
  language: 11,
  consoleRegion: 255,
  country: 0,
  region: 255,
};
describe("encounter local settings and entry", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("preserves local trainer widths, every language, options and independent loaded drafts", () => {
    const options = {
      ...encounterDefaults,
      gridRows: 20,
      useTabsAsCriteria: false,
    };
    saveEncounterSettings(options, [trainer]);
    const loaded = loadEncounterSettings();
    expect(loaded).toEqual({ options, trainers: [trainer] });
    loaded.trainers[0].name = "changed";
    loaded.options.gridRows = 5;
    expect(loadEncounterSettings()).toEqual({ options, trainers: [trainer] });
  });
  it.each([0, 4, 21, 1.5, NaN])(
    "rejects row count %s without overwriting saved settings",
    (gridRows) => {
      saveEncounterSettings(encounterDefaults, [trainer]);
      expect(() =>
        saveEncounterSettings({ ...encounterDefaults, gridRows }, []),
      ).toThrow();
      expect(loadEncounterSettings().trainers).toEqual([trainer]);
    },
  );
  it.each([
    { tid: 65536 },
    { sid: -1 },
    { gender: 2 },
    { language: 0 },
    { language: 12 },
    { consoleRegion: 256 },
    { name: "a".repeat(32768) },
  ])("rejects invalid trainer field %s", (change) => {
    expect(() =>
      saveEncounterSettings(encounterDefaults, [{ ...trainer, ...change }]),
    ).toThrow();
    expect(loadEncounterSettings()).toEqual({
      options: encounterDefaults,
      trainers: [],
    });
  });
  it("keeps a usable default entry after malformed local data or unavailable storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "not json",
      setItem: () => {
        throw Error("quota");
      },
    });
    expect(loadEncounterSettings()).toEqual({
      options: encounterDefaults,
      trainers: [],
    });
    expect(() => saveEncounterSettings(encounterDefaults, [])).toThrow("quota");
  });
  it.each(["zh", "en", "ja"] as const)(
    "renders the localized entry with shared selectors and source controls in %s",
    (lang) => {
      const request = vi.fn(),
        report = {
          boxes: [],
          boxSlotCount: 30,
          partyCount: 0,
        } as unknown as SaveReport;
      const html = renderToStaticMarkup(
        <PokemonEncounterViewer
          lang={lang}
          busy={false}
          report={report}
          actions={{ request }}
          databaseActions={{ request: vi.fn(), apply: vi.fn() }}
        />,
      );
      expect(html).toContain(encounterWords[lang].title);
      expect(html).toContain(encounterWords[lang].fromSource);
      expect(html).toContain("haku-select");
      expect(html).toContain(encounterWords[lang].criteria);
      expect(html).toContain(encounterWords[lang].trainers);
      expect(request).not.toHaveBeenCalled();
    },
  );
});

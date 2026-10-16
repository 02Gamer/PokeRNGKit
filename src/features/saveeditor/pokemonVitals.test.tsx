// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { PokemonVitalsEditor } from "./PokemonVitalsEditor";
import {
  statusChoice,
  statusIconChoice,
  vitalInteger,
  experienceInput,
  levelInput,
  partyStatInput,
  partyStatsWords,
  vitalsWords,
  type PokemonVitalsInfo,
} from "./pokemonVitals";
import { pokemonStatusImage } from "./art";
const name = { zh: "睡眠", en: "Sleep", ja: "ねむり" };
const info: PokemonVitalsInfo = {
  experience: {
    value: 8000,
    level: 20,
    maximum: 1000000,
    start: 8000,
    end: 9260,
    progress: 0,
    showBar: true,
  },
  hiddenPower: { type: 0, power: 70, types: [{ id: 0, name }], maximize: true },
  status: {
    value: 0x12340007,
    canEdit: true,
    present: true,
    fainted: false,
    show: true,
    choices: [
      { id: 0, name: { zh: "无异常状态", en: "None", ja: "なし" } },
      { id: 1, name },
    ],
    sleepTurns: 7,
  },
  showGender: true,
};
function render(lang: "zh" | "en" | "ja", data = info, generation = 3) {
  const i18n = createInstance();
  void i18n.init({ lng: lang, initAsync: false, resources: {} });
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <PokemonVitalsEditor
        info={data}
        generation={generation}
        disabled={false}
        onApply={async () => {}}
      />
    </I18nextProvider>,
  );
}
describe("source entity editor vitals", () => {
  it.each(["zh", "en", "ja"] as const)(
    "renders localized, initially locked party stats with shared controls in %s",
    (lang) => {
      const html = render(lang, {
        ...info,
        partyStats: {
          values: [12, 23, 34, 45, 56, 67],
          computed: [100, 101, 102, 103, 104, 105],
          writable: [true, true, true, true, true, true],
          maximum: 65535,
        },
      });
      expect(html).toContain(partyStatsWords[lang].manual);
      expect(html).toContain(partyStatsWords[lang].hint);
      expect(html).toContain('class="field save-editor-checkbox"');
      expect(html.match(/maxLength="5" disabled=""/g)).toHaveLength(6);
      expect(html).toContain('value="100"');
      expect(
        html.indexOf(`<span>${partyStatsWords[lang].stats[4]}</span>`),
      ).toBeLessThan(
        html.indexOf(`<span>${partyStatsWords[lang].stats[3]}</span>`),
      );
      const first = render(
        lang,
        {
          ...info,
          partyStats: {
            values: [12, 23, 34, 45, 56, 56],
            computed: [100, 101, 102, 103, 104, 104],
            writable: [true, true, true, true, true, false],
            maximum: 65535,
          },
        },
        1,
      );
      expect(first.match(/maxLength="5" disabled=""/g)).toHaveLength(5);
      expect(first).toContain(`<span>${partyStatsWords[lang].special}</span>`);
      expect(first).not.toContain(
        `<span>${partyStatsWords[lang].stats[5]}</span>`,
      );
      expect(render(lang)).not.toContain(partyStatsWords[lang].manual);
    },
  );
  it("normalizes the five-digit source controls without wrapping", () => {
    for (const value of ["", " ", "00000"])
      expect(partyStatInput(value)).toBe(0);
    expect(partyStatInput("12 34")).toBe(1234);
    expect(partyStatInput("65535")).toBe(65535);
    expect(partyStatInput("99999")).toBe(65535);
    for (const value of ["100000", "-1", "1.5", "1e3", "0xFF", "１２"])
      expect(() => partyStatInput(value)).toThrow();
  });
  it.each(["zh", "en", "ja"] as const)(
    "renders shared controls and source sleep/EXP limits in %s",
    (lang) => {
      const html = render(lang);
      expect(html).toContain(vitalsWords[lang].title);
      expect(html).toContain('maxLength="7"');
      expect(html).toContain('maxLength="3"');
      expect(html).toContain('min="1" max="7"');
      expect(html).toContain('type="range"');
      expect(html).toContain("sicksleep.png");
      expect(html).toContain(vitalsWords[lang].edgeHigh);
    },
  );
  it("consumes bar/status settings and modern type visibility", () => {
    const html = render(
      "zh",
      {
        ...info,
        experience: { ...info.experience, showBar: false },
        status: { ...info.status, show: false },
        hiddenPower: null,
      },
      9,
    );
    expect(html).not.toContain('type="range"');
    expect(html).not.toContain("sicksleep");
    expect(html).not.toContain(
      `<legend>${vitalsWords.zh.hiddenPower}</legend>`,
    );
    expect(html).toContain(vitalsWords.zh.experience);
  });
  it("disables nonpersistent status without hiding its explanation", () => {
    const html = render("zh", {
      ...info,
      status: { ...info.status, canEdit: false, present: false },
    });
    expect(html).toContain(vitalsWords.zh.notStored);
    expect(html).toContain('fieldset class="save-editor-fields" disabled');
    expect(html).not.toContain('src="/save-art/26.08.26/sicksleep');
  });
  it("keeps fainted display separate from clearing a condition", () => {
    const html = render("en", {
      ...info,
      status: { ...info.status, fainted: true },
    });
    expect(html).toContain("sickfaint.png");
    expect(html).toContain('alt="Fainted"');
  });
  it("uses distinct source priorities for the browser selection and image", () => {
    expect(statusChoice(0x12340048, 3)).toBe(64);
    expect(statusIconChoice(0x12340048, 3)).toBe(8);
    expect(statusChoice(0x123400c0, 4)).toBe(64);
    expect(statusIconChoice(0x123400c0, 4)).toBe(128);
    for (let turns = 1; turns <= 7; turns++)
      expect(statusChoice(turns, 2)).toBe(1);
    expect(statusChoice(0x12340005, 9)).toBe(8);
    expect(statusIconChoice(0x12340005, 9)).toBe(8);
    expect(statusIconChoice(255, 9)).toBe(0);
  });
  it("enforces integer values and source field limits", () => {
    expect(vitalInteger("9999999", 9999999)).toBe(9999999);
    expect(vitalInteger("1", 100, 1)).toBe(1);
    for (const value of ["", "-1", "1.5", "1e2", "10000000", "NaN"])
      expect(() => vitalInteger(value, 9999999)).toThrow();
    expect(() => vitalInteger("0", 100, 1)).toThrow();
  });
  it("uses all original local status assets", () => {
    for (const choice of [-1, 1, 8, 16, 32, 64, 128])
      expect(pokemonStatusImage(choice)).toMatch(/save-art\/26\.08\.26\/sick/);
    expect(pokemonStatusImage(0)).toBeUndefined();
    expect(pokemonStatusImage(255)).toBeUndefined();
  });
  it("matches masked empty fields and source level clamping", () => {
    for (const value of ["", " ", "0000000"])
      expect(experienceInput(value)).toBe(0);
    expect(experienceInput("12 34")).toBe(1234);
    expect(experienceInput("9999999")).toBe(9999999);
    expect(levelInput("")).toBe(1);
    expect(levelInput("000")).toBe(1);
    expect(levelInput("999")).toBe(100);
    expect(levelInput("020")).toBe(20);
    for (const value of ["10000000", "-1", "1e2", "x"])
      expect(() => experienceInput(value)).toThrow();
    expect(() => levelInput("1000")).toThrow();
  });
});

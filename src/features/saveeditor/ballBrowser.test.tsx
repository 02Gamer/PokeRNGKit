import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  parseOriginCatalog,
  ballBrowserWords,
  originPreviewBall,
} from "./ballBrowser";
import { PokemonBallBrowser } from "./PokemonBallBrowser";

const name = { zh: "精灵球", en: "Poké Ball", ja: "モンスターボール" };
const catalog = () => ({
  version: 3,
  games: [{ id: 3, name }],
  balls: [
    { id: 0, name },
    { id: 1, name },
    { id: 2, name },
    { id: 3, name },
  ],
  metLocations: [],
  eggLocations: [],
  ballBrowser: {
    legalFirst: true,
    currentBall: 2,
    pokeBall: 3,
    colorBall: 2,
    choices: [
      { id: 2, name, legal: true, storedValue: 2 },
      { id: 1, name, legal: false, storedValue: 1 },
      { id: 3, name, legal: false, storedValue: 0 },
    ],
  },
});

describe("source ball browser boundary", () => {
  it("retains unlisted raw values on reads and adopts Core results only for explicit edits", () => {
    expect(
      originPreviewBall(
        { version: 3, ball: 255 },
        { version: 3, ball: 255 },
        4,
      ),
    ).toBe(255);
    expect(
      originPreviewBall({ version: 3, ball: 255 }, { version: 3, ball: 24 }, 4),
    ).toBe(4);
    expect(
      originPreviewBall({ version: 7, ball: 24 }, { version: 10, ball: 24 }, 4),
    ).toBe(4);
    expect(
      originPreviewBall({ version: 7, ball: 4 }, { version: 7, ball: 4 }, 4),
    ).toBe(4);
  });
  it("preserves every ball, exact names, nonpassing choices and setter readback", () => {
    const value = catalog();
    expect(parseOriginCatalog(value)).toBe(value);
    const numeric = catalog();
    numeric.ballBrowser.legalFirst = false;
    numeric.ballBrowser.choices.sort((a, b) => a.id - b.id);
    expect(parseOriginCatalog(numeric)).toBe(numeric);
    const empty = catalog();
    empty.ballBrowser.choices = [];
    expect(parseOriginCatalog(empty)).toBe(empty);
  });
  it.each([
    (v: ReturnType<typeof catalog>) => {
      v.ballBrowser.choices.push(v.ballBrowser.choices[0]);
    },
    (v: ReturnType<typeof catalog>) => {
      v.ballBrowser.choices[1].id = 0;
    },
    (v: ReturnType<typeof catalog>) => {
      v.ballBrowser.choices[1].id = 4;
    },
    (v: ReturnType<typeof catalog>) => {
      v.ballBrowser.choices.reverse();
    },
    (v: ReturnType<typeof catalog>) => {
      v.ballBrowser.legalFirst = false;
    },
    (v: ReturnType<typeof catalog>) => {
      v.ballBrowser.choices[0].name = { ...name, ja: "" };
    },
    (v: ReturnType<typeof catalog>) => {
      v.ballBrowser.choices[0].storedValue = 256;
    },
    (v: ReturnType<typeof catalog>) => {
      v.ballBrowser.pokeBall = -1;
    },
    (v: ReturnType<typeof catalog>) => {
      v.games.push(v.games[0]);
    },
    (v: ReturnType<typeof catalog>) => {
      v.version = 256;
    },
  ])(
    "rejects malformed, incomplete or incorrectly ordered native data",
    (mutate) => {
      const value = catalog();
      mutate(value);
      expect(() => parseOriginCatalog(value)).toThrow();
    },
  );
  it("rejects absent metadata and nonobjects", () => {
    for (const value of [
      null,
      [],
      {},
      { ...catalog(), ballBrowser: null },
      { ...catalog(), ballBrowser: undefined },
      {
        ...catalog(),
        ballBrowser: { ...catalog().ballBrowser, legalFirst: 1 },
      },
    ])
      expect(() => parseOriginCatalog(value)).toThrow();
  });
});

describe("shared image ball chooser", () => {
  it.each(["zh", "en", "ja"] as const)(
    "renders real art, accessible choices and exact source names in %s",
    (lang) => {
      const html = renderToStaticMarkup(
        createElement(PokemonBallBrowser, {
          catalog: catalog().ballBrowser,
          value: 2,
          lang,
          disabled: false,
          onChoose: () => {},
        }),
      );
      expect(html).toContain(name[lang]);
      expect(html).toContain(ballBrowserWords[lang].legal);
      expect(html).toContain(ballBrowserWords[lang].other);
      expect(html).toContain(ballBrowserWords[lang].note);
      expect(html).toContain("_ball1.png");
      expect(html).toContain("_ball2.png");
      expect(html).toContain("_ball3.png");
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
      expect(html.match(/aria-pressed=/g)).toHaveLength(3);
      expect(html).not.toContain("disabled=");
    },
  );
  it("maps both explicit actions and source Alt/Shift shortcuts to native readback values", () => {
    const selected: number[] = [];
    const tree = PokemonBallBrowser({
      catalog: catalog().ballBrowser,
      value: 2,
      lang: "zh",
      disabled: false,
      onChoose: (v) => selected.push(v),
    });
    const buttons: ReactElement<{
      onClick: (event: { altKey: boolean; shiftKey: boolean }) => void;
      "aria-pressed"?: boolean;
    }>[] = [];
    function visit(node: ReactNode) {
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (!isValidElement<{ children?: ReactNode }>(node)) return;
      if (node.type === "button")
        buttons.push(node as (typeof buttons)[number]);
      visit(node.props.children);
    }
    visit(tree);
    const plain = { altKey: false, shiftKey: false };
    buttons[0].props.onClick(plain);
    buttons[1].props.onClick(plain);
    buttons[4].props.onClick(plain);
    buttons[4].props.onClick({ altKey: true, shiftKey: true });
    buttons[4].props.onClick({ altKey: false, shiftKey: true });
    expect(selected).toEqual([3, 2, 0, 3, 2]);
    const html = renderToStaticMarkup(
      createElement(PokemonBallBrowser, {
        catalog: catalog().ballBrowser,
        value: 2,
        lang: "en",
        disabled: true,
        onChoose: () => {},
      }),
    );
    expect(html.match(/disabled=""/g)).toHaveLength(5);
  });
});

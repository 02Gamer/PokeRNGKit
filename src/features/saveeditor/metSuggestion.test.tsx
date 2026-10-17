// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MetSuggestionWorkspace } from "./MetSuggestionWorkspace";
import {
  metSuggestionWords,
  parseMetSuggestion,
  type MetSuggestionPreview,
} from "./metSuggestion";
const hash = "A".repeat(64);
const state = {
  level: 25,
  metLevel: 5,
  location: 16,
  locationName: { zh: "地点", en: "Location", ja: "場所" },
  groundTile: null,
  timeOfDay: null,
};
const preview: MetSuggestionPreview = {
  sourceHash: hash,
  available: true,
  token: "met:1",
  targetHash: "B".repeat(64),
  before: state,
  after: { ...state, location: 20 },
  hatchMemory: false,
  changedBytes: 8,
};
it("requires a complete frozen suggestion for the current source", () => {
  expect(() => parseMetSuggestion(preview, "C".repeat(64))).toThrow();
  for (const patch of [
    { token: null },
    { targetHash: "invalid" },
    { after: null },
    { changedBytes: -1 },
    { before: { ...state, level: 256 } },
  ])
    expect(() => parseMetSuggestion({ ...preview, ...patch }, hash)).toThrow();
  const parsed = parseMetSuggestion(preview, hash);
  parsed.after!.locationName.zh = "changed";
  expect(preview.after!.locationName.zh).toBe("地点");
});
it("unavailable suggestions cannot carry writable output", () => {
  const unavailable = {
    sourceHash: hash,
    available: false,
    hatchMemory: false,
    changedBytes: 0,
  };
  expect(parseMetSuggestion(unavailable, hash)).toEqual(unavailable);
  for (const patch of [
    { token: "met:1" },
    { targetHash: hash },
    { before: state },
    { hatchMemory: true },
    { changedBytes: 1 },
  ])
    expect(() =>
      parseMetSuggestion({ ...unavailable, ...patch }, hash),
    ).toThrow();
});
it.each(["zh", "en", "ja"] as const)(
  "offers a localized preview before any write in %s",
  (lang) => {
    const apply = vi.fn();
    const html = renderToStaticMarkup(
      <MetSuggestionWorkspace
        hash={hash}
        lang={lang}
        disabled={false}
        onPreview={async () => preview}
        onApply={apply}
        onDiscard={async () => {}}
        onReviewing={() => {}}
      />,
    );
    expect(html).toContain(metSuggestionWords[lang].preview);
    expect(html).not.toContain(metSuggestionWords[lang].confirm);
    expect(apply).not.toHaveBeenCalled();
    const locked = renderToStaticMarkup(
      <MetSuggestionWorkspace
        hash={hash}
        lang={lang}
        disabled
        onPreview={async () => preview}
        onApply={apply}
        onDiscard={async () => {}}
        onReviewing={() => {}}
      />,
    );
    expect(locked).toContain('disabled=""');
  },
);

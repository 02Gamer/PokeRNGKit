// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrainerLibraryWorkspace } from "./TrainerLibraryWorkspace";
import { trainerLibraryWords } from "./trainerLibraryWords";
vi.mock("./useSaveSettingsJson", () => ({
  useSaveSettingsJson: () =>
    JSON.stringify({ localResources: { trainerPath: "trainers" } }),
}));
it.each(["zh", "en", "ja"] as const)(
  "labels local trainer sources and import controls in %s",
  (lang) => {
    const html = renderToStaticMarkup(
        <TrainerLibraryWorkspace
          lang={lang}
          busy={false}
          onChanged={() => {}}
        />,
      ),
      w = trainerLibraryWords[lang];
    expect(html).toContain(w.title);
    expect(html).toContain(w.files);
    expect(html).toContain(w.folder);
    expect(html).toContain(w.undo);
    const inputs = html.match(/<input[^>]*>/g)!;
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input).toContain('type="file"');
      expect(input).toContain('multiple=""');
      expect(input).toContain('disabled=""');
    }
  },
);

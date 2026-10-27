// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BoxArchiveEditor } from "./BoxArchiveEditor";
import { boxArchiveWords } from "./boxArchive";
import { settingsFieldName, settingsEnumName } from "./settingsLabels";
const language = vi.hoisted(() => ({ value: "zh" }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: language.value } }),
}));
it.each(["zh", "en", "ja"] as const)(
  "provides all source options and localized close-memory guidance in %s",
  (lang) => {
    language.value = lang;
    const html = renderToStaticMarkup(
      <BoxArchiveEditor
        box={0}
        busy={false}
        onExport={async () => true}
        onRemember={async () => {
          throw Error("not called by SSR");
        }}
      />,
    );
    const escaped = (value: string) =>
      renderToStaticMarkup(<span>{value}</span>).slice(6, -7);
    expect(html).toContain(escaped(boxArchiveWords[lang].rememberNote));
    expect(html).toContain(settingsFieldName("Notify", lang));
    expect(html).toContain(
      settingsEnumName("BoxExportNofify", "NotifyResult", lang),
    );
    expect(html).toContain(boxArchiveWords[lang].namer);
    expect(html).toContain("Default");
    expect(html.match(/aria-haspopup="listbox"/g)).toHaveLength(6);
    expect(html).not.toContain('role="alert"');
  },
);
it("explicitly disables every menu trigger while the export workspace is locked", () => {
  const html = renderToStaticMarkup(
    <BoxArchiveEditor
      box={0}
      busy={true}
      onExport={async () => true}
      onRemember={async () => {
        throw Error("not called by SSR");
      }}
    />,
  );
  const triggers = Array.from(
    html.matchAll(/<button\b[^>]*aria-haspopup="listbox"[^>]*>/g),
    (match) => match[0],
  );
  expect(triggers).toHaveLength(6);
  for (const trigger of triggers) expect(trigger).toContain('disabled=""');
});

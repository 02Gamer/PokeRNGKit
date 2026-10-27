// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BoxBatchEditor } from "./BoxBatchEditor";
import { BoxImportEditor } from "./BoxImportEditor";
import { BoxBinaryEditor } from "./BoxBinaryEditor";
import type { SaveReport } from "./domain";

// View-only fixture. These components consume box names, count and actions;
// save recognition and validation remain covered by the Core/domain fixtures.
const report = {
  boxCount: 2,
  boxes: [{ name: "BOX1" }, { name: "BOX2" }],
  boxOptions: { batchActions: [{ id: "SortSpecies", group: 1 }] },
} as SaveReport;
const apply = async () => {};
const preview = async () => undefined;
const discard = () => {};
function triggers(html: string) {
  return Array.from(
    html.matchAll(/<button\b[^>]*aria-haspopup="listbox"[^>]*>/g),
    (match) => match[0],
  );
}
function importMarkup(lang: "zh" | "en" | "ja", busy: boolean) {
  return renderToStaticMarkup(
    <BoxImportEditor
      report={report}
      box={0}
      busy={busy}
      lang={lang}
      onPreview={preview}
      onApply={apply}
      onDiscard={discard}
    />,
  );
}
function batchMarkup(lang: "zh" | "en" | "ja", disabled: boolean) {
  return renderToStaticMarkup(
    <BoxBatchEditor
      report={report}
      box={0}
      disabled={disabled}
      lang={lang}
      onApply={apply}
    />,
  );
}
function binaryMarkup(
  lang: "zh" | "en" | "ja",
  busy: boolean,
  canEdit: boolean,
) {
  return renderToStaticMarkup(
    <BoxBinaryEditor
      box={0}
      busy={busy}
      canEdit={canEdit}
      lang={lang}
      onPreviewBoxBinary={preview}
      onApplyBoxBinary={apply}
      onDiscardBoxBinary={discard}
      onExportBoxBinary={async () => true}
    />,
  );
}
it.each(["zh", "en", "ja"] as const)(
  "locks import and batch menu triggers in %s",
  (lang) => {
    const imports = triggers(importMarkup(lang, true));
    const batch = triggers(batchMarkup(lang, true));
    expect(imports).toHaveLength(4);
    expect(batch).toHaveLength(2);
    for (const trigger of [...imports, ...batch])
      expect(trigger).toContain('disabled=""');
  },
);
it.each(["zh", "en", "ja"] as const)(
  "keeps available import and batch choices enabled in %s",
  (lang) => {
    const imports = triggers(importMarkup(lang, false));
    const batch = triggers(batchMarkup(lang, false));
    expect(imports).toHaveLength(4);
    expect(batch).toHaveLength(2);
    for (const trigger of [...imports, ...batch])
      expect(trigger).not.toContain('disabled=""');
  },
);
it.each(["zh", "en", "ja"] as const)(
  "locks binary menus while preserving read-only export choices in %s",
  (lang) => {
    const locked = triggers(binaryMarkup(lang, true, true));
    expect(locked).toHaveLength(4);
    for (const trigger of locked) expect(trigger).toContain('disabled=""');
    const editable = triggers(binaryMarkup(lang, false, true));
    expect(editable).toHaveLength(4);
    for (const trigger of editable)
      expect(trigger).not.toContain('disabled=""');
    const readOnly = triggers(binaryMarkup(lang, false, false));
    expect(readOnly).toHaveLength(1);
    expect(readOnly[0]).not.toContain('disabled=""');
  },
);

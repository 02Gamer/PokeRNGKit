// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { settingsFieldCaption } from "./settingsLabels";
import { SaveSettingsEditor } from "./SaveSettingsEditor";
import { SAVE_EDITOR_API_VERSION } from "./domain";
import type { SaveSettingsField } from "./settingsProtocol";

const field = (path: string): SaveSettingsField => ({
  path,
  name: path.split(".").at(-1)!,
  kind: "boolean",
  minimum: null,
  maximum: null,
  choices: [],
});
const names = {
  zh: {
    bulk: "批量分析 · 核对当前持有人",
    trainer: "允许第六世代原训练家持有",
    x: "水平偏移（X）",
    y: "垂直偏移（Y）",
  },
  en: {
    bulk: "Bulk · Check Current Handler",
    trainer: "Allow Gen VI Original Trainer Handling",
    x: "Horizontal Offset (X)",
    y: "Vertical Offset (Y)",
  },
  ja: {
    bulk: "一括解析 · 現在の所持者を確認",
    trainer: "第6世代で元のトレーナーの所持を許可",
    x: "横方向のオフセット（X）",
    y: "縦方向のオフセット（Y）",
  },
};
const escapeText = (text: string) =>
  renderToStaticMarkup(<span>{text}</span>).slice(6, -7);

it.each(["zh", "en", "ja"] as const)(
  "renders readable known setting captions in %s",
  (lang) => {
    const fields = [
      field("legality.bulk.checkActiveHandler"),
      field("legality.handler.restrictions.allowHandleOTGen6"),
    ];
    expect(settingsFieldCaption(fields[0], lang)).toBe(names[lang].bulk);
    expect(settingsFieldCaption(fields[1], lang)).toContain(
      names[lang].trainer,
    );
    expect(
      settingsFieldCaption(field("hover.previewCursorShift.x"), lang),
    ).toContain(names[lang].x);
    expect(
      settingsFieldCaption(field("hover.previewCursorShift.y"), lang),
    ).toContain(names[lang].y);
    const input = {
      legality: {
        bulk: { checkActiveHandler: true },
        handler: { restrictions: { allowHandleOTGen6: false } },
      },
    };
    const json = JSON.stringify(input);
    const html = renderToStaticMarkup(
      <SaveSettingsEditor
        bundle={{
          apiVersion: SAVE_EDITOR_API_VERSION,
          json,
          catalog: { groups: [{ id: "legality", fields }] },
        }}
        json={json}
        lang={lang}
        busy={false}
        unavailable={{}}
        initialGroup="legality"
        onValidate={async (draft) => draft}
        onSave={async () => {}}
      />,
    );
    expect(html).toContain(escapeText(names[lang].bulk));
    expect(html).toContain(escapeText(names[lang].trainer));
    expect(JSON.parse(json)).toEqual(input);
  },
);

it.each(["zh", "en", "ja"] as const)(
  "does not reuse a known caption for an unrelated future path in %s",
  (lang) => {
    expect(settingsFieldCaption(field("future.checkActiveHandler"), lang)).toBe(
      "checkActiveHandler",
    );
    expect(settingsFieldCaption(field("future.restrictions"), lang)).toBe(
      "restrictions",
    );
    expect(settingsFieldCaption(field("hover.future.x"), lang)).toBe(
      "Future · x",
    );
  },
);

it.each(["zh", "en", "ja"] as const)(
  "retains upstream captions for existing translated fields in %s",
  (lang) => {
    const caption = {
      zh: "写入时更新图鉴",
      en: "SetUpdateDex",
      ja: "配置時に図鑑を更新",
    };
    expect(settingsFieldCaption(field("slotWrite.setUpdateDex"), lang)).toBe(
      caption[lang],
    );
  },
);

// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SaveSoundControl } from "./SaveSoundControl";
it.each(["zh", "en", "ja"] as const)(
  "keeps sound off and test unavailable before page activation in %s",
  (lang) => {
    const html = renderToStaticMarkup(
      <SaveSoundControl lang={lang} busy={false} />,
    );
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('role="alert"');
    for (const label of {
      zh: ["提示类型", "提示"],
      en: ["Cue type", "Notice"],
      ja: ["通知の種類", "通知"],
    }[lang])
      expect(html).toContain(label);
  },
);

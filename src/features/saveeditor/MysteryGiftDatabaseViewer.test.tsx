import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MysteryGiftDatabaseViewer } from "./MysteryGiftDatabaseViewer";
import { mysteryGiftDatabaseWords } from "./mysteryGiftDatabaseWords";
import type { SaveReport } from "./domain";
import { settingsWords } from "./settingsLabels";
afterEach(() => vi.unstubAllGlobals());
it.each(["zh", "en", "ja"] as const)(
  "renders localized operations and the unified settings entry in %s without opening a file",
  (lang) => {
    const request = vi.fn(),
      apply = vi.fn();
    const html = renderToStaticMarkup(
      <MysteryGiftDatabaseViewer
        lang={lang}
        busy={false}
        report={{ generation: 6 } as SaveReport}
        actions={{ request }}
        databaseActions={{ request, apply }}
        onOpenSettings={() => {}}
      />,
    );
    const w = mysteryGiftDatabaseWords[lang];
    for (const label of [
      w.title,
      w.library,
      w.settings,
      w.add,
      w.remove,
      w.undo,
      settingsWords[lang].title,
      w.search,
      w.exportAll,
      w.source,
    ])
      expect(html).toContain(label);
    expect(html).toContain(".wa9");
    expect(html).not.toContain(w.rows);
    expect(request).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  },
);

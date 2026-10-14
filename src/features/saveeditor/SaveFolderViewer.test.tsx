import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SaveFolderViewer } from "./SaveFolderViewer";
import { saveFolderWords } from "./saveFolderWords";
describe("save folder workspace entry", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(["zh", "en", "ja"] as const)(
    "renders localized operations and shared controls without opening source files in %s",
    (lang) => {
      const onOpen = vi.fn(),
        onClose = vi.fn();
      const html = renderToStaticMarkup(
        <SaveFolderViewer
          lang={lang}
          busy={false}
          onOpen={onOpen}
          onClose={onClose}
        />,
      );
      const words = saveFolderWords[lang];
      for (const text of [
        words.title,
        words.recent,
        words.backup,
        words.folders,
        words.choose,
        words.chooseFolder,
        words.cleanup,
        words.undo,
        ...words.columns,
      ])
        expect(html).toContain(text);
      expect(html).toContain("haku-select");
      expect(html).toContain('maxLength="32767"');
      expect(html).toContain("webkitdirectory");
      expect(onOpen).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    },
  );
});

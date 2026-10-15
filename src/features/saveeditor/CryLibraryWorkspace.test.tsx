import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CryLibraryWorkspace } from "./CryLibraryWorkspace";
for (const [lang, title, enable, loading] of [
  ["zh", "本机叫声资料", "启用叫声", "正在读取叫声资料"],
  ["en", "Local cry files", "Enable cries", "Reading cry files"],
  ["ja", "ローカルの鳴き声", "鳴き声を有効にする", "鳴き声を読み込み中"],
] as const) {
  it(`keeps ${lang} cry controls localized and audio inactive on initial render`, () => {
    const html = renderToStaticMarkup(
      <CryLibraryWorkspace lang={lang} busy={false} />,
    );
    expect(html).toContain(title);
    expect(html).toContain(enable);
    expect(html).toContain(loading);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('accept=".wav,audio/wav"');
    expect(html).toContain("webkitdirectory");
  });
}

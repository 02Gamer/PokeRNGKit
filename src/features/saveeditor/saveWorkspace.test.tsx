import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SaveSectionNavigation } from "./SaveSectionNavigation";
import { groupSaveSections, type SaveSectionItem } from "./saveWorkspace";

const items: SaveSectionItem[] = [
  { id: "pokemon", label: "宝可梦", available: true },
  { id: "trainer", label: "训练家", available: true },
  { id: "sevenstar9", label: "七星团体战", available: false },
  { id: "raid8", label: "极巨团体战", available: true },
  { id: "files", label: "文件", available: true },
];

describe("save workspace navigation", () => {
  it("keeps available source entries in their purpose groups without empty groups or input changes", () => {
    const before = structuredClone(items);
    const groups = groupSaveSections(items);
    expect(groups.map((group) => group.id)).toEqual([
      "pokemon",
      "trainer",
      "game",
      "tools",
    ]);
    expect(
      groups.flatMap((group) => group.items.map((item) => item.id)),
    ).toEqual(["pokemon", "trainer", "raid8", "files"]);
    expect(items).toEqual(before);
    expect(
      groupSaveSections(items.map((item) => ({ ...item, available: false }))),
    ).toEqual([]);
  });

  it.each(["zh", "en", "ja"] as const)(
    "renders shared selector groups and one current desktop action in %s",
    (lang) => {
      const html = renderToStaticMarkup(
        <SaveSectionNavigation
          items={items}
          selected="trainer"
          busy={false}
          lang={lang}
          onSelect={() => {}}
        />,
      );
      expect(html).not.toContain("七星团体战");
      expect(html).toContain("haku-select");
      expect(html).toContain("极巨团体战");
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
      expect(
        html.match(/aria-controls="save-section-content"/g)?.length,
      ).toBeGreaterThanOrEqual(4);
      expect(html).not.toContain("disabled=");
    },
  );

  it("disables purpose actions and the shared selector during an operation", () => {
    const html = renderToStaticMarkup(
      <SaveSectionNavigation
        items={items}
        selected="trainer"
        busy
        lang="zh"
        onSelect={() => {}}
      />,
    );
    expect(html.match(/disabled=""/g)).toHaveLength(5);
    expect(html).toContain("训练家与记录");
    expect(html).not.toContain("事件与配信");
  });
});

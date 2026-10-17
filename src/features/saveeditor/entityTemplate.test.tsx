import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntityTemplateWorkspace } from "./EntityTemplateWorkspace";
import {
  entityTemplateBase64,
  entityTemplateWords,
  parseEntityTemplateCatalog,
  parseEntityTemplateCreated,
  type EntityTemplateCatalog,
} from "./entityTemplate";
import {
  findEntityTemplate,
  replaceEntityTemplate,
} from "./entityTemplateLibrary";
import type { DatabaseLocalFile } from "./databaseRepository";
const hash = "A".repeat(64),
  names = { zh: "测试", en: "Test", ja: "テスト" };
const catalog: EntityTemplateCatalog = {
  apiVersion: 185,
  sourceHash: hash,
  version: 3,
  versions: [{ id: 3, name: names }],
  directory: "my/template",
  expectedFileName: "template.pk3",
  format: "PK3",
};
const created = {
  apiVersion: 185,
  sourceHash: hash,
  version: 3,
  directory: "my/template",
  expectedFileName: "template.pk3",
  usedCustom: false,
  fallback: "none",
  fileName: "template.pk3",
};
describe("entity template contracts", () => {
  it("binds multilingual game choices and created entity metadata to the exact save source", () => {
    expect(parseEntityTemplateCatalog(catalog, hash)).toBe(catalog);
    expect(parseEntityTemplateCreated(created, hash)).toBe(created);
    expect(() => parseEntityTemplateCatalog(catalog, "B".repeat(64))).toThrow();
    expect(() => parseEntityTemplateCreated(created, "B".repeat(64))).toThrow();
  });
  it.each([
    null,
    [],
    { ...catalog, apiVersion: 167 },
    { ...catalog, versions: [] },
    { ...catalog, versions: [{ id: 3, name: { en: "missing" } }] },
    { ...catalog, expectedFileName: "" },
  ])("rejects malformed catalog %#", (value) => {
    expect(() => parseEntityTemplateCatalog(value, hash)).toThrow();
  });
  it.each([
    null,
    { ...created, apiVersion: 167 },
    { ...created, fileName: "unsafe.sav" },
    { ...created, usedCustom: 1 },
    { ...created, fallback: "other" },
  ])("rejects malformed created metadata %#", (value) => {
    expect(() => parseEntityTemplateCreated(value, hash)).toThrow();
  });
  it("encodes exact template bytes without changing a subarray", () => {
    const data = new Uint8Array([9, 0, 1, 254, 255, 9]);
    expect(entityTemplateBase64(data.subarray(1, 5))).toBe("AAH+/w==");
    expect([...data]).toEqual([9, 0, 1, 254, 255, 9]);
  });
  it.each(["zh", "en", "ja"] as const)(
    "renders localized creation controls without reading a file or starting a Worker in %s",
    (lang) => {
      const html = renderToStaticMarkup(
        createElement(EntityTemplateWorkspace, {
          lang,
          active: false,
          onOpenSettings() {},
        }),
      );
      expect(html).toContain(entityTemplateWords[lang].note);
      expect(html).toContain(entityTemplateWords[lang].create);
      expect(html).toContain("haku-select");
      expect(html).not.toContain(".sav");
    },
  );
});
describe("template library ownership", () => {
  const file = (
    id: string,
    directory: string,
    name = "template.pk3",
  ): DatabaseLocalFile => ({
    id,
    name,
    directory,
    data: new Uint8Array([1, 2, 3]).buffer,
    entityFile: true,
    modified: 1,
  });
  it("matches one exact directory and Windows filename casing, excluding nested/unrelated and legacy database files", () => {
    const wanted = file("wanted", "my\\template/", "TEMPLATE.PK3");
    const files = [
      file("outside", "other"),
      file("nested", "my/template/sub"),
      { ...file("legacy", "pkmdb"), directory: undefined },
      wanted,
    ];
    expect(findEntityTemplate(files, catalog)).toBe(wanted);
    expect(() =>
      findEntityTemplate([...files, { ...wanted, id: "duplicate" }], catalog),
    ).toThrow();
  });
  it("replaces/removes only the template and keeps independent source buffers and every other category", () => {
    const outside = file("outside", "other"),
      old = file("old", "my/template");
    const original = [outside, old];
    const input = new Uint8Array([7, 8, 9]).buffer;
    const next = replaceEntityTemplate(original, catalog, input, "unused", 4);
    expect(next[0]).toBe(outside);
    expect(next[1].id).toBe(old.id);
    expect(next[1].modified).toBe(4);
    new Uint8Array(next[1].data)[0] = 99;
    expect([...new Uint8Array(input)]).toEqual([7, 8, 9]);
    expect([...new Uint8Array(old.data)]).toEqual([1, 2, 3]);
    expect(replaceEntityTemplate(original, catalog, undefined, "", 4)).toEqual([
      outside,
    ]);
    expect(original).toEqual([outside, old]);
  });
  it("rejects conflicting identities and empty or oversized files before a repository transaction", () => {
    expect(() =>
      replaceEntityTemplate([], catalog, new ArrayBuffer(0), "new", 1),
    ).toThrow();
    expect(() =>
      replaceEntityTemplate(
        [],
        catalog,
        new ArrayBuffer(1024 * 1024 + 1),
        "new",
        1,
      ),
    ).toThrow();
    expect(() =>
      replaceEntityTemplate(
        [file("taken", "other")],
        catalog,
        new ArrayBuffer(1),
        "taken",
        1,
      ),
    ).toThrow();
  });
});

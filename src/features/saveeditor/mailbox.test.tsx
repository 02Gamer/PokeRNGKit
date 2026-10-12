import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MailboxEditor } from "./MailboxEditor";
import {
  mailConfirmation,
  mailDraft,
  mailIssue,
  mailRequest,
  mailType,
  mailTypeChoice,
  mailboxWords,
  supportsMailbox,
  type MailCatalog,
  type MailEntry,
  type MailTicket,
} from "./mailbox";
const entry: MailEntry = {
  index: 0,
  held: true,
  empty: true,
  authorName: "MAIL  ",
  tid: 1,
  sid: 2,
  language: 2,
  version: 10,
  gender: 0xfe,
  type: 255,
  species: 25,
  appear: [65528, 25, 0],
  message: Array(12).fill(65535),
  lines: [],
  userEntered: false,
  misc: [],
  ending: 0,
};
const catalog: MailCatalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  generation: 4,
  heldCount: 1,
  boxCount: 20,
  boxMaximum: 20,
  entries: [entry],
  party: [],
  types: Array.from({ length: 13 }, (_, id) => ({
    id,
    name: { zh: `Z${id}`, en: `E${id}`, ja: `J${id}` },
  })),
  species: [
    { id: 0, name: { zh: "空", en: "None", ja: "なし" } },
    { id: 25, name: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" } },
  ],
  languages: [{ id: 2, name: { zh: "英语", en: "English", ja: "英語" } }],
  versions: [
    { id: 10, name: { zh: "钻石", en: "Diamond", ja: "ダイヤモンド" } },
  ],
  issues: [],
};
describe("mailbox frontend", () => {
  it("matches source mail type choices for all four generations", () => {
    for (const generation of [2, 3, 4, 5]) {
      const c = {
        ...catalog,
        generation,
        types: catalog.types.slice(0, generation === 2 ? 11 : 13),
      };
      for (const choice of c.types)
        expect(mailTypeChoice(c, mailType(c, choice.id))).toBe(choice.id);
      expect(mailType(c, 0)).toBe(generation <= 3 ? 0 : 255);
    }
  });
  it("normalizes displayed gender and invalid artwork without mutating raw entries", () => {
    const before = structuredClone(entry),
      draft = mailDraft(catalog, entry);
    expect(draft.gender).toBe(0);
    expect(draft.appear).toEqual([0, 25, 0]);
    expect(entry).toEqual(before);
  });
  it("keeps ordered edits detached and validates source limits", () => {
    const actions = [
      { kind: "edit" as const, index: 0, entry: mailDraft(catalog, entry) },
    ];
    const r = mailRequest(catalog, actions);
    actions[0].entry.tid = 400;
    expect(r.actions[0]).toMatchObject({ entry: { tid: 1 } });
    expect(() =>
      mailRequest(catalog, [
        { kind: "edit", index: 0, entry: { ...entry, authorName: "12345678" } },
      ]),
    ).toThrow();
    expect(() =>
      mailRequest(catalog, [{ kind: "heldId", index: 0, value: 6 }]),
    ).toThrow();
    expect(() =>
      mailRequest(catalog, [{ kind: "boxCount", index: 0, value: 21 }]),
    ).toThrow();
  });
  it("requires explicit issue acknowledgment and rejects stale frozen results", () => {
    const t: MailTicket = {
      token: "mailbox:2",
      sourceHash: catalog.sourceHash,
      targetHash: "B".repeat(64),
      before: catalog,
      result: { ...catalog, sourceHash: "B".repeat(64) },
      changedOffsets: [5],
      issues: ["party:0:mailId"],
    };
    expect(() => mailConfirmation(catalog, t, false)).toThrow();
    expect(mailConfirmation(catalog, t, true).acceptIssues).toBe(true);
    expect(() =>
      mailConfirmation(catalog, { ...t, sourceHash: t.targetHash }, true),
    ).toThrow();
  });
  it.each(["zh", "en", "ja"] as const)(
    "localizes controls and association details in %s",
    (lang) => {
      const html = renderToStaticMarkup(
        <MailboxEditor
          revision={1}
          busy={true}
          lang={lang}
          onRead={async () => undefined}
          onPreview={async () => undefined}
          onApply={async () => false}
          onDiscard={async () => {}}
        />,
      );
      expect(html).toContain(mailboxWords[lang].title);
      expect(html).toContain("save-editor-toolbar");
      expect(html).toContain("disabled");
      expect(mailIssue("party:0:mailId", lang)).not.toContain("party:0:");
    },
  );
  it("keeps unsupported console formats outside the source entry", () => {
    for (const name of ["SAV2Stadium", "SAV3E", "SAV4HGSS", "SAV5B2W2"])
      expect(supportsMailbox(name)).toBe(true);
    for (const name of ["SAV3Colosseum", "SAV3XD", "SAV4BR", "SAV6XY"])
      expect(supportsMailbox(name)).toBe(false);
  });
});

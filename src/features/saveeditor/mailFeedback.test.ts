// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import { mailDeleteNeedsQuestion } from "./mailbox";
it("asks only when deleting a party-side mail referenced by an actual mail item", () => {
  const c = {
    party: [
      { heldMailId: 0, itemIsMail: true },
      { heldMailId: 0, itemIsMail: true },
      { heldMailId: 2, itemIsMail: false },
    ],
  };
  expect(mailDeleteNeedsQuestion(c, 0)).toBe(true);
  expect(mailDeleteNeedsQuestion(c, 1)).toBe(false);
  expect(mailDeleteNeedsQuestion(c, 2)).toBe(false);
  for (const index of [-1, 0.5, 3, 20])
    expect(mailDeleteNeedsQuestion(c, index)).toBe(false);
  expect(mailDeleteNeedsQuestion({ party: [] }, 0)).toBe(false);
});
it("uses current preview references after held-item changes and permits deletion without the item modification", () => {
  const c = { party: [{ heldMailId: 0, itemIsMail: true }] },
    before = structuredClone(c);
  expect(mailDeleteNeedsQuestion(c, 0)).toBe(true);
  expect(c).toEqual(before);
  expect(
    mailDeleteNeedsQuestion(
      { party: [{ heldMailId: -1, itemIsMail: false }] },
      0,
    ),
  ).toBe(false);
});

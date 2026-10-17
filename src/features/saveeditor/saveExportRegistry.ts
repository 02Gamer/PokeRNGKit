// SPDX-License-Identifier: GPL-3.0-or-later
import { createContext } from "react";
export class SaveExportRegistry {
  private readonly editors = new Map<symbol, () => string | undefined>();
  register(read: () => string | undefined) {
    const key = Symbol();
    this.editors.set(key, read);
    return () => {
      this.editors.delete(key);
    };
  }
  snapshot() {
    return JSON.stringify(
      [...this.editors.values()].map((read) => read() ?? null),
    );
  }
  hasUnsaved() {
    return [...this.editors.values()].some((read) => read() !== undefined);
  }
}
export const SaveExportContext = createContext<SaveExportRegistry | undefined>(
  undefined,
);
export function equalEntityBytes(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

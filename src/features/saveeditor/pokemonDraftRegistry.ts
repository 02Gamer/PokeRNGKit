// SPDX-License-Identifier: GPL-3.0-or-later
export interface DraftModifiers {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/** One registry belongs to one entity position and working-copy revision. */
export class PokemonDraftRegistry {
  constructor(readonly scope = "") {}

  private readonly validators = new Map<
    string,
    { token: symbol; validate: () => unknown }
  >();

  register(section: string, validate: () => unknown) {
    const token = Symbol(section);
    this.validators.set(section, { token, validate });
    return () => {
      if (this.validators.get(section)?.token === token)
        this.validators.delete(section);
    };
  }

  check(modifiers?: DraftModifiers): string[] {
    // PKMEditor.EditsComplete's UI-only escape hatch. Writes still go through Core.
    if (
      modifiers?.ctrlKey &&
      modifiers.shiftKey &&
      modifiers.altKey &&
      !modifiers.metaKey
    )
      return [];
    const invalid: string[] = [];
    for (const [section, { validate }] of this.validators) {
      try {
        validate();
      } catch {
        invalid.push(section);
      }
    }
    return invalid;
  }
}

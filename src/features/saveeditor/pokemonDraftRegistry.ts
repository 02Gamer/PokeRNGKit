// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonDraftStep, PokemonDraftCapture } from "./pokemonDraftPlan";
export interface DraftModifiers {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/** One registry belongs to one entity position and working-copy revision. */
export class PokemonDraftRegistry {
  constructor(readonly scope = "") {}
  private readonly listeners = new Set<() => void>();
  private queued = false;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = (): string => {
    try {
      const value = this.capture(this.scope);
      return JSON.stringify(value);
    } catch {
      return "invalid";
    }
  };
  private changed() {
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      for (const listener of this.listeners) listener();
    });
  }

  private readonly validators = new Map<
    string,
    { token: symbol; validate: () => unknown }
  >();

  private readonly preparers = new Map<
    string,
    { token: symbol; prepare: () => PokemonDraftStep[] }
  >();
  private readonly sectionOrder = new Map<string, number>();
  registerPreparation(section: string, prepare: () => PokemonDraftStep[]) {
    const token = Symbol(section);
    if (!this.sectionOrder.has(section))
      this.sectionOrder.set(section, this.sectionOrder.size);
    this.preparers.set(section, { token, prepare });
    this.changed();
    return () => {
      if (this.preparers.get(section)?.token === token) {
        this.preparers.delete(section);
        this.changed();
      }
    };
  }
  capture(
    expectedScope: string,
    modifiers?: DraftModifiers,
  ): PokemonDraftCapture {
    if (expectedScope !== this.scope)
      throw new PokemonDraftCaptureError(["stale"]);
    const invalid = this.validate(modifiers, false);
    const missing = [...this.validators.keys()].filter(
      (section) => !this.preparers.has(section),
    );
    if (invalid.length || missing.length)
      throw new PokemonDraftCaptureError([
        ...new Set([...invalid, ...missing]),
      ]);
    const sections: PokemonDraftCapture["sections"] = [],
      failed: string[] = [];
    const ordered = [...this.preparers].sort(
      ([a], [b]) => this.sectionOrder.get(a)! - this.sectionOrder.get(b)!,
    );
    for (const [section, { prepare }] of ordered) {
      try {
        const steps = structuredClone(prepare());
        if (!Array.isArray(steps) || steps.length > 32)
          throw Error("Invalid draft operation count");
        if (steps.length) sections.push({ section, steps });
      } catch {
        failed.push(section);
      }
    }
    if (failed.length) throw new PokemonDraftCaptureError(failed);
    const capture = { scope: this.scope, sections };
    if (
      sections.flatMap((s) => s.steps).length > 64 ||
      JSON.stringify(capture).length > 1024 * 1024
    )
      throw new PokemonDraftCaptureError(["capacity"]);
    return capture;
  }
  register(section: string, validate: () => unknown) {
    const token = Symbol(section);
    this.validators.set(section, { token, validate });
    this.changed();
    return () => {
      if (this.validators.get(section)?.token === token) {
        this.validators.delete(section);
        this.changed();
      }
    };
  }

  check(modifiers?: DraftModifiers): string[] {
    return this.validate(modifiers, true);
  }
  private validate(
    modifiers: DraftModifiers | undefined,
    includePreparations: boolean,
  ): string[] {
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
    if (includePreparations)
      for (const [section, { prepare }] of this.preparers) {
        if (this.validators.has(section)) continue;
        try {
          prepare();
        } catch {
          invalid.push(section);
        }
      }
    return invalid;
  }
}

export class PokemonDraftCaptureError extends Error {
  constructor(readonly sections: string[]) {
    super(
      "Pokemon editor drafts are invalid, stale or not yet preparable: " +
        sections.join(", "),
    );
  }
}

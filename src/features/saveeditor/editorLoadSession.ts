// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonSetActions } from "./pokemonSet";
type EditorOpenResult = Awaited<ReturnType<PokemonSetActions["open"]>>;
/** Survives effect cleanup/replay; only an explicit retry starts another read. */
export class EditorLoadSession {
  private current?: { attempt: number; promise: Promise<EditorOpenResult> };
  load(attempt: number, open: () => Promise<EditorOpenResult>) {
    if (!this.current || this.current.attempt !== attempt)
      this.current = { attempt, promise: open() };
    return this.current.promise;
  }
}

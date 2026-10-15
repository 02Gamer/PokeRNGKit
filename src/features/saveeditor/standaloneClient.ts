// SPDX-License-Identifier: GPL-3.0-or-later
import { SaveEditorClient } from "./client";
import {
  MAX_ENTITY_BYTES,
  type StandalonePokemonRequest,
  type StandalonePokemonOperation,
  type StandalonePokemonResult,
} from "./standalonePokemon";
export class StandalonePokemonClient {
  // Own a separate Worker while sharing settings, cancellation, activity and
  // builder restoration rules with the save client.
  private readonly client = new SaveEditorClient();
  run(
    bytes: Uint8Array,
    request: StandalonePokemonRequest,
    kind: StandalonePokemonOperation = "entityInspect",
  ): Promise<StandalonePokemonResult> {
    if (!bytes.length || bytes.length > MAX_ENTITY_BYTES)
      return Promise.reject(new Error("Entity file size is invalid."));
    return this.client.run(
      bytes,
      JSON.stringify(request),
      kind,
    ) as unknown as Promise<StandalonePokemonResult>;
  }
  dispose(message = "Entity file operation cancelled.") {
    this.client.dispose(message);
  }
}

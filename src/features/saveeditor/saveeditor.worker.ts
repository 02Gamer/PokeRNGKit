import type { SaveReport, PokemonLegalityReport } from "./domain";
import { browserCryptography } from "./browserCryptography";

interface SaveExports {
  PokeRNGKit: {
    SaveEditor: {
      Program: {
        ConfigureBrowserCrypto(): void;
        Inspect(data: Uint8Array): string;
        ReadPokedex8a(data: Uint8Array): string;
        EditPokedex8a(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex8(data: Uint8Array): string;
        EditPokedex8(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex8b(data: Uint8Array): string;
        EditPokedex8b(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex7(data: Uint8Array): string;
        EditPokedex7(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex6(data: Uint8Array): string;
        EditPokedex6(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex5(data: Uint8Array): string;
        EditPokedex5(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex4(data: Uint8Array): string;
        EditPokedex4(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex(data: Uint8Array, json: string): string;
        EditPokedex(data: Uint8Array, json: string): Uint8Array;
        ExportWorkingCopy(data: Uint8Array): Uint8Array;
        ReadInventory(data: Uint8Array): string;
        ReadRecords(data: Uint8Array): string;
        EditRecord(data: Uint8Array, json: string): Uint8Array;
        EditInventory(data: Uint8Array, json: string): Uint8Array;
        EditInventoryBatch(data: Uint8Array, json: string): Uint8Array;
        Export(data: Uint8Array, json: string): Uint8Array;
        EditPokemon(data: Uint8Array, json: string): Uint8Array;
        EditPokemonRaw(data: Uint8Array, json: string): Uint8Array;
        EditBox(data: Uint8Array, json: string): Uint8Array;
        EditStorage(data: Uint8Array, json: string): Uint8Array;
        ImportPokemon(data: Uint8Array, json: string): Uint8Array;
        ExportPokemon(data: Uint8Array, json: string): string;
        ReadHistory(data: Uint8Array, json: string): string;
        ReadMemory(data: Uint8Array, json: string): string;
        ReadRibbons(data: Uint8Array, json: string): string;
        SuggestRelearn(data: Uint8Array, json: string): string;
        ReadOrigin(data: Uint8Array, json: string): string;
        AnalyzePokemon(data: Uint8Array, json: string): string;
      };
    };
  };
}

let runtime: Promise<SaveExports> | undefined;
async function loadRuntime(base: string): Promise<SaveExports> {
  const runtimeUrl = new URL("pkhex/_framework/dotnet.js", base).href;
  const { dotnet } = await import(/* @vite-ignore */ runtimeUrl);
  const host = await dotnet.withDiagnosticTracing(false).create();
  host.setModuleImports("pkhex-crypto", browserCryptography);
  const api: SaveExports = await host.getAssemblyExports(
    host.getConfig().mainAssemblyName,
  );
  api.PokeRNGKit.SaveEditor.Program.ConfigureBrowserCrypto();
  return api;
}

// .NET distinguishes a standalone worker from a pthread using self.onmessage.
// Keep that property unset during initialization: dotnet/runtime#114918.
self.addEventListener(
  "message",
  async (
    event: MessageEvent<{
      id: number;
      base: string;
      bytes: Uint8Array;
      edit?: string;
      kind?:
        | "pokedex8a"
        | "pokedex8aEdit"
        | "pokedex8"
        | "pokedex8Edit"
        | "pokedex8b"
        | "pokedex8bEdit"
        | "pokedex7"
        | "pokedex7Edit"
        | "pokedex6"
        | "pokedex6Edit"
        | "pokedex5"
        | "pokedex5Edit"
        | "pokedex4"
        | "pokedex4Edit"
        | "pokedex"
        | "pokedexEdit"
        | "exportWorkingCopy"
        | "trainer"
        | "inventory"
        | "records"
        | "recordEdit"
        | "inventoryEdit"
        | "inventoryBatch"
        | "pokemon"
        | "pokemonRaw"
        | "legality"
        | "box"
        | "storage"
        | "pokemonImport"
        | "historyCatalog"
        | "memoryCatalog"
        | "ribbons"
        | "relearnSuggestion"
        | "originCatalog"
        | "pokemonExport";
    }>,
  ) => {
    const { id, base, bytes, kind } = event.data;
    const edit = event.data.edit;
    const payload = edit ?? "";
    try {
      runtime ??= loadRuntime(base).catch((error) => {
        runtime = undefined;
        throw error;
      });
      const api = (await runtime).PokeRNGKit.SaveEditor.Program;
      const output =
        (edit === undefined && kind !== "exportWorkingCopy") ||
        kind === "pokedex8a" ||
        kind === "pokedex8" ||
        kind === "pokedex8b" ||
        kind === "pokedex7" ||
        kind === "pokedex6" ||
        kind === "pokedex5" ||
        kind === "pokedex4" ||
        kind === "pokedex" ||
        kind === "inventory" ||
        kind === "records" ||
        kind === "legality" ||
        kind === "pokemonExport" ||
        kind === "originCatalog" ||
        kind === "historyCatalog" ||
        kind === "memoryCatalog" ||
        kind === "ribbons" ||
        kind === "relearnSuggestion"
          ? undefined
          : new Uint8Array(
              kind === "exportWorkingCopy"
                ? api.ExportWorkingCopy(bytes)
                : kind === "pokedex8aEdit"
                  ? api.EditPokedex8a(bytes, payload)
                  : kind === "pokedex8Edit"
                    ? api.EditPokedex8(bytes, payload)
                    : kind === "pokedex8bEdit"
                      ? api.EditPokedex8b(bytes, payload)
                      : kind === "pokedex7Edit"
                        ? api.EditPokedex7(bytes, payload)
                        : kind === "pokedex6Edit"
                          ? api.EditPokedex6(bytes, payload)
                          : kind === "pokedex5Edit"
                            ? api.EditPokedex5(bytes, payload)
                            : kind === "pokedex4Edit"
                              ? api.EditPokedex4(bytes, payload)
                              : kind === "pokedexEdit"
                                ? api.EditPokedex(bytes, payload)
                                : kind === "recordEdit"
                                  ? api.EditRecord(bytes, payload)
                                  : kind === "inventoryBatch"
                                    ? api.EditInventoryBatch(bytes, payload)
                                    : kind === "inventoryEdit"
                                      ? api.EditInventory(bytes, payload)
                                      : kind === "pokemonRaw"
                                        ? api.EditPokemonRaw(bytes, payload)
                                        : kind === "pokemon"
                                          ? api.EditPokemon(bytes, payload)
                                          : kind === "box"
                                            ? api.EditBox(bytes, payload)
                                            : kind === "storage"
                                              ? api.EditStorage(bytes, payload)
                                              : kind === "pokemonImport"
                                                ? api.ImportPokemon(
                                                    bytes,
                                                    payload,
                                                  )
                                                : api.Export(bytes, payload),
            );
      const report: SaveReport = JSON.parse(api.Inspect(output ?? bytes));
      if (report.apiVersion !== 56)
        throw new Error("Save editor API version mismatch.");
      const legality: PokemonLegalityReport | undefined =
        kind === "legality" && edit !== undefined
          ? JSON.parse(api.AnalyzePokemon(bytes, payload))
          : undefined;
      const pokemonFile =
        kind === "pokemonExport" && edit !== undefined
          ? JSON.parse(api.ExportPokemon(bytes, payload))
          : undefined;
      const originCatalog =
        kind === "originCatalog" && edit !== undefined
          ? JSON.parse(api.ReadOrigin(bytes, payload))
          : undefined;
      const relearnSuggestion =
        kind === "relearnSuggestion" && edit !== undefined
          ? JSON.parse(api.SuggestRelearn(bytes, payload))
          : undefined;
      const ribbons =
        kind === "ribbons" && edit !== undefined
          ? JSON.parse(api.ReadRibbons(bytes, payload))
          : undefined;
      const historyCatalog =
        kind === "historyCatalog" && edit !== undefined
          ? JSON.parse(api.ReadHistory(bytes, payload))
          : undefined;
      const memoryCatalog =
        kind === "memoryCatalog" && edit !== undefined
          ? JSON.parse(api.ReadMemory(bytes, payload))
          : undefined;
      self.postMessage(
        {
          id,
          report,
          pokedex8a:
            kind === "pokedex8a"
              ? JSON.parse(api.ReadPokedex8a(bytes))
              : undefined,
          pokedex8:
            kind === "pokedex8"
              ? JSON.parse(api.ReadPokedex8(bytes))
              : undefined,
          pokedex8b:
            kind === "pokedex8b"
              ? JSON.parse(api.ReadPokedex8b(bytes))
              : undefined,
          pokedex7:
            kind === "pokedex7"
              ? JSON.parse(api.ReadPokedex7(bytes))
              : undefined,
          pokedex6:
            kind === "pokedex6"
              ? JSON.parse(api.ReadPokedex6(bytes))
              : undefined,
          pokedex5:
            kind === "pokedex5"
              ? JSON.parse(api.ReadPokedex5(bytes))
              : undefined,
          pokedex4:
            kind === "pokedex4"
              ? JSON.parse(api.ReadPokedex4(bytes))
              : undefined,
          pokedex:
            kind === "pokedex" && edit !== undefined
              ? JSON.parse(api.ReadPokedex(bytes, payload))
              : undefined,
          records:
            kind === "records" ? JSON.parse(api.ReadRecords(bytes)) : undefined,
          inventory:
            kind === "inventory"
              ? JSON.parse(api.ReadInventory(bytes))
              : undefined,
          output,
          legality,
          pokemonFile,
          originCatalog,
          relearnSuggestion,
          ribbons,
          memoryCatalog,
          historyCatalog,
        },
        output ? [output.buffer] : [],
      );
    } catch (error) {
      self.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

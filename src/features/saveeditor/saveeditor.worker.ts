import type { SaveReport, PokemonLegalityReport } from "./domain";
import { browserCryptography } from "./browserCryptography";

interface SaveExports {
  PokeRNGKit: {
    SaveEditor: {
      Program: {
        ConfigureBrowserCrypto(): void;
        Inspect(data: Uint8Array): string;
        Export(data: Uint8Array, json: string): Uint8Array;
        EditPokemon(data: Uint8Array, json: string): Uint8Array;
        EditPokemonRaw(data: Uint8Array, json: string): Uint8Array;
        EditBox(data: Uint8Array, json: string): Uint8Array;
        EditStorage(data: Uint8Array, json: string): Uint8Array;
        ImportPokemon(data: Uint8Array, json: string): Uint8Array;
        ExportPokemon(data: Uint8Array, json: string): string;
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
        | "trainer"
        | "pokemon"
        | "pokemonRaw"
        | "legality"
        | "box"
        | "storage"
        | "pokemonImport"
        | "ribbons"
        | "relearnSuggestion"
        | "originCatalog"
        | "pokemonExport";
    }>,
  ) => {
    const { id, base, bytes, edit, kind } = event.data;
    try {
      runtime ??= loadRuntime(base).catch((error) => {
        runtime = undefined;
        throw error;
      });
      const api = (await runtime).PokeRNGKit.SaveEditor.Program;
      const output =
        edit === undefined ||
        kind === "legality" ||
        kind === "pokemonExport" ||
        kind === "originCatalog" ||
        kind === "ribbons" ||
        kind === "relearnSuggestion"
          ? undefined
          : new Uint8Array(
              kind === "pokemonRaw"
                ? api.EditPokemonRaw(bytes, edit)
                : kind === "pokemon"
                  ? api.EditPokemon(bytes, edit)
                  : kind === "box"
                    ? api.EditBox(bytes, edit)
                    : kind === "storage"
                      ? api.EditStorage(bytes, edit)
                      : kind === "pokemonImport"
                        ? api.ImportPokemon(bytes, edit)
                        : api.Export(bytes, edit),
            );
      const report: SaveReport = JSON.parse(api.Inspect(output ?? bytes));
      if (report.apiVersion !== 23)
        throw new Error("Save editor API version mismatch.");
      const legality: PokemonLegalityReport | undefined =
        kind === "legality" && edit !== undefined
          ? JSON.parse(api.AnalyzePokemon(bytes, edit))
          : undefined;
      const pokemonFile =
        kind === "pokemonExport" && edit !== undefined
          ? JSON.parse(api.ExportPokemon(bytes, edit))
          : undefined;
      const originCatalog =
        kind === "originCatalog" && edit !== undefined
          ? JSON.parse(api.ReadOrigin(bytes, edit))
          : undefined;
      const relearnSuggestion =
        kind === "relearnSuggestion" && edit !== undefined
          ? JSON.parse(api.SuggestRelearn(bytes, edit))
          : undefined;
      const ribbons =
        kind === "ribbons" && edit !== undefined
          ? JSON.parse(api.ReadRibbons(bytes, edit))
          : undefined;
      self.postMessage(
        {
          id,
          report,
          output,
          legality,
          pokemonFile,
          originCatalog,
          relearnSuggestion,
          ribbons,
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

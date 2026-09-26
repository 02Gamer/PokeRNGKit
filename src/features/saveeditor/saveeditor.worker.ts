import type { SaveReport } from "./domain";
import { browserCryptography } from "./browserCryptography";

interface SaveExports {
  PokeRNGKit: {
    SaveEditor: {
      Program: {
        ConfigureBrowserCrypto(): void;
        Inspect(data: Uint8Array): string;
        Export(data: Uint8Array, json: string): Uint8Array;
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
    }>,
  ) => {
    const { id, base, bytes, edit } = event.data;
    try {
      runtime ??= loadRuntime(base).catch((error) => {
        runtime = undefined;
        throw error;
      });
      const api = (await runtime).PokeRNGKit.SaveEditor.Program;
      const output =
        edit === undefined
          ? undefined
          : new Uint8Array(api.Export(bytes, edit));
      const report: SaveReport = JSON.parse(api.Inspect(output ?? bytes));
      if (report.apiVersion !== 2)
        throw new Error("Save editor API version mismatch.");
      self.postMessage({ id, report, output }, output ? [output.buffer] : []);
    } catch (error) {
      self.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

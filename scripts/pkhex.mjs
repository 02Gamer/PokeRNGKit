import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const localDotnet = path.join(
  root,
  ".tools/dotnet",
  process.platform === "win32" ? "dotnet.exe" : "dotnet",
);
const dotnet =
  process.env.PKHEX_DOTNET ??
  (existsSync(localDotnet) ? localDotnet : "dotnet");
const env = {
  ...process.env,
  DOTNET_CLI_TELEMETRY_OPTOUT: "1",
  DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1",
};
function run(args) {
  const result = spawnSync(dotnet, args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: false,
  });
  if (result.error)
    throw new Error(
      `Install .NET SDK 10.0.401 and wasm-tools, or set PKHEX_DOTNET. ${result.error.message}`,
    );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const command = process.argv[2];
if (command !== "build" && command !== "test")
  throw new Error("Expected build or test.");
async function clearGenerated(relative) {
  const target = path.resolve(root, relative);
  if (path.relative(root, target) !== path.normalize(relative))
    throw new Error("Refusing to clear a directory outside the repository.");
  await rm(target, { recursive: true, force: true });
}
const manifest = JSON.parse(
  await readFile(
    path.join(root, "third_party/pkhex/source-manifest.json"),
    "utf8",
  ),
);
for (const [name, hash] of Object.entries(manifest.files)) {
  const bytes = await readFile(path.join(root, "third_party/pkhex", name));
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw new Error(`PKHeX source hash mismatch: ${name}`);
}
if (command === "test") {
  run([
    "run",
    "--project",
    "wasm/pkhex/tests/SaveEditor.Tests.csproj",
    "-c",
    "Release",
  ]);
} else {
  await clearGenerated("wasm/pkhex/bin/Release/net10.0/publish");
  run([
    "publish",
    "wasm/pkhex/PokeRNGKit.SaveEditor.csproj",
    "-c",
    "Release",
    "--nologo",
  ]);
  async function findFramework(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = path.join(dir, entry.name);
      if (
        entry.name === "_framework" &&
        existsSync(path.join(child, "dotnet.js"))
      )
        return child;
      const found = await findFramework(child);
      if (found) return found;
    }
  }
  const base = path.join(root, "wasm/pkhex/bin/Release/net10.0");
  const framework = await findFramework(path.join(base, "publish"));
  if (!framework) throw new Error("Published PKHeX framework was not found.");
  const output = path.join(root, "public/pkhex/_framework");
  await clearGenerated("public/pkhex/_framework");
  await mkdir(output, { recursive: true });
  await cp(framework, output, { recursive: true });
  process.stdout.write("PKHeX browser assets: public/pkhex/_framework\n");
}

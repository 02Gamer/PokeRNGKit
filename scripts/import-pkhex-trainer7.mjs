// SPDX-License-Identifier: GPL-3.0-or-later
// Import exact PKHeX 26.08.26 trainer labels, map indices and eight fashion payloads.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { Buffer } from "node:buffer";
const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2])
  throw Error("Provide the read-only PKHeX source directory.");
const source = path.resolve(process.argv[2]);
const languages = await Promise.all(
  ["zh-Hans", "en", "ja"].map(
    async (l) =>
      new Map(
        (
          await readFile(
            path.join(source, `PKHeX.WinForms/Resources/text/lang_${l}.txt`),
            "utf8",
          )
        )
          .split(/\r?\n/)
          .filter((v) => v.includes("="))
          .map((v) => {
            const i = v.indexOf("=");
            return [v.slice(0, i), v.slice(i + 1)];
          }),
      ),
  ),
);
const keys = [...languages[1].keys()].filter((k) =>
  ["SAV_Trainer7.", "PlayerBattleStyle7.", "PlayerSkinColor7.", "Stamp7."].some(
    (p) => k.startsWith(p),
  ),
);
const rows = keys.sort().map((k) => {
  const values = languages.map((l) => l.get(k));
  if (values.some((v) => v === undefined))
    throw Error(`Missing trainer translation: ${k}`);
  return `[${JSON.stringify(k)}] = new(${values.map((v) => JSON.stringify(v)).join(",")}),`;
});
await writeFile(
  path.join(root, "wasm/pkhex/Trainer7Names.cs"),
  `// SPDX-License-Identifier: GPL-3.0-or-later\n// Exact PKHeX 26.08.26 WinForms language resources.\nnamespace PokeRNGKit.SaveEditor;\ninternal static class Trainer7Names {\nprivate static readonly Dictionary<string,LocalizedText> Rows = new() {\n${rows.join("\n")}\n};\ninternal static LocalizedText Get(string key,string fallback)=>Rows.TryGetValue(key,out var value)?value:new(fallback,fallback,fallback);\n}\n`,
);
const body = await readFile(
  path.join(
    source,
    "PKHeX.WinForms/Subforms/Save Editors/Gen7/SAV_Trainer7.cs",
  ),
  "utf8",
);
const arrays = [];
for (const [name, count] of [
  ["FlyDestNameIndex", 46],
  ["FlyDestFlagOfs", 46],
  ["MapUnmaskNameIndex", 48],
  ["MapUnmaskFlagOfs", 48],
]) {
  const m = body.match(new RegExp(`${name} =\\s*\\[([\\s\\S]*?)\\];`));
  if (!m) throw Error(`Missing ${name}`);
  const values = m[1]
    .replace(/\/\/[^\r\n]*/g, "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map(Number);
  if (values.length !== count || values.some((v) => !Number.isInteger(v)))
    throw Error(`Invalid ${name} count ${values.length}`);
  arrays.push(
    `internal static readonly int[] ${name} = [${values.join(",")}];`,
  );
}
await writeFile(
  path.join(root, "wasm/pkhex/Trainer7MapData.cs"),
  `// SPDX-License-Identifier: GPL-3.0-or-later\n// Exact source indices, SHA-256 ${createHash("sha256").update(body).digest("hex")}.\nnamespace PokeRNGKit.SaveEditor;\ninternal static class Trainer7MapData {\n${arrays.join("\n")}\n}\n`,
);
const payloads = [];
for (const game of ["sm", "uu"])
  for (const gender of ["m", "f"])
    for (const illegal of [false, true]) {
      const name = `fashion_${gender}_${game}${illegal ? "_illegal" : ""}`;
      const bytes = await readFile(
        path.join(source, `PKHeX.WinForms/Resources/byte/${name}`),
      );
      if (bytes.length === 0 || bytes.length > 0x1a08)
        throw Error(`Invalid fashion payload ${name}: ${bytes.length}`);
      payloads.push(
        `// ${name}: ${bytes.length} bytes; SHA-256 ${createHash("sha256").update(bytes).digest("hex")}\n[${JSON.stringify(name)}] = ${JSON.stringify(Buffer.from(bytes).toString("base64"))},`,
      );
    }
await writeFile(
  path.join(root, "wasm/pkhex/Trainer7Fashion.cs"),
  `// SPDX-License-Identifier: GPL-3.0-or-later\n// Eight unmodified PKHeX 26.08.26 WinForms fashion payloads.\nnamespace PokeRNGKit.SaveEditor;\ninternal static class Trainer7Fashion {\nprivate static readonly Dictionary<string,string> Payloads = new() {\n${payloads.join("\n")}\n};\ninternal static byte[] Read(bool ultra,byte gender,bool everything)=>Convert.FromBase64String(Payloads[$"fashion_{(gender==0?"m":"f")}_{(ultra?"uu":"sm")}{(everything?"_illegal":"")}"]);\n}\n`,
);

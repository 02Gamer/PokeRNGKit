// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2])
  throw Error("Provide the read-only PKHeX source directory.");
const source = path.resolve(process.argv[2]);
const languages = await Promise.all(
  ["zh-Hans", "en", "ja"].map(
    async (lang) =>
      new Map(
        (
          await readFile(
            path.join(source, `PKHeX.WinForms/Resources/text/lang_${lang}.txt`),
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
const rows = [...languages[1].keys()]
  .filter((k) => k.startsWith("SAV_Trainer7GG."))
  .sort()
  .map((k) => {
    const values = languages.map((l) => l.get(k));
    if (values.some((v) => v === undefined))
      throw Error(`Missing TrainerGG label: ${k}`);
    return `[${JSON.stringify(k)}] = new(${values.map((v) => JSON.stringify(v)).join(",")}),`;
  });
await writeFile(
  path.join(root, "wasm/pkhex/TrainerGGNames.cs"),
  `// SPDX-License-Identifier: GPL-3.0-or-later\n// Exact PKHeX 26.08.26 Trainer7GG language resources.\nnamespace PokeRNGKit.SaveEditor;\ninternal static class TrainerGGNames {\nprivate static readonly Dictionary<string,LocalizedText> Rows = new() {\n${rows.join("\n")}\n};\ninternal static LocalizedText Get(string key,string fallback)=>Rows.TryGetValue("SAV_Trainer7GG."+key,out var v)?v:new(fallback,fallback,fallback);\n}\n`,
);

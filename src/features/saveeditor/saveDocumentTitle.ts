// SPDX-License-Identifier: GPL-3.0-or-later
import type { SaveReport } from "./domain";
export function saveDocumentTitle(
  report: SaveReport,
  fileName: string,
  language: "zh" | "en" | "ja",
  hidden: boolean,
) {
  const game = report.gameName?.[language] || report.version;
  const base = `PokeRNGKit - ${report.format}`;
  return hidden
    ? `${base}: [${game}]`
    : `${base}: ${fileName} [${report.ot} (${game})]`;
}

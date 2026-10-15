// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonLegalityReport } from "./domain";
export function legalityDisplay(
  report: PokemonLegalityReport,
  controlOnly = false,
) {
  return {
    expanded: Boolean(report.alwaysVerbose) !== controlOnly,
    hidden: report.hideReport === true,
    canCopy: report.canCopy !== false && report.clipboard != null,
  };
}

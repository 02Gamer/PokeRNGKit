// SPDX-License-Identifier: GPL-3.0-or-later
// Explicit source operation mapping; call only after a working-copy edit succeeds.
import type { CGear5Preview } from "./cgear5";
import type { TrGGPreview } from "./trainerGG";
export function saveEditHasSound(
  kind: string,
  value: unknown,
  format?: string,
): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const edit = value as Record<string, unknown>;
  const action = typeof edit.action === "string" ? edit.action : "";
  const group = typeof edit.group === "string" ? edit.group : "";
  switch (kind) {
    case "gsBall2Edit":
      return edit.action === "enableGsBall";
    case "hall3Edit":
      return edit.action === "party";
    case "misc3Edit":
      return edit.action === "mirage";
    case "rtcEdit":
      return edit.action === "reset" || edit.action === "berryFix";
    case "secretBase3Edit":
      return edit.action === "trainer" || edit.action === "member";
    case "pokegear4Edit":
      return ["all", "nonTrainers", "clear"].includes(action);
    case "pokeathlon4Edit":
      return edit.action === "medalsBatch";
    case "misc4Edit":
      return (
        (edit.group === "poketch" && edit.action === "all") ||
        (["seals", "accessories", "backdrops"].includes(group) &&
          (edit.action === "all" || edit.action === "legal"))
      );
    case "pokedex4Edit":
      return (
        edit.species === 0 &&
        ["clear", "seen", "caught", "uncaught", "complete"].includes(action)
      );
    case "video4Import":
      return true;
    case "battlePass4Edit":
      return edit.action === "import";
    case "pokedex5Edit":
    case "pokedex6Edit":
      return (
        ((action === "give" || action === "giveNone") &&
          typeof edit.species === "number" &&
          Number.isInteger(edit.species) &&
          edit.species > 0 &&
          edit.species <= (kind === "pokedex5Edit" ? 649 : 721)) ||
        (edit.species === 0 &&
          [
            "clear",
            "seen",
            "caught",
            "uncaught",
            "complete",
            "formsClear",
            "formsFirst",
            "formsAll",
          ].includes(action))
      );
    case "misc5Edit":
      return action === "forestRandom" || action === "giveProps";
    case "medals5Edit":
      return [
        "giveAll",
        "import",
        "complete",
        "clear",
        "calculateRank",
      ].includes(action);
    case "trainer6Edit":
      return action === "accessories";
    case "secretBase6Edit":
      return action === "import";
    case "trainer7Edit":
      return action === "fashion";
    case "trainerGGEdit":
      return ["parkClear", "parkDelete", "titles", "fashion"].includes(action);
    case "zygarde7Edit":
      return action === "giveAll";
    case "foodEdit":
      return (
        ((format === "SAV7SM" || format === "SAV7USUM") &&
          (action === "fill" || action === "clear")) ||
        (format === "SAV8BS" &&
          (action === "caseFill" || action === "caseClear"))
      );
    case "pokedex7Edit":
      if (action === "capture") {
        const capture = edit.capture;
        if (!capture || typeof capture !== "object" || Array.isArray(capture))
          return false;
        const captureKind = (capture as Record<string, unknown>).kind;
        return captureKind === "all" || captureKind === "sum";
      }
      return (
        edit.index === -1 &&
        ["clear", "seen", "caught", "uncaught", "complete"].includes(action)
      );
    case "trainer8Edit":
      return ["copyParty", "fashion", "diglett"].includes(action);
    case "misc8bEdit":
      return [
        "spiritomb",
        "shaymin",
        "darkrai",
        "arceus",
        "boxLegend",
        "roamers",
        "zones",
        "defeat",
        "rebattle",
        "fashion",
      ].includes(action);
    case "seal8bEdit":
    case "underground8bEdit":
      return action === "all" || action === "none";
    case "pokedex8Edit":
      return [
        "give",
        "clear",
        "seen",
        "caught",
        "uncaught",
        "complete",
        "counts",
      ].includes(action);
    case "pokedex8aEdit":
      return action === "report";
    case "pokedex8bEdit":
      return (
        edit.species === 0 &&
        ["clear", "seen", "caught", "uncaught", "complete"].includes(action)
      );
    case "pokedex9Edit":
    case "pokedex9aEdit":
      return [
        "give",
        "clear",
        "seen",
        "caught",
        "uncaught",
        "complete",
      ].includes(action);
    default:
      return false;
  }
}

// Origin comes from the frozen preview, never from a confirmation token alone.
// It stays in React callbacks and is not added to the Core request.
export function saveCommitHasSound(kind: string, origin: unknown): boolean {
  if (kind === "donut9aCommit")
    return (
      typeof origin === "string" &&
      ["randomLv3", "clone", "shiny", "generate", "import", "hex"].includes(
        origin,
      )
    );
  if (!Array.isArray(origin)) return false;
  if (kind === "trainer9Commit")
    return origin.some(
      (operation) =>
        typeof operation === "string" &&
        [
          "fly",
          "stakes",
          "tm",
          "legendaries",
          "coaches",
          "bike",
          "clothing",
          "throwStyles",
        ].includes(operation),
    );
  if (kind === "trainer9aCommit")
    return origin.some(
      (operation) =>
        operation &&
        typeof operation === "object" &&
        operation.key === "resetAndCollectScrews",
    );
  if (kind === "fashion9Commit" || kind === "raid9Commit")
    return origin.some(
      (operation) =>
        operation &&
        typeof operation === "object" &&
        operation.action ===
          (kind === "fashion9Commit" ? "owned" : "propagate"),
    );
  return false;
}

// The source folder import returns before its cue if any file cannot fit.
export function goParkBatchHasSound(
  preview: Pick<TrGGPreview, "request" | "receipt">,
): boolean {
  return (
    preview.request.action === "parkBatch" &&
    preview.receipt !== null &&
    preview.receipt.unplaced.length === 0
  );
}

// SAV_DLC5.CheckResult<CGearBackground>: 16 colors and 255 tiles.
// Overflow conversions retain their existing warning and have no success cue.
export function cgear5PreviewHasSound(
  preview: Pick<CGear5Preview, "request" | "colors" | "tiles">,
): boolean {
  return (
    preview.request.action === "raw" ||
    (preview.request.action === "image" &&
      typeof preview.colors === "number" &&
      Number.isInteger(preview.colors) &&
      preview.colors >= 0 &&
      preview.colors <= 16 &&
      typeof preview.tiles === "number" &&
      Number.isInteger(preview.tiles) &&
      preview.tiles >= 0 &&
      preview.tiles <= 255)
  );
}

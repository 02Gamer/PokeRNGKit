// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonPosition } from "./domain";
import type { SpriteData } from "./PokemonSprite";
export type PokemonHoverTarget =
  | ({ kind: "slot" } & PokemonPosition)
  | { kind: "database" | "encounter" | "gift"; id: number }
  | { kind: "registered"; group: number; slot: number };
export type ReadPokemonHoverTarget = (
  target: PokemonHoverTarget,
) => Promise<PokemonHoverReport | undefined>;
export function hoverTargetKey(target: PokemonHoverTarget) {
  const integer = (value: unknown, min = 0) =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= 2147483647;
  if (target.kind === "slot" && integer(target.box, -1) && integer(target.slot))
    return `slot:${target.box}:${target.slot}`;
  if (
    target.kind === "registered" &&
    integer(target.group) &&
    integer(target.slot)
  )
    return `registered:${target.group}:${target.slot}`;
  if (
    (target.kind === "database" ||
      target.kind === "encounter" ||
      target.kind === "gift") &&
    integer(target.id)
  )
    return `${target.kind}:${target.id}`;
  throw new Error("Invalid hover target.");
}
export function hoverTargetFromData(data: {
  hoverTarget?: string;
  hoverBox?: string;
  hoverSlot?: string;
}): PokemonHoverTarget | undefined {
  try {
    const target: PokemonHoverTarget = data.hoverTarget
      ? JSON.parse(data.hoverTarget)
      : {
          kind: "slot",
          box: Number(data.hoverBox),
          slot: Number(data.hoverSlot),
        };
    hoverTargetKey(target);
    return target;
  } catch {
    return undefined;
  }
}
export function hoverResponseMatches(
  target: PokemonHoverTarget,
  report: PokemonHoverReport,
) {
  try {
    return report.target
      ? hoverTargetKey(report.target) === hoverTargetKey(target)
      : target.kind === "slot" &&
          target.box === report.box &&
          target.slot === report.slot;
  } catch {
    return false;
  }
}
export interface PokemonHoverText {
  title: string;
  before: string;
  after: string;
  hint: string;
  tooltip: string;
  moves: { name: string; valid: boolean; type: number }[];
}
export interface PokemonHoverReport {
  box?: number | null;
  slot?: number | null;
  target?: PokemonHoverTarget;
  artwork?: SpriteData | null;
  glowArtwork?: SpriteData | null;
  mode?: "pokemon" | "encounter";
  generation?: number;
  ball?: number | null;
  cryNames?: string[] | null;
  sourceHash: string;
  text: Record<"zh" | "en" | "ja", PokemonHoverText>;
}
export function pokemonHoverSettings(json: string) {
  if (!json)
    return {
      preview: true,
      text: true,
      cry: true,
      glow: true,
      offset: { x: 16, y: 8 },
    };
  const { hover } = JSON.parse(json);
  if (
    !hover ||
    typeof hover.hoverSlotShowPreview !== "boolean" ||
    typeof hover.hoverSlotShowText !== "boolean" ||
    (hover.hoverSlotPlayCry !== undefined &&
      typeof hover.hoverSlotPlayCry !== "boolean") ||
    (hover.hoverSlotGlowEdges !== undefined &&
      typeof hover.hoverSlotGlowEdges !== "boolean") ||
    ![hover.previewCursorShift?.x, hover.previewCursorShift?.y].every(
      (value) =>
        Number.isInteger(value) && value >= -2147483648 && value <= 2147483647,
    )
  )
    throw new Error("Invalid hover settings.");
  return {
    preview: hover.hoverSlotShowPreview,
    text: hover.hoverSlotShowText,
    cry: hover.hoverSlotPlayCry ?? true,
    glow: hover.hoverSlotGlowEdges ?? true,
    offset: {
      x: hover.previewCursorShift.x as number,
      y: hover.previewCursorShift.y as number,
    },
  };
}
export function hoverPlacement(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  return {
    left: Math.max(8, Math.min(x, viewportWidth - width - 8)),
    top: Math.max(8, Math.min(y, viewportHeight - height - 8)),
  };
}
// One delayed read per hovered slot. Leaving, switching or disposing invalidates
// both timers and late Worker responses without cancelling foreground edits.
export class PokemonHoverReader {
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  clear() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
  }
  start(
    read: () => Promise<PokemonHoverReport | undefined>,
    show: (report: PokemonHoverReport) => void,
  ) {
    this.clear();
    const generation = this.generation;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void read()
        .then((report) => {
          if (report && generation === this.generation) show(report);
        })
        .catch(() => {});
    }, 200);
  }
}

// SPDX-License-Identifier: GPL-3.0-or-later
export function markingColors(json: string) {
  if (!json) return { blue: "#00bfff", pink: "#ff75b3" };
  const draw = JSON.parse(json).draw;
  if (
    !draw ||
    ![draw.markBlue, draw.markPink].every(
      (color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color),
    )
  )
    throw new Error("Invalid marking colors.");
  return { blue: draw.markBlue as string, pink: draw.markPink as string };
}
// MarkingApplicator.Next: reserved values also move to blue.
export function nextMarking(value: number, colored: boolean) {
  return colored ? (value === 1 ? 2 : value === 2 ? 0 : 1) : value ? 0 : 1;
}
export function invalidSelectionColor(json: string) {
  if (!json) return "#e9967a";
  const color = JSON.parse(json).draw?.invalidSelection;
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color))
    throw new Error("Invalid selection color.");
  return color;
}
export function shinySymbol(json: string) {
  if (!json) return "☆";
  const { display, draw } = JSON.parse(json);
  if (
    typeof display?.unicode !== "boolean" ||
    !draw ||
    ![draw.shinyUnicode, draw.shinyDefault].every(
      (value) => typeof value === "string" && value.length <= 32767,
    )
  )
    throw new Error("Invalid shiny display settings.");
  return display.unicode
    ? (draw.shinyUnicode as string)
    : (draw.shinyDefault as string);
}

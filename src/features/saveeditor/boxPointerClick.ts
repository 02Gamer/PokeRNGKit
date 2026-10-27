// SPDX-License-Identifier: GPL-3.0-or-later
// Cancel the compatibility click even when Escape precedes a delayed mouse-up.
// A new press always belongs to an independent interaction and clears the block.
export function suppressBoxPointerClick(target: EventTarget) {
  let active = true;
  const capture = { capture: true };
  const clear = () => {
    if (!active) return;
    active = false;
    target.removeEventListener("click", click, capture);
    target.removeEventListener("pointerdown", clear, capture);
  };
  const click = (event: Event) => {
    if (!active || !((event as MouseEvent).detail > 0)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clear();
  };
  target.addEventListener("click", click, capture);
  target.addEventListener("pointerdown", clear, capture);
  return clear;
}

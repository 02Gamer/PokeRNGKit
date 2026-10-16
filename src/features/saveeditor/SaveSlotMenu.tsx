// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useMenuPlacement } from "../shared/useMenuPlacement";
import {
  menuFocusIndex,
  slotMenuWords,
  type SlotAction,
  type SlotMenuInvocation,
} from "./slotMenu";
export function SlotMenuItems({
  actions,
  lang,
  onAction,
}: {
  actions: SlotAction[];
  lang: "zh" | "en" | "ja";
  onAction(action: SlotAction): void;
}) {
  return actions.map((action) => (
    <button
      key={action}
      type="button"
      role="menuitem"
      onClick={() => onAction(action)}
    >
      <span>{slotMenuWords[lang][action]}</span>
    </button>
  ));
}
export function SaveSlotMenu({
  invocation,
  actions,
  lang,
  onClose,
  onAction,
}: {
  invocation: SlotMenuInvocation;
  actions: SlotAction[];
  lang: "zh" | "en" | "ja";
  onClose(restoreFocus: boolean): void;
  onAction(action: SlotAction): void;
}) {
  const anchor = useRef<HTMLSpanElement>(null),
    menu = useRef<HTMLDivElement>(null);
  const placement = useMenuPlacement(
    anchor,
    menu,
    true,
    actions.length * 44 + 16,
  );
  useLayoutEffect(() => {
    const element = menu.current;
    const trigger = invocation.trigger;
    element
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });
    return () => {
      if (element?.contains(document.activeElement) && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, [invocation]);
  useEffect(() => {
    const outside = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) onClose(false);
    };
    const resize = () => onClose(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", outside, true);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", outside, true);
      window.removeEventListener("resize", resize);
    };
  }, [onClose]);
  return createPortal(
    <>
      <span
        aria-hidden="true"
        ref={anchor}
        style={{
          position: "fixed",
          left: invocation.x,
          top: invocation.y,
          width: 240,
          height: 0,
          pointerEvents: "none",
        }}
      />
      <div
        ref={menu}
        className="haku-select-menu"
        data-menu-portal="true"
        data-align={placement.horizontal}
        data-placement={placement.vertical}
        role="menu"
        aria-label={slotMenuWords[lang].menu}
        style={{
          left: placement.left,
          top: placement.top,
          width: placement.width,
          maxHeight: placement.maxHeight,
        }}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose(true);
            return;
          }
          if (event.key === "Tab") {
            onClose(true);
            return;
          }
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="menuitem"]',
            ),
          );
          const next = menuFocusIndex(
            buttons.indexOf(document.activeElement as HTMLButtonElement),
            event.key,
            buttons.length,
          );
          if (next !== undefined) {
            event.preventDefault();
            buttons[next]?.focus();
          }
        }}
      >
        <SlotMenuItems actions={actions} lang={lang} onAction={onAction} />
      </div>
    </>,
    document.body,
  );
}

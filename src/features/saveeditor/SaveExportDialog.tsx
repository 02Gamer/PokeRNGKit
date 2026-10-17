// SPDX-License-Identifier: GPL-3.0-or-later
import { useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { saveExportWords } from "./saveExportWords";
export function SaveExportDialog({
  lang,
  onCancel,
  onConfirm,
}: {
  lang: "zh" | "en" | "ja";
  onCancel(): void;
  onConfirm(): void;
}) {
  const w = saveExportWords[lang],
    id = useId(),
    ref = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    cancel.current?.focus();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="save-editor-panel save-pokemon-set-dialog"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h3 id={id}>{w.title}</h3>
      <p>{w.note}</p>
      <div className="save-editor-toolbar">
        <button type="button" ref={cancel} onClick={onCancel}>
          {w.cancel}
        </button>
        <button type="button" onClick={onConfirm}>
          {w.confirm}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

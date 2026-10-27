// SPDX-License-Identifier: GPL-3.0-or-later
import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SAVE_STARTUP_RELEASE, saveStartupWords } from "./saveStartupRelease";
import "./SaveStartupFeedback.css";

type Language = "zh" | "en" | "ja";
export function SaveStartupScreen({ lang }: { lang: Language }) {
  const words = saveStartupWords[lang];
  return (
    <section className="save-startup-screen" role="status">
      <h3>{words.starting}</h3>
      <p>{words.loading}</p>
    </section>
  );
}
export function SaveChangelogDialog({
  lang,
  onClose,
}: {
  lang: Language;
  onClose(): void;
}) {
  const words = saveStartupWords[lang];
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    close.current?.focus();
    return () => {
      element?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="save-editor-panel save-editor-dialog save-changelog-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        // The notes have one interactive control. Keep keyboard traversal in
        // the modal while leaving browser and operating-system shortcuts alone.
        if (
          event.key === "Tab" &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          close.current?.focus();
        }
      }}
    >
      <h3 id={titleId}>{words.changelog}</h3>
      <time dateTime={SAVE_STARTUP_RELEASE.date}>
        {SAVE_STARTUP_RELEASE.date}
      </time>
      <ul>
        {SAVE_STARTUP_RELEASE.changes[lang].map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
      <div className="save-editor-toolbar">
        <button type="button" ref={close} onClick={onClose}>
          {words.close}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
export function SaveStartupSettingsTools({ lang }: { lang: Language }) {
  const [open, setOpen] = useState(false);
  const words = saveStartupWords[lang];
  return (
    <>
      <p className="save-editor-note">{words.scope}</p>
      <div className="save-editor-toolbar">
        <button type="button" onClick={() => setOpen(true)}>
          {words.viewChangelog}
        </button>
      </div>
      {open && (
        <SaveChangelogDialog lang={lang} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

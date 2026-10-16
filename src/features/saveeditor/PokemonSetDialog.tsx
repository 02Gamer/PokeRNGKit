// SPDX-License-Identifier: GPL-3.0-or-later
import { useLayoutEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { PokemonSprite } from "./PokemonSprite";
import { pokemonSetWords, type PokemonSetTicket } from "./pokemonSet";
export function PokemonSetDialog({
  ticket,
  lang,
  busy,
  onCancel,
  onConfirm,
}: {
  ticket: PokemonSetTicket;
  lang: "zh" | "en" | "ja";
  busy: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    [overwrite, setOverwrite] = useState(false),
    [compatibility, setCompatibility] = useState(false);
  useLayoutEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement as HTMLElement | null;
    element?.showModal();
    cancel.current?.focus();
    return () => {
      element?.close();
      if (focus?.isConnected) focus.focus({ preventScroll: true });
    };
  }, []);
  const w = pokemonSetWords[lang];
  const titleId = useId();
  return createPortal(
    <dialog
      ref={dialog}
      className="save-editor-panel save-pokemon-set-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h3 id={titleId}>{ticket.clear ? w.clear : w.title}</h3>
      {ticket.clear ? (
        <p>{ticket.target.box === -1 ? w.clearParty : w.clear}</p>
      ) : (
        <div className="save-pokemon-identity">
          <PokemonSprite
            pokemon={ticket.pokemon}
            alt=""
            width={68}
            height={56}
          />
          <h4>
            {ticket.pokemon.nickname} · {ticket.pokemon.speciesName[lang]}
          </h4>
        </div>
      )}
      <p>
        {w.target}:{" "}
        {ticket.target.box === -1
          ? w.party
          : `${w.box} ${ticket.target.box + 1}`}{" "}
        · {w.slot} {ticket.target.slot + 1}
      </p>
      <p className="save-editor-note">
        {w.bytes}: {ticket.changedBytes.toLocaleString()}
      </p>
      {ticket.overwrite && (
        <label className="save-check">
          <input
            type="checkbox"
            checked={overwrite}
            disabled={busy}
            onChange={(event) => setOverwrite(event.target.checked)}
          />
          <span>{ticket.clear ? w.clear : w.overwrite}</span>
        </label>
      )}
      {ticket.compatibility.length > 0 && (
        <>
          <ul>
            {ticket.compatibility.map((message, i) => (
              <li key={i}>{message[lang]}</li>
            ))}
          </ul>
          <label className="save-check">
            <input
              type="checkbox"
              checked={compatibility}
              disabled={busy}
              onChange={(event) => setCompatibility(event.target.checked)}
            />
            <span>{w.compatibility}</span>
          </label>
        </>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={
            busy ||
            (ticket.overwrite && !overwrite) ||
            (ticket.compatibility.length > 0 && !compatibility)
          }
          onClick={onConfirm}
        >
          {ticket.clear ? w.clear : w.confirm}
        </button>
        <button type="button" ref={cancel} disabled={busy} onClick={onCancel}>
          {w.cancel}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

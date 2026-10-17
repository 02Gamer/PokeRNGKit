// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import {
  metSuggestionWords,
  parseMetSuggestion,
  type MetSuggestionPreview,
  type MetSuggestionConfirmation,
} from "./metSuggestion";
export function MetSuggestionWorkspace({
  hash,
  lang,
  disabled,
  onPreview,
  onApply,
  onDiscard,
  onReviewing,
}: {
  hash: string;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  onPreview(): Promise<MetSuggestionPreview | undefined>;
  onApply(value: MetSuggestionConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
  onReviewing(value: boolean): void;
}) {
  const w = metSuggestionWords[lang];
  const [preview, setPreview] = useState<MetSuggestionPreview>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true),
    ticket = useRef<string | undefined>(undefined),
    discard = useRef(onDiscard);
  useEffect(() => {
    discard.current = onDiscard;
  }, [onDiscard]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      onReviewing(false);
      if (ticket.current)
        void discard.current(ticket.current).catch(() => undefined);
    };
  }, [onReviewing]);
  async function prepare() {
    setPending(true);
    setError("");
    try {
      const result = parseMetSuggestion(await onPreview(), hash);
      if (!active.current) {
        if (result.token) await onDiscard(result.token);
        return;
      }
      ticket.current = result.token ?? undefined;
      setPreview(result);
      onReviewing(result.available);
    } catch {
      if (active.current) setError(w.failed);
    } finally {
      if (active.current) setPending(false);
    }
  }
  async function cancel() {
    setPending(true);
    try {
      if (ticket.current) await onDiscard(ticket.current);
      ticket.current = undefined;
      if (active.current) setPreview(undefined);
    } catch {
      if (active.current) setError(w.failed);
    } finally {
      ticket.current = undefined;
      onReviewing(false);
      if (active.current) setPreview(undefined);
      if (active.current) setPending(false);
    }
  }
  async function apply() {
    if (!preview?.available || !preview.token || !preview.targetHash) return;
    setPending(true);
    setError("");
    try {
      if (
        await onApply({
          token: preview.token,
          sourceHash: preview.sourceHash,
          targetHash: preview.targetHash,
        })
      ) {
        ticket.current = undefined;
        if (active.current) setPreview(undefined);
      } else if (active.current) setError(w.failed);
    } catch {
      if (active.current) setError(w.failed);
    } finally {
      ticket.current = undefined;
      onReviewing(false);
      if (active.current) setPreview(undefined);
      if (active.current) setPending(false);
    }
  }
  const locked = disabled || pending;
  const rows =
    preview?.available && preview.before && preview.after
      ? [
          [
            w.location,
            `${preview.before.locationName[lang]} (#${preview.before.location})`,
            `${preview.after.locationName[lang]} (#${preview.after.location})`,
          ],
          [w.metLevel, preview.before.metLevel, preview.after.metLevel],
          [w.level, preview.before.level, preview.after.level],
          ...(preview.before.groundTile !== null ||
          preview.after.groundTile !== null
            ? [
                [
                  w.ground,
                  preview.before.groundTile ?? "—",
                  preview.after.groundTile ?? "—",
                ],
              ]
            : []),
          ...(preview.before.timeOfDay !== null ||
          preview.after.timeOfDay !== null
            ? [
                [
                  w.time,
                  preview.before.timeOfDay ?? "—",
                  preview.after.timeOfDay ?? "—",
                ],
              ]
            : []),
        ]
      : [];
  return (
    <section className="save-record-editor" aria-label={w.title}>
      <h3>{w.title}</h3>
      <p className="save-editor-note">{w.note}</p>
      {preview?.available && (
        <div className="save-editor-preview">
          {rows.map(([label, before, after]) => (
            <p key={label}>
              {label}: {before} → {after}
            </p>
          ))}
          {preview.hatchMemory && <p>{w.memory}</p>}
        </div>
      )}
      {preview && !preview.available && <p role="status">{w.none}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="save-editor-toolbar">
        {!preview?.available ? (
          <button
            type="button"
            disabled={locked}
            onClick={() => void prepare()}
          >
            {w.preview}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={locked}
              onClick={() => void apply()}
            >
              {w.confirm}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => void cancel()}
            >
              {w.cancel}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

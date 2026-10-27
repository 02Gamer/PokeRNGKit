// SPDX-License-Identifier: GPL-3.0-or-later
import { useId, useState, type ReactNode } from "react";
import { Select } from "../shared/Select";
import type { SaveSettingsBundle, SaveSettingsField } from "./settingsProtocol";
import {
  settingsFieldCaption,
  settingsFieldDescription,
  settingsGroupName,
  settingsEnumName,
  settingsWords,
} from "./settingsLabels";

type Value = boolean | number | string | Value[] | { [key: string]: Value };
type ObjectValue = { [key: string]: Value };
function read(root: ObjectValue, path: string): Value {
  let value: Value = root;
  for (const key of path.split(".")) value = (value as ObjectValue)[key];
  return value;
}
function write(root: ObjectValue, path: string, value: Value): ObjectValue {
  const copy = structuredClone(root);
  const parts = path.split(".");
  let node = copy;
  for (const part of parts.slice(0, -1)) node = node[part] as ObjectValue;
  node[parts.at(-1)!] = value;
  return copy;
}
export function SaveSettingsEditor({
  bundle,
  json,
  lang,
  busy,
  unavailable = {},
  onValidate,
  onSave,
  initialGroup = "legality",
  renderGroupTools,
}: {
  bundle: SaveSettingsBundle;
  json: string;
  lang: "zh" | "en" | "ja";
  busy: boolean;
  unavailable?: Record<string, string>;
  onValidate(json: string): Promise<string>;
  onSave(json: string): Promise<void>;
  initialGroup?: string;
  renderGroupTools?(group: string): ReactNode;
}) {
  const words = settingsWords[lang];
  const noticeId = useId();
  const [draft, setDraft] = useState(() => JSON.parse(json) as ObjectValue);
  const [group, setGroup] = useState(initialGroup);
  const [invalid, setInvalid] = useState("");
  const [preview, setPreview] = useState<string>();
  const [running, setRunning] = useState(false);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const disabled = busy || running;
  const savedValues = JSON.parse(json) as ObjectValue;
  const reviewedValues = preview
    ? (JSON.parse(preview) as ObjectValue)
    : undefined;
  const changes = reviewedValues
    ? bundle.catalog.groups
        .flatMap((value) => value.fields)
        .filter(
          (field) =>
            JSON.stringify(read(savedValues, field.path)) !==
            JSON.stringify(read(reviewedValues, field.path)),
        )
    : [];
  const groups = [...bundle.catalog.groups].sort((a, b) =>
    settingsGroupName(a.id, lang).localeCompare(
      settingsGroupName(b.id, lang),
      lang === "zh" ? "zh-CN" : lang === "ja" ? "ja-JP" : "en-US",
    ),
  );
  const currentFields =
    groups.find((value) => value.id === group)?.fields ?? [];
  const hasPending = currentFields.some(
    (field) => unavailable[field.path] === words.pending,
  );
  function update(field: SaveSettingsField, value: Value) {
    setDraft((previous) => write(previous, field.path, value));
    setPreview(undefined);
    setInvalid("");
  }
  async function review() {
    setRunning(true);
    setInvalid("");
    try {
      let next = structuredClone(draft);
      for (const field of bundle.catalog.groups.flatMap(
        (value) => value.fields,
      )) {
        if (texts[field.path] === undefined) continue;
        const raw = texts[field.path];
        let value: Value = raw;
        if (field.kind === "list")
          value =
            raw === ""
              ? []
              : raw
                  .split("\n")
                  .map((item) => (field.choices.length ? Number(item) : item));
        else if (field.kind === "integer" || field.kind === "number") {
          if (
            raw.trim() === "" ||
            !Number.isFinite(Number(raw)) ||
            (field.kind === "integer" && !Number.isInteger(Number(raw)))
          )
            throw new Error(words.invalid);
          value = Number(raw);
        }
        next = write(next, field.path, value);
        if (
          field.path === "report.extraProperties" ||
          field.path === "report.hiddenProperties"
        ) {
          if (
            (value as Value[]).length > 256 ||
            (value as Value[]).some(
              (item) => typeof item !== "string" || item.length > 128,
            )
          )
            throw new Error(words.invalid);
        }
      }
      setPreview(await onValidate(JSON.stringify(next)));
    } catch {
      setInvalid(words.invalid);
    } finally {
      setRunning(false);
    }
  }
  async function save() {
    if (!preview) return;
    setRunning(true);
    try {
      await onSave(preview);
      setDraft(JSON.parse(preview) as ObjectValue);
      setTexts({});
      setPreview(undefined);
    } catch {
      setInvalid(words.saveError);
    } finally {
      setRunning(false);
    }
  }
  return (
    <fieldset className="save-food-fields" disabled={disabled}>
      <legend>{words.title}</legend>
      <p>{words.changed}</p>
      <label className="field">
        <span>{words.group}</span>
        <Select
          value={group}
          onChange={(event) => setGroup(event.target.value)}
        >
          {groups.map((value) => (
            <option key={value.id} value={value.id}>
              {settingsGroupName(value.id, lang)}
            </option>
          ))}
        </Select>
      </label>
      {renderGroupTools?.(group)}
      {invalid && <p role="alert">{invalid}</p>}
      {hasPending && (
        <p id={noticeId} className="save-editor-note">
          {words.pending}
        </p>
      )}
      <div className="save-editor-fields">
        {currentFields.map((field, index) => {
          const value = read(draft, field.path),
            description = settingsFieldDescription(field.name, lang);
          const reason = unavailable[field.path];
          const sharedReason = reason === words.pending;
          const reasonId = reason
            ? sharedReason
              ? noticeId
              : `${noticeId}-${index}`
            : undefined;
          const changed = (text: string) => {
            setTexts((previous) => ({ ...previous, [field.path]: text }));
            setPreview(undefined);
            setInvalid("");
          };
          return (
            <label
              className="field"
              key={field.path}
              aria-describedby={reasonId}
            >
              <span>{settingsFieldCaption(field, lang)}</span>
              {field.kind === "boolean" ? (
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  disabled={disabled || Boolean(reason)}
                  aria-describedby={reasonId}
                  onChange={(event) => update(field, event.target.checked)}
                />
              ) : field.kind === "enum" ? (
                <Select
                  value={Number(value)}
                  disabled={disabled || Boolean(reason)}
                  aria-describedby={reasonId}
                  onChange={(event) =>
                    update(field, Number(event.target.value))
                  }
                >
                  {field.choices.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {settingsEnumName(field.enumType, choice.name, lang)}
                    </option>
                  ))}
                </Select>
              ) : field.kind === "list" ? (
                <textarea
                  disabled={disabled || Boolean(reason)}
                  aria-describedby={reasonId}
                  value={texts[field.path] ?? (value as Value[]).join("\n")}
                  aria-label={
                    settingsFieldCaption(field, lang) + " · " + words.list
                  }
                  onChange={(event) => changed(event.target.value)}
                />
              ) : (
                <input
                  type={
                    field.kind === "color"
                      ? "color"
                      : field.kind === "integer" || field.kind === "number"
                        ? "number"
                        : "text"
                  }
                  min={field.minimum ?? undefined}
                  max={field.maximum ?? undefined}
                  step={
                    field.kind === "integer"
                      ? 1
                      : field.kind === "number"
                        ? "any"
                        : undefined
                  }
                  inputMode={
                    field.kind === "integer"
                      ? "numeric"
                      : field.kind === "number"
                        ? "decimal"
                        : undefined
                  }
                  disabled={disabled || Boolean(reason)}
                  aria-describedby={reasonId}
                  maxLength={32767}
                  value={texts[field.path] ?? String(value)}
                  onChange={(event) => changed(event.target.value)}
                />
              )}
              {reason && !sharedReason && <small id={reasonId}>{reason}</small>}
              {description && <small>{description}</small>}
            </label>
          );
        })}
      </div>
      <div className="save-editor-toolbar">
        <button
          type="button"
          onClick={() => {
            let next = JSON.parse(bundle.json) as ObjectValue;
            for (const field of bundle.catalog.groups.flatMap(
              (value) => value.fields,
            )) {
              if (unavailable[field.path])
                next = write(next, field.path, read(savedValues, field.path));
            }
            setDraft(next);
            setTexts({});
            setPreview(undefined);
            setInvalid("");
          }}
        >
          {words.reset}
        </button>
        <button type="button" onClick={() => void review()}>
          {words.check}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!preview || !changes.length || disabled}
          onClick={() => void save()}
        >
          {words.save}
        </button>
      </div>
      {preview && (
        <div aria-live="polite">
          <h3>{words.changes}</h3>
          {!changes.length && <p>{words.same}</p>}
          <dl>
            {changes.map((field) => {
              const display = (value: Value): string =>
                typeof value === "boolean"
                  ? value
                    ? words.yes
                    : words.no
                  : field.kind === "enum"
                    ? settingsEnumName(
                        field.enumType,
                        field.choices.find((choice) => choice.value === value)
                          ?.name ?? String(value),
                        lang,
                      )
                    : Array.isArray(value)
                      ? value.join(" · ")
                      : String(value);
              return (
                <div key={field.path}>
                  <dt>
                    {settingsGroupName(field.path.split(".")[0], lang)} ·{" "}
                    {settingsFieldCaption(field, lang)}
                  </dt>
                  <dd>
                    {display(read(savedValues, field.path))} →{" "}
                    {display(read(reviewedValues!, field.path))}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </fieldset>
  );
}

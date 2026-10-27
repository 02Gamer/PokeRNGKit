// SPDX-License-Identifier: GPL-3.0-or-later
import { settingsFieldVisible } from "./settingsLabels";
import type { SaveSettingsBundle } from "./settingsProtocol";

export type Value =
  boolean | number | string | Value[] | { [key: string]: Value };
export type ObjectValue = { [key: string]: Value };
export function read(root: ObjectValue, path: string): Value {
  let value: Value = root;
  for (const key of path.split(".")) value = (value as ObjectValue)[key];
  return value;
}
export function write(
  root: ObjectValue,
  path: string,
  value: Value,
): ObjectValue {
  const copy = structuredClone(root);
  const parts = path.split(".");
  let node = copy;
  for (const part of parts.slice(0, -1)) node = node[part] as ObjectValue;
  node[parts.at(-1)!] = value;
  return copy;
}
export function resetSettingsDraft(
  bundle: SaveSettingsBundle,
  savedValues: ObjectValue,
  unavailable: Readonly<Record<string, string>>,
): ObjectValue {
  let next = JSON.parse(bundle.json) as ObjectValue;
  for (const field of bundle.catalog.groups.flatMap((group) => group.fields)) {
    if (!settingsFieldVisible(field.path) || unavailable[field.path])
      next = write(next, field.path, read(savedValues, field.path));
  }
  return next;
}

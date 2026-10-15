// SPDX-License-Identifier: GPL-3.0-or-later
export interface SaveSettingsField {
  path: string;
  name: string;
  kind: "boolean" | "enum" | "text" | "list" | "number" | "integer" | "color";
  minimum: number | null;
  maximum: number | null;
  choices: { value: number; name: string }[];
  enumType?: string | null;
}
export interface SaveSettingsBundle {
  apiVersion: number;
  json: string;
  catalog: { groups: { id: string; fields: SaveSettingsField[] }[] };
}

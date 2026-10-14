// SPDX-License-Identifier: GPL-3.0-or-later
export type SaveFolderRequestKind =
  | "saveFolderOpen"
  | "saveFolderRead"
  | "saveFolderPreview"
  | "saveFolderCommit"
  | "saveFolderOpenFile"
  | "saveFolderDiscard"
  | "saveFolderReset";
export interface SaveFolderLocalFile {
  id: string;
  name: string;
  folder: string;
  data: ArrayBuffer;
  modified: number;
  recent: boolean;
  backup: boolean;
  remembered: boolean;
}
export interface SaveFolderDescriptor extends Omit<
  SaveFolderLocalFile,
  "data"
> {
  offset: number;
  length: number;
}
export interface SaveFolderQuery {
  backup: boolean;
  column: number;
  text: string;
  sort: number;
  descending: boolean;
  culture: "zh-CN" | "en-US" | "ja-JP";
}
export interface SaveFolderRow {
  id: string;
  sourceHash: string;
  ot: string;
  generation: number;
  game: number;
  gameName: { zh: string; en: string; ja: string };
  played: string;
  fileTime: string;
  tid: string;
  sid: string;
  folder: string;
  name: string;
  recent: boolean;
  backup: boolean;
  format: string;
}
export interface SaveFolderView {
  apiVersion: number;
  filesHash: string;
  total: number;
  matches: number;
  offset: number;
  rows: SaveFolderRow[];
  errors: { id: string; name: string; error: string }[];
}
export interface SaveFolderConfirmation {
  token: string;
  filesHash: string;
  outputHash: string;
}
export interface SaveFolderTicket {
  confirmation: SaveFolderConfirmation;
  changes: { id: string; action: "remove" | "rename"; name: string }[];
}
export interface SaveFolderDelta {
  removed: string[];
  renamed: SaveFolderDescriptor[];
  filesHash: string;
}
export interface SaveFolderOpened {
  id: string;
  name: string;
  data: string;
  sourceHash: string;
}
export interface SaveFolderResult {
  id: number;
  error?: string;
  saveFolder?: SaveFolderView;
  saveFolderPreview?: SaveFolderTicket;
  saveFolderDelta?: SaveFolderDelta;
  saveFolderOpened?: SaveFolderOpened;
}
export function saveFolderPacket(files: readonly SaveFolderLocalFile[]) {
  if (files.length > 1024) throw Error("Save folder exceeds the file limit.");
  let size = 0;
  const ids = new Set<string>();
  const descriptors: SaveFolderDescriptor[] = files.map((file) => {
    if (
      !file.id ||
      file.id.length > 128 ||
      ids.has(file.id) ||
      !file.name ||
      file.name.length > 4096 ||
      typeof file.folder !== "string" ||
      file.folder.length > 4096 ||
      !(file.data instanceof ArrayBuffer) ||
      file.data.byteLength < 1 ||
      file.data.byteLength > 32 * 1024 * 1024 ||
      !Number.isSafeInteger(file.modified) ||
      file.modified < 0 ||
      file.modified > 253402300799999 ||
      ![file.recent, file.backup, file.remembered].every(
        (value) => typeof value === "boolean",
      )
    )
      throw Error("Invalid local save file.");
    ids.add(file.id);
    const { data, ...metadata } = file;
    const descriptor = { ...metadata, offset: size, length: data.byteLength };
    size += data.byteLength;
    return descriptor;
  });
  if (size > 128 * 1024 * 1024)
    throw Error("Save folder exceeds the local size limit.");
  const bytes = new Uint8Array(size);
  for (let i = 0; i < files.length; i++)
    bytes.set(new Uint8Array(files[i].data), descriptors[i].offset);
  return { bytes, descriptors };
}
export function applySaveFolderDelta(
  files: readonly SaveFolderLocalFile[],
  delta: SaveFolderDelta,
): SaveFolderLocalFile[] {
  const ids = new Set(files.map((f) => f.id)),
    removed = new Set(delta.removed),
    renamed = new Map(delta.renamed.map((f) => [f.id, f]));
  if (
    removed.size !== delta.removed.length ||
    renamed.size !== delta.renamed.length ||
    [...removed, ...renamed.keys()].some((id) => !ids.has(id)) ||
    [...renamed.keys()].some((id) => removed.has(id))
  )
    throw Error("Invalid save folder delta.");
  const output = files
    .filter((f) => !removed.has(f.id))
    .map((file) => {
      const next = renamed.get(file.id);
      if (
        next &&
        (next.folder !== file.folder ||
          next.length !== file.data.byteLength ||
          next.modified !== file.modified ||
          next.recent !== file.recent ||
          next.backup !== file.backup ||
          next.remembered !== file.remembered)
      )
        throw Error("Save folder rename changes unrelated metadata.");
      return {
        ...file,
        name: next?.name ?? file.name,
        data: file.data.slice(0),
      };
    });
  saveFolderPacket(output);
  return output;
}
// Match SaveFolderSession.Hash: UTF-8 length-prefixed fields in source order.
export async function saveFolderHash(
  files: readonly SaveFolderLocalFile[],
): Promise<string> {
  saveFolderPacket(files);
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const append = (value: string) => {
    const text = encoder.encode(value),
      prefix = new Uint8Array(4);
    new DataView(prefix.buffer).setInt32(0, text.length, true);
    chunks.push(prefix, text);
    size += 4 + text.length;
  };
  for (const file of files) {
    const digest = await crypto.subtle.digest("SHA-256", file.data);
    const hash = Array.from(new Uint8Array(digest), (v) =>
      v.toString(16).padStart(2, "0"),
    )
      .join("")
      .toUpperCase();
    for (const value of [
      file.id,
      file.name,
      file.folder,
      String(file.modified),
      file.recent ? "recent" : "",
      file.backup ? "backup" : "",
      file.remembered ? "remembered" : "",
      hash,
    ])
      append(value);
  }
  const packet = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    packet.set(chunk, offset);
    offset += chunk.length;
  }
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", packet)),
    (v) => v.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
}

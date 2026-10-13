// SPDX-License-Identifier: GPL-3.0-or-later
import {
  validateDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
import type { PokemonEntry, PokemonPosition } from "./domain";
import type { SaveEditorResult } from "./domain";
export interface DatabaseActions {
  request(
    kind: DatabaseRequestKind,
    json: string,
    files?: Uint8Array,
  ): Promise<SaveEditorResult | undefined>;
  apply(
    result: SaveEditorResult,
    sourceHash: string,
    before: readonly DatabaseLocalFile[],
    after: readonly DatabaseLocalFile[],
  ): Promise<boolean>;
}
import type { PokemonSearchQuery, PokemonSearchCatalog } from "./pokemonSearch";
export type DatabaseRequestKind =
  | "databaseView"
  | "databaseArchive"
  | "databaseReport"
  | "databaseReportExport"
  | "databaseReportCatalog"
  | "databaseCatalog"
  | "databaseOpen"
  | "databaseRead"
  | "databasePreview"
  | "databaseCommit"
  | "databaseExport"
  | "databaseDiscard"
  | "databaseReset";
export interface DatabaseViewRow {
  id: number;
  source: "current" | "file" | "backup";
  identity: string;
  fileId: string | null;
  format: string;
  position: PokemonPosition | null;
  pokemon: PokemonEntry;
}
export interface DatabaseCatalog {
  search: PokemonSearchCatalog;
  contexts: { id: number; name: string }[];
  context: number;
  comparison: number;
  boxes: number;
}
export interface DatabaseView {
  sourceHash: string;
  filesHash: string;
  total: number;
  matches: number;
  offset: number;
  gridRows: number;
  rows: DatabaseViewRow[];
  files: {
    id: string;
    name: string;
    kind: string;
    count: number;
    error: string | null;
  }[];
}
export interface DatabaseQuery {
  filters: PokemonSearchQuery;
  current: boolean;
  files: boolean;
  backups: boolean;
  legal: boolean | null;
  clones: 0 | 1 | 2;
  context: number | null;
  comparison: number | null;
}
export interface DatabaseDelta {
  removed: string[];
  added: DatabaseLocalFile[];
  filesHash: string;
}
export interface DatabaseWireDelta {
  save: string;
  removed: string[];
  added: {
    id: string;
    name: string;
    data: string;
    entityFile: boolean;
    modified: number;
    useFileFormat?: boolean;
  }[];
  filesHash: string;
}
export function decodeDatabaseBytes(base64: string): Uint8Array<ArrayBuffer> {
  const value = atob(base64);
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i);
  return bytes;
}
export function decodeDatabaseDelta(result: DatabaseWireDelta) {
  const output = decodeDatabaseBytes(result.save);
  const added = result.added.map((file) => ({
    ...file,
    data: decodeDatabaseBytes(file.data).buffer,
  }));
  validateDatabaseFiles(added);
  return {
    output,
    databaseDelta: {
      removed: result.removed,
      added,
      filesHash: result.filesHash,
    },
  };
}
export function applyDatabaseDelta(
  files: readonly DatabaseLocalFile[],
  delta: DatabaseDelta,
) {
  const removed = new Set(delta.removed);
  if (
    removed.size !== delta.removed.length ||
    delta.removed.some((id) => !files.some((f) => f.id === id))
  )
    throw Error("Database removal sources have changed.");
  const next = [...files.filter((f) => !removed.has(f.id)), ...delta.added];
  validateDatabaseFiles(next);
  return next;
}
export interface DatabaseDescriptor {
  id: string;
  name: string;
  offset: number;
  length: number;
  entityFile: boolean;
  modified: number;
  useFileFormat?: boolean;
}
export interface DatabaseConfirmation {
  token: string;
  sourceHash: string;
  filesHash: string;
  outputHash: string;
}
export interface DatabaseTicket {
  confirmation: DatabaseConfirmation;
  action: string;
  removedFiles: string[];
  addedFiles: string[];
  changedSaveBytes: number;
  imported: number;
  deletedSlots: number;
}
export interface DatabaseOptions {
  filterUnavailableSpecies: boolean;
  sort: 0 | 1 | 2;
  gridRows: number;
}
export const defaultDatabaseOptions = (): DatabaseOptions => ({
  filterUnavailableSpecies: true,
  sort: 0,
  gridRows: 9,
});
// A fresh packed buffer is transferable; IndexedDB/caller ArrayBuffers stay owned.
export function databasePacket(files: readonly DatabaseLocalFile[]) {
  validateDatabaseFiles(files);
  const bytes = new Uint8Array(
    files.reduce((sum, file) => sum + file.data.byteLength, 0),
  );
  let offset = 0;
  const descriptors: DatabaseDescriptor[] = files.map((file) => {
    const descriptor = {
      id: file.id,
      name: file.name,
      offset,
      length: file.data.byteLength,
      entityFile: file.entityFile,
      modified: file.modified,
      useFileFormat: Boolean(file.useFileFormat),
    };
    bytes.set(new Uint8Array(file.data), offset);
    offset += file.data.byteLength;
    return descriptor;
  });
  if (JSON.stringify({ files: descriptors }).length > 1024 * 1024)
    throw Error("Database metadata exceeds the local size limit.");
  return { bytes, descriptors };
}
export function databaseConfirmation(
  ticket: DatabaseTicket,
): DatabaseConfirmation {
  return { ...ticket.confirmation };
}

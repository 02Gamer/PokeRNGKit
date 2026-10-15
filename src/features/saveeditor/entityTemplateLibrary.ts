import { libraryFolderName } from "./saveLibraryLocations";
import {
  validateDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
import type { EntityTemplateCatalog } from "./entityTemplate";
import { MAX_ENTITY_BYTES } from "./standalonePokemon";
export function findEntityTemplate(
  files: readonly DatabaseLocalFile[],
  catalog: EntityTemplateCatalog,
) {
  const found = files.filter(
    (f) =>
      f.entityFile &&
      libraryFolderName(f.directory ?? "pkmdb") === catalog.directory &&
      f.name.toLowerCase() === catalog.expectedFileName.toLowerCase(),
  );
  if (found.length > 1)
    throw new Error(
      "Multiple files match the template path. Resolve duplicate names before creating a template.",
    );
  const file = found[0];
  if (file && file.data.byteLength > MAX_ENTITY_BYTES)
    throw new Error("Template exceeds the entity size limit.");
  return file;
}
export function replaceEntityTemplate(
  files: readonly DatabaseLocalFile[],
  catalog: EntityTemplateCatalog,
  data: ArrayBuffer | undefined,
  id: string,
  modified: number,
): DatabaseLocalFile[] {
  const current = findEntityTemplate(files, catalog);
  if (data && (!data.byteLength || data.byteLength > MAX_ENTITY_BYTES))
    throw new Error("Invalid template size.");
  const next = files.filter((f) => f !== current);
  if (data)
    next.push({
      id: current?.id ?? id,
      name: catalog.expectedFileName,
      data: data.slice(0),
      entityFile: true,
      directory: catalog.directory,
      modified,
      useFileFormat: false,
    });
  validateDatabaseFiles(next);
  return next;
}

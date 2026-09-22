import { Note, Vault } from '@nothingraph/shared';
import { parseNote } from '../parser';
import { buildBacklinks } from '../linker';

export function createVault(path: string, name?: string): Vault {
  return {
    path,
    name: name || path.split(/[/\\]/).pop() || 'Vault',
    notes: new Map(),
    folders: new Set(),
  };
}

/** Normalize a relative folder path: forward slashes, no leading/trailing slash. */
function normalizeFolderPath(relativePath: string): string {
  return relativePath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

/** Register a folder (possibly empty) as part of the vault. */
export function addFolderToVault(vault: Vault, relativePath: string): void {
  const normalized = normalizeFolderPath(relativePath);
  if (!normalized) return;
  vault.folders.add(normalized);
}

/**
 * All folder paths in the vault: explicitly tracked ones (e.g. empty
 * folders created by the user) plus every directory implied by a note's
 * path, including intermediate parents.
 */
export function getAllFolders(vault: Vault): Set<string> {
  const all = new Set<string>(vault.folders);

  const addWithParents = (dirPath: string) => {
    const parts = dirPath.split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      all.add(acc);
    }
  };

  for (const note of vault.notes.values()) {
    const normalized = note.path.replace(/\\/g, '/');
    const parts = normalized.split('/');
    parts.pop(); // drop filename
    if (parts.length > 0) addWithParents(parts.join('/'));
  }

  return all;
}

export function addNoteToVault(
  vault: Vault,
  relativePath: string,
  content: string
): Note {
  const id = relativePath.replace(/\.md$/i, '');
  const { title, links, tags } = parseNote(relativePath, content);

  const note: Note = {
    id,
    path: relativePath,
    title,
    content,
    links,
    backlinks: [],
    tags,
    updatedAt: Date.now(),
  };

  vault.notes.set(id, note);
  return note;
}

export function rebuildVaultIndex(vault: Vault): void {
  buildBacklinks(vault.notes);
}

export function getNote(vault: Vault, id: string): Note | undefined {
  return vault.notes.get(id);
}

export function updateNoteContent(
  vault: Vault,
  id: string,
  content: string
): Note | undefined {
  const note = vault.notes.get(id);
  if (!note) return undefined;

  const { title, links, tags } = parseNote(note.path, content);
  note.content = content;
  note.title = title;
  note.links = links;
  note.tags = tags;
  note.updatedAt = Date.now();

  rebuildVaultIndex(vault);
  return note;
}

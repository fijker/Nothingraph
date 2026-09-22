import { Note, Vault } from '@nothingraph/shared';
import { parseNote } from '../parser';
import { buildBacklinks } from '../linker';

export function createVault(path: string, name?: string): Vault {
  return {
    path,
    name: name || path.split(/[/\\]/).pop() || 'Vault',
    notes: new Map(),
  };
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

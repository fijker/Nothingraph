import { create } from 'zustand';
import { Note, Vault, GraphData } from '@nothingraph/shared';
import {
  createVault,
  addNoteToVault,
  addFolderToVault,
  rebuildVaultIndex,
  updateNoteContent,
  buildGraph,
  searchNotes,
} from '@nothingraph/core';
import {
  pickVaultFolder,
  readVaultFiles,
  writeNoteFile,
  createVaultFolder,
  createVaultNoteFile,
  moveVaultEntry,
  deleteVaultEntry,
  VaultFile,
  getLastVaultPath,
  setLastVaultPath,
  clearLastVaultPath,
} from '../lib/fs';

interface VaultState {
  vault: Vault | null;
  currentNoteId: string | null;
  graph: GraphData | null;
  searchQuery: string;
  searchResults: ReturnType<typeof searchNotes>;
  isLoading: boolean;
  error: string | null;

  /** Load vault from list of files + known folders (used by demo + Tauri) */
  openVault: (path: string, files: VaultFile[], folders?: string[]) => void;

  /** Open real folder via Tauri dialog */
  openVaultFromDisk: () => Promise<void>;

  /** Try to reopen the last remembered disk vault on startup; falls back to picker screen. */
  openLastVault: () => Promise<void>;

  /** Create a new empty folder inside the vault (relative path, e.g. "projects/2026"). */
  createFolder: (relativePath: string) => Promise<boolean>;

  /** Create a new empty .md note inside the vault (relative path, without extension). */
  createNote: (relativeIdWithoutExt: string) => Promise<boolean>;

  /** Move an existing note into a different folder (targetFolderPath: '' = vault root). */
  moveNote: (noteId: string, targetFolderPath: string) => Promise<boolean>;

  /** Delete the currently open note (from disk and from the vault). */
  deleteCurrentNote: () => Promise<boolean>;

  selectNote: (id: string) => void;
  updateCurrentNote: (content: string) => void;
  saveCurrentNote: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  getCurrentNote: () => Note | null;
  clearError: () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vault: null,
  currentNoteId: null,
  graph: null,
  searchQuery: '',
  searchResults: [],
  isLoading: false,
  error: null,

  openVault: (path, files, folders = []) => {
    const vault = createVault(path);
    for (const file of files) {
      if (file.path.toLowerCase().endsWith('.md')) {
        addNoteToVault(vault, file.path, file.content);
      }
    }
    for (const folder of folders) {
      addFolderToVault(vault, folder);
    }
    rebuildVaultIndex(vault);
    const graph = buildGraph(vault.notes);

    const firstId =
      files.length > 0 ? files[0].path.replace(/\.md$/i, '') : null;

    set({
      vault,
      graph,
      currentNoteId: firstId,
      searchQuery: '',
      searchResults: [],
      error: null,
      isLoading: false,
    });
  },

  openVaultFromDisk: async () => {
    set({ isLoading: true, error: null });
    try {
      const folder = await pickVaultFolder();
      if (!folder) {
        set({ isLoading: false });
        return;
      }

      // Remember this as the vault to reopen next launch, until the user
      // picks a different folder here.
      setLastVaultPath(folder);

      const { files, folders } = await readVaultFiles(folder);
      // An empty (or note-less) folder is still a valid vault — notes and
      // subfolders can be created from inside the app.
      get().openVault(folder, files, folders);
    } catch (e) {
      console.error(e);
      set({
        isLoading: false,
        error: 'Failed to open vault. See console for details.',
      });
    }
  },

  openLastVault: async () => {
    const lastPath = getLastVaultPath();
    if (!lastPath) return;

    set({ isLoading: true, error: null });
    try {
      const { files, folders } = await readVaultFiles(lastPath);
      if (files.length === 0 && folders.length === 0) {
        // Folder moved/deleted since last time, or genuinely doesn't exist
        // anymore — don't keep retrying it silently.
        clearLastVaultPath();
        set({ isLoading: false });
        return;
      }
      get().openVault(lastPath, files, folders);
    } catch (e) {
      console.error(e);
      clearLastVaultPath();
      set({ isLoading: false });
    }
  },

  createFolder: async (relativePath) => {
    const { vault } = get();
    if (!vault) return false;

    const ok = await createVaultFolder(vault.path, relativePath);
    if (!ok) return false;

    addFolderToVault(vault, relativePath);
    set({ vault: { ...vault } });
    return true;
  },

  createNote: async (relativeIdWithoutExt) => {
    const { vault } = get();
    if (!vault) return false;

    const relativePath = `${relativeIdWithoutExt}.md`.replace(/\\/g, '/');
    const title = relativePath.split('/').pop()!.replace(/\.md$/i, '');
    const initialContent = `# ${title}\n`;

    const ok = await createVaultNoteFile(vault.path, relativePath, initialContent);
    if (!ok) return false;

    addNoteToVault(vault, relativePath, initialContent);
    rebuildVaultIndex(vault);
    const graph = buildGraph(vault.notes);

    set({
      vault: { ...vault },
      graph,
      currentNoteId: relativeIdWithoutExt,
    });
    return true;
  },

  selectNote: (id) => set({ currentNoteId: id }),

  moveNote: async (noteId, targetFolderPath) => {
    const { vault, currentNoteId } = get();
    if (!vault) return false;

    const note = vault.notes.get(noteId);
    if (!note) return false;

    const filename = note.path.replace(/\\/g, '/').split('/').pop()!;
    const newPath = targetFolderPath ? `${targetFolderPath}/${filename}` : filename;

    if (newPath === note.path) return true; // already there, no-op

    const ok = await moveVaultEntry(vault.path, note.path, newPath);
    if (!ok) return false;

    const newId = newPath.replace(/\.md$/i, '');
    vault.notes.delete(noteId);
    vault.notes.set(newId, { ...note, id: newId, path: newPath });

    rebuildVaultIndex(vault);
    const graph = buildGraph(vault.notes);

    set({
      vault: { ...vault },
      graph,
      currentNoteId: currentNoteId === noteId ? newId : currentNoteId,
    });
    return true;
  },

  deleteCurrentNote: async () => {
    const { vault, currentNoteId } = get();
    if (!vault || !currentNoteId) return false;

    const note = vault.notes.get(currentNoteId);
    if (!note) return false;

    const ok = await deleteVaultEntry(vault.path, note.path);
    if (!ok) return false;

    vault.notes.delete(currentNoteId);
    rebuildVaultIndex(vault);
    const graph = buildGraph(vault.notes);

    set({
      vault: { ...vault },
      graph,
      currentNoteId: null,
    });
    return true;
  },

  updateCurrentNote: (content) => {
    const { vault, currentNoteId } = get();
    if (!vault || !currentNoteId) return;

    updateNoteContent(vault, currentNoteId, content);
    const graph = buildGraph(vault.notes);
    set({ vault: { ...vault }, graph });
  },
  saveCurrentNote: async () => {
    const { vault, currentNoteId } = get();
    if (!vault || !currentNoteId) return;

    const note = vault.notes.get(currentNoteId);
    if (!note) return;

    const ok = await writeNoteFile(vault.path, note.path, note.content);
    if (!ok) {
      console.info('Save skipped (not running under Tauri or write failed)');
    }
  },

  setSearchQuery: (query) => {
    const { vault } = get();
    const results = vault ? searchNotes(vault.notes, query) : [];
    set({ searchQuery: query, searchResults: results });
  },

  getCurrentNote: () => {
    const { vault, currentNoteId } = get();
    if (!vault || !currentNoteId) return null;
    return vault.notes.get(currentNoteId) || null;
  },

  clearError: () => set({ error: null }),
}));

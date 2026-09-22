import { create } from 'zustand';
import { Note, Vault, GraphData } from '@nothingraph/shared';
import {
  createVault,
  addNoteToVault,
  rebuildVaultIndex,
  updateNoteContent,
  buildGraph,
  searchNotes,
} from '@nothingraph/core';
import { pickVaultFolder, readVaultFiles, writeNoteFile, VaultFile } from '../lib/fs';

interface VaultState {
  vault: Vault | null;
  currentNoteId: string | null;
  graph: GraphData | null;
  searchQuery: string;
  searchResults: ReturnType<typeof searchNotes>;
  isLoading: boolean;
  error: string | null;

  /** Load vault from list of files (used by demo + Tauri) */
  openVault: (path: string, files: VaultFile[]) => void;

  /** Open real folder via Tauri dialog */
  openVaultFromDisk: () => Promise<void>;

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

  openVault: (path, files) => {
    const vault = createVault(path);
    for (const file of files) {
      if (file.path.toLowerCase().endsWith('.md')) {
        addNoteToVault(vault, file.path, file.content);
      }
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

      const files = await readVaultFiles(folder);
      if (files.length === 0) {
        set({
          isLoading: false,
          error: 'No Markdown (.md) files found in the selected folder.',
        });
        return;
      }

      get().openVault(folder, files);
    } catch (e) {
      console.error(e);
      set({
        isLoading: false,
        error: 'Failed to open vault. See console for details.',
      });
    }
  },

  selectNote: (id) => set({ currentNoteId: id }),

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

import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { Note, Vault } from '@nothingraph/shared';
import { getAllFolders } from '@nothingraph/core';
import { useVaultStore } from '../../stores/vaultStore';
import { isTauri } from '../../lib/fs';

type TreeNode =
  | { type: 'folder'; name: string; path: string; children: TreeNode[] }
  | { type: 'note'; name: string; id: string; path: string };

function buildTree(vault: Vault): TreeNode[] {
  const folderPaths = Array.from(getAllFolders(vault)).sort();
  const folderMap = new Map<string, Extract<TreeNode, { type: 'folder' }>>();

  for (const path of folderPaths) {
    folderMap.set(path, {
      type: 'folder',
      name: path.split('/').pop() || path,
      path,
      children: [],
    });
  }

  const roots: TreeNode[] = [];

  for (const path of folderPaths) {
    const node = folderMap.get(path)!;
    const idx = path.lastIndexOf('/');
    const parentPath = idx === -1 ? null : path.slice(0, idx);
    if (parentPath && folderMap.has(parentPath)) {
      folderMap.get(parentPath)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const note of vault.notes.values() as IterableIterator<Note>) {
    const normalized = note.path.replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    const parentPath = idx === -1 ? null : normalized.slice(0, idx);
    const noteNode: TreeNode = { type: 'note', name: note.title, id: note.id, path: normalized };
    if (parentPath && folderMap.has(parentPath)) {
      folderMap.get(parentPath)!.children.push(noteNode);
    } else {
      roots.push(noteNode);
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) if (n.type === 'folder') sortNodes(n.children);
  };
  sortNodes(roots);

  return roots;
}

interface NewEntryState {
  parentPath: string; // '' = vault root
  kind: 'note' | 'folder';
}

export function Sidebar() {
  const vault = useVaultStore((s) => s.vault);
  const currentNoteId = useVaultStore((s) => s.currentNoteId);
  const currentNote = useVaultStore((s) => s.getCurrentNote());
  const selectNote = useVaultStore((s) => s.selectNote);
  const createFolder = useVaultStore((s) => s.createFolder);
  const createNote = useVaultStore((s) => s.createNote);
  const moveNote = useVaultStore((s) => s.moveNote);
  const deleteCurrentNote = useVaultStore((s) => s.deleteCurrentNote);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeFolder, setActiveFolder] = useState<string>(''); // '' = root
  const [newEntry, setNewEntry] = useState<NewEntryState | null>(null);
  const [newName, setNewName] = useState('');
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null); // '' = root

  const tree = useMemo(() => (vault ? buildTree(vault) : []), [vault]);

  if (!vault) return null;

  const toggleFolder = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const startCreating = (parentPath: string, kind: 'note' | 'folder') => {
    setActiveFolder(parentPath);
    setNewEntry({ parentPath, kind });
    setNewName('');
    if (parentPath) setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(parentPath);
      return next;
    });
  };

  const cancelCreating = () => {
    setNewEntry(null);
    setNewName('');
  };

  const commitCreating = async () => {
    if (!newEntry) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      cancelCreating();
      return;
    }
    const fullPath = newEntry.parentPath ? `${newEntry.parentPath}/${trimmed}` : trimmed;

    const ok =
      newEntry.kind === 'folder'
        ? await createFolder(fullPath)
        : await createNote(fullPath);

    if (!ok) {
      console.warn(`Failed to create ${newEntry.kind} at ${fullPath} (may already exist)`);
    }
    cancelCreating();
  };

  const handleNoteDragStart = (e: DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNoteId(noteId);
  };

  const handleNoteDragEnd = () => {
    setDraggedNoteId(null);
    setDragOverPath(null);
  };

  const handleDropZoneDragOver = (e: DragEvent, path: string) => {
    if (!draggedNoteId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPath(path);
  };

  const handleDropZoneDrop = async (e: DragEvent, targetFolderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(null);
    const noteId = e.dataTransfer.getData('text/plain') || draggedNoteId;
    setDraggedNoteId(null);
    if (!noteId) return;

    const ok = await moveNote(noteId, targetFolderPath);
    if (!ok) {
      console.warn(`Failed to move note "${noteId}" into "${targetFolderPath || '/'}"`);
    }
  };

  const handleDeleteCurrentNote = async () => {
    if (!currentNote) return;

    const message = `Delete "${currentNote.title}"? This can't be undone.`;
    let confirmed = false;
    if (isTauri()) {
      const { confirm } = await import('@tauri-apps/plugin-dialog');
      confirmed = await confirm(message, { title: 'Delete note', kind: 'warning' });
    } else {
      confirmed = window.confirm(message);
    }
    if (!confirmed) return;

    const ok = await deleteCurrentNote();
    if (!ok) {
      console.warn('Failed to delete note', currentNote.path);
    }
  };

  const renderNewEntryInput = (parentPath: string) => {
    if (!newEntry || newEntry.parentPath !== parentPath) return null;
    return (
      <input
        autoFocus
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitCreating();
          if (e.key === 'Escape') cancelCreating();
        }}
        onBlur={commitCreating}
        placeholder={newEntry.kind === 'folder' ? 'Folder name' : 'Note name'}
        className="w-full bg-zinc-900 border border-indigo-600 rounded px-1.5 py-0.5 text-sm text-zinc-100 outline-none"
      />
    );
  };

  const renderNode = (node: TreeNode, depth: number) => {
    if (node.type === 'note') {
      return (
        <button
          key={node.path}
          draggable
          onDragStart={(e) => handleNoteDragStart(e, node.id)}
          onDragEnd={handleNoteDragEnd}
          onClick={() => selectNote(node.id)}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          className={`w-full text-left pr-3 py-1.5 text-sm truncate transition flex items-center gap-1.5 cursor-grab active:cursor-grabbing ${
            draggedNoteId === node.id ? 'opacity-40' : ''
          } ${
            currentNoteId === node.id
              ? 'bg-indigo-600/20 text-indigo-300'
              : 'hover:bg-zinc-900 text-zinc-300'
          }`}
        >
          <span className="text-zinc-600 shrink-0">•</span>
          <span className="truncate">{node.name}</span>
        </button>
      );
    }

    const isCollapsed = collapsed.has(node.path);
    const isActive = activeFolder === node.path;
    const isDropTarget = dragOverPath === node.path;

    return (
      <div key={node.path}>
        <div
          style={{ paddingLeft: `${4 + depth * 14}px` }}
          className={`group w-full flex items-center gap-1 pr-1.5 py-1.5 text-sm transition cursor-pointer ${
            isDropTarget
              ? 'bg-indigo-600/20 outline outline-1 outline-indigo-500 -outline-offset-1'
              : isActive
              ? 'bg-zinc-900/70'
              : 'hover:bg-zinc-900/70'
          }`}
          onClick={() => {
            toggleFolder(node.path);
            setActiveFolder(node.path);
          }}
          onDragOver={(e) => handleDropZoneDragOver(e, node.path)}
          onDragLeave={() => setDragOverPath((p) => (p === node.path ? null : p))}
          onDrop={(e) => handleDropZoneDrop(e, node.path)}
        >
          <span className="text-zinc-500 w-3 shrink-0 text-center">
            {isCollapsed ? '▸' : '▾'}
          </span>
          <span className="truncate flex-1 text-zinc-300 font-medium">{node.name}</span>
          <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button
              title="New note here"
              onClick={(e) => {
                e.stopPropagation();
                startCreating(node.path, 'note');
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-800 text-white text-sm font-bold leading-none"
            >
              +
            </button>
            <button
              title="New folder here"
              onClick={(e) => {
                e.stopPropagation();
                startCreating(node.path, 'folder');
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-800 text-white text-xs"
            >
              🖿
            </button>
          </span>
        </div>

        {newEntry?.parentPath === node.path && (
          <div style={{ paddingLeft: `${22 + depth * 14}px`, paddingRight: '10px' }} className="py-0.5">
            {renderNewEntryInput(node.path)}
          </div>
        )}

        {!isCollapsed && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <aside className="w-64 border-r border-zinc-800 flex flex-col shrink-0">
      <div
        onClick={() => setActiveFolder('')}
        onDragOver={(e) => handleDropZoneDragOver(e, '')}
        onDragLeave={() => setDragOverPath((p) => (p === '' ? null : p))}
        onDrop={(e) => handleDropZoneDrop(e, '')}
        className={`p-3 border-b border-zinc-800 flex items-center justify-between gap-2 cursor-pointer transition ${
          dragOverPath === ''
            ? 'bg-indigo-600/20 outline outline-1 outline-indigo-500 -outline-offset-1'
            : activeFolder === ''
            ? 'bg-zinc-900/50'
            : ''
        }`}
      >
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider truncate">
          {vault.notes.size} note{vault.notes.size === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            title={currentNote ? `Delete "${currentNote.title}"` : 'No note open'}
            disabled={!currentNote}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCurrentNote();
            }}
            className={`w-6 h-6 flex items-center justify-center rounded text-base font-bold leading-none ${
              currentNote
                ? 'text-white hover:bg-red-900/60'
                : 'text-zinc-700 cursor-not-allowed'
            }`}
          >
            −
          </button>
          <button
            title={activeFolder ? `New note in "${activeFolder}"` : 'New note'}
            onClick={(e) => {
              e.stopPropagation();
              startCreating(activeFolder, 'note');
            }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-white text-base font-bold leading-none"
          >
            +
          </button>
          <button
            title={activeFolder ? `New folder in "${activeFolder}"` : 'New folder'}
            onClick={(e) => {
              e.stopPropagation();
              startCreating(activeFolder, 'folder');
            }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-white text-sm"
          >
            🖿
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto py-1"
        onDragOver={(e) => handleDropZoneDragOver(e, '')}
        onDrop={(e) => handleDropZoneDrop(e, '')}
      >
        {newEntry?.parentPath === '' && (
          <div className="px-3 py-0.5">{renderNewEntryInput('')}</div>
        )}

        {tree.length === 0 && !newEntry && (
          <p className="px-3 py-4 text-sm text-zinc-600 text-center">
            Empty vault. Use + / 🖿 above to create your first note or folder.
          </p>
        )}

        {tree.map((node) => renderNode(node, 0))}
      </div>
    </aside>
  );
}

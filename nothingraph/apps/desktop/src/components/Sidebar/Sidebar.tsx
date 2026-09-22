import { useVaultStore } from '../../stores/vaultStore';

export function Sidebar() {
  const vault = useVaultStore((s) => s.vault);
  const currentNoteId = useVaultStore((s) => s.currentNoteId);
  const selectNote = useVaultStore((s) => s.selectNote);

  if (!vault) return null;

  const notes = Array.from(vault.notes.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <aside className="w-64 border-r border-zinc-800 flex flex-col shrink-0">
      <div className="p-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        Notes ({notes.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => selectNote(note.id)}
            className={`w-full text-left px-3 py-2 text-sm truncate transition ${
              currentNoteId === note.id
                ? 'bg-indigo-600/20 text-indigo-300'
                : 'hover:bg-zinc-900 text-zinc-300'
            }`}
          >
            {note.title}
          </button>
        ))}
      </div>
    </aside>
  );
}

import { useVaultStore } from '../../stores/vaultStore';

export function BacklinksPanel() {
  const note = useVaultStore((s) => s.getCurrentNote());
  const vault = useVaultStore((s) => s.vault);
  const selectNote = useVaultStore((s) => s.selectNote);

  if (!note || !vault) return null;

  const backlinkNotes = note.backlinks
    .map((id) => vault.notes.get(id))
    .filter(Boolean);

  return (
    <aside className="w-64 border-l border-zinc-800 flex flex-col shrink-0">
      <div className="p-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        Backlinks ({backlinkNotes.length})
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {backlinkNotes.length === 0 ? (
          <p className="text-sm text-zinc-600 p-2">No backlinks yet</p>
        ) : (
          backlinkNotes.map((n) => (
            <button
              key={n!.id}
              onClick={() => selectNote(n!.id)}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-zinc-900 text-zinc-300 truncate"
            >
              {n!.title}
            </button>
          ))
        )}
      </div>

      {note.links.length > 0 && (
        <>
          <div className="p-3 border-t border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Outgoing ({note.links.length})
          </div>
          <div className="p-2">
            {note.links.map((link) => (
              <div key={link} className="px-2 py-1 text-sm text-zinc-400 truncate">
                [[{link}]]
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

import { useVaultStore } from '../../stores/vaultStore';

export function SearchBar() {
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const searchResults = useVaultStore((s) => s.searchResults);
  const selectNote = useVaultStore((s) => s.selectNote);

  return (
    <div className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search notes..."
        className="w-64 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-sm outline-none focus:border-indigo-500"
      />
      {searchQuery && searchResults.length > 0 && (
        <div className="absolute top-full mt-1 w-80 max-h-64 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-50">
          {searchResults.map((r) => (
            <button
              key={r.noteId}
              onClick={() => {
                selectNote(r.noteId);
                setSearchQuery('');
              }}
              className="w-full text-left px-3 py-2 hover:bg-zinc-800 text-sm"
            >
              <div className="font-medium">{r.title}</div>
              {r.matches[0] && (
                <div className="text-xs text-zinc-500 truncate">{r.matches[0].text}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

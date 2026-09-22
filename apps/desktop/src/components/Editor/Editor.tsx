import { useEffect, useState } from 'react';
import { useVaultStore } from '../../stores/vaultStore';

export function Editor() {
  const note = useVaultStore((s) => s.getCurrentNote());
  const updateCurrentNote = useVaultStore((s) => s.updateCurrentNote);
  const saveCurrentNote = useVaultStore((s) => s.saveCurrentNote);
  const [content, setContent] = useState('');

  useEffect(() => {
    setContent(note?.content ?? '');
  }, [note?.id]);

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        Select a note or create a new one
      </div>
    );
  }

  const handleChange = (value: string) => {
    setContent(value);
    updateCurrentNote(value);
  };

  const handleBlur = () => {
    saveCurrentNote();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-zinc-800 text-sm text-zinc-500 flex items-center gap-3">
        <span>{note.path}</span>
        {note.tags.length > 0 && (
          <span>
            {note.tags.map((t) => (
              <span key={t} className="mr-2 text-indigo-400">
                #{t}
              </span>
            ))}
          </span>
        )}
        <span className="ml-auto text-xs text-zinc-600">auto-saves on blur</span>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className="flex-1 w-full p-6 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed"
        placeholder="Start writing markdown..."
        spellCheck={false}
      />
    </div>
  );
}

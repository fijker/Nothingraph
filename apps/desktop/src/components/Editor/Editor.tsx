import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useVaultStore } from '../../stores/vaultStore';

interface EditorProps {
  mode: 'edit' | 'read';
}

export function Editor({ mode }: EditorProps) {
  const note = useVaultStore((s) => s.getCurrentNote());
  const updateCurrentNote = useVaultStore((s) => s.updateCurrentNote);
  const saveCurrentNote = useVaultStore((s) => s.saveCurrentNote);
  const selectNote = useVaultStore((s) => s.selectNote);
  const vault = useVaultStore((s) => s.vault);
  const [content, setContent] = useState('');

  useEffect(() => {
    setContent(note?.content ?? '');
  }, [note?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
      if (!isSaveShortcut) return;
      e.preventDefault();
      saveCurrentNote();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentNote]);

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

  const handleWikiClick = (target: string) => {
    if (!vault) return;
    if (vault.notes.has(target)) {
      selectNote(target);
      return;
    }
    for (const [id, n] of vault.notes) {
      if (
        id.toLowerCase() === target.toLowerCase() ||
        n.title.toLowerCase() === target.toLowerCase()
      ) {
        selectNote(id);
        return;
      }
    }
  };

  const renderContent = content.replace(
    /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target, alias) => {
      const label = alias || target;
      return `[${label}](wiki://${encodeURIComponent(target.trim())})`;
    }
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-2 border-b border-zinc-800 text-xs text-zinc-500 flex items-center gap-3 shrink-0">
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
        <span className="ml-auto text-zinc-600">
          {mode === 'edit' ? 'editing' : 'reading'}
        </span>
      </div>

      {mode === 'edit' ? (
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className="flex-1 w-full p-6 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-zinc-200"
          placeholder="Start writing markdown..."
          spellCheck={false}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 md-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-zinc-100 mb-4 mt-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold text-zinc-100 mb-3 mt-6">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-medium text-zinc-200 mb-2 mt-4">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-zinc-300 leading-relaxed mb-3">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside text-zinc-300 mb-3 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside text-zinc-300 mb-3 space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="text-zinc-300">{children}</li>,
              code: ({ className, children }) => {
                const isBlock = className?.includes('language-');
                if (isBlock) {
                  return (
                    <code className="block bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm font-mono text-indigo-300 overflow-x-auto mb-3">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="px-1.5 py-0.5 bg-zinc-800 rounded text-sm font-mono text-indigo-300">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <div className="mb-3">{children}</div>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-indigo-500 pl-4 text-zinc-400 italic mb-3">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => {
                if (href?.startsWith('wiki://')) {
                  const target = decodeURIComponent(href.replace('wiki://', ''));
                  return (
                    <button
                      type="button"
                      onClick={() => handleWikiClick(target)}
                      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0 font-inherit inline"
                    >
                      {children}
                    </button>
                  );
                }
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                  >
                    {children}
                  </a>
                );
              },
              hr: () => <hr className="border-zinc-800 my-6" />,
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-100">{children}</strong>
              ),
            }}
          >
            {renderContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

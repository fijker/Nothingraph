import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Editor } from './components/Editor/Editor';
import { GraphView } from './components/Graph/GraphView';
import { SearchBar } from './components/Search/SearchBar';
import { BacklinksPanel } from './components/Backlinks/BacklinksPanel';
import { TitleBar } from './components/TitleBar';
import { useVaultStore } from './stores/vaultStore';
import { isTauri } from './lib/fs';

type View = 'editor' | 'graph';
type Mode = 'edit' | 'read';

function App() {
  const [view, setView] = useState<View>('editor');
  const [mode, setMode] = useState<Mode>('read');
  const vault = useVaultStore((s) => s.vault);
  const openVault = useVaultStore((s) => s.openVault);
  const openVaultFromDisk = useVaultStore((s) => s.openVaultFromDisk);
  const openLastVault = useVaultStore((s) => s.openLastVault);
  const isLoading = useVaultStore((s) => s.isLoading);
  const error = useVaultStore((s) => s.error);
  const clearError = useVaultStore((s) => s.clearError);

  // On startup, try to silently reopen the last vault folder the user had
  // open. If none is remembered (or it can't be read anymore), this is a
  // no-op and the picker screen below is shown as usual.
  useEffect(() => {
    if (isTauri()) {
      openLastVault();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDemo = () => {
    const demoFiles = [
      {
        path: 'Welcome.md',
        content: `# Welcome to Nothingraph

This is a local-first markdown knowledge base.

## Features

- [[Wiki Links]]
- Graph view
- Backlinks
- Tags #demo #nothingraph

Start writing and create links with \`[[double brackets]]\`.
`,
      },
      {
        path: 'Wiki Links.md',
        content: `# Wiki Links

You can link to other notes using \`[[Note Name]]\`.

This note is linked from [[Welcome]].

Try the graph view to see connections.
`,
      },
      {
        path: 'Getting Started.md',
        content: `# Getting Started

1. Create a folder for your vault
2. Add \`.md\` files
3. Use \`[[links]]\` between them
4. Explore the graph

#tutorial
`,
      },
      {
        path: 'Ideas.md',
        content: `# Ideas

Some random thoughts linked to [[Welcome]] and [[Getting Started]].

- Local-first is the future
- Graphs help discover connections
- Keep it simple

#ideas
`,
      },
    ];
    openVault('/demo-vault', demoFiles);
  };

  if (!vault) {
    return (
      <div className="h-full flex flex-col bg-zinc-950">
        <TitleBar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <h1 className="text-4xl font-bold tracking-tight">Nothingraph</h1>
          <p className="text-zinc-400 text-center max-w-md">
            Local-first markdown knowledge base with bidirectional links and interactive graph view.
          </p>

          {isLoading && (
            <p className="text-sm text-zinc-500">Reopening last vault…</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {isTauri() && (
              <button
                onClick={() => openVaultFromDisk()}
                disabled={isLoading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg font-medium transition"
              >
                {isLoading ? 'Opening…' : 'Open Vault Folder'}
              </button>
            )}
            <button
              onClick={loadDemo}
              disabled={isLoading}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg font-medium transition"
            >
              Open Demo Vault
            </button>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-900/40 border border-red-800 rounded-lg text-sm text-red-200 max-w-md text-center">
              {error}
              <button onClick={clearError} className="ml-3 underline">
                dismiss
              </button>
            </div>
          )}

          <p className="text-sm text-zinc-500 max-w-sm text-center">
            {isTauri()
              ? 'Select any folder containing Markdown files to use as a vault.'
              : 'Running in browser — only demo vault is available. Use the desktop app for real folders.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <TitleBar />

      <header className="h-10 border-b border-zinc-800 flex items-center px-3 gap-3 shrink-0">
        <span className="font-semibold text-indigo-400 text-sm">Nothingraph</span>
        <span className="text-zinc-500 text-xs truncate max-w-[180px]" title={vault.path}>
          {vault.name}
        </span>
        <div className="flex-1" />
        <SearchBar />

        {/* Read / Edit toggle */}
        {view === 'editor' && (
          <div className="flex rounded border border-zinc-700 overflow-hidden text-xs">
            <button
              onClick={() => setMode('read')}
              className={`px-2.5 py-1 ${
                mode === 'read' ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              Read
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`px-2.5 py-1 ${
                mode === 'edit' ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              Edit
            </button>
          </div>
        )}

        <div className="flex gap-0.5">
          <button
            onClick={() => setView('editor')}
            className={`px-2.5 py-1 rounded text-xs ${
              view === 'editor' ? 'bg-zinc-800' : 'hover:bg-zinc-900'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setView('graph')}
            className={`px-2.5 py-1 rounded text-xs ${
              view === 'graph' ? 'bg-zinc-800' : 'hover:bg-zinc-900'
            }`}
          >
            Graph
          </button>
        </div>
        {isTauri() && (
          <button
            onClick={() => openVaultFromDisk()}
            className="ml-1 px-2.5 py-1 text-xs rounded hover:bg-zinc-800 text-zinc-400"
            title="Open another vault"
          >
            Open…
          </button>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {view === 'editor' ? <Editor mode={mode} /> : <GraphView />}
        </main>
        {view === 'editor' && <BacklinksPanel />}
      </div>
    </div>
  );
}

export default App;

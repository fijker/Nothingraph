import { useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Editor } from './components/Editor/Editor';
import { GraphView } from './components/Graph/GraphView';
import { SearchBar } from './components/Search/SearchBar';
import { BacklinksPanel } from './components/Backlinks/BacklinksPanel';
import { useVaultStore } from './stores/vaultStore';
import { isTauri } from './lib/fs';

type View = 'editor' | 'graph';

function App() {
  const [view, setView] = useState<View>('editor');
  const vault = useVaultStore((s) => s.vault);
  const openVault = useVaultStore((s) => s.openVault);
  const openVaultFromDisk = useVaultStore((s) => s.openVaultFromDisk);
  const isLoading = useVaultStore((s) => s.isLoading);
  const error = useVaultStore((s) => s.error);
  const clearError = useVaultStore((s) => s.clearError);

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
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-4xl font-bold tracking-tight">Nothingraph</h1>
        <p className="text-zinc-400 text-center max-w-md">
          Local-first markdown knowledge base with bidirectional links and interactive graph view.
        </p>

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
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <header className="h-12 border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0">
        <span className="font-semibold text-indigo-400">Nothingraph</span>
        <span className="text-zinc-500 text-sm truncate max-w-[200px]" title={vault.path}>
          {vault.name}
        </span>
        <div className="flex-1" />
        <SearchBar />
        <div className="flex gap-1">
          <button
            onClick={() => setView('editor')}
            className={`px-3 py-1 rounded text-sm ${
              view === 'editor' ? 'bg-zinc-800' : 'hover:bg-zinc-900'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setView('graph')}
            className={`px-3 py-1 rounded text-sm ${
              view === 'graph' ? 'bg-zinc-800' : 'hover:bg-zinc-900'
            }`}
          >
            Graph
          </button>
        </div>
        {isTauri() && (
          <button
            onClick={() => openVaultFromDisk()}
            className="ml-2 px-3 py-1 text-sm rounded hover:bg-zinc-800 text-zinc-400"
            title="Open another vault"
          >
            Open…
          </button>
        )}
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {view === 'editor' ? <Editor /> : <GraphView />}
        </main>
        {view === 'editor' && <BacklinksPanel />}
      </div>
    </div>
  );
}

export default App;

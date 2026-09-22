import { isTauri } from '../lib/fs';

async function getWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export function TitleBar() {
  const startDrag = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    if (!isTauri()) return;
    try {
      const win = await getWindow();
      await win.startDragging();
    } catch (err) {
      console.warn('startDragging failed', err);
    }
  };

  const minimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const win = await getWindow();
      await win.minimize();
    } catch {}
  };

  const toggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const win = await getWindow();
      await win.toggleMaximize();
    } catch {}
  };

  const close = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const win = await getWindow();
      await win.close();
    } catch {}
  };

  return (
    <div
      onMouseDown={startDrag}
      className="h-8 flex items-center px-3 shrink-0 bg-zinc-900 border-b border-zinc-800 select-none cursor-default"
    >
      <span className="text-xs font-medium text-zinc-400 tracking-wide pointer-events-none">
        Nothingraph
      </span>
      <div className="flex-1 h-full" />
      {isTauri() && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={minimize}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-8 h-6 flex items-center justify-center rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm"
            title="Minimize"
          >
            ─
          </button>
          <button
            onClick={toggleMaximize}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-8 h-6 flex items-center justify-center rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs"
            title="Maximize"
          >
            □
          </button>
          <button
            onClick={close}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-8 h-6 flex items-center justify-center rounded hover:bg-red-600/80 text-zinc-400 hover:text-white text-sm"
            title="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

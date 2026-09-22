/**
 * File system helpers.
 * Works in Tauri (real FS) and falls back to demo mode in pure browser.
 */

export interface VaultFile {
  path: string; // relative path inside vault, e.g. "folder/Note.md"
  content: string;
}

const isTauri = () =>
  typeof window !== 'undefined' &&
  // @ts-expect-error Tauri global
  (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined);

/**
 * Open a folder picker and return the selected directory path.
 * Returns null if cancelled or not in Tauri.
 */
export async function pickVaultFolder(): Promise<string | null> {
  if (!isTauri()) return null;

  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Open Vault Folder',
    });
    return typeof selected === 'string' ? selected : null;
  } catch (e) {
    console.error('Failed to open folder dialog', e);
    return null;
  }
}

/** Make a path relative to base (simple string version, no Tauri relative API) */
function toRelative(base: string, full: string): string {
  const normBase = base.replace(/\\/g, '/').replace(/\/+$/, '');
  const normFull = full.replace(/\\/g, '/');
  if (normFull.startsWith(normBase + '/')) {
    return normFull.slice(normBase.length + 1);
  }
  if (normFull.startsWith(normBase)) {
    return normFull.slice(normBase.length).replace(/^\//, '');
  }
  // fallback: just filename
  return normFull.split('/').pop() || normFull;
}

/**
 * Recursively read all .md files from a directory.
 * Returns relative paths + content.
 */
export async function readVaultFiles(vaultPath: string): Promise<VaultFile[]> {
  if (!isTauri()) return [];

  try {
    const { readDir, readTextFile } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');

    const results: VaultFile[] = [];

    async function walk(dir: string, base: string) {
      const entries = await readDir(dir);
      for (const entry of entries) {
        const fullPath = await join(dir, entry.name);
        if (entry.isDirectory) {
          // skip hidden / common ignore dirs
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          await walk(fullPath, base);
        } else if (entry.name.toLowerCase().endsWith('.md')) {
          try {
            const content = await readTextFile(fullPath);
            const normalized = toRelative(base, fullPath);
            results.push({ path: normalized, content });
          } catch (err) {
            console.warn('Could not read', fullPath, err);
          }
        }
      }
    }

    await walk(vaultPath, vaultPath);
    return results;
  } catch (e) {
    console.error('Failed to read vault files', e);
    return [];
  }
}

/**
 * Write content back to a note file.
 */
export async function writeNoteFile(
  vaultPath: string,
  relativePath: string,
  content: string
): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');
    const full = await join(vaultPath, relativePath);
    await writeTextFile(full, content);
    return true;
  } catch (e) {
    console.error('Failed to write note', e);
    return false;
  }
}

export { isTauri };

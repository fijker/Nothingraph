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

const LAST_VAULT_KEY = 'nothingraph:lastVaultPath';

/** Remember the last real (disk) vault folder so it can be reopened on next launch. */
export function setLastVaultPath(path: string): void {
  try {
    localStorage.setItem(LAST_VAULT_KEY, path);
  } catch (e) {
    console.warn('Could not persist last vault path', e);
  }
}

/** Path of the last opened disk vault, if any. */
export function getLastVaultPath(): string | null {
  try {
    return localStorage.getItem(LAST_VAULT_KEY);
  } catch (e) {
    console.warn('Could not read last vault path', e);
    return null;
  }
}

/** Forget the remembered vault (e.g. if it can no longer be opened). */
export function clearLastVaultPath(): void {
  try {
    localStorage.removeItem(LAST_VAULT_KEY);
  } catch (e) {
    console.warn('Could not clear last vault path', e);
  }
}

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
 * Recursively read all .md files and folders from a directory.
 * Returns relative note paths + content, plus every folder's relative path
 * (including empty ones) so they can be shown in the sidebar.
 */
export async function readVaultFiles(
  vaultPath: string
): Promise<{ files: VaultFile[]; folders: string[] }> {
  if (!isTauri()) return { files: [], folders: [] };

  try {
    const { readDir, readTextFile } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');

    const files: VaultFile[] = [];
    const folders: string[] = [];

    async function walk(dir: string, base: string, relDir: string) {
      const entries = await readDir(dir);
      for (const entry of entries) {
        const fullPath = await join(dir, entry.name);
        if (entry.isDirectory) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const relSubDir = relDir ? `${relDir}/${entry.name}` : entry.name;
          folders.push(relSubDir);
          await walk(fullPath, base, relSubDir);
        } else if (entry.name.toLowerCase().endsWith('.md')) {
          try {
            const content = await readTextFile(fullPath);
            const normalized = toRelative(base, fullPath);
            files.push({ path: normalized, content });
          } catch (err) {
            console.warn('Could not read', fullPath, err);
          }
        }
      }
    }

    await walk(vaultPath, vaultPath, '');
    return { files, folders };
  } catch (e) {
    console.error('Failed to read vault files', e);
    return { files: [], folders: [] };
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

/**
 * Create a new, empty folder inside the vault (relative path, may be nested).
 * Safe to call on a folder that already exists.
 */
export async function createVaultFolder(
  vaultPath: string,
  relativePath: string
): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { mkdir } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');
    const full = await join(vaultPath, relativePath);
    await mkdir(full, { recursive: true });
    return true;
  } catch (e) {
    console.error('Failed to create folder', e);
    return false;
  }
}

/**
 * Create a new .md note file inside the vault. Creates any missing parent
 * folders. Fails (returns false) if the file already exists.
 */
export async function createVaultNoteFile(
  vaultPath: string,
  relativePath: string,
  content = ''
): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { mkdir, writeTextFile, exists } = await import('@tauri-apps/plugin-fs');
    const { join, dirname } = await import('@tauri-apps/api/path');

    const full = await join(vaultPath, relativePath);

    if (await exists(full)) {
      console.warn('File already exists', full);
      return false;
    }

    const parentDir = await dirname(full);
    await mkdir(parentDir, { recursive: true });
    await writeTextFile(full, content);
    return true;
  } catch (e) {
    console.error('Failed to create note file', e);
    return false;
  }
}

/**
 * Move/rename a file or folder inside the vault (relative paths).
 * Creates the destination's parent folder if needed. Fails if the
 * destination already exists.
 */
export async function moveVaultEntry(
  vaultPath: string,
  oldRelativePath: string,
  newRelativePath: string
): Promise<boolean> {
  if (!isTauri()) return false;
  if (oldRelativePath === newRelativePath) return true;

  try {
    const { rename, mkdir, exists } = await import('@tauri-apps/plugin-fs');
    const { join, dirname } = await import('@tauri-apps/api/path');

    const oldFull = await join(vaultPath, oldRelativePath);
    const newFull = await join(vaultPath, newRelativePath);

    if (await exists(newFull)) {
      console.warn('Move target already exists', newFull);
      return false;
    }

    const parentDir = await dirname(newFull);
    await mkdir(parentDir, { recursive: true });
    await rename(oldFull, newFull);
    return true;
  } catch (e) {
    console.error('Failed to move entry', e);
    return false;
  }
}

/**
 * Delete a file or (empty) folder inside the vault (relative path).
 */
export async function deleteVaultEntry(
  vaultPath: string,
  relativePath: string
): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { remove } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');
    const full = await join(vaultPath, relativePath);
    await remove(full);
    return true;
  } catch (e) {
    console.error('Failed to delete entry', e);
    return false;
  }
}

export { isTauri };

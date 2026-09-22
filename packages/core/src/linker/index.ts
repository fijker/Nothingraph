import { Note } from '@nothingraph/shared';

/**
 * Build backlinks for all notes.
 * Mutates the notes Map in place.
 */
export function buildBacklinks(notes: Map<string, Note>): void {
  // Reset backlinks
  for (const note of notes.values()) {
    note.backlinks = [];
  }

  for (const note of notes.values()) {
    for (const target of note.links) {
      // Try exact match first, then case-insensitive
      let targetNote = notes.get(target);
      if (!targetNote) {
        for (const [id, n] of notes) {
          if (id.toLowerCase() === target.toLowerCase() || n.title.toLowerCase() === target.toLowerCase()) {
            targetNote = n;
            break;
          }
        }
      }

      if (targetNote && !targetNote.backlinks.includes(note.id)) {
        targetNote.backlinks.push(note.id);
      }
    }
  }
}

import { Note, SearchResult } from '@nothingraph/shared';

export function searchNotes(
  notes: Map<string, Note>,
  query: string,
  limit = 50
): SearchResult[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  for (const note of notes.values()) {
    const titleMatch = note.title.toLowerCase().includes(q);
    const matches: { line: number; text: string }[] = [];

    const lines = note.content.split('\n');
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(q)) {
        matches.push({ line: index + 1, text: line.trim() });
      }
    });

    if (titleMatch || matches.length > 0) {
      let score = 0;
      if (titleMatch) score += 10;
      score += matches.length;

      results.push({
        noteId: note.id,
        title: note.title,
        matches: matches.slice(0, 5),
        score,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

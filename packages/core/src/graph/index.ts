import { Note, GraphData, GraphNode, GraphEdge } from '@nothingraph/shared';

export function buildGraph(notes: Map<string, Note>): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  for (const note of notes.values()) {
    nodes.push({
      id: note.id,
      title: note.title,
      tags: note.tags,
      linkCount: note.links.length + note.backlinks.length,
    });

    for (const target of note.links) {
      // Only create edge if target exists
      if (notes.has(target)) {
        const key = [note.id, target].sort().join('-->');
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source: note.id, target });
        }
      }
    }
  }

  return { nodes, edges };
}

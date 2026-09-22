export interface Note {
  id: string;           // relative path without .md
  path: string;         // full relative path including .md
  title: string;
  content: string;
  links: string[];      // outgoing [[links]]
  backlinks: string[];  // incoming links
  tags: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface Vault {
  path: string;
  name: string;
  notes: Map<string, Note>;
  /** Relative folder paths known to exist (includes empty ones with no notes yet) */
  folders: Set<string>;
}

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  linkCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchResult {
  noteId: string;
  title: string;
  matches: { line: number; text: string }[];
  score: number;
}

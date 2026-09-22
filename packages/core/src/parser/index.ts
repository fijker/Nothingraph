import { extractTitle, unique } from '@nothingraph/shared';

const WIKI_LINK_REGEX = /\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g;
const TAG_REGEX = /(?:^|\s)#([a-zA-Z0-9_/\-]+)/g;

export function parseWikiLinks(content: string): string[] {
  const links: string[] = [];
  let match: RegExpExecArray | null;

  const regex = new RegExp(WIKI_LINK_REGEX);
  while ((match = regex.exec(content)) !== null) {
    const target = match[1].trim();
    if (target) links.push(target);
  }

  return unique(links);
}

export function parseTags(content: string): string[] {
  const tags: string[] = [];
  let match: RegExpExecArray | null;

  const regex = new RegExp(TAG_REGEX);
  while ((match = regex.exec(content)) !== null) {
    tags.push(match[1]);
  }

  return unique(tags);
}

export function parseNote(
  path: string,
  content: string
): { title: string; links: string[]; tags: string[] } {
  const filename = path.replace(/\.md$/i, '').split('/').pop() || path;
  const title = extractTitle(content, filename);
  const links = parseWikiLinks(content);
  const tags = parseTags(content);

  return { title, links, tags };
}

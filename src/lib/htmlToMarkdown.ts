import TurndownService from 'turndown';

let turndownService: TurndownService | null = null;

function getTurndownService() {
  if (turndownService) return turndownService;

  turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  turndownService.addRule('strikethrough', {
    filter: (node) =>
      node.nodeName === 'DEL' || node.nodeName === 'S' || node.nodeName === 'STRIKE',
    replacement: (content) => `~~${content}~~`,
  });

  return turndownService;
}

export function htmlToMarkdown(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';

  return getTurndownService().turndown(trimmed).trim();
}

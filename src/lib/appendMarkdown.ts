import { contentToMarkdown } from './markdownContent';

export function appendMarkdown(existing: unknown, addition: string): string {
  const base = contentToMarkdown(existing).trim();
  const extra = addition.trim();
  if (!extra) return base;
  if (!base) return extra;
  return `${base}\n\n${extra}`;
}

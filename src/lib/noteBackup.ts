import type { PageNode, WorkspaceStore } from '../types';
import { contentToMarkdown } from './markdownContent';

const BACKUP_FORMAT = 'opennote.workspace.v1';

interface WorkspaceBackup {
  format: typeof BACKUP_FORMAT;
  exportedAt: number;
  workspace: WorkspaceStore;
}

export function serializeWorkspaceBackup(workspace: WorkspaceStore, exportedAt = Date.now()): string {
  const backup: WorkspaceBackup = {
    format: BACKUP_FORMAT,
    exportedAt,
    workspace,
  };

  return JSON.stringify(backup, null, 2);
}

export function parseWorkspaceBackup(json: string): WorkspaceStore {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('备份文件不是有效 JSON');
  }

  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    throw new Error('备份格式不受支持');
  }

  if (!isWorkspaceStore(parsed.workspace)) {
    throw new Error('备份文件缺少有效工作区数据');
  }

  return parsed.workspace;
}

export function serializeWorkspaceMarkdown(workspace: WorkspaceStore, exportedAt = Date.now()): string {
  const lines = ['# OpenNote Export', '', `Exported at: ${formatDate(exportedAt)}`, ''];

  for (const rootId of workspace.rootIds) {
    const root = workspace.pages[rootId];
    if (!root) continue;
    writePageMarkdown(lines, workspace, root, 2);
  }

  return `${lines.join('\n').trim()}\n`;
}

function writePageMarkdown(lines: string[], workspace: WorkspaceStore, page: PageNode, level: number) {
  const heading = '#'.repeat(Math.min(level, 6));
  lines.push(`${heading} ${page.title.trim() || 'Untitled'}`, '');
  lines.push(`- Created: ${formatDate(page.createdAt)}`);
  lines.push(`- Updated: ${formatDate(page.updatedAt)}`);

  if (page.tags?.length) {
    lines.push(`- Tags: ${page.tags.join(', ')}`);
  }

  if (page.source?.pageUrl) {
    const label = page.source.pageTitle?.trim() || page.source.pageUrl;
    lines.push(`- Source: [${escapeMarkdownLinkText(label)}](${page.source.pageUrl})`);
  }

  const content = contentToMarkdown(page.content).trim();
  if (content) {
    lines.push('', content);
  }
  lines.push('');

  for (const child of getSortedChildren(workspace, page.id)) {
    writePageMarkdown(lines, workspace, child, level + 1);
  }
}

function getSortedChildren(workspace: WorkspaceStore, parentId: string): PageNode[] {
  return Object.values(workspace.pages)
    .filter((page) => page.parentId === parentId)
    .sort((a, b) => a.sortIndex - b.sortIndex || a.title.localeCompare(b.title));
}

function isWorkspaceStore(value: unknown): value is WorkspaceStore {
  if (!isRecord(value) || !isRecord(value.pages) || !Array.isArray(value.rootIds)) return false;
  return (
    value.rootIds.every((id) => typeof id === 'string') &&
    Object.values(value.pages).every(isPageNode)
  );
}

function isPageNode(value: unknown): value is PageNode {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    (value.type === 'site' || value.type === 'page') &&
    typeof value.site === 'string' &&
    (typeof value.parentId === 'string' || value.parentId === null) &&
    typeof value.title === 'string' &&
    (typeof value.content === 'string' || isRecord(value.content)) &&
    typeof value.sortIndex === 'number' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function escapeMarkdownLinkText(text: string): string {
  return text.replace(/[[\]]/g, '\\$&');
}

export const serializeNotesBackup = serializeWorkspaceBackup;
export const parseNotesBackup = parseWorkspaceBackup;
export const serializeNotesMarkdown = serializeWorkspaceMarkdown;

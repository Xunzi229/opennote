import { contentToMarkdown } from './markdownContent';

export function getNoteStats(content: unknown) {
  const text = contentToMarkdown(content);
  const lines = text ? text.split('\n').length : 0;
  const chars = text.length;
  return { lines, chars };
}

export function getNoteExcerpt(content: unknown, maxLen = 80): string {
  const text = contentToMarkdown(content).replace(/\s+/g, ' ').trim();
  if (!text) return '暂无内容';
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

/** 将笔记 content 统一转为 Markdown 字符串（兼容旧 ProseMirror JSON） */
export function contentToMarkdown(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object' && (content as { type?: string }).type === 'doc') {
    return proseMirrorToMarkdown(content as ProseMirrorNode);
  }
  return '';
}

export function isContentEmpty(content: unknown): boolean {
  return contentToMarkdown(content).trim().length === 0;
}

export function contentPreview(content: unknown, maxLen = 10): string {
  return contentToMarkdown(content).replace(/\s/g, '').slice(0, maxLen);
}

interface ProseMirrorNode {
  type: string;
  text?: string;
  content?: ProseMirrorNode[];
  attrs?: Record<string, unknown>;
}

function proseMirrorToMarkdown(doc: ProseMirrorNode): string {
  if (!doc.content?.length) return '';
  return doc.content.map((node) => blockToMarkdown(node)).filter(Boolean).join('\n\n');
}

function blockToMarkdown(node: ProseMirrorNode): string {
  switch (node.type) {
    case 'paragraph':
      return inlineToMarkdown(node.content);
    case 'heading': {
      const level = (node.attrs?.level as number) || 1;
      return `${'#'.repeat(level)} ${inlineToMarkdown(node.content)}`;
    }
    case 'bulletList':
      return (node.content || [])
        .map((item) => listItemToMarkdown(item, '- '))
        .join('\n');
    case 'orderedList':
      return (node.content || [])
        .map((item, i) => listItemToMarkdown(item, `${i + 1}. `))
        .join('\n');
    case 'blockquote':
      return (node.content || [])
        .map((child) => `> ${blockToMarkdown(child)}`)
        .join('\n');
    case 'codeBlock':
      return `\`\`\`\n${inlineToMarkdown(node.content)}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    default:
      return inlineToMarkdown(node.content);
  }
}

function listItemToMarkdown(item: ProseMirrorNode, prefix: string): string {
  const text = (item.content || []).map(blockToMarkdown).join('\n');
  return `${prefix}${text}`;
}

function inlineToMarkdown(nodes?: ProseMirrorNode[]): string {
  if (!nodes?.length) return '';
  return nodes
    .map((node) => {
      if (node.type === 'text') {
        let text = node.text || '';
        const marks = (node as ProseMirrorNode & { marks?: { type: string }[] }).marks;
        if (marks?.some((m) => m.type === 'bold')) text = `**${text}**`;
        if (marks?.some((m) => m.type === 'italic')) text = `*${text}*`;
        if (marks?.some((m) => m.type === 'code')) text = '`' + text + '`';
        return text;
      }
      if (node.type === 'hardBreak') return '\n';
      return inlineToMarkdown(node.content);
    })
    .join('');
}

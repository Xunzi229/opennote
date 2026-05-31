function nodesToMarkdown(nodes: NodeListOf<ChildNode> | ChildNode[]): string {
  let result = '';

  for (const node of Array.from(nodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += (node.textContent ?? '').replace(/\s+/g, ' ');
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    const inner = nodesToMarkdown(element.childNodes);

    switch (tag) {
      case 'strong':
      case 'b':
        result += `**${inner}**`;
        break;
      case 'em':
      case 'i':
        result += `*${inner}*`;
        break;
      case 'del':
      case 's':
      case 'strike':
        result += `~~${inner}~~`;
        break;
      case 'code':
        result += `\`${inner}\``;
        break;
      case 'pre':
        result += `\n\`\`\`\n${element.textContent?.trim() ?? ''}\n\`\`\`\n\n`;
        break;
      case 'img': {
        const image = element as HTMLImageElement;
        const src = image.src || image.getAttribute('src') || '';
        const alt = image.alt || '';
        result += src ? `![${alt}](${src})` : '';
        break;
      }
      case 'a':
        result += `[${inner}](${(element as HTMLAnchorElement).href})`;
        break;
      case 'br':
        result += '\n';
        break;
      case 'p':
      case 'div':
        result += `${inner.trim()}\n\n`;
        break;
      case 'li':
        result += `- ${inner.trim()}\n`;
        break;
      case 'ul':
        result += `${listToMarkdown(element, false)}\n`;
        break;
      case 'ol':
        result += `${listToMarkdown(element, true)}\n`;
        break;
      case 'blockquote':
        result += `${inner
          .trim()
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')}\n\n`;
        break;
      case 'table':
      case 'thead':
      case 'tbody':
      case 'tfoot':
        result += `${tableToMarkdown(element)}\n\n`;
        break;
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        result += `${'#'.repeat(Number(tag[1]))} ${inner.trim()}\n\n`;
        break;
      default: {
        let formatted = inner;
        if (isVisuallyBold(element)) formatted = `**${formatted.trim()}**`;
        if (isVisuallyItalic(element)) formatted = `*${formatted.trim()}*`;
        result += formatted;
      }
    }
  }

  return result;
}

function isVisuallyBold(element: HTMLElement): boolean {
  const weight = element.style.fontWeight;
  return weight === 'bold' || Number(weight) >= 600;
}

function isVisuallyItalic(element: HTMLElement): boolean {
  return element.style.fontStyle === 'italic';
}

function listToMarkdown(element: HTMLElement, ordered: boolean): string {
  return Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((child, index) => {
      const prefix = ordered ? `${index + 1}.` : '-';
      return `${prefix} ${nodesToMarkdown(child.childNodes).trim()}`;
    })
    .join('\n');
}

function tableToMarkdown(element: HTMLElement): string {
  const rows = Array.from(element.querySelectorAll('tr'))
    .map((row) =>
      Array.from(row.children)
        .filter((cell) => ['td', 'th'].includes(cell.tagName.toLowerCase()))
        .map((cell) => normalizeTableCell(nodesToMarkdown(cell.childNodes))),
    )
    .filter((row) => row.length > 0);

  if (rows.length === 0) return '';

  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array.from({ length: columnCount - row.length }, () => ''),
  ]);
  const [header, ...body] = normalizedRows;
  const separator = Array.from({ length: columnCount }, () => '---');

  return [header, separator, ...body]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');
}

function normalizeTableCell(value: string): string {
  return value.replace(/\n+/g, ' ').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
}

function htmlToMarkdownInPage(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return nodesToMarkdown(template.content.childNodes).replace(/\n{3,}/g, '\n\n').trim();
}

export function capturePageSelection(): { text: string; html: string; markdown: string } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const text = selection.toString().trim();
  if (!text) return null;

  const range = selection.getRangeAt(0);
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());

  container.querySelectorAll('a[href]').forEach((element) => {
    const anchor = element as HTMLAnchorElement;
    anchor.setAttribute('href', anchor.href);
  });

  container.querySelectorAll('img[src]').forEach((element) => {
    const image = element as HTMLImageElement;
    image.setAttribute('src', image.src);
  });

  const html = container.innerHTML;
  const markdown = htmlToMarkdownInPage(html) || text;

  return { text, html, markdown };
}

function nodesToMarkdown(nodes: NodeListOf<ChildNode> | ChildNode[]): string {
  let result = '';

  for (const node of Array.from(nodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? '';
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
      case 'a':
        result += `[${inner}](${(element as HTMLAnchorElement).href})`;
        break;
      case 'br':
        result += '\n';
        break;
      case 'p':
      case 'div':
        result += `${inner}\n\n`;
        break;
      case 'li':
        result += `- ${inner.trim()}\n`;
        break;
      case 'ul':
      case 'ol':
        result += `${inner}\n`;
        break;
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        result += `${'#'.repeat(Number(tag[1]))} ${inner.trim()}\n\n`;
        break;
      default:
        result += inner;
    }
  }

  return result;
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

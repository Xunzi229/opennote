import { describe, expect, it } from 'vitest';
import { capturePageSelection } from './capturePageSelection';

describe('capturePageSelection', () => {
  it('preserves common rich selection formatting as markdown', () => {
    document.body.innerHTML = `
      <article>
        <h2>Title</h2>
        <p><span style="font-weight: 700">Bold</span> and <em>italic</em></p>
        <ol><li>first</li><li>second</li></ol>
        <p><a href="https://example.com/path">link</a></p>
      </article>
    `;
    selectElement(document.querySelector('article')!);

    const result = capturePageSelection();

    expect(result?.markdown).toContain('## Title');
    expect(result?.markdown).toContain('**Bold** and *italic*');
    expect(result?.markdown).toContain('1. first');
    expect(result?.markdown).toContain('2. second');
    expect(result?.markdown).toContain('[link](https://example.com/path)');
  });

  it('preserves selected tables as markdown tables', () => {
    document.body.innerHTML = `
      <table>
        <tr><th>Name</th><th>Value</th></tr>
        <tr><td>Alpha</td><td>1</td></tr>
      </table>
    `;
    selectElement(document.querySelector('table')!);

    const result = capturePageSelection();

    expect(result?.markdown).toContain('| Name | Value |');
    expect(result?.markdown).toContain('| --- | --- |');
    expect(result?.markdown).toContain('| Alpha | 1 |');
  });
});

function selectElement(element: Element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

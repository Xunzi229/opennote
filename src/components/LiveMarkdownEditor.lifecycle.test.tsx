import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const destroyedEditor = {
  isDestroyed: true,
  get commands() {
    throw new TypeError("Cannot read properties of null (reading 'commands')");
  },
};

vi.mock('@tiptap/react', () => ({
  useEditor: () => destroyedEditor,
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock('./TableDimensionHandle', () => ({
  default: () => null,
}));

describe('LiveMarkdownEditor lifecycle', () => {
  it('does not read commands from a destroyed editor instance', async () => {
    const { default: LiveMarkdownEditor } = await import('./LiveMarkdownEditor');

    expect(() => {
      render(<LiveMarkdownEditor content="Recovered note" noteId="restored-page" onUpdate={vi.fn()} />);
    }).not.toThrow();
  });
});

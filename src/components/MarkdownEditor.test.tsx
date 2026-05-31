import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MarkdownEditor from './MarkdownEditor';

vi.mock('./LiveMarkdownEditor', () => ({
  default: function MockLiveMarkdownEditor({ content }: { content: string }) {
    return <div data-testid="live-editor">{content}</div>;
  },
}));

vi.mock('./MarkdownToolbar', () => ({
  default: function MockMarkdownToolbar() {
    return <div data-testid="markdown-toolbar" />;
  },
}));

describe('MarkdownEditor external content sync', () => {
  it('updates the live editor when the selected page content changes externally', () => {
    const { rerender } = render(
      <MarkdownEditor content="before" noteId="page-1" onUpdate={vi.fn()} />,
    );

    expect(screen.getByTestId('live-editor')).toHaveTextContent('before');

    rerender(<MarkdownEditor content="after" noteId="page-1" onUpdate={vi.fn()} />);

    expect(screen.getByTestId('live-editor')).toHaveTextContent('after');
  });
});

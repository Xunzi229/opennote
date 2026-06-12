import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LiveMarkdownEditor from './LiveMarkdownEditor';

describe('LiveMarkdownEditor links', () => {
  it('turns a plain URL in the markdown body into a link that opens on click', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <LiveMarkdownEditor
        content="Read https://example.com/docs"
        noteId="page-1"
        onUpdate={vi.fn()}
      />,
    );

    const link = await screen.findByRole('link', { name: 'https://example.com/docs' });

    expect(link).toHaveAttribute('href', 'https://example.com/docs');

    fireEvent.click(link, { button: 0 });

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith('https://example.com/docs', '_blank');
    });
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LiveMarkdownEditor from './LiveMarkdownEditor';

describe('LiveMarkdownEditor links', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not auto-link plain email addresses after formatting is cleared', async () => {
    render(
      <LiveMarkdownEditor
        content="Contact yap-45-grungy+sss5@icloud.com"
        noteId="page-email"
        onUpdate={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'yap-45-grungy+sss5@icloud.com' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('Contact yap-45-grungy+sss5@icloud.com')).toBeInTheDocument();
  });

  it('renders auto-generated mailto markdown for an email as plain text', async () => {
    render(
      <LiveMarkdownEditor
        content="Contact [yap-45-grungy+sss5@icloud.com](mailto:yap-45-grungy+sss5@icloud.com)"
        noteId="page-mailto"
        onUpdate={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'yap-45-grungy+sss5@icloud.com' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('Contact yap-45-grungy+sss5@icloud.com')).toBeInTheDocument();
  });

  it('keeps intentional mailto links with custom text', async () => {
    render(
      <LiveMarkdownEditor
        content="Contact [Email me](mailto:yap-45-grungy+sss5@icloud.com)"
        noteId="page-intentional-mailto"
        onUpdate={vi.fn()}
      />,
    );

    const link = await screen.findByRole('link', { name: 'Email me' });

    expect(link).toHaveAttribute('href', 'mailto:yap-45-grungy+sss5@icloud.com');
  });

  it('turns a plain URL into a link that opens only on double click', async () => {
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

    expect(openSpy).not.toHaveBeenCalled();

    fireEvent.doubleClick(link, { button: 0 });

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith('https://example.com/docs', '_blank');
    });
  });

  it('opens a link on Ctrl-click', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <LiveMarkdownEditor
        content="Read https://example.com/docs"
        noteId="page-ctrl-click"
        onUpdate={vi.fn()}
      />,
    );

    const link = await screen.findByRole('link', { name: 'https://example.com/docs' });

    fireEvent.click(link, { button: 0, ctrlKey: true });

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith('https://example.com/docs', '_blank');
    });
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MarkdownToolbar from './MarkdownToolbar';

describe('MarkdownToolbar', () => {
  it('emits clearFormat when the clear formatting button is clicked', () => {
    const onInsert = vi.fn();

    render(<MarkdownToolbar onInsert={onInsert} onInsertTable={vi.fn()} />);

    fireEvent.click(screen.getByTitle('清除格式'));

    expect(onInsert).toHaveBeenCalledWith('clearFormat');
  });
});

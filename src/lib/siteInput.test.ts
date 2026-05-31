import { describe, expect, it } from 'vitest';
import { normalizeSiteInput } from './siteInput';

describe('normalizeSiteInput', () => {
  it('keeps a bare hostname', () => {
    expect(normalizeSiteInput('example.com')).toBe('example.com');
  });

  it('extracts hostname from a full URL', () => {
    expect(normalizeSiteInput('https://www.example.com/path?q=1')).toBe('www.example.com');
  });

  it('adds a scheme when the input looks like a hostname with a path', () => {
    expect(normalizeSiteInput('docs.example.com/guide/intro')).toBe('docs.example.com');
  });

  it('rejects blank or special page input', () => {
    expect(normalizeSiteInput('   ')).toBeNull();
    expect(normalizeSiteInput('chrome://extensions')).toBeNull();
  });
});

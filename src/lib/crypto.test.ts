import { beforeEach, describe, expect, it } from 'vitest';
import { __resetCryptoForTests, decryptText, encryptText } from './crypto';

describe('crypto', () => {
  beforeEach(() => {
    __resetCryptoForTests();
  });

  it('encrypts to a prefixed, non-plaintext string', async () => {
    const cipher = await encryptText('s3cret-password');
    expect(cipher.startsWith('enc:v1:')).toBe(true);
    expect(cipher).not.toContain('s3cret-password');
  });

  it('round-trips encrypt -> decrypt', async () => {
    const cipher = await encryptText('hello 世界');
    await expect(decryptText(cipher)).resolves.toBe('hello 世界');
  });

  it('returns empty string for empty input', async () => {
    await expect(encryptText('')).resolves.toBe('');
    await expect(decryptText('')).resolves.toBe('');
  });

  it('passes through values without the encryption prefix', async () => {
    await expect(decryptText('plaintext-legacy')).resolves.toBe('plaintext-legacy');
  });
});

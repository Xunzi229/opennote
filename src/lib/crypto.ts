// AES-GCM encryption for sensitive sync config (the WebDAV password). The key
// lives in chrome.storage.local on this machine — this is local obfuscation,
// not zero-knowledge encryption. Ported from the opentab project.

const STORAGE_KEY_NAME = 'opennote-webdav-key';
const ENCRYPTION_PREFIX = 'enc:v1:';

let cachedKey: CryptoKey | null = null;

function getLocalArea(): typeof chrome.storage.local | undefined {
  if (typeof chrome === 'undefined') return undefined;
  return chrome.storage?.local;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const area = getLocalArea();
  const stored = area ? await area.get(STORAGE_KEY_NAME) : {};
  const existingKey = stored[STORAGE_KEY_NAME] as JsonWebKey | undefined;

  if (existingKey) {
    cachedKey = await crypto.subtle.importKey('jwk', existingKey, { name: 'AES-GCM' }, true, [
      'encrypt',
      'decrypt',
    ]);
    return cachedKey;
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const exported = await crypto.subtle.exportKey('jwk', key);
  await area?.set({ [STORAGE_KEY_NAME]: exported });
  cachedKey = key;
  return cachedKey;
}

export async function encryptText(plainText: string): Promise<string> {
  if (!plainText) return '';

  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const cipherBytes = new Uint8Array(cipher);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, iv.length);

  let binary = '';
  for (const byte of combined) {
    binary += String.fromCharCode(byte);
  }

  return `${ENCRYPTION_PREFIX}${btoa(binary)}`;
}

export async function decryptText(encryptedText: string): Promise<string> {
  if (!encryptedText) return '';
  // Tolerate plaintext (e.g. values written before encryption was added).
  if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) return encryptedText;

  const key = await getEncryptionKey();
  const raw = atob(encryptedText.slice(ENCRYPTION_PREFIX.length));
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plainBuffer);
}

// Test-only: drop the cached key so each test starts fresh.
export function __resetCryptoForTests(): void {
  cachedKey = null;
}

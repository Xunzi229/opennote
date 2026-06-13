import type { PageNode } from '../types';

const DB_NAME = 'opennote';
const DB_VERSION = 1;
const PAGES_STORE = 'pages';
const KV_STORE = 'kv';

export interface IdbWriteOps {
  putPages?: PageNode[];
  deletePageIds?: string[];
  kv?: Record<string, unknown>;
  // When true, both stores are cleared at the start of the same transaction,
  // giving an atomic full replace (used by setWorkspace / import).
  clearAll?: boolean;
}

let dbPromise: Promise<IDBDatabase> | null = null;

// In-memory fallback for environments without IndexedDB (e.g. some test/SW edge cases).
const memoryPages = new Map<string, PageNode>();
const memoryKv = new Map<string, unknown>();

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PAGES_STORE)) {
        db.createObjectStore(PAGES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // The service worker can be killed and the connection closed; reset so the
      // next call reopens a fresh connection.
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });

  // If opening fails, clear the cached promise so a later call can retry.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGetAllPages(): Promise<PageNode[]> {
  if (!hasIndexedDB()) {
    return [...memoryPages.values()];
  }

  const db = await openDB();
  const tx = db.transaction(PAGES_STORE, 'readonly');
  const pages = await promisifyRequest(tx.objectStore(PAGES_STORE).getAll() as IDBRequest<PageNode[]>);
  return pages ?? [];
}

export async function idbGetKv<T>(key: string): Promise<T | undefined> {
  if (!hasIndexedDB()) {
    return memoryKv.has(key) ? (memoryKv.get(key) as T) : undefined;
  }

  const db = await openDB();
  const tx = db.transaction(KV_STORE, 'readonly');
  const record = await promisifyRequest(
    tx.objectStore(KV_STORE).get(key) as IDBRequest<{ key: string; value: T } | undefined>,
  );
  return record ? record.value : undefined;
}

export async function idbWrite(ops: IdbWriteOps): Promise<void> {
  const { putPages, deletePageIds, kv, clearAll } = ops;

  if (!hasIndexedDB()) {
    if (clearAll) {
      memoryPages.clear();
      memoryKv.clear();
    }
    for (const page of putPages ?? []) memoryPages.set(page.id, page);
    for (const id of deletePageIds ?? []) memoryPages.delete(id);
    if (kv) {
      for (const [key, value] of Object.entries(kv)) memoryKv.set(key, value);
    }
    return;
  }

  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([PAGES_STORE, KV_STORE], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    const pagesStore = tx.objectStore(PAGES_STORE);
    const kvStore = tx.objectStore(KV_STORE);

    if (clearAll) {
      pagesStore.clear();
      kvStore.clear();
    }
    for (const page of putPages ?? []) pagesStore.put(page);
    for (const id of deletePageIds ?? []) pagesStore.delete(id);
    if (kv) {
      for (const [key, value] of Object.entries(kv)) kvStore.put({ key, value });
    }
  });
}

export async function idbClear(): Promise<void> {
  if (!hasIndexedDB()) {
    memoryPages.clear();
    memoryKv.clear();
    return;
  }

  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([PAGES_STORE, KV_STORE], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    tx.objectStore(PAGES_STORE).clear();
    tx.objectStore(KV_STORE).clear();
  });
}

// Test-only: drop the cached connection and in-memory fallback so each test
// starts from a clean database. Pair with a fresh fake-indexeddb factory.
export function __resetIdbForTests(): void {
  dbPromise = null;
  memoryPages.clear();
  memoryKv.clear();
}

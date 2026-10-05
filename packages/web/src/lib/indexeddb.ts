import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

/**
 * Initializes local-first IndexedDB storage for offline editing.
 * Mutations are saved locally in the browser immediately, surviving restarts and network drops.
 */
export function setupIndexedDB(docId: string, ydoc: Y.Doc): IndexeddbPersistence | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const persistence = new IndexeddbPersistence(`collab_doc_${docId}`, ydoc);

  persistence.on('synced', () => {
    console.log(`[IndexedDB] Local-first state loaded and synchronized for doc: ${docId}`);
  });

  return persistence;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChatMessage {
  id?: number;
  threadId: string;
  role: 'user' | 'himo';
  text: string;
  timestamp: number;
}

export interface ChatThread {
  id: string;
  title: string;
  lastUpdated: number;
}

const DB_NAME = 'HimoChatDB';
const MESSAGES_STORE = 'messages';
const THREADS_STORE = 'threads';
const DB_VERSION = 3;

export class ChatDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        
        let msgStore;
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          msgStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id', autoIncrement: true });
        } else {
          msgStore = transaction!.objectStore(MESSAGES_STORE);
        }
        
        if (!msgStore.indexNames.contains('threadId')) {
          msgStore.createIndex('threadId', 'threadId', { unique: false });
        }

        if (!db.objectStoreNames.contains(THREADS_STORE)) {
          db.createObjectStore(THREADS_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  async addMessage(message: Omit<ChatMessage, 'id'>): Promise<number> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE, THREADS_STORE], 'readwrite');
      const msgStore = transaction.objectStore(MESSAGES_STORE);
      const threadStore = transaction.objectStore(THREADS_STORE);
      
      const msgRequest = msgStore.add(message);
      
      // Update thread last updated
      threadStore.put({
        id: message.threadId,
        title: message.role === 'user' ? message.text.slice(0, 30) : 'New Chat',
        lastUpdated: message.timestamp
      });

      msgRequest.onsuccess = () => resolve(msgRequest.result as number);
      msgRequest.onerror = () => reject(msgRequest.error);
    });
  }

  async getMessagesByThread(threadId: string): Promise<ChatMessage[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('threadId');
      const request = index.getAll(threadId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getThreads(): Promise<ChatThread[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THREADS_STORE], 'readonly');
      const store = transaction.objectStore(THREADS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const threads = request.result as ChatThread[];
        resolve(threads.sort((a, b) => b.lastUpdated - a.lastUpdated));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearHistory(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE, THREADS_STORE], 'readwrite');
      transaction.objectStore(MESSAGES_STORE).clear();
      transaction.objectStore(THREADS_STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const chatDb = new ChatDatabase();

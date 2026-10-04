/**
 * Persistent Audio Storage using IndexedDB with localStorage fallback
 * Stores base64 WAV audio for lessons and sentences so that generated AI expressive voices
 * are preserved and instantly ready for subsequent learning sessions without re-generating.
 */

const DB_NAME = 'esp_lesson_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'audios';

class AudioStorageManager {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryCache: Map<string, string> = new Map();

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (e) => {
          console.warn('[AudioStorage] IndexedDB open error, using localStorage fallback', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('[AudioStorage] IndexedDB initialization failed', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private getKey(lessonId: string, sentenceId: number): string {
    return `${lessonId}_sentence_${sentenceId}`;
  }

  /**
   * Save a single sentence audio URL (data URI)
   */
  public async saveSentenceAudio(lessonId: string, sentenceId: number, audioUrl: string): Promise<void> {
    const key = this.getKey(lessonId, sentenceId);
    this.memoryCache.set(key, audioUrl);

    try {
      const db = await this.initDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(audioUrl, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        return;
      }
    } catch (err) {
      console.warn('[AudioStorage] Failed to save to IndexedDB', err);
    }

    // Fallback to localStorage if small enough
    try {
      if (audioUrl.length < 500000) {
        localStorage.setItem(`esp_audio_${key}`, audioUrl);
      }
    } catch {
      // Ignore quota errors on fallback
    }
  }

  /**
   * Save multiple sentence audios for a lesson in one go
   */
  public async saveLessonAudios(lessonId: string, audioMap: Record<number, string>): Promise<void> {
    const entries = Object.entries(audioMap);
    for (const [sId, url] of entries) {
      await this.saveSentenceAudio(lessonId, Number(sId), url);
    }
  }

  /**
   * Get audio for a specific sentence
   */
  public async getSentenceAudio(lessonId: string, sentenceId: number): Promise<string | null> {
    const key = this.getKey(lessonId, sentenceId);

    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) || null;
    }

    try {
      const db = await this.initDB();
      if (db) {
        const audio = await new Promise<string | null>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

        if (audio) {
          this.memoryCache.set(key, audio);
          return audio;
        }
      }
    } catch (err) {
      console.warn('[AudioStorage] Failed to read from IndexedDB', err);
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(`esp_audio_${key}`);
      if (stored) {
        this.memoryCache.set(key, stored);
        return stored;
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Get all audios for a lesson
   */
  public async getLessonAudios(lessonId: string, sentenceIds: number[]): Promise<Record<number, string>> {
    const result: Record<number, string> = {};
    for (const id of sentenceIds) {
      const audio = await this.getSentenceAudio(lessonId, id);
      if (audio) {
        result[id] = audio;
      }
    }
    return result;
  }

  /**
   * Delete all audios for a deleted lesson
   */
  public async deleteLessonAudios(lessonId: string, sentenceIds: number[]): Promise<void> {
    for (const id of sentenceIds) {
      const key = this.getKey(lessonId, id);
      this.memoryCache.delete(key);
      try {
        const db = await this.initDB();
        if (db) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(key);
        }
        localStorage.removeItem(`esp_audio_${key}`);
      } catch {
        // Ignore
      }
    }
  }
}

export const audioStorage = new AudioStorageManager();

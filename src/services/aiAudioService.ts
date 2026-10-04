import { AiVoiceOption, SentenceItem, WordToken, Lesson, WordTimeSlot, AudioPlaybackState } from '../types';

export const AI_VOICE_OPTIONS: AiVoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    description: 'Giọng Nữ trong trẻo, tự nhiên, phát âm chuẩn Mỹ (Khuyên dùng THCS)',
    tag: 'Tự nhiên & Chuẩn Mỹ',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male',
    description: 'Giọng Nam giàu biểu cảm, vui tươi, sinh động',
    tag: 'Biểu cảm & Vui tươi',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Female',
    description: 'Giọng Nữ dịu dàng, thanh thoát, truyền cảm',
    tag: 'Dịu dàng & Thanh thoát',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    description: 'Giọng Nam trầm ấm, rõ ràng, dứt khoát',
    tag: 'Trầm ấm & Rõ ràng',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    description: 'Giọng Nam điềm đạm, chuẩn mực học thuật',
    tag: 'Chuẩn mực học thuật',
  },
];

const UNSTRESSED_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from', 'by',
  'and', 'but', 'or', 'so', 'as', 'if', 'than',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did',
  'have', 'has', 'had',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  'that', 'this', 'these', 'those'
]);

function estimateSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 1;
  if (clean.length <= 3) return 1;

  const matches = clean.match(/[aeiouy]{1,2}/g);
  let count = matches ? matches.length : 1;

  if (clean.endsWith('e') && !clean.endsWith('le') && count > 1) {
    count--;
  }
  if (clean.endsWith('ed') && count > 1 && !clean.endsWith('ted') && !clean.endsWith('ded')) {
    count--;
  }
  return Math.max(1, count);
}

export interface AcousticAnalysisResult {
  leadMs: number;
  soundEndMs: number;
  durationMs: number;
  sampleRate: number;
  energyValleys: number[]; // timestamps (ms) of acoustic energy dips between syllables/words
}

/**
 * Parses WAV header and audio samples in browser to accurately detect:
 * 1. leadMs: the exact onset millisecond when human speech begins (ignoring lead silence)
 * 2. soundEndMs: the exact offset millisecond when human speech ends (ignoring trailing padding)
 * 3. durationMs: true audio duration
 * 4. energyValleys: local acoustic energy dips for snapping word boundaries
 */
const wavTimingCache = new Map<string, AcousticAnalysisResult | null>();

export function parseWavTimingInBrowser(dataUrl: string): AcousticAnalysisResult | null {
  if (!dataUrl) return null;
  const cacheKey = dataUrl.length > 200 ? dataUrl.slice(0, 100) + '_' + dataUrl.length : dataUrl;
  if (wavTimingCache.has(cacheKey)) {
    return wavTimingCache.get(cacheKey) || null;
  }

  try {
    const b64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
    if (!b64 || typeof window === 'undefined' || !window.atob) return null;

    const binary = window.atob(b64);
    const len = binary.length;
    if (len < 44) return null;

    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const view = new DataView(bytes.buffer);

    // Verify RIFF and WAVE header
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riff !== 'RIFF' || wave !== 'WAVE') return null;

    // Scan chunks to locate 'fmt ' and 'data' chunks dynamically
    let pos = 12;
    let dataOffset = 44;
    let dataSize = len - 44;
    let sampleRate = 24000;
    let channels = 1;
    let bitsPerSample = 16;

    while (pos + 8 <= len) {
      const chunkId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
      const chunkSize = view.getUint32(pos + 4, true);
      if (chunkId === 'fmt ') {
        channels = view.getUint16(pos + 10, true) || 1;
        sampleRate = view.getUint32(pos + 12, true) || 24000;
        bitsPerSample = view.getUint16(pos + 22, true) || 16;
      } else if (chunkId === 'data') {
        dataOffset = pos + 8;
        dataSize = Math.min(chunkSize, len - dataOffset);
        break;
      }
      pos += 8 + chunkSize;
    }

    const bytesPerSample = Math.max(1, (bitsPerSample / 8) * channels);
    const totalSamples = Math.floor(dataSize / bytesPerSample);
    const durationMs = Math.round((totalSamples / sampleRate) * 1000);
    if (totalSamples <= 0) return null;

    // Compute RMS energy curve in 15ms windows with 10ms hop
    const hopSamples = Math.max(1, Math.round(sampleRate * 0.01)); // 10ms
    const winSamples = Math.max(hopSamples, Math.round(sampleRate * 0.015)); // 15ms
    const numFrames = Math.floor((totalSamples - winSamples) / hopSamples);

    const frameEnergies: { ms: number; energy: number }[] = [];
    let noiseSum = 0;
    let noiseFrames = 0;

    for (let f = 0; f < numFrames; f++) {
      const startSample = f * hopSamples;
      const ms = Math.round((startSample / sampleRate) * 1000);
      let sumSq = 0;
      let count = 0;

      for (let s = 0; s < winSamples; s++) {
        const sampleIdx = startSample + s;
        const offset = dataOffset + sampleIdx * bytesPerSample;
        if (offset + 2 > len) break;
        const val = view.getInt16(offset, true);
        sumSq += val * val;
        count++;
      }

      const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
      frameEnergies.push({ ms, energy: rms });

      // Track ambient baseline from early frames
      if (f < 15) {
        noiseSum += rms;
        noiseFrames++;
      }
    }

    const noiseFloor = noiseFrames > 0 ? noiseSum / noiseFrames : 80;
    const speechThreshold = Math.max(300, noiseFloor * 2.5);

    // 1. Detect lead speech onset
    let leadMs = 60;
    for (let i = 0; i < frameEnergies.length; i++) {
      if (frameEnergies[i].energy > speechThreshold) {
        leadMs = Math.max(40, frameEnergies[i].ms - 40);
        break;
      }
    }

    // 2. Detect trail speech offset
    let soundEndMs = durationMs - 50;
    for (let i = frameEnergies.length - 1; i >= 0; i--) {
      if (frameEnergies[i].energy > speechThreshold) {
        soundEndMs = Math.min(durationMs, frameEnergies[i].ms + 60);
        break;
      }
    }

    // 3. Find local energy minima (acoustic valleys) between speech onset and offset
    const energyValleys: number[] = [];
    const minValleyDistanceMs = 80;
    let lastValleyMs = -999;

    for (let i = 2; i < frameEnergies.length - 2; i++) {
      const cur = frameEnergies[i];
      if (cur.ms < leadMs + 60 || cur.ms > soundEndMs - 60) continue;

      const prev = frameEnergies[i - 1].energy;
      const next = frameEnergies[i + 1].energy;

      // Local minimum
      if (cur.energy < prev && cur.energy < next && cur.energy < speechThreshold * 1.5) {
        if (cur.ms - lastValleyMs >= minValleyDistanceMs) {
          energyValleys.push(cur.ms);
          lastValleyMs = cur.ms;
        }
      }
    }

    const result: AcousticAnalysisResult = {
      leadMs,
      soundEndMs: Math.max(leadMs + 250, soundEndMs),
      durationMs,
      sampleRate,
      energyValleys,
    };
    wavTimingCache.set(cacheKey, result);
    return result;
  } catch {
    wavTimingCache.set(cacheKey, null);
    return null;
  }
}

const DB_NAME = 'esp_expressive_audio_v1';
const STORE_NAME = 'audios';

class AiAudioService {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memCache: Map<string, string> = new Map();

  // Playback engine
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentRate: number = 1.0;
  private wordTimeline: WordTimeSlot[] = [];
  private activeWordIndex: number | null = null;
  private animFrameId: number | null = null;
  private boundTimeUpdateHandler: (() => void) | null = null;
  private lastTimeUpdateTimestamp: number = 0;
  private onWordChangeCb: ((idx: number | null) => void) | null = null;
  private onTimeUpdateCb: ((state: AudioPlaybackState) => void) | null = null;
  private onEndCb: (() => void) | null = null;
  private onErrorCb: ((err: any) => void) | null = null;

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase | null> {
    if (this.db) return Promise.resolve(this.db);
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = (e: any) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private getStorageKey(lessonId: string, sentenceId: number, voiceName: string = 'Kore'): string {
    const v = (voiceName || 'kore').trim().toLowerCase();
    return `${lessonId}_s${sentenceId}_v_${v}`;
  }

  /**
   * Check if AI audio is already stored for a sentence with a specific voice
   */
  public async hasAudio(lessonId: string, sentenceId: number, voiceName: string = 'Kore'): Promise<boolean> {
    const key = this.getStorageKey(lessonId, sentenceId, voiceName);
    if (this.memCache.has(key)) return true;

    // Check legacy key if voice is default 'kore'
    const legacyKey = `${lessonId}_s${sentenceId}`;
    if (voiceName.toLowerCase() === 'kore' && this.memCache.has(legacyKey)) return true;

    const db = await this.initDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result) {
            resolve(true);
          } else if (voiceName.toLowerCase() === 'kore') {
            const legReq = store.get(legacyKey);
            legReq.onsuccess = () => resolve(Boolean(legReq.result));
            legReq.onerror = () => resolve(false);
          } else {
            resolve(false);
          }
        };
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Retrieve audio data URL for sentence with a specific voice
   */
  public async getAudioDataUrl(
    lessonId: string,
    sentenceId: number,
    voiceName: string = 'Kore'
  ): Promise<string | null> {
    const key = this.getStorageKey(lessonId, sentenceId, voiceName);
    if (this.memCache.has(key)) {
      return this.memCache.get(key) || null;
    }

    const legacyKey = `${lessonId}_s${sentenceId}`;
    if (voiceName.toLowerCase() === 'kore' && this.memCache.has(legacyKey)) {
      return this.memCache.get(legacyKey) || null;
    }

    const db = await this.initDb();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && typeof req.result === 'string') {
            this.memCache.set(key, req.result);
            resolve(req.result);
          } else if (voiceName.toLowerCase() === 'kore') {
            const legReq = store.get(legacyKey);
            legReq.onsuccess = () => {
              if (legReq.result && typeof legReq.result === 'string') {
                this.memCache.set(key, legReq.result);
                resolve(legReq.result);
              } else {
                resolve(null);
              }
            };
            legReq.onerror = () => resolve(null);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Save generated audio to persistent storage for this voice
   */
  public async saveAudio(
    lessonId: string,
    sentenceId: number,
    voiceName: string,
    base64Data: string,
    mimeType: string = 'audio/wav'
  ): Promise<string> {
    const key = this.getStorageKey(lessonId, sentenceId, voiceName);
    const dataUrl = base64Data.startsWith('data:')
      ? base64Data
      : `data:${mimeType};base64,${base64Data}`;

    this.memCache.set(key, dataUrl);

    const db = await this.initDb();
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(dataUrl, key);
      } catch (e) {
        console.warn('Failed to save audio to indexedDB:', e);
      }
    }

    return dataUrl;
  }

  /**
   * Delete audio from storage for this voice
   */
  public async removeAudio(lessonId: string, sentenceId: number, voiceName: string = 'Kore'): Promise<void> {
    const key = this.getStorageKey(lessonId, sentenceId, voiceName);
    this.memCache.delete(key);

    const db = await this.initDb();
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Request expressive AI voice generation from server
   */
  public async generateSpeechApi(
    text: string,
    voiceName: string = 'Kore'
  ): Promise<{ audioBase64: string; mimeType: string; voiceName: string }> {
    const res = await fetch('/api/ai/generate-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceName,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const err: any = new Error(data.message || data.error || 'Lỗi khi tạo giọng AI biểu cảm');
      if (res.status === 429 || data.rateLimited || data.error === 'QUOTA_EXCEEDED') {
        err.isRateLimited = true;
        err.retryAfter = data.retryAfter || 30;
      }
      throw err;
    }

    return {
      audioBase64: data.audioBase64,
      mimeType: data.mimeType || 'audio/wav',
      voiceName: data.voiceName || voiceName,
    };
  }

  /**
   * Generate and store AI audio for a single sentence
   */
  public async generateAndSaveSentenceAudio(
    lessonId: string,
    sentence: SentenceItem,
    voiceName: string = 'Kore',
    forceRefresh: boolean = false
  ): Promise<string> {
    if (!forceRefresh) {
      const existing = await this.getAudioDataUrl(lessonId, sentence.id, voiceName);
      if (existing) return existing;
      if (
        sentence.audioBase64 &&
        (!sentence.audioVoice || sentence.audioVoice.toLowerCase() === voiceName.toLowerCase())
      ) {
        return this.saveAudio(
          lessonId,
          sentence.id,
          voiceName,
          sentence.audioBase64,
          sentence.audioMimeType || 'audio/wav'
        );
      }
    }

    const speechResult = await this.generateSpeechApi(sentence.english, voiceName);
    const dataUrl = await this.saveAudio(
      lessonId,
      sentence.id,
      voiceName,
      speechResult.audioBase64,
      speechResult.mimeType
    );

    // Save metadata back to sentence item
    sentence.audioBase64 = speechResult.audioBase64;
    sentence.audioMimeType = speechResult.mimeType;
    sentence.audioVoice = voiceName;

    return dataUrl;
  }

  /**
   * Batch generate AI voice for all sentences in a lesson with smart pacing and rate-limit safety
   */
  public async batchGenerateLessonAudio(
    lesson: Lesson,
    voiceName: string = 'Kore',
    onProgress?: (current: number, total: number, sentenceText: string) => void
  ): Promise<{ successCount: number; total: number; rateLimited: boolean }> {
    let successCount = 0;
    const total = lesson.sentences.length;
    let rateLimited = false;

    for (let i = 0; i < total; i++) {
      const sent = lesson.sentences[i];
      if (onProgress) {
        onProgress(i + 1, total, sent.english);
      }

      // Check if already has cached audio for this specific voice
      const existing = await this.getAudioDataUrl(lesson.id, sent.id, voiceName);
      if (existing || (sent.audioBase64 && sent.audioVoice?.toLowerCase() === voiceName.toLowerCase())) {
        successCount++;
        continue;
      }

      try {
        await this.generateAndSaveSentenceAudio(lesson.id, sent, voiceName, false);
        successCount++;
        // Pacing delay (1.2s) between API calls to avoid bursting requests
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err: any) {
        console.warn(`[Batch TTS] Notice for sentence ${sent.id}:`, err?.message);
        if (err?.isRateLimited) {
          rateLimited = true;
          // Gracefully stop batch loop to avoid redundant 429 errors
          break;
        }
      }
    }

    return { successCount, total, rateLimited };
  }

  /**
   * Build accurate phonetic word timeline scaled to actual speech boundaries:
   * Maps words between exact detected speech onset (leadMs) and speech offset (soundEndMs),
   * and snaps inter-word boundaries to detected acoustic energy valleys.
   */
  private buildWordTimeline(
    sentenceText: string,
    words: WordToken[],
    durationSeconds: number,
    detectedTiming?: AcousticAnalysisResult | null
  ): WordTimeSlot[] {
    if (!words || words.length === 0) return [];

    const totalAudioMs = detectedTiming?.durationMs || Math.max(800, durationSeconds * 1000);
    const leadMs = detectedTiming?.leadMs ?? Math.min(220, Math.round(totalAudioMs * 0.08));
    const soundEndMs = detectedTiming?.soundEndMs ?? Math.max(leadMs + 300, totalAudioMs - 70);
    const usableMs = Math.max(300, soundEndMs - leadMs);

    // Calculate relative phonetic weights for natural pacing
    const weights: number[] = words.map((token, index) => {
      const cleanWord = token.text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const syllables = estimateSyllables(cleanWord);
      const isUnstressed = UNSTRESSED_WORDS.has(cleanWord);

      let weight = syllables * 1.0;
      weight += Math.max(0, cleanWord.length - 2) * 0.07;

      if (isUnstressed) {
        weight *= 0.68; // Function words are spoken faster
      } else if (cleanWord.length >= 7 || syllables >= 3) {
        weight *= 1.28; // Multisyllabic content words take more time
      }

      // Trailing punctuation pause
      const punct = token.punctuation || '';
      if (/[,;:\-]/.test(punct)) {
        weight += 0.42;
      } else if (/[.!?]/.test(punct)) {
        weight += 0.68;
      }

      // Sentence-final lengthening
      if (index === words.length - 1) {
        weight *= 1.25;
      }

      return Math.max(0.35, weight);
    });

    const sumWeights = weights.reduce((a, b) => a + b, 0);

    // Initial estimate of word boundaries
    const rawSlots: { index: number; word: string; startMs: number; endMs: number }[] = [];
    let curStart = leadMs;

    words.forEach((token, index) => {
      const fraction = weights[index] / sumWeights;
      const dur = Math.round(usableMs * fraction);
      const rawEnd = curStart + dur;
      rawSlots.push({
        index,
        word: token.text,
        startMs: curStart,
        endMs: rawEnd,
      });
      curStart = rawEnd;
    });

    // Snap inter-word boundaries to nearest acoustic energy valleys if available
    const valleys = detectedTiming?.energyValleys || [];
    if (valleys.length > 0 && rawSlots.length > 1) {
      for (let i = 0; i < rawSlots.length - 1; i++) {
        const targetBoundary = rawSlots[i].endMs;
        // Search for closest valley within +/- 95ms
        let bestValley = -1;
        let bestDist = 95;

        for (const v of valleys) {
          const dist = Math.abs(v - targetBoundary);
          if (dist < bestDist) {
            bestDist = dist;
            bestValley = v;
          }
        }

        if (bestValley > 0) {
          // Adjust boundary between word i and word i + 1, ensuring minimum word duration of 110ms
          const minDuration = 110;
          if (
            bestValley - rawSlots[i].startMs >= minDuration &&
            rawSlots[i + 1].endMs - bestValley >= minDuration
          ) {
            rawSlots[i].endMs = bestValley;
            rawSlots[i + 1].startMs = bestValley;
          }
        }
      }
    }

    // Convert to WordTimeSlot with both seconds and milliseconds
    const timeline: WordTimeSlot[] = rawSlots.map((s) => ({
      index: s.index,
      word: s.word,
      startMs: Math.round(s.startMs),
      endMs: Math.round(s.endMs),
      startSec: Number((s.startMs / 1000).toFixed(3)),
      endSec: Number((s.endMs / 1000).toFixed(3)),
    }));

    return timeline;
  }

  /**
   * Play stored AI audio with precise real-time word highlight synchronization using audio.currentTime
   */
  public async playAiAudio(
    audioUrl: string,
    sentenceText: string,
    words: WordToken[],
    rate: number = 1.0,
    callbacks?: {
      onWordChange?: (wordIndex: number | null) => void;
      onTimeUpdate?: (state: AudioPlaybackState) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    this.stopPlayback();

    this.onWordChangeCb = callbacks?.onWordChange || null;
    this.onTimeUpdateCb = callbacks?.onTimeUpdate || null;
    this.onEndCb = callbacks?.onEnd || null;
    this.onErrorCb = callbacks?.onError || null;
    this.currentRate = Math.max(0.5, Math.min(2.0, rate));

    // 1. Detect exact audio timing & speech boundaries with acoustic valley profile
    const timing = parseWavTimingInBrowser(audioUrl);
    const duration = timing ? timing.durationMs / 1000 : 2.5;
    this.wordTimeline = this.buildWordTimeline(sentenceText, words, duration, timing);

    const audio = new Audio();
    this.currentAudio = audio;
    audio.defaultPlaybackRate = this.currentRate;
    audio.playbackRate = this.currentRate;
    audio.preload = 'auto';
    audio.src = audioUrl;

    // Attach native audio event handlers for instantaneous reaction to audio clock updates
    this.boundTimeUpdateHandler = () => {
      this.syncStateFromAudioTime();
    };
    audio.addEventListener('timeupdate', this.boundTimeUpdateHandler);
    audio.addEventListener('seeking', this.boundTimeUpdateHandler);
    audio.addEventListener('seeked', this.boundTimeUpdateHandler);

    return new Promise((resolve, reject) => {
      // Re-affirm playback rate upon loadedmetadata and play so browsers never reset it
      audio.onloadedmetadata = () => {
        audio.defaultPlaybackRate = this.currentRate;
        audio.playbackRate = this.currentRate;
        if (!timing) {
          const loadedDuration = audio.duration || 2.5;
          this.wordTimeline = this.buildWordTimeline(sentenceText, words, loadedDuration, null);
        }
        this.syncStateFromAudioTime();
      };

      audio.onplay = () => {
        audio.defaultPlaybackRate = this.currentRate;
        audio.playbackRate = this.currentRate;
        this.isPlaying = true;
        this.isPaused = false;
        this.startRealtimeHighlightTicker();
      };

      audio.onended = () => {
        this.stopPlayback();
        if (this.onEndCb) this.onEndCb();
        resolve();
      };

      audio.onerror = (e) => {
        this.stopPlayback();
        if (this.onErrorCb) this.onErrorCb(e);
        reject(e);
      };

      audio.play().catch((err) => {
        this.stopPlayback();
        if (this.onErrorCb) this.onErrorCb(err);
        reject(err);
      });
    });
  }

  /**
   * Precise synchronization mechanism driven by audio.currentTime.
   * Calculates active word index, word-level progress, and overall track progress.
   */
  public syncStateFromAudioTime(): AudioPlaybackState | null {
    if (!this.currentAudio) return null;

    const currentTime = this.currentAudio.currentTime;
    const duration =
      this.currentAudio.duration && !isNaN(this.currentAudio.duration) && isFinite(this.currentAudio.duration)
        ? this.currentAudio.duration
        : this.wordTimeline.length > 0
        ? this.wordTimeline[this.wordTimeline.length - 1].endSec
        : 0;

    const currentMs = currentTime * 1000;

    let activeIndex: number | null = null;
    let wordProgress = 0;

    if (this.wordTimeline.length > 0) {
      const firstSlot = this.wordTimeline[0];
      const lastSlot = this.wordTimeline[this.wordTimeline.length - 1];

      if (currentMs < firstSlot.endMs) {
        activeIndex = 0;
        const slotDur = Math.max(1, firstSlot.endMs - firstSlot.startMs);
        wordProgress = Math.min(1, Math.max(0, (currentMs - firstSlot.startMs) / slotDur));
      } else {
        for (let i = 1; i < this.wordTimeline.length; i++) {
          const slot = this.wordTimeline[i];
          if (currentMs >= slot.startMs && currentMs < slot.endMs) {
            activeIndex = slot.index;
            const slotDur = Math.max(1, slot.endMs - slot.startMs);
            wordProgress = Math.min(1, Math.max(0, (currentMs - slot.startMs) / slotDur));
            break;
          } else if (currentMs < slot.startMs) {
            activeIndex = i - 1;
            break;
          }
        }

        // If at or past the final word of the sentence
        if (activeIndex === null && currentMs >= lastSlot.startMs) {
          activeIndex = lastSlot.index;
          wordProgress = 1;
        }
      }
    }

    let activeIndexChanged = false;
    if (activeIndex !== this.activeWordIndex) {
      this.activeWordIndex = activeIndex;
      activeIndexChanged = true;
      if (this.onWordChangeCb) {
        this.onWordChangeCb(activeIndex);
      }
    }

    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

    const state: AudioPlaybackState = {
      currentTime,
      duration,
      currentMs,
      activeWordIndex: activeIndex,
      wordProgress,
      progressPercent,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
    };

    // Throttle React component state updates to at most once per 100ms or when word index changes
    const now = performance.now();
    if (this.onTimeUpdateCb && (activeIndexChanged || now - this.lastTimeUpdateTimestamp > 100)) {
      this.lastTimeUpdateTimestamp = now;
      this.onTimeUpdateCb(state);
    }

    return state;
  }

  /**
   * High-frequency animation ticker tracking audio.currentTime with sub-frame resolution
   */
  private startRealtimeHighlightTicker() {
    this.stopHighlightTicker();

    const tick = () => {
      if (!this.isPlaying || this.isPaused || !this.currentAudio) {
        return;
      }

      this.syncStateFromAudioTime();
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopHighlightTicker() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Directly seek audio track to specified time in seconds and dynamically update visual cues
   */
  public seekTo(timeInSeconds: number) {
    if (this.currentAudio) {
      const dur = this.currentAudio.duration || 100;
      const clamped = Math.max(0, Math.min(dur, timeInSeconds));
      this.currentAudio.currentTime = clamped;
      this.syncStateFromAudioTime();
    }
  }

  /**
   * Jump directly to the exact start of a specified word in the sentence
   */
  public seekToWord(wordIndex: number) {
    if (this.wordTimeline[wordIndex] && this.currentAudio) {
      const targetSec = this.wordTimeline[wordIndex].startSec;
      this.currentAudio.currentTime = targetSec;
      this.syncStateFromAudioTime();
    }
  }

  public getWordTimeline(): WordTimeSlot[] {
    return this.wordTimeline;
  }

  public getCurrentTime(): number {
    return this.currentAudio?.currentTime || 0;
  }

  public getDuration(): number {
    return (
      this.currentAudio?.duration ||
      (this.wordTimeline.length > 0 ? this.wordTimeline[this.wordTimeline.length - 1].endSec : 0)
    );
  }

  public getPlaybackState(): AudioPlaybackState | null {
    return this.syncStateFromAudioTime();
  }

  public pausePlayback() {
    if (this.currentAudio && this.isPlaying && !this.isPaused) {
      this.currentAudio.pause();
      this.isPaused = true;
      this.stopHighlightTicker();
      this.syncStateFromAudioTime();
    }
  }

  public resumePlayback() {
    if (this.currentAudio && this.isPlaying && this.isPaused) {
      this.currentAudio.defaultPlaybackRate = this.currentRate;
      this.currentAudio.playbackRate = this.currentRate;
      this.currentAudio.play();
      this.isPaused = false;
      this.startRealtimeHighlightTicker();
      this.syncStateFromAudioTime();
    }
  }

  public stopPlayback() {
    this.stopHighlightTicker();
    if (this.currentAudio) {
      this.currentAudio.onplay = null;
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio.onloadedmetadata = null;
      if (this.boundTimeUpdateHandler) {
        this.currentAudio.removeEventListener('timeupdate', this.boundTimeUpdateHandler);
        this.currentAudio.removeEventListener('seeking', this.boundTimeUpdateHandler);
        this.currentAudio.removeEventListener('seeked', this.boundTimeUpdateHandler);
        this.boundTimeUpdateHandler = null;
      }
      try {
        this.currentAudio.pause();
      } catch {}
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.wordTimeline = [];
    if (this.activeWordIndex !== null) {
      this.activeWordIndex = null;
      if (this.onWordChangeCb) this.onWordChangeCb(null);
    }
    if (this.onTimeUpdateCb) {
      this.onTimeUpdateCb({
        currentTime: 0,
        duration: 0,
        currentMs: 0,
        activeWordIndex: null,
        wordProgress: 0,
        progressPercent: 0,
        isPlaying: false,
        isPaused: false,
      });
    }
  }

  public setPlaybackRate(rate: number) {
    this.currentRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.currentAudio) {
      this.currentAudio.defaultPlaybackRate = this.currentRate;
      this.currentAudio.playbackRate = this.currentRate;
    }
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public isCurrentlyPaused(): boolean {
    return this.isPaused;
  }
}

export const aiAudioService = new AiAudioService();

import { VoiceOption, WordToken } from '../types';

export type WordHighlightCallback = (wordIndex: number | null) => void;
export type StateCallback = (isPlaying: boolean, isPaused: boolean) => void;

interface WordTimeSlot {
  index: number;
  word: string;
  startMs: number;
  endMs: number;
  durationMs: number;
}

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

function estimateWordSyllables(word: string): number {
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

class TextToSpeechManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: VoiceOption[] = [];
  private selectedVoiceId: string = '';
  private currentRate: number = 1.0;
  private isSpeaking: boolean = false;
  private isPaused: boolean = false;
  private onWordChangeCallback: WordHighlightCallback | null = null;
  private onStateChangeCallback: StateCallback | null = null;

  // High-precision timeline & animation
  private wordTimeline: WordTimeSlot[] = [];
  private wordRanges: { start: number; end: number; index: number }[] = [];
  private animationFrameId: number | null = null;
  private playbackStartTime: number = 0;
  private pausedAt: number = 0;
  private activeWordIndex: number | null = null;
  private nativeBoundaryFired: boolean = false;
  private voiceListeners: ((voices: VoiceOption[]) => void)[] = [];
  private speakTimeoutId: any = null;
  private keepAliveInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  public subscribeVoices(cb: (voices: VoiceOption[]) => void): () => void {
    this.voiceListeners.push(cb);
    if (this.voices.length > 0) {
      cb(this.voices);
    }
    return () => {
      this.voiceListeners = this.voiceListeners.filter((l) => l !== cb);
    };
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public loadVoices(): VoiceOption[] {
    if (!this.synth) return [];

    const rawVoices = this.synth.getVoices();
    const englishVoices = rawVoices.filter((v) => v.lang.startsWith('en'));

    // Categorize voices nicely for Vietnamese middle school students
    const options: VoiceOption[] = [];

    englishVoices.forEach((v) => {
      const lowerName = v.name.toLowerCase();
      let gender: 'Female' | 'Male' | 'Neutral' = 'Neutral';
      if (
        lowerName.includes('female') ||
        lowerName.includes('samantha') ||
        lowerName.includes('victoria') ||
        lowerName.includes('karen') ||
        lowerName.includes('zira') ||
        lowerName.includes('susan') ||
        lowerName.includes('catherine') ||
        lowerName.includes('linda')
      ) {
        gender = 'Female';
      } else if (
        lowerName.includes('male') ||
        lowerName.includes('david') ||
        lowerName.includes('daniel') ||
        lowerName.includes('george') ||
        lowerName.includes('alex') ||
        lowerName.includes('james') ||
        lowerName.includes('mark')
      ) {
        gender = 'Male';
      }

      let accent: 'US' | 'UK' | 'AU' | 'Other' = 'Other';
      if (v.lang.includes('US')) accent = 'US';
      else if (v.lang.includes('GB')) accent = 'UK';
      else if (v.lang.includes('AU')) accent = 'AU';

      options.push({
        id: v.name,
        name: `${v.name} (${accent} ${gender !== 'Neutral' ? gender : ''})`,
        lang: v.lang,
        gender,
        accent,
        speechVoice: v,
      });
    });

    this.voices = options;

    // Pick a sensible default (prefer US Female or US first)
    if (!this.selectedVoiceId && options.length > 0) {
      const preferred =
        options.find((o) => o.accent === 'US' && o.gender === 'Female') ||
        options.find((o) => o.accent === 'US') ||
        options[0];
      this.selectedVoiceId = preferred.id;
    }

    // Notify subscribers
    if (this.voiceListeners.length > 0) {
      this.voiceListeners.forEach((listener) => {
        try {
          listener(this.voices);
        } catch {
          // ignore
        }
      });
    }

    return this.voices;
  }

  /**
   * Maps an expressive AI Voice persona (Kore, Puck, Zephyr, Fenrir, Charon)
   * to a matching system voice with tailored pitch and rate characteristics.
   * Guarantees that students ALWAYS hear distinct, gender-appropriate voices!
   */
  public getVoiceForAiOption(aiVoiceName: string): {
    speechVoice: SpeechSynthesisVoice | null;
    pitch: number;
    rateFactor: number;
  } {
    const rawVoices = this.synth ? this.synth.getVoices() : [];
    const englishVoices = rawVoices.filter((v) => v.lang.startsWith('en'));

    const lowerTarget = (aiVoiceName || '').toLowerCase().trim();
    const isMale = lowerTarget === 'puck' || lowerTarget === 'fenrir' || lowerTarget === 'charon';
    const isFemale = lowerTarget === 'kore' || lowerTarget === 'zephyr';

    let matchedVoice: SpeechSynthesisVoice | null = null;

    if (isMale) {
      matchedVoice =
        englishVoices.find((v) => {
          const n = v.name.toLowerCase();
          return (
            n.includes('male') ||
            n.includes('david') ||
            n.includes('alex') ||
            n.includes('george') ||
            n.includes('daniel') ||
            n.includes('james') ||
            n.includes('mark')
          );
        }) || null;
    } else if (isFemale) {
      matchedVoice =
        englishVoices.find((v) => {
          const n = v.name.toLowerCase();
          return (
            n.includes('female') ||
            n.includes('samantha') ||
            n.includes('zira') ||
            n.includes('victoria') ||
            n.includes('karen') ||
            n.includes('susan') ||
            n.includes('linda')
          );
        }) || null;
    }

    if (!matchedVoice && englishVoices.length > 0) {
      const currentChosen = this.voices.find((v) => v.id === this.selectedVoiceId);
      matchedVoice = currentChosen?.speechVoice || englishVoices[0];
    }

    // Persona-specific acoustic properties (Pitch & Speed)
    switch (lowerTarget) {
      case 'puck':
        // Lively, upbeat male voice
        return { speechVoice: matchedVoice, pitch: 1.18, rateFactor: 1.02 };
      case 'fenrir':
        // Deep, warm, resonant male voice
        return { speechVoice: matchedVoice, pitch: 0.82, rateFactor: 0.95 };
      case 'charon':
        // Academic, measured male voice
        return { speechVoice: matchedVoice, pitch: 0.92, rateFactor: 0.93 };
      case 'zephyr':
        // Soft, serene, melodic female voice
        return { speechVoice: matchedVoice, pitch: 0.98, rateFactor: 0.95 };
      case 'kore':
      default:
        // Clear, natural standard US female voice
        return { speechVoice: matchedVoice, pitch: 1.06, rateFactor: 1.0 };
    }
  }

  public getVoices(): VoiceOption[] {
    if (this.voices.length === 0) {
      return this.loadVoices();
    }
    return this.voices;
  }

  public setVoice(voiceId: string) {
    this.selectedVoiceId = voiceId;
  }

  public getSelectedVoiceId(): string {
    return this.selectedVoiceId;
  }

  public setRate(rate: number) {
    this.currentRate = Math.max(0.5, Math.min(2.0, rate));
  }

  public getRate(): number {
    return this.currentRate;
  }

  public registerCallbacks(
    onWordChange?: WordHighlightCallback,
    onStateChange?: StateCallback
  ) {
    if (onWordChange) this.onWordChangeCallback = onWordChange;
    if (onStateChange) this.onStateChangeCallback = onStateChange;
  }

  private updateState(playing: boolean, paused: boolean) {
    this.isSpeaking = playing;
    this.isPaused = paused;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(playing, paused);
    }
  }

  private setActiveWord(idx: number | null, customCallback?: (idx: number | null) => void) {
    if (idx === null) {
      if (this.activeWordIndex !== null) {
        this.activeWordIndex = null;
        if (customCallback) customCallback(null);
        if (this.onWordChangeCallback) this.onWordChangeCallback(null);
      }
      return;
    }

    if (this.activeWordIndex === idx) return;
    this.activeWordIndex = idx;
    if (customCallback) customCallback(idx);
    if (this.onWordChangeCallback) this.onWordChangeCallback(idx);
  }

  public stop() {
    this.stopTimeline();
    if (this.speakTimeoutId) {
      clearTimeout(this.speakTimeoutId);
      this.speakTimeoutId = null;
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
        if (this.synth.paused) {
          this.synth.resume();
        }
      } catch {}
    }
    if (typeof window !== 'undefined') {
      (window as any).__activeUtterance = null;
    }
    this.updateState(false, false);
    this.setActiveWord(null);
  }

  public pause() {
    if (this.synth && this.isSpeaking && !this.isPaused) {
      try {
        this.synth.pause();
      } catch {}
      this.pausedAt = performance.now();
      this.stopAnimationLoop();
      this.updateState(true, true);
    }
  }

  public resume() {
    if (this.synth && this.isSpeaking && this.isPaused) {
      try {
        this.synth.resume();
      } catch {}
      if (this.pausedAt > 0) {
        const pauseDuration = performance.now() - this.pausedAt;
        this.playbackStartTime += pauseDuration;
        this.pausedAt = 0;
      }
      this.startAnimationLoop();
      this.updateState(true, false);
    }
  }

  private stopAnimationLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private stopTimeline() {
    this.stopAnimationLoop();
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    this.wordTimeline = [];
    this.wordRanges = [];
    this.activeWordIndex = null;
    this.nativeBoundaryFired = false;
  }

  /**
   * Speaks an entire sentence and highlights each word in real-time.
   * Features high-precision phonetic timeline calculation with speed calibration
   * and native SpeechSynthesis boundary drift auto-correction.
   */
  public speakSentence(
    sentenceText: string,
    words: WordToken[],
    callbacks?: {
      onWordChange?: (wordIndex: number | null) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      customVoice?: SpeechSynthesisVoice | null;
      customPitch?: number;
      customRate?: number;
    }
  ) {
    this.stop();

    if (!this.synth) {
      if (callbacks?.onError) callbacks.onError(new Error('TTS not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentenceText);
    this.currentUtterance = utterance;

    const effectiveRate = callbacks?.customRate ?? this.currentRate;
    utterance.rate = Math.max(0.5, Math.min(2.0, effectiveRate));
    utterance.pitch = callbacks?.customPitch ?? 1.0;

    // Set chosen voice or custom voice
    if (callbacks?.customVoice) {
      utterance.voice = callbacks.customVoice;
      utterance.lang = callbacks.customVoice.lang;
    } else {
      const chosen = this.voices.find((v) => v.id === this.selectedVoiceId);
      if (chosen?.speechVoice) {
        utterance.voice = chosen.speechVoice;
        utterance.lang = chosen.speechVoice.lang;
      } else {
        utterance.lang = 'en-US';
      }
    }

    // Precalculate word boundaries and character offsets
    this.wordRanges = this.calculateWordRanges(sentenceText, words);
    this.wordTimeline = this.buildWordTimeline(sentenceText, words, utterance.rate);
    this.nativeBoundaryFired = false;

    utterance.onstart = () => {
      this.updateState(true, false);
      this.playbackStartTime = performance.now();
      this.pausedAt = 0;

      // Start Chrome keep-alive watchdog to prevent auto-pause on long sentences
      if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = setInterval(() => {
        if (this.synth && this.isSpeaking && !this.isPaused) {
          try {
            this.synth.pause();
            this.synth.resume();
          } catch {}
        }
      }, 10000);

      // Immediately highlight Word 0 the instant speech begins
      if (words.length > 0) {
        this.setActiveWord(0, callbacks?.onWordChange);
      }
      this.startAnimationLoop(callbacks?.onWordChange);
    };

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      // Validate real word boundary event (ignore sentence boundary at index 0)
      const isWordBoundary =
        event.name === 'word' ||
        (event.charIndex !== undefined && event.charIndex >= 0 && event.name !== 'sentence');

      if (isWordBoundary) {
        this.nativeBoundaryFired = true;
        this.stopAnimationLoop(); // Stop requestAnimationFrame ticker immediately to free CPU!
        const charIndex = event.charIndex;
        const matchedIndex = this.findWordIndexByChar(charIndex, this.wordRanges);

        if (matchedIndex !== -1) {
          this.setActiveWord(matchedIndex, callbacks?.onWordChange);
        }
      }
    };

    utterance.onend = () => {
      this.stopTimeline();
      if (typeof window !== 'undefined') (window as any).__activeUtterance = null;
      this.updateState(false, false);
      this.setActiveWord(null, callbacks?.onWordChange);
      if (callbacks?.onEnd) callbacks.onEnd();
    };

    utterance.onerror = (e) => {
      this.stopTimeline();
      if (typeof window !== 'undefined') (window as any).__activeUtterance = null;
      this.updateState(false, false);
      this.setActiveWord(null, callbacks?.onWordChange);
      if (callbacks?.onError) callbacks.onError(e);
    };

    // Hold global reference to avoid Chromium GC bug
    if (typeof window !== 'undefined') {
      (window as any).__activeUtterance = utterance;
    }

    // Debounce speak by 25ms to allow Chromium audio pipe to reset cleanly after cancel
    this.speakTimeoutId = setTimeout(() => {
      if (!this.synth) return;
      try {
        if (this.synth.paused) {
          this.synth.resume();
        }
        this.synth.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak error:', err);
      }
    }, 25);
  }

  /**
   * Speaks sentence using a designated AI Voice persona (Kore, Puck, Zephyr, Fenrir, Charon)
   * with guaranteed vocal distinction, pitch modulation, and calibrated highlight synchronization.
   */
  public speakSentenceWithAiVoice(
    sentenceText: string,
    words: WordToken[],
    aiVoiceName: string,
    callbacks?: {
      onWordChange?: (wordIndex: number | null) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) {
    const aiConfig = this.getVoiceForAiOption(aiVoiceName);
    this.speakSentence(sentenceText, words, {
      ...callbacks,
      customVoice: aiConfig.speechVoice,
      customPitch: aiConfig.pitch,
      customRate: this.currentRate * aiConfig.rateFactor,
    });
  }

  /**
   * Continuous high-resolution frame ticker for smooth word highlighting synchronized with audio rate.
   * Runs in synergy with boundary calibration to guarantee consistent karaoke progression on all platforms.
   */
  private startAnimationLoop(customCallback?: (idx: number | null) => void) {
    this.stopAnimationLoop();

    const tick = () => {
      if (!this.isSpeaking || this.isPaused) return;

      // If the browser provides native word boundary events, stop animation loop to free CPU!
      if (this.nativeBoundaryFired) {
        this.stopAnimationLoop();
        return;
      }

      const elapsed = performance.now() - this.playbackStartTime;

      let activeIndex: number | null = null;
      if (this.wordTimeline.length > 0) {
        const firstSlot = this.wordTimeline[0];
        const lastSlot = this.wordTimeline[this.wordTimeline.length - 1];

        if (elapsed < firstSlot.endMs) {
          activeIndex = 0;
        } else {
          for (let i = 1; i < this.wordTimeline.length; i++) {
            const slot = this.wordTimeline[i];
            if (elapsed >= slot.startMs && elapsed < slot.endMs) {
              activeIndex = slot.index;
              break;
            } else if (elapsed < slot.startMs) {
              activeIndex = i - 1;
              break;
            }
          }

          if (activeIndex === null && elapsed >= lastSlot.startMs) {
            activeIndex = lastSlot.index;
          }
        }
      }

      if (activeIndex !== null && activeIndex !== this.activeWordIndex) {
        this.setActiveWord(activeIndex, customCallback);
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * Builds a calibrated timeline estimating each word's spoken duration
   * using syllables, character weights, function words, punctuation pauses,
   * and the current speech rate.
   */
  private buildWordTimeline(
    sentence: string,
    words: WordToken[],
    rate: number
  ): WordTimeSlot[] {
    if (words.length === 0) return [];

    // Rate scaling factor: slower rates (e.g. 0.75x) produce proportionally longer durations
    const speedFactor = 1.0 / Math.max(0.4, rate);

    const timeline: WordTimeSlot[] = [];
    // Lead-in hardware synthesis startup window
    let currentStartMs = Math.round(75 * speedFactor);

    words.forEach((token, index) => {
      const cleanWord = token.text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const syllables = estimateWordSyllables(cleanWord);
      const isUnstressed = UNSTRESSED_WORDS.has(cleanWord);

      // Calibrated base duration matching standard English SpeechSynthesis (~140-150 WPM)
      let baseMs = 0;
      if (isUnstressed) {
        baseMs = 230 + Math.max(0, cleanWord.length - 2) * 16;
      } else if (syllables >= 3 || cleanWord.length >= 8) {
        baseMs = syllables * 190 + Math.max(0, cleanWord.length - 3) * 22;
      } else if (syllables === 2) {
        baseMs = 380 + Math.max(0, cleanWord.length - 4) * 18;
      } else {
        baseMs = 330 + Math.max(0, cleanWord.length - 3) * 18;
      }

      // Detect trailing punctuation pauses in the sentence
      const fullTextPos = sentence.indexOf(token.text);
      const trailingSubstr =
        fullTextPos !== -1
          ? sentence.slice(fullTextPos + token.text.length, fullTextPos + token.text.length + 3)
          : '';
      const hasPausePunctuation =
        /[,;:\-]/.test(token.punctuation || '') || /[,;:\-]/.test(trailingSubstr);
      const hasEndPunctuation =
        /[.!?]/.test(token.punctuation || '') || /[.!?]/.test(trailingSubstr);

      if (hasPausePunctuation) {
        baseMs += 260;
      } else if (hasEndPunctuation) {
        baseMs += 350;
      }

      // Sentence-final lengthening
      if (index === words.length - 1) {
        baseMs *= 1.25;
      }

      // Scale by playback speed
      const durationMs = Math.round(Math.max(160, baseMs) * speedFactor);
      const endMs = currentStartMs + durationMs;

      timeline.push({
        index,
        word: token.text,
        startMs: currentStartMs,
        endMs,
        durationMs,
      });

      // Small inter-word gap
      const gapMs = Math.round(25 * speedFactor);
      currentStartMs = endMs + gapMs;
    });

    return timeline;
  }

  /**
   * Speaks just a single isolated word (when clicked).
   */
  public speakWord(
    wordText: string,
    onStart?: () => void,
    onEnd?: () => void
  ) {
    this.stop();

    if (!this.synth) return;

    // Clean word of extraneous punctuation
    const cleanWord = wordText.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').trim();
    if (!cleanWord) return;

    const utterance = new SpeechSynthesisUtterance(cleanWord);
    utterance.rate = Math.min(1.0, this.currentRate); // keep isolated word clear

    const chosen = this.voices.find((v) => v.id === this.selectedVoiceId);
    if (chosen?.speechVoice) {
      utterance.voice = chosen.speechVoice;
      utterance.lang = chosen.speechVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onstart = () => {
      this.updateState(true, false);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.updateState(false, false);
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.updateState(false, false);
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  private calculateWordRanges(
    sentence: string,
    words: WordToken[]
  ): { start: number; end: number; index: number }[] {
    const ranges: { start: number; end: number; index: number }[] = [];
    let searchStart = 0;

    words.forEach((w, index) => {
      const cleanWord = w.text.trim();
      const pos = sentence.toLowerCase().indexOf(cleanWord.toLowerCase(), searchStart);
      if (pos !== -1) {
        ranges.push({
          start: pos,
          end: pos + cleanWord.length,
          index,
        });
        searchStart = pos + cleanWord.length;
      }
    });

    return ranges;
  }

  private findWordIndexByChar(
    charIndex: number,
    ranges: { start: number; end: number; index: number }[]
  ): number {
    if (ranges.length === 0) return -1;

    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const nextStart = i + 1 < ranges.length ? ranges[i + 1].start : Infinity;
      if (charIndex >= r.start && charIndex < nextStart) {
        return r.index;
      }
    }

    if (charIndex < ranges[0].start) {
      return 0;
    }

    return ranges[ranges.length - 1].index;
  }
}

export const ttsManager = new TextToSpeechManager();


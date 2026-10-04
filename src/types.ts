export interface WordToken {
  text: string;
  ipa?: string;
  meaning?: string;
  punctuation?: string;
}

export interface WordTimeSlot {
  index: number;
  word: string;
  startMs: number;
  endMs: number;
  startSec: number;
  endSec: number;
}

export interface AudioPlaybackState {
  currentTime: number; // in seconds, e.g. 1.34
  duration: number; // in seconds, e.g. 3.20
  currentMs: number; // in ms, e.g. 1340
  activeWordIndex: number | null;
  wordProgress: number; // 0.0 to 1.0 within currently spoken word
  progressPercent: number; // 0.0 to 100.0 across entire track
  isPlaying: boolean;
  isPaused: boolean;
}

export interface SentenceItem {
  id: number;
  speaker: string; // e.g. "A", "B", "Nam", "Lan", "Narrator"
  english: string;
  vietnamese: string;
  words: WordToken[];
  audioBase64?: string; // Optional cached AI speech base64
  audioMimeType?: string; // e.g. "audio/wav"
  audioVoice?: string; // e.g. "Kore", "Puck"
  audioDurationMs?: number;
}

export interface AiVoiceOption {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  description: string;
  tag: string;
}

export interface Lesson {
  id: string; // share code or unique ID (e.g. EN-8A3F2)
  title: string;
  topic: string;
  grade?: string; // e.g. "Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"
  createdBy: string;
  authorRole: 'teacher' | 'student';
  createdAt: string;
  sentences: SentenceItem[];
  visibility: 'public' | 'private';
  viewsCount?: number;
  practiceCount?: number;
}

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: 'Female' | 'Male' | 'Neutral';
  accent: 'US' | 'UK' | 'AU' | 'Other';
  speechVoice?: SpeechSynthesisVoice;
}

export interface ShadowingConfig {
  pauseDelaySeconds: number; // 2, 3, 5 seconds
  autoAdvance: boolean;
  replayCount: number;
}

export interface UserProgress {
  lessonId: string;
  userId: string;
  completedSentences: number[];
  lastSentenceId: number;
  practiceCount: number;
  lastStudiedAt: string;
  favorite?: boolean;
}

export interface PronunciationResult {
  score: number;
  feedback: string;
  correctWords: string[];
  mispronouncedWords: {
    word: string;
    tip: string;
  }[];
}

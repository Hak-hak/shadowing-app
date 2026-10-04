import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Volume2,
  Info,
  Play,
  Pause,
  RotateCcw,
  Mic,
  ChevronLeft,
  ChevronRight,
  Settings2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { SentenceItem, WordToken, AudioPlaybackState, WordTimeSlot, VoiceOption } from '../types';
import { WordBadge } from './WordBadge';
import { normalizeSentence } from '../utils/sentenceUtils';
import { AI_VOICE_OPTIONS } from '../services/aiAudioService';

interface SentenceCardProps {
  sentence: SentenceItem;
  sentenceIndex: number;
  totalSentences: number;
  activeWordIndex: number | null;
  isPlaying: boolean;
  isPaused?: boolean;
  isCompleted: boolean;
  showVietnamese: boolean;
  onPlay: () => void;
  onPlayAi?: () => void;
  onPlaySystem?: () => void;
  onSlowPlay: () => void;
  onPractice: () => void;
  // Navigation & Replay
  onPrev?: () => void;
  onNext?: () => void;
  onReplay?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  // Audio Mode Props
  audioMode?: 'ai' | 'system';
  onAudioModeChange?: (mode: 'ai' | 'system') => void;
  hasAiAudio?: boolean;
  aiVoiceName?: string;
  isGeneratingAiAudio?: boolean;
  onGenerateAiAudio?: () => void;
  onRegenerateAiAudio?: () => void;
  // Speed & Voices
  currentRate?: number;
  onRateChange?: (rate: number) => void;
  voices?: VoiceOption[];
  selectedVoiceId?: string;
  onVoiceChange?: (voiceId: string) => void;
  selectedAiVoice?: string;
  onAiVoiceChange?: (voice: string) => void;
  // Precision audio.currentTime timing & player props
  audioPlaybackState?: AudioPlaybackState | null;
  onSeekAudio?: (seconds: number) => void;
  onSeekWord?: (wordIndex: number) => void;
  wordTimeline?: WordTimeSlot[];
}

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
}

export const SentenceCard: React.FC<SentenceCardProps> = ({
  sentence,
  sentenceIndex,
  totalSentences,
  activeWordIndex,
  isPlaying,
  isPaused = false,
  isCompleted,
  showVietnamese,
  onPlay,
  onPlayAi,
  onPlaySystem,
  onSlowPlay,
  onPractice,
  onPrev,
  onNext,
  onReplay,
  hasPrev = false,
  hasNext = false,
  audioMode = 'ai',
  onAudioModeChange,
  hasAiAudio = false,
  aiVoiceName = 'Kore',
  isGeneratingAiAudio = false,
  onGenerateAiAudio,
  onRegenerateAiAudio,
  currentRate = 1.0,
  onRateChange,
  voices = [],
  selectedVoiceId = '',
  onVoiceChange,
  selectedAiVoice = 'Kore',
  onAiVoiceChange,
  audioPlaybackState,
  onSeekAudio,
  onSeekWord,
  wordTimeline = [],
}) => {
  const normalized = useMemo(() => normalizeSentence(sentence), [sentence]);
  const [openedWordIndex, setOpenedWordIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Close open popup when switching sentences or starting sentence playback
  useEffect(() => {
    setOpenedWordIndex(null);
  }, [normalized.id, isPlaying]);

  // Global click-outside listener: clicking any empty space on card or document closes popup
  useEffect(() => {
    if (openedWordIndex === null) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('#word-dictionary-popup') || target.closest('.word-badge-btn')) {
        return;
      }

      setOpenedWordIndex(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openedWordIndex]);

  // Speaker styling
  const isSpeakerA = normalized.speaker.toUpperCase().includes('A') || normalized.speaker === '1';
  const isSpeakerB = normalized.speaker.toUpperCase().includes('B') || normalized.speaker === '2';
  const isNarrator = normalized.speaker.toLowerCase().includes('narrator');

  let speakerColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
  let speakerBadgeText = `Người nói ${normalized.speaker}`;

  if (isSpeakerA) {
    speakerColor = 'bg-blue-50 text-blue-800 border-blue-200';
    speakerBadgeText = 'Nhân vật A';
  } else if (isSpeakerB) {
    speakerColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    speakerBadgeText = 'Nhân vật B';
  } else if (isNarrator) {
    speakerColor = 'bg-purple-50 text-purple-800 border-purple-200';
    speakerBadgeText = 'Lời dẫn (Narrator)';
  } else if (normalized.speaker) {
    speakerBadgeText = normalized.speaker;
  }

  // Precise timing values
  const currentTime = audioPlaybackState?.currentTime || 0;
  const duration = audioPlaybackState?.duration || 0;
  const progressPercent = audioPlaybackState?.progressPercent || 0;
  const currentEffectiveActiveIndex =
    isPlaying ? (activeWordIndex !== null ? activeWordIndex : 0) : null;
  const activeWord =
    currentEffectiveActiveIndex !== null && normalized.words && normalized.words[currentEffectiveActiveIndex]
      ? normalized.words[currentEffectiveActiveIndex].text
      : null;

  return (
    <div
      id={`sentence-card-${normalized.id}`}
      className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 sm:p-7 sm:py-8 transition-all hover:border-slate-300 relative space-y-5"
    >
      {/* Top Header: Speaker identity + Audio Status + Completion */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${speakerColor}`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {speakerBadgeText}
          </span>

          <span className="text-xs font-bold text-slate-400">
            Câu {sentenceIndex + 1} / {totalSentences}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {audioMode === 'ai' ? (
            hasAiAudio ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Giọng AI ({aiVoiceName})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Chưa có audio AI
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
              Giọng hệ thống
            </span>
          )}

          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Đã luyện tập
            </span>
          )}
        </div>
      </div>

      {/* DYNAMIC AUDIO PLAYER BAR WITH PRECISE audio.currentTime SYNC */}
      {isPlaying && (
        <div
          id="audio-player-timing-panel"
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-800 space-y-2.5 animate-in fade-in duration-150"
        >
          {/* Top row: Status, Active word tracker, Digital audio clock */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex gap-1 items-end h-3.5">
                <span className="w-1 bg-amber-400 h-2.5 rounded-full animate-bounce"></span>
                <span className="w-1 bg-amber-400 h-3.5 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-1 bg-amber-400 h-2 rounded-full animate-bounce [animation-delay:0.3s]"></span>
              </span>

              <span className="font-bold text-indigo-200">
                {audioMode === 'ai' ? `Giọng AI (${aiVoiceName})` : 'Giọng đọc chuẩn'}
              </span>

              {activeWord && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 font-extrabold text-[11px] shadow-xs">
                  <span>Từ:</span>
                  <span className="underline decoration-amber-900">{activeWord}</span>
                </span>
              )}
            </div>

            {/* Digital precise audio.currentTime clock */}
            <div className="font-mono text-xs font-bold tracking-wider text-emerald-300 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
              {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
            </div>
          </div>

          {/* Interactive audio scrubber track driven by audio.currentTime */}
          <div className="space-y-1">
            <div className="relative flex items-center group py-1">
              <input
                id="audio-player-scrubber"
                type="range"
                min="0"
                max={duration > 0 ? duration : 1}
                step="0.01"
                value={currentTime}
                onChange={(e) => {
                  if (onSeekAudio) {
                    onSeekAudio(parseFloat(e.target.value));
                  }
                }}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                title="Kéo để tua nhanh/chậm chính xác đến từng từ"
              />
            </div>

            {/* Hint for students */}
            <div className="flex items-center justify-between text-[11px] text-indigo-300/80">
              <span>Đồng bộ chính xác với audio.currentTime</span>
              <span>Bấm vào từ bất kỳ để tua tới từ đó</span>
            </div>
          </div>
        </div>
      )}

      {/* THE MAIN ENGLISH SENTENCE - PROMINENT, LARGE, CRYSTAL-CLEAR */}
      <div className="space-y-3">
        {/* Dynamic Spoken Word Highlight Focus Banner when playing */}
        {isPlaying && activeWord && (
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-50 border-2 border-amber-400 rounded-2xl text-amber-950 font-bold text-xs sm:text-sm w-fit shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-600"></span>
            </span>
            <span className="text-amber-900 font-extrabold uppercase text-[11px] tracking-wider">Đang phát âm:</span>
            <span className="text-base sm:text-xl font-black text-amber-950 px-3 py-0.5 bg-amber-400 rounded-xl shadow-xs border border-amber-500 scale-105">
              {activeWord}
            </span>
            {normalized.words && activeWordIndex !== null && normalized.words[activeWordIndex]?.ipa && (
              <span className="font-mono text-xs sm:text-sm text-amber-900 font-bold bg-white/90 px-2 py-0.5 rounded-lg border border-amber-300">
                {normalized.words[activeWordIndex].ipa}
              </span>
            )}
            {normalized.words && activeWordIndex !== null && normalized.words[activeWordIndex]?.meaning && (
              <span className="text-xs text-amber-900/80 font-medium">
                ({normalized.words[activeWordIndex].meaning})
              </span>
            )}
          </div>
        )}

        <div className="py-3 px-3.5 sm:px-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 min-h-[90px] flex flex-wrap items-center gap-y-3.5 gap-x-1.5">
          {normalized.words && normalized.words.length > 0 ? (
            normalized.words.map((word: WordToken, wIdx: number) => (
              <WordBadge
                key={`${normalized.id}-w-${wIdx}`}
                word={word}
                index={wIdx}
                isActive={isPlaying && currentEffectiveActiveIndex === wIdx}
                isPast={isPlaying && currentEffectiveActiveIndex !== null && wIdx < currentEffectiveActiveIndex}
                isOpen={openedWordIndex === wIdx}
                isPlaying={isPlaying}
                onOpen={() => setOpenedWordIndex(wIdx)}
                onClose={() => setOpenedWordIndex(null)}
                onSeek={onSeekWord}
              />
            ))
          ) : (
            <p className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight leading-relaxed">
              {normalized.english}
            </p>
          )}
        </div>

        {/* UNIFIED INTEGRATED AUDIO TOOLBAR (ALL CONTROLS FROM IMAGE 1 INTEGRATED NEATLY) */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Primary Action Cluster: Trước • Nghe AI • Nghe Hệ Thống • Luyện Đọc • Sau • Replay */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Nút 1: Trước */}
              {onPrev && (
                <button
                  id={`btn-card-prev-${normalized.id}`}
                  type="button"
                  onClick={onPrev}
                  disabled={!hasPrev}
                  className="flex items-center gap-1 px-3 sm:px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
                  title="Quay lại câu trước"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                  <span>Trước</span>
                </button>
              )}

              {/* Nút 2: Nghe Giọng AI */}
              <button
                id={`btn-card-ai-${normalized.id}`}
                type="button"
                onClick={onPlayAi || onPlay}
                disabled={isGeneratingAiAudio}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                  isPlaying && audioMode === 'ai' && !isPaused
                    ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 ring-1 ring-indigo-400'
                }`}
                title={`Phát âm câu này bằng giọng AI (${aiVoiceName})`}
              >
                {isGeneratingAiAudio ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Đang tạo AI...</span>
                  </>
                ) : isPlaying && audioMode === 'ai' && !isPaused ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Tạm dừng AI</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Nghe giọng AI ({aiVoiceName})</span>
                  </>
                )}
              </button>

              {/* Nút 3: Nghe Hệ Thống */}
              <button
                id={`btn-card-system-${normalized.id}`}
                type="button"
                onClick={onPlaySystem || onPlay}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer ${
                  isPlaying && audioMode === 'system' && !isPaused
                    ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                    : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200 ring-1 ring-slate-700'
                }`}
                title="Phát âm câu này bằng giọng chuẩn thiết bị / trình duyệt"
              >
                {isPlaying && audioMode === 'system' && !isPaused ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Tạm dừng Máy</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-sky-300" />
                    <span>Nghe Hệ Thống</span>
                  </>
                )}
              </button>

              {/* Nút 4: Luyện đọc */}
              {onPractice && (
                <button
                  id={`btn-card-practice-${normalized.id}`}
                  type="button"
                  onClick={onPractice}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm ring-1 ring-emerald-500"
                  title="Luyện phát âm câu này"
                >
                  <Mic className="w-4 h-4" />
                  <span>LUYỆN ĐỌC</span>
                </button>
              )}

              {/* Nút 5: Sau */}
              {onNext && (
                <button
                  id={`btn-card-next-${normalized.id}`}
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="flex items-center gap-1 px-3 sm:px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
                  title="Chuyển sang câu sau"
                >
                  <span>Sau</span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              )}

              {/* Nút 6: Replay ↺ */}
              {onReplay && (
                <button
                  id={`btn-card-replay-${normalized.id}`}
                  type="button"
                  onClick={onReplay}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all active:scale-95 cursor-pointer"
                  title="Nghe lại câu này từ đầu"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Utility Cluster: Speed Selector (0.5x, 0.75x, 1x, 1.25x) & Voice Settings dropdown */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Speed selector pills */}
              {onRateChange && (
                <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200/80">
                  {[0.5, 0.75, 1.0, 1.25].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => onRateChange(rate)}
                      className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        currentRate === rate
                          ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title={`Tốc độ đọc ${rate}×`}
                    >
                      {rate}×
                    </button>
                  ))}
                </div>
              )}

              {/* Giọng đọc dropdown toggle */}
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  showSettings
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title="Đổi giọng đọc và cài đặt nâng cao"
              >
                <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Giọng đọc</span>
                {showSettings ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* ADVANCED VOICE SETTINGS POPDOWN */}
          {showSettings && (
            <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Engine Switcher */}
              {onAudioModeChange && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">Bộ phát âm:</span>
                  <div className="inline-flex bg-slate-200/70 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => onAudioModeChange('ai')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        audioMode === 'ai'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Giọng AI Biểu Cảm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAudioModeChange('system')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        audioMode === 'system'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Giọng Hệ Thống</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Voice selectors */}
              <div className="flex flex-wrap items-center gap-2">
                {audioMode === 'ai' && onAiVoiceChange ? (
                  <>
                    <span className="font-bold text-slate-500">Giọng AI:</span>
                    <select
                      id="select-card-ai-voice"
                      value={selectedAiVoice}
                      onChange={(e) => onAiVoiceChange(e.target.value)}
                      className="bg-white border border-indigo-200 text-indigo-950 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    >
                      {AI_VOICE_OPTIONS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.gender === 'Female' ? '👩 Nữ' : '👨 Nam'}: {v.name} ({v.tag})
                        </option>
                      ))}
                    </select>

                    {hasAiAudio ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✅ Đã lưu
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                        Chưa lưu
                      </span>
                    )}

                    {onRegenerateAiAudio && (
                      <button
                        type="button"
                        onClick={onRegenerateAiAudio}
                        disabled={isGeneratingAiAudio}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-indigo-700 bg-indigo-100/70 hover:bg-indigo-100 rounded-xl font-bold transition-colors cursor-pointer"
                        title="Tạo lại audio AI cho câu này"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAiAudio ? 'animate-spin' : ''}`} />
                        <span>Tạo lại</span>
                      </button>
                    )}
                  </>
                ) : onVoiceChange ? (
                  <>
                    <span className="font-bold text-slate-500">Giọng trình duyệt:</span>
                    <select
                      id="select-card-system-voice"
                      value={selectedVoiceId}
                      onChange={(e) => onVoiceChange(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {voices.length > 0 ? (
                        voices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))
                      ) : (
                        <option value="">Giọng chuẩn (English)</option>
                      )}
                    </select>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIETNAMESE TRANSLATION */}
      {showVietnamese && (
        <div
          id="vietnamese-translation"
          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-700 transition-all"
        >
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>🇻🇳 Dịch nghĩa:</span>
          </div>
          <p className="text-base sm:text-lg font-medium text-slate-800 leading-normal">
            {normalized.vietnamese}
          </p>
        </div>
      )}

      {/* Friendly Student Hint Footer */}
      <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>Mẹo: Chạm vào bất kỳ từ nào để nghe riêng và xem phiên âm</span>
        </span>
      </div>
    </div>
  );
};

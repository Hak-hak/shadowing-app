import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Repeat, Volume2, Sparkles } from 'lucide-react';
import { SentenceItem, AudioPlaybackState } from '../types';

interface FullLessonPlayerBarProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalSentences: number;
  currentSentence?: SentenceItem;
  fullLoop: boolean;
  onToggleLoop: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentRate: number;
  onRateChange: (rate: number) => void;
  audioMode?: 'ai' | 'system';
  voiceName?: string;
  audioPlaybackState?: AudioPlaybackState | null;
}

function formatFullTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const FullLessonPlayerBar: React.FC<FullLessonPlayerBarProps> = ({
  isPlaying,
  isPaused,
  currentIndex,
  totalSentences,
  currentSentence,
  fullLoop,
  onToggleLoop,
  onPlayPause,
  onStop,
  onPrev,
  onNext,
  currentRate,
  onRateChange,
  audioMode = 'ai',
  voiceName = 'Kore',
  audioPlaybackState,
}) => {
  const progressPercent = Math.round(((currentIndex + 1) / Math.max(totalSentences, 1)) * 100);
  const audioTime = audioPlaybackState?.currentTime || 0;
  const audioDuration = audioPlaybackState?.duration || 0;

  return (
    <div
      id="full-lesson-player-bar"
      className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-indigo-700/50 space-y-3.5 transition-all"
    >
      {/* Top row: Status, Current sentence preview, Loop toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Animated sound wave bars when playing */}
          <div className="flex items-center gap-1 h-5 px-2 py-1 bg-white/10 rounded-lg">
            <span
              className={`w-1 bg-indigo-300 rounded-full transition-all duration-300 ${
                isPlaying && !isPaused ? 'h-4 animate-bounce' : 'h-2'
              }`}
            />
            <span
              className={`w-1 bg-indigo-200 rounded-full transition-all duration-300 delay-75 ${
                isPlaying && !isPaused ? 'h-5 animate-bounce' : 'h-3'
              }`}
            />
            <span
              className={`w-1 bg-indigo-400 rounded-full transition-all duration-300 delay-150 ${
                isPlaying && !isPaused ? 'h-3 animate-bounce' : 'h-1.5'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                {isPaused ? 'Đang tạm dừng' : 'Đang nghe toàn bài'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600/60 text-indigo-100">
                Câu {currentIndex + 1} / {totalSentences}
              </span>
              {audioMode === 'ai' ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Giọng AI ({voiceName})</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Giọng hệ thống
                </span>
              )}
              {audioDuration > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/40 text-emerald-300 border border-white/10">
                  {formatFullTime(audioTime)} / {formatFullTime(audioDuration)}
                </span>
              )}
            </div>
            {currentSentence && (
              <p className="text-xs text-indigo-200/80 truncate max-w-xs sm:max-w-md mt-0.5">
                <span className="font-semibold text-white mr-1">
                  [{currentSentence.speaker}]:
                </span>
                {currentSentence.english}
              </p>
            )}
          </div>
        </div>

        {/* Speed & Loop options */}
        <div className="flex items-center gap-2">
          {/* Speed pills */}
          <div className="inline-flex bg-white/10 p-0.5 rounded-xl text-xs font-semibold">
            {[0.8, 1.0, 1.2].map((rate) => (
              <button
                key={rate}
                onClick={() => onRateChange(rate)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  currentRate === rate
                    ? 'bg-white text-indigo-900 font-bold shadow-xs'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Loop toggle button */}
          <button
            id="btn-toggle-full-loop"
            onClick={onToggleLoop}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              fullLoop
                ? 'bg-amber-400 text-amber-950 shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-indigo-200'
            }`}
            title={fullLoop ? 'Đang bật lặp lại bài học' : 'Bật lặp lại toàn bài'}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{fullLoop ? 'Đang lặp bài' : 'Lặp bài'}</span>
          </button>
        </div>
      </div>

      {/* Lesson-wide Progress track */}
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Playback Controller Bar */}
      <div className="flex items-center justify-between pt-1">
        {/* Previous Sentence */}
        <button
          id="btn-full-prev"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
        >
          <SkipBack className="w-4 h-4" />
          <span className="hidden sm:inline">Câu trước</span>
        </button>

        {/* Center: Play/Pause and Stop */}
        <div className="flex items-center gap-3">
          <button
            id="btn-full-play-pause"
            onClick={onPlayPause}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 shadow-lg font-bold transition-all active:scale-95"
            title={isPaused ? 'Tiếp tục phát' : 'Tạm dừng'}
          >
            {isPaused ? (
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            ) : (
              <Pause className="w-6 h-6 fill-current" />
            )}
          </button>

          <button
            id="btn-full-stop"
            onClick={onStop}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 transition-all active:scale-95"
            title="Dừng chế độ nghe toàn bài"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Dừng</span>
          </button>
        </div>

        {/* Next Sentence */}
        <button
          id="btn-full-next"
          onClick={onNext}
          disabled={currentIndex >= totalSentences - 1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
        >
          <span className="hidden sm:inline">Câu tiếp</span>
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

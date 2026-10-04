import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Zap,
  Mic,
  Settings2,
  ChevronDown,
  ChevronUp,
  Volume2,
} from 'lucide-react';
import { VoiceOption } from '../types';
import { AI_VOICE_OPTIONS } from '../services/aiAudioService';

export type AudioEngineMode = 'ai' | 'system';

interface AudioControlsProps {
  currentIndex: number;
  totalSentences: number;
  onPrev: () => void;
  onNext: () => void;
  onPlayNext?: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPlayAi?: () => void;
  onPlaySystem?: () => void;
  onPause: () => void;
  onReplay: () => void;
  onSlowPlay: () => void;
  currentRate: number;
  onRateChange: (rate: number) => void;
  // Audio Mode
  audioMode: AudioEngineMode;
  onAudioModeChange: (mode: AudioEngineMode) => void;
  // System Voice
  voices: VoiceOption[];
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  // AI Voice
  selectedAiVoice: string;
  onAiVoiceChange: (voice: string) => void;
  hasAiAudio: boolean;
  isGeneratingAiAudio: boolean;
  onRegenerateAiAudio: () => void;
  // Auto next toggle
  autoNext: boolean;
  onToggleAutoNext: () => void;
  // Practice repeat modal trigger
  onPractice?: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25];

export const AudioControls: React.FC<AudioControlsProps> = ({
  currentIndex,
  totalSentences,
  onPrev,
  onNext,
  onPlayNext,
  isPlaying,
  isPaused,
  onPlay,
  onPlayAi,
  onPlaySystem,
  onPause,
  onReplay,
  onSlowPlay,
  currentRate,
  onRateChange,
  audioMode,
  onAudioModeChange,
  voices,
  selectedVoiceId,
  onVoiceChange,
  selectedAiVoice,
  onAiVoiceChange,
  hasAiAudio,
  isGeneratingAiAudio,
  onRegenerateAiAudio,
  autoNext,
  onToggleAutoNext,
  onPractice,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const hasNext = currentIndex < totalSentences - 1;
  const hasPrev = currentIndex > 0;

  return (
    <div
      id="top-audio-controls-panel"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3.5 transition-all"
    >
      {/* PRIMARY CONTROLS: LISTEN AI • LISTEN SYSTEM • SPEAK • SLOW • NEXT • PREV */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Core Actions Cluster */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Previous Sentence */}
          <button
            id="btn-top-prev"
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            className="flex items-center justify-center gap-1 px-3 sm:px-3.5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
            title="Quay lại câu trước"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
            <span className="hidden md:inline">Trước</span>
          </button>

          {/* DEDICATED BUTTON 1: NGHE GIỌNG AI */}
          <button
            id="btn-play-ai-voice"
            type="button"
            onClick={onPlayAi || onPlay}
            disabled={isGeneratingAiAudio}
            className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-2xl font-extrabold text-xs sm:text-sm text-white shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
              isPlaying && audioMode === 'ai' && !isPaused
                ? 'bg-amber-500 hover:bg-amber-600 ring-2 ring-amber-300'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 ring-2 ring-indigo-300/60'
            }`}
            title={`Nghe giọng đọc AI tự nhiên (${selectedAiVoice})`}
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
                <span>Nghe giọng AI ({selectedAiVoice})</span>
              </>
            )}
          </button>

          {/* DEDICATED BUTTON 2: NGHE HỆ THỐNG */}
          <button
            id="btn-play-system-voice"
            type="button"
            onClick={onPlaySystem || onPlay}
            className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-2xl font-extrabold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer ${
              isPlaying && audioMode === 'system' && !isPaused
                ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                : 'bg-slate-800 hover:bg-slate-900 text-white shadow-md shadow-slate-200 ring-2 ring-slate-300'
            }`}
            title="Nghe giọng đọc chuẩn của thiết bị/trình duyệt"
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

          {/* MAIN [🎙 LUYỆN ĐỌC] (REPEAT & SPEAK) BUTTON */}
          {onPractice && (
            <button
              id="btn-top-practice"
              type="button"
              onClick={onPractice}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-200 transition-all active:scale-95 cursor-pointer ring-2 ring-emerald-300/60"
              title="Mở bảng luyện phát âm câu này"
            >
              <Mic className="w-4 h-4" />
              <span>LUYỆN ĐỌC</span>
            </button>
          )}

          {/* FAST [NGHE CÂU SAU ➔] BUTTON (ONE-CLICK ADVANCE & PLAY) */}
          {onPlayNext && hasNext && (
            <button
              id="btn-top-play-next"
              type="button"
              onClick={onPlayNext}
              disabled={isGeneratingAiAudio}
              className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Chuyển ngay sang câu sau và tự động phát âm"
            >
              <span>Câu sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Next Sentence Navigation */}
          <button
            id="btn-top-next"
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="flex items-center justify-center gap-1 px-3 sm:px-3.5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
            title="Chuyển sang câu sau"
          >
            <span className="hidden md:inline">Sau</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
          </button>

          {/* Quick Replay */}
          <button
            id="btn-top-replay"
            type="button"
            onClick={onReplay}
            disabled={isGeneratingAiAudio}
            className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Nghe lại câu này từ đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Pills & Settings Trigger */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {/* Speed Selector: [0.5x] [0.75x] [1x] [1.25x] */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-400 px-1.5 hidden lg:inline">
              Tốc độ:
            </span>
            {SPEED_OPTIONS.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => onRateChange(rate)}
                className={`px-2.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  currentRate === rate
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`Tốc độ đọc ${rate}×`}
              >
                {rate}×
              </button>
            ))}
          </div>

          {/* Settings / Advanced Audio Options Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              showSettings
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-200'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            title="Tùy chỉnh giọng đọc và cài đặt nâng cao"
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

      {/* ADVANCED SETTINGS ACCORDION (Keeps technical clutter hidden until needed) */}
      {showSettings && (
        <div className="pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Engine switcher */}
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
                  <Sparkles className="w-3.5 h-3.5" />
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
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Giọng Hệ Thống</span>
                </button>
              </div>
            </div>

            {/* Voice Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              {audioMode === 'ai' ? (
                <>
                  <span className="font-bold text-slate-500">Giọng:</span>
                  <select
                    id="select-top-ai-voice"
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
                </>
              ) : (
                <>
                  <span className="font-bold text-slate-500">Giọng trình duyệt:</span>
                  <select
                    id="select-top-system-voice"
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
              )}

              {/* Auto Next Option */}
              <button
                type="button"
                onClick={onToggleAutoNext}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ml-2 ${
                  autoNext
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800'
                }`}
                title="Tự động phát câu tiếp theo khi nghe xong câu hiện tại"
              >
                <Zap className={`w-3.5 h-3.5 ${autoNext ? 'text-amber-300 fill-current' : 'text-slate-400'}`} />
                <span>Tự động chuyển câu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import { Volume2, X, BookOpen } from 'lucide-react';
import { WordToken } from '../types';
import { ttsManager } from '../services/tts';

interface WordPopupProps {
  word: WordToken;
  onClose: () => void;
  buttonId?: string;
}

export const WordPopup: React.FC<WordPopupProps> = ({ word, onClose, buttonId }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside (empty space) or Escape key
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Do not close if clicking inside this popup
      if (popupRef.current && popupRef.current.contains(target)) {
        return;
      }

      // Do not close if clicking the button of this word (it handles its own toggle/re-read)
      if (buttonId && target.closest(`#${buttonId}`)) {
        return;
      }

      // User clicked outside into empty space -> close popup
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, buttonId]);

  // Viewport edge collision clamping
  useEffect(() => {
    if (!popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    const padding = 12;

    if (rect.left < padding) {
      const shift = padding - rect.left;
      popupRef.current.style.transform = `translateX(calc(-50% + ${shift}px))`;
    } else if (rect.right > window.innerWidth - padding) {
      const shift = rect.right - (window.innerWidth - padding);
      popupRef.current.style.transform = `translateX(calc(-50% - ${shift}px))`;
    }
  }, []);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    ttsManager.speakWord(
      word.text,
      () => setIsPlaying(true),
      () => setIsPlaying(false)
    );
  };

  return (
    <div
      ref={popupRef}
      id="word-dictionary-popup"
      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 max-w-[85vw] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 text-left transition-all animate-in fade-in zoom-in-95 duration-150 select-text"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between border-b border-slate-100 pb-2 mb-2">
        <div className="pr-2">
          <span className="font-bold text-lg text-slate-900">{word.text}</span>
          {word.ipa && (
            <span className="ml-2 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
              {word.ipa}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          title="Đóng (hoặc bấm ra khoảng trống)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-400 flex items-center gap-1 mb-1 font-medium">
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span>Nghĩa tiếng Việt</span>
        </div>
        <div className="text-sm font-medium text-slate-800 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
          {word.meaning || 'Từ vựng tiếng Anh trong bài học'}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSpeak}
        className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          isPlaying
            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-98'
        }`}
      >
        <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce' : ''}`} />
        <span>{isPlaying ? 'Đang phát âm...' : 'Phát âm lại từ này'}</span>
      </button>

      {/* Little arrow down */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white drop-shadow-xs pointer-events-none" />
    </div>
  );
};


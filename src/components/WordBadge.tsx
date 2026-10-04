import React, { useState, memo } from 'react';
import { WordToken } from '../types';
import { WordPopup } from './WordPopup';
import { ttsManager } from '../services/tts';

interface WordBadgeProps {
  word: WordToken;
  index: number;
  isActive: boolean;
  isPast?: boolean;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onWordClick?: (word: WordToken) => void;
  onSeek?: (wordIndex: number) => void;
  isPlaying?: boolean;
}

export const WordBadgeComponent: React.FC<WordBadgeProps> = ({
  word,
  index,
  isActive,
  isPast = false,
  isOpen,
  onOpen,
  onClose,
  onWordClick,
  onSeek,
  isPlaying = false,
}) => {
  const [localShowPopup, setLocalShowPopup] = useState(false);
  const [isSelfSpeaking, setIsSelfSpeaking] = useState(false);

  const showPopup = isOpen !== undefined ? isOpen : localShowPopup;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setLocalShowPopup(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // If audio is currently playing and onSeek is provided, clicking jumps directly to this word
    if (isPlaying && onSeek) {
      onSeek(index);
      return;
    }

    // Trigger speak word
    setIsSelfSpeaking(true);
    ttsManager.speakWord(
      word.text,
      () => setIsSelfSpeaking(true),
      () => setIsSelfSpeaking(false)
    );

    // Open dictionary popup
    if (onOpen) {
      onOpen();
    } else {
      setLocalShowPopup(true);
    }

    if (onWordClick) {
      onWordClick(word);
    }
  };

  const isHighlighted = isActive || isSelfSpeaking || showPopup;

  return (
    <span className="relative inline-block my-1.5 mx-1 align-baseline">
      {/* Animated glowing beacon above active spoken word */}
      {isHighlighted && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-30">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600 shadow-sm"></span>
        </span>
      )}

      <button
        type="button"
        id={`word-token-${index}`}
        data-word-index={index}
        onClick={handleClick}
        className={`word-badge-btn inline-flex items-baseline px-2.5 py-1 rounded-xl text-2xl md:text-3xl tracking-tight transition-all duration-150 ease-out select-none cursor-pointer ${
          isHighlighted
            ? 'active-word bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-black shadow-xl shadow-amber-400/50 ring-4 ring-amber-400 scale-110 -translate-y-1 z-20 border-b-2 border-amber-600'
            : isPast
            ? 'text-slate-400 font-normal bg-transparent hover:text-slate-700'
            : 'text-slate-800 font-semibold bg-transparent hover:bg-slate-100 hover:text-slate-900'
        }`}
        title={isPlaying ? `Bấm để nhảy giọng đọc đến từ "${word.text}"` : 'Bấm để nghe riêng từ này và tra nghĩa'}
      >
        <span>{word.text}</span>
        {word.punctuation && (
          <span
            className={`select-none ml-0.5 ${
              isHighlighted ? 'text-amber-950 font-black' : isPast ? 'text-slate-400' : 'text-slate-700'
            }`}
          >
            {word.punctuation}
          </span>
        )}
      </button>

      {/* Dictionary definition popup on click */}
      {showPopup && (
        <WordPopup
          word={word}
          onClose={handleClose}
          buttonId={`word-token-${index}`}
        />
      )}
    </span>
  );
};

export const WordBadge = memo(WordBadgeComponent);


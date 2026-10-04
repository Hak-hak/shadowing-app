import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Mic, CheckCircle2, Volume2 } from 'lucide-react';
import { SentenceItem, WordToken } from '../types';
import { WordBadge } from './WordBadge';
import { normalizeSentence } from '../utils/sentenceUtils';

interface FullScriptViewProps {
  sentences: SentenceItem[];
  currentSentenceIndex: number;
  activeWordIndex: number | null;
  isPlaying: boolean;
  isFullPlaying: boolean;
  showVietnamese: boolean;
  onPlayFromSentence: (index: number) => void;
  onPracticeSentence: (index: number) => void;
  completedSentences: number[];
}

export const FullScriptView: React.FC<FullScriptViewProps> = ({
  sentences,
  currentSentenceIndex,
  activeWordIndex,
  isPlaying,
  isFullPlaying,
  showVietnamese,
  onPlayFromSentence,
  onPracticeSentence,
  completedSentences,
}) => {
  // Key format: `${sIdx}-${wIdx}`
  const [openedWordKey, setOpenedWordKey] = useState<string | null>(null);

  // Close popup on click outside
  useEffect(() => {
    if (!openedWordKey) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('#word-dictionary-popup')) return;
      setOpenedWordKey(null);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openedWordKey]);

  // Normalize all sentences to ensure punctuation is attached to the final word
  const normalizedSentences = useMemo(() => {
    return sentences.map((s) => normalizeSentence(s));
  }, [sentences]);

  return (
    <div id="full-script-container" className="space-y-4">
      {normalizedSentences.map((sentence, sIdx) => {
        const isCurrent = sIdx === currentSentenceIndex;
        const isSentenceActive = isCurrent && (isPlaying || isFullPlaying);
        const isCompleted = completedSentences.includes(sentence.id);

        const isSpeakerA = sentence.speaker.toUpperCase().includes('A') || sentence.speaker === '1';
        const isSpeakerB = sentence.speaker.toUpperCase().includes('B') || sentence.speaker === '2';
        const isNarrator = sentence.speaker.toLowerCase().includes('narrator');

        let speakerColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
        let speakerBadgeText = `Người nói ${sentence.speaker}`;

        if (isSpeakerA) {
          speakerColor = 'bg-blue-100 text-blue-800 border-blue-200';
          speakerBadgeText = 'Nhân vật A';
        } else if (isSpeakerB) {
          speakerColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
          speakerBadgeText = 'Nhân vật B';
        } else if (isNarrator) {
          speakerColor = 'bg-purple-100 text-purple-800 border-purple-200';
          speakerBadgeText = 'Lời dẫn';
        } else if (sentence.speaker) {
          speakerBadgeText = sentence.speaker;
        }

        return (
          <div
            key={sentence.id}
            id={`script-sentence-${sentence.id}`}
            className={`rounded-2xl p-5 border transition-all duration-200 ${
              isSentenceActive
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200 shadow-md'
                : isCurrent
                ? 'bg-white border-slate-300 shadow-xs'
                : 'bg-white/80 border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Header: Speaker, sentence index, action buttons */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${speakerColor}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {speakerBadgeText}
                </span>

                <span className="text-xs font-semibold text-slate-400">
                  Câu {sIdx + 1}
                </span>

                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã luyện
                  </span>
                )}
              </div>

              {/* Action Buttons for this line */}
              <div className="flex items-center gap-1.5">
                <button
                  id={`btn-play-line-${sIdx}`}
                  onClick={() => onPlayFromSentence(sIdx)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isSentenceActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Nghe câu này"
                >
                  {isSentenceActive ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      <span>Đang phát</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Phát câu này</span>
                    </>
                  )}
                </button>

                <button
                  id={`btn-practice-line-${sIdx}`}
                  onClick={() => onPracticeSentence(sIdx)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-700 transition-colors"
                  title="Luyện đọc câu này"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Word Badges */}
            <div className="flex flex-wrap items-center min-h-[40px] mb-2">
              {sentence.words && sentence.words.length > 0 ? (
                sentence.words.map((word: WordToken, wIdx: number) => {
                  const wordKey = `${sIdx}-${wIdx}`;
                  const isWordActive = isSentenceActive && (activeWordIndex === wIdx || (activeWordIndex === null && wIdx === 0));
                  const isWordPast =
                    isSentenceActive && activeWordIndex !== null && wIdx < activeWordIndex;

                  return (
                    <WordBadge
                      key={`${sentence.id}-w-${wIdx}`}
                      word={word}
                      index={wIdx}
                      isActive={isWordActive}
                      isPast={isWordPast}
                      isOpen={openedWordKey === wordKey}
                      onOpen={() => setOpenedWordKey(wordKey)}
                      onClose={() => setOpenedWordKey(null)}
                    />
                  );
                })
              ) : (
                <p className="text-lg font-medium text-slate-800">
                  {sentence.english}
                </p>
              )}
            </div>

            {/* Vietnamese Translation */}
            {showVietnamese && (
              <div className="mt-2 text-sm text-slate-500 font-normal border-t border-slate-100 pt-2">
                <span className="text-xs font-semibold text-slate-400 mr-1.5 uppercase">Dịch:</span>
                {sentence.vietnamese}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

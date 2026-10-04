import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, ArrowRight, Settings, Volume2, Mic, Clock, Sparkles } from 'lucide-react';
import { SentenceItem, Lesson } from '../types';
import { ttsManager } from '../services/tts';
import { normalizeSentence } from '../utils/sentenceUtils';

interface ShadowingModalProps {
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onCompleteSentence: (sentenceId: number) => void;
}

type ShadowingStep = 'idle' | 'listening' | 'waiting_for_student' | 'paused' | 'finished';

export const ShadowingModal: React.FC<ShadowingModalProps> = ({
  lesson,
  isOpen,
  onClose,
  onCompleteSentence,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<ShadowingStep>('idle');
  const [delaySeconds, setDelaySeconds] = useState(3); // 2s, 3s, 5s
  const [remainingTime, setRemainingTime] = useState(3);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);

  const countdownRef = useRef<any>(null);

  const currentSentence: SentenceItem | undefined = lesson.sentences[currentIndex]
    ? normalizeSentence(lesson.sentences[currentIndex])
    : undefined;

  // Stop TTS when closing
  useEffect(() => {
    if (!isOpen) {
      ttsManager.stop();
      if (countdownRef.current) clearInterval(countdownRef.current);
      setStep('idle');
      setActiveWordIdx(null);
    }
  }, [isOpen]);

  const startCurrentSentence = () => {
    if (!currentSentence) return;

    if (countdownRef.current) clearInterval(countdownRef.current);
    setStep('listening');
    setActiveWordIdx(null);

    ttsManager.speakSentence(
      currentSentence.english,
      currentSentence.words,
      {
        onWordChange: (idx) => setActiveWordIdx(idx),
        onEnd: () => {
          setActiveWordIdx(null);
          // Transition to student speaking window
          startStudentCountdown();
        },
        onError: () => {
          setStep('idle');
        },
      }
    );
  };

  const startStudentCountdown = () => {
    setStep('waiting_for_student');
    setRemainingTime(delaySeconds);

    let timeLeft = delaySeconds;
    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setRemainingTime(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(countdownRef.current);
        if (currentSentence) {
          onCompleteSentence(currentSentence.id);
        }

        if (autoAdvance) {
          if (currentIndex < lesson.sentences.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            // Small pause before reading next
            setTimeout(() => {
              // Proceed next
            }, 600);
          } else {
            setStep('finished');
          }
        } else {
          setStep('idle');
        }
      }
    }, 1000);
  };

  // Watch for index change when running
  useEffect(() => {
    if (step === 'waiting_for_student' && remainingTime <= 0 && autoAdvance) {
      startCurrentSentence();
    }
  }, [currentIndex]);

  const handleTogglePlay = () => {
    if (step === 'idle' || step === 'finished') {
      if (step === 'finished') setCurrentIndex(0);
      startCurrentSentence();
    } else if (step === 'listening') {
      ttsManager.pause();
      setStep('paused');
    } else if (step === 'paused') {
      ttsManager.resume();
      setStep('listening');
    } else if (step === 'waiting_for_student') {
      clearInterval(countdownRef.current);
      setStep('paused');
    }
  };

  const handleStop = () => {
    ttsManager.stop();
    if (countdownRef.current) clearInterval(countdownRef.current);
    setStep('idle');
    setActiveWordIdx(null);
  };

  const handleNextSentence = () => {
    handleStop();
    if (currentIndex < lesson.sentences.length - 1) {
      setCurrentIndex((p) => p + 1);
    }
  };

  const handlePrevSentence = () => {
    handleStop();
    if (currentIndex > 0) {
      setCurrentIndex((p) => p - 1);
    }
  };

  if (!isOpen || !currentSentence) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="shadowing-modal"
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-lg">Chế độ Shadowing (Nghe - Lặp lại)</h3>
              <p className="text-xs text-indigo-200">
                {lesson.title} • Câu {currentIndex + 1} / {lesson.sentences.length}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Shadowing configuration bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span className="font-medium">Thời gian chờ học sinh đọc:</span>
            <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
              {[2, 3, 5].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setDelaySeconds(sec)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    delaySeconds === sec
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Tự động chuyển câu (Auto Next)</span>
          </label>
        </div>

        {/* Main Content Area */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto flex flex-col justify-center items-center text-center">
          {/* Status Indicator */}
          <div className="mb-4">
            {step === 'listening' && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-sm font-semibold animate-pulse">
                <Volume2 className="w-4 h-4" />
                1. Đang đọc câu mẫu • Hãy lắng nghe kỹ
              </span>
            )}
            {step === 'waiting_for_student' && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-900 text-sm font-bold ring-2 ring-amber-300">
                <Mic className="w-4 h-4 text-amber-600 animate-bounce" />
                2. LƯỢT CỦA BẠN! Hãy nhắc lại câu vừa nghe ({remainingTime}s)
              </span>
            )}
            {step === 'idle' && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                Nhấn Bắt đầu để vào chu trình Shadowing
              </span>
            )}
            {step === 'paused' && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
                Đang tạm dừng
              </span>
            )}
            {step === 'finished' && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold">
                🎉 Hoàn thành bài luyện Shadowing!
              </span>
            )}
          </div>

          {/* Current Sentence Display with Word Highlight */}
          <div className="my-4 max-w-lg">
            <div className="text-2xl md:text-3xl font-semibold text-slate-900 leading-relaxed mb-3">
              {currentSentence.words.map((w, idx) => (
                <span
                  key={idx}
                  className={`inline-block mx-0.5 px-1.5 py-0.5 rounded-lg font-semibold transition-colors duration-150 ease-out ${
                    step === 'listening' && activeWordIdx === idx
                      ? 'bg-amber-300 text-amber-950 shadow-xs ring-2 ring-amber-400/80'
                      : 'text-slate-800'
                  }`}
                >
                  {w.text}
                  {w.punctuation || ''}
                </span>
              ))}
            </div>

            <p className="text-base text-slate-500 font-medium">
              {currentSentence.vietnamese}
            </p>
          </div>

          {/* Visual countdown progress for student turn */}
          {step === 'waiting_for_student' && (
            <div className="w-full max-w-md my-4">
              <div className="flex justify-between text-xs text-amber-800 font-semibold mb-1">
                <span>Nói theo mẫu...</span>
                <span>{remainingTime} giây</span>
              </div>
              <div className="h-3 w-full bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(remainingTime / delaySeconds) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handlePrevSentence}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-medium disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            ← Câu trước
          </button>

          <div className="flex items-center gap-3">
            <button
              id="btn-shadowing-main-action"
              onClick={handleTogglePlay}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-md transition-all active:scale-95"
            >
              {step === 'listening' || step === 'waiting_for_student' ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{step === 'paused' ? 'Tiếp tục' : 'Bắt đầu đọc'}</span>
                </>
              )}
            </button>

            {(step === 'listening' || step === 'waiting_for_student' || step === 'paused') && (
              <button
                onClick={handleStop}
                className="p-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors"
                title="Dừng lại"
              >
                <Square className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={handleNextSentence}
            disabled={currentIndex >= lesson.sentences.length - 1}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-medium disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
          >
            <span>Câu sau</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

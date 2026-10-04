import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Play, RotateCcw, Award, CheckCircle2, AlertCircle, Sparkles, Volume2, X } from 'lucide-react';
import { SentenceItem, PronunciationResult } from '../types';
import { speechPractice } from '../services/speechRecognition';
import { ttsManager } from '../services/tts';
import { normalizeSentence } from '../utils/sentenceUtils';

interface PronunciationModalProps {
  sentence: SentenceItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (score: number) => void;
}

export const PronunciationModal: React.FC<PronunciationModalProps> = ({
  sentence,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const safeSentence = normalizeSentence(sentence);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [isPlayingOwnVoice, setIsPlayingOwnVoice] = useState(false);
  const [activeRefWordIndex, setActiveRefWordIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      ttsManager.stop();
      setIsRecording(false);
      setTranscript('');
      setRecordedAudioUrl(null);
      setResult(null);
      setActiveRefWordIndex(null);
    }
  }, [isOpen]);

  const handleStartRecording = async () => {
    setResult(null);
    setTranscript('');
    setIsRecording(true);

    await speechPractice.startListening({
      onInterim: (text) => setTranscript(text),
      onFinal: (text) => {
        setTranscript(text);
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
      },
    });
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    const audioUrl = await speechPractice.stopListening();
    if (audioUrl) {
      setRecordedAudioUrl(audioUrl);
    }

    // If transcript is available, send for evaluation
    evaluateStudentSpeech(transcript);
  };

  const evaluateStudentSpeech = async (spoken: string) => {
    if (!spoken.trim()) {
      setResult({
        score: 45,
        feedback: 'Chưa nghe rõ giọng của bạn. Hãy đảm bảo micro hoạt động và phát âm to, rõ ràng hơn nhé!',
        correctWords: [],
        mispronouncedWords: safeSentence.words.map((w) => ({
          word: w.text,
          tip: 'Hãy nhấn vào từ để nghe mẫu và thử lại',
        })),
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/evaluate-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceSentence: safeSentence.english,
          spokenText: spoken,
        }),
      });

      const data = await response.json();
      if (data.success && data.evaluation) {
        setResult(data.evaluation);
        if (data.evaluation.score >= 70) {
          onSuccess(data.evaluation.score);
        }
      }
    } catch (e) {
      // Offline fallback comparison
      const refWords = safeSentence.english.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      const spokenWords = spoken.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      const matched = refWords.filter((w) => spokenWords.includes(w));
      const score = Math.round((matched.length / Math.max(refWords.length, 1)) * 100);

      const evaluation: PronunciationResult = {
        score: Math.max(score, 60),
        feedback: score >= 80 ? 'Rất tốt! Bạn phát âm câu rất tự nhiên và chính xác.' : 'Luyện tập thêm một chút để ngữ điệu mượt mà hơn nhé!',
        correctWords: matched,
        mispronouncedWords: refWords.filter((w) => !spokenWords.includes(w)).map((w) => ({
          word: w,
          tip: `Hãy luyện phát âm rõ từ "${w}"`,
        })),
      };
      setResult(evaluation);
      if (score >= 70) onSuccess(score);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayReference = () => {
    setActiveRefWordIndex(null);
    ttsManager.speakSentence(safeSentence.english, safeSentence.words, {
      onWordChange: (idx) => setActiveRefWordIndex(idx),
      onEnd: () => setActiveRefWordIndex(null),
      onError: () => setActiveRefWordIndex(null),
    });
  };

  const handlePlayOwnVoice = () => {
    if (!recordedAudioUrl) return;
    const audio = new Audio(recordedAudioUrl);
    setIsPlayingOwnVoice(true);
    audio.play();
    audio.onended = () => setIsPlayingOwnVoice(false);
    audio.onerror = () => setIsPlayingOwnVoice(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="pronunciation-practice-modal"
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-lg">Luyện phát âm câu (Repeat Mode)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Reference Sentence */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Câu mẫu cần đọc:
              </span>
              <button
                onClick={handlePlayReference}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Nghe lại mẫu</span>
              </button>
            </div>
            <div className="text-lg md:text-xl font-semibold text-slate-800 leading-relaxed my-1">
              {safeSentence.words && safeSentence.words.length > 0 ? (
                safeSentence.words.map((w, wIdx) => (
                  <span
                    key={wIdx}
                    className={`inline-block mr-1.5 px-1.5 py-0.5 rounded-lg font-semibold transition-colors duration-150 ease-out ${
                      activeRefWordIndex === wIdx
                        ? 'bg-amber-300 text-amber-950 shadow-xs ring-2 ring-amber-400/80'
                        : 'text-slate-800'
                    }`}
                  >
                    {w.text}
                    {w.punctuation || ''}
                  </span>
                ))
              ) : (
                <span>{safeSentence.english}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {sentence.vietnamese}
            </p>
          </div>

          {/* Recording interface */}
          <div className="flex flex-col items-center justify-center py-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <button
              id="btn-toggle-mic-recording"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                isRecording
                  ? 'bg-rose-500 text-white ring-8 ring-rose-200 scale-105 animate-pulse'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>

            <span className="mt-3 text-sm font-semibold text-slate-700">
              {isRecording ? 'Đang thu âm... Nhấn lại để hoàn thành' : 'Bấm vào micro để bắt đầu đọc'}
            </span>

            {/* Real-time transcript preview */}
            {transcript && (
              <div className="mt-3 px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 max-w-md text-center shadow-2xs">
                <span className="text-xs text-slate-400 block font-medium">Bạn vừa nói:</span>
                "{transcript}"
              </div>
            )}

            {/* Playback student's voice */}
            {recordedAudioUrl && !isRecording && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handlePlayOwnVoice}
                  disabled={isPlayingOwnVoice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isPlayingOwnVoice ? 'Đang phát...' : 'Nghe lại giọng của bạn'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Analysis loading */}
          {isAnalyzing && (
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center gap-3 text-indigo-700 text-sm font-medium">
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>AI đang chấm điểm phát âm của bạn...</span>
            </div>
          )}

          {/* Pronunciation Evaluation Result */}
          {result && !isAnalyzing && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Điểm số</span>
                    <h4 className="text-2xl font-black text-slate-900 leading-none">
                      {result.score} / 100
                    </h4>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    result.score >= 80
                      ? 'bg-emerald-100 text-emerald-800'
                      : result.score >= 60
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {result.score >= 80 ? 'Xuất sắc' : result.score >= 60 ? 'Đạt' : 'Cần cố gắng'}
                </span>
              </div>

              <p className="text-sm font-medium text-slate-700">
                {result.feedback}
              </p>

              {/* Word breakdown */}
              {result.mispronouncedWords && result.mispronouncedWords.length > 0 && (
                <div className="mt-1 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500 block mb-1.5">
                    Từ cần lưu ý thêm:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.mispronouncedWords.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-900"
                      >
                        <span className="font-bold">{item.word}:</span> {item.tip}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

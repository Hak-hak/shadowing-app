import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Volume2,
  Edit3,
  Save,
  RotateCcw,
  Headphones,
  ChevronDown,
  ChevronUp,
  Mic,
  Languages,
} from 'lucide-react';
import { Lesson, SentenceItem } from '../types';
import { storageService } from '../services/storage';
import { ttsManager } from '../services/tts';
import { aiAudioService, AI_VOICE_OPTIONS } from '../services/aiAudioService';

interface CreateLessonProps {
  onLessonCreated: (lesson: Lesson) => void;
  onCancel: () => void;
}

interface PreviewData {
  lessonTitle: string;
  topic: string;
  grade: string;
  sentences: SentenceItem[];
}

const EXAMPLE_CONVERSATION = `A: What do you usually do after school?
B: I usually play badminton with my friends.
A: How often do you play badminton?
B: I play it twice a week.`;

const EXAMPLE_READING = `Eating healthy food is very important for teenagers. You should drink plenty of water and eat fresh fruits every day. Exercising regularly also helps you stay active and happy.`;

export const CreateLesson: React.FC<CreateLessonProps> = ({ onLessonCreated, onCancel }) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Step 1: Input Form State
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('Lớp 7');
  const [rawText, setRawText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 2: Preview & Inline Editing State
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [expandedWordSentenceId, setExpandedWordSentenceId] = useState<number | null>(null);
  const [playingSentenceId, setPlayingSentenceId] = useState<number | null>(null);

  // Batch AI Voice generation in Preview
  const [selectedAiVoice, setSelectedAiVoice] = useState('Kore');
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [generatingSingleId, setGeneratingSingleId] = useState<number | null>(null);

  const handleFillExample = (type: 'conversation' | 'reading') => {
    if (type === 'conversation') {
      setTitle('After-school Activities');
      setTopic('Daily Activities');
      setGrade('Lớp 6');
      setRawText(EXAMPLE_CONVERSATION);
    } else {
      setTitle('Healthy Habits for Students');
      setTopic('Health & Lifestyle');
      setGrade('Lớp 8');
      setRawText(EXAMPLE_READING);
    }
  };

  // Fallback parser on client when network or server is slow/offline
  const parseLessonLocally = (text: string, lessonTitle?: string, lessonTopic?: string, lessonGrade?: string): PreviewData => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sentences: SentenceItem[] = [];
    let currentId = 1;

    for (const line of lines) {
      let speaker = 'A';
      let content = line;

      const speakerMatch = line.match(/^([A-Za-z0-9\s]+)[:：]\s*(.+)$/);
      if (speakerMatch) {
        speaker = speakerMatch[1].trim();
        content = speakerMatch[2].trim();
      } else if (sentences.length > 0) {
        const prev = sentences[sentences.length - 1].speaker;
        speaker = prev === 'A' ? 'B' : 'A';
      }

      const parts = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [content];

      for (const part of parts) {
        let cleanPart = part.trim();
        if (!cleanPart) continue;

        if (!/[.?!]$/.test(cleanPart)) {
          const isQuestion = /^(\s*(what|where|when|why|who|whom|whose|which|how|do|does|did|are|is|am|was|were|can|could|will|would|shall|should|have|has|had|may|might))\b/i.test(cleanPart);
          cleanPart += isQuestion ? '?' : '.';
        }

        const endingMatch = cleanPart.match(/([.?!]+)$/);
        const endingPunct = endingMatch ? endingMatch[1] : '.';
        const rawTokens = cleanPart.split(/\s+/).filter(Boolean);

        const words = rawTokens.map((w, idx) => {
          const punctMatch = w.match(/([,;:!?.…]+)$/);
          const cleaned = w.replace(/^[.,/#!$%^&*;:{}=\-_`~()?"']+|[.,/#!$%^&*;:{}=\-_`~()?"']+$/g, '');
          return {
            text: cleaned || w,
            punctuation: idx === rawTokens.length - 1 ? endingPunct : (punctMatch ? punctMatch[1] : undefined),
          };
        });

        sentences.push({
          id: currentId++,
          speaker,
          english: cleanPart,
          vietnamese: '',
          words,
        });
      }
    }

    return {
      lessonTitle: lessonTitle || 'Bài học luyện nói mới',
      topic: lessonTopic || 'Giao tiếp tiếng Anh',
      grade: lessonGrade || 'Lớp 7',
      sentences: sentences.length > 0 ? sentences : [
        {
          id: 1,
          speaker: 'Speaker',
          english: text,
          vietnamese: '',
          words: text.split(/\s+/).map((w) => ({ text: w })),
        },
      ],
    };
  };

  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMsg('Vui lòng nhập đoạn hội thoại hoặc đoạn văn tiếng Anh.');
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);

    try {
      // 12-second abort timeout so user is never frozen waiting for slow requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch('/api/ai/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          rawText,
          title: title.trim(),
          topic: topic.trim(),
          grade,
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data.sentences)) {
          setPreviewData({
            lessonTitle: result.data.lessonTitle || title || 'Bài học luyện nói mới',
            topic: result.data.topic || topic || 'Giao tiếp tiếng Anh',
            grade: result.data.grade || grade,
            sentences: result.data.sentences,
          });
          setStep('preview');
          return;
        }
      }

      // If server returned non-200 or unexpected structure, fall back to local parser
      const fallback = parseLessonLocally(rawText, title.trim(), topic.trim(), grade);
      setPreviewData(fallback);
      setStep('preview');
    } catch (err: any) {
      console.warn('Network or AI service busy, parsing lesson with integrated parser:', err);
      // Seamlessly fall back to client-side parser so user flow is never blocked
      const fallback = parseLessonLocally(rawText, title.trim(), topic.trim(), grade);
      setPreviewData(fallback);
      setStep('preview');
    } finally {
      setIsGenerating(false);
    }
  };

  // Inline editing handlers in Preview
  const handleUpdateSentenceField = (
    sentenceId: number,
    field: 'vietnamese' | 'english' | 'speaker',
    value: string
  ) => {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      sentences: previewData.sentences.map((s) => {
        if (s.id === sentenceId) {
          return { ...s, [field]: value };
        }
        return s;
      }),
    });
  };

  const handleUpdateWordMeaning = (sentenceId: number, wordIndex: number, newMeaning: string) => {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      sentences: previewData.sentences.map((s) => {
        if (s.id === sentenceId) {
          const updatedWords = [...s.words];
          if (updatedWords[wordIndex]) {
            updatedWords[wordIndex] = { ...updatedWords[wordIndex], meaning: newMeaning };
          }
          return { ...s, words: updatedWords };
        }
        return s;
      }),
    });
  };

  // Test listen single sentence
  const handleTestListen = async (sentence: SentenceItem) => {
    if (playingSentenceId === sentence.id) {
      ttsManager.stop();
      aiAudioService.stopPlayback();
      setPlayingSentenceId(null);
      return;
    }

    setPlayingSentenceId(sentence.id);

    // If already has AI audio, play AI audio
    if (sentence.audioBase64) {
      const dataUrl = `data:${sentence.audioMimeType || 'audio/wav'};base64,${sentence.audioBase64}`;
      try {
        await aiAudioService.playAiAudio(dataUrl, sentence.english, sentence.words, 1.0, {
          onEnd: () => setPlayingSentenceId(null),
          onError: () => setPlayingSentenceId(null),
        });
      } catch {
        setPlayingSentenceId(null);
      }
      return;
    }

    // Otherwise use system voice
    ttsManager.speakSentence(sentence.english, sentence.words, {
      onEnd: () => setPlayingSentenceId(null),
      onError: () => setPlayingSentenceId(null),
    });
  };

  // Generate single sentence AI audio right in preview
  const handleGenerateSingleAudio = async (sentence: SentenceItem) => {
    setGeneratingSingleId(sentence.id);
    try {
      const result = await aiAudioService.generateSpeechApi(sentence.english, selectedAiVoice);
      if (previewData) {
        setPreviewData({
          ...previewData,
          sentences: previewData.sentences.map((s) => {
            if (s.id === sentence.id) {
              return {
                ...s,
                audioBase64: result.audioBase64,
                audioMimeType: result.mimeType,
                audioVoice: result.voiceName,
              };
            }
            return s;
          }),
        });
      }
    } catch (err: any) {
      alert(`Không thể tạo giọng AI: ${err.message || 'Lỗi kết nối'}`);
    } finally {
      setGeneratingSingleId(null);
    }
  };

  // Batch generate AI audio for all sentences in preview
  const handleBatchGenerateAudio = async () => {
    if (!previewData || previewData.sentences.length === 0) return;
    setIsBatchGenerating(true);
    const total = previewData.sentences.length;
    setBatchProgress({ current: 0, total });

    const updatedSentences = [...previewData.sentences];
    let createdCount = 0;
    let rateLimited = false;

    for (let i = 0; i < total; i++) {
      const sent = updatedSentences[i];
      setBatchProgress({ current: i + 1, total });

      // Skip if already generated
      if (sent.audioBase64) {
        createdCount++;
        continue;
      }

      try {
        const res = await aiAudioService.generateSpeechApi(sent.english, selectedAiVoice);
        updatedSentences[i] = {
          ...sent,
          audioBase64: res.audioBase64,
          audioMimeType: res.mimeType,
          audioVoice: res.voiceName,
        };
        createdCount++;

        // Pacing delay to avoid exceeding free-tier rate limits
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err: any) {
        console.warn(`[Batch TTS] Sentence ${sent.id}:`, err?.message);
        if (err?.isRateLimited) {
          rateLimited = true;
          break;
        }
      }
    }

    setPreviewData({
      ...previewData,
      sentences: updatedSentences,
    });
    setIsBatchGenerating(false);

    if (rateLimited) {
      alert(`Đã tạo và lưu thành công ${createdCount}/${total} câu bằng giọng AI. Các câu còn lại sẽ tự động phát mượt mà bằng giọng hệ thống, hoặc bạn có thể tạo tiếp sau ít phút!`);
    }
  };

  // Final confirmation: Save to library
  const handleConfirmAndSave = async () => {
    if (!previewData) return;

    const currentUser = storageService.getUser();
    const saved = storageService.addLesson({
      title: previewData.lessonTitle.trim() || 'Bài học luyện nói mới',
      topic: previewData.topic.trim() || 'Giao tiếp tiếng Anh',
      grade: previewData.grade || grade,
      createdBy: currentUser.name || 'Thầy/Cô giáo viên',
      authorRole: currentUser.role,
      sentences: previewData.sentences,
      visibility: 'public',
    });

    // Also persist any generated audio into IndexedDB so it's instantly available
    for (const sent of previewData.sentences) {
      if (sent.audioBase64) {
        await aiAudioService.saveAudio(
          saved.id,
          sent.id,
          sent.audioBase64,
          sent.audioMimeType || 'audio/wav'
        );
      }
    }

    onLessonCreated(saved);
  };

  return (
    <div id="create-lesson-screen" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {step === 'input' ? (
        /* STEP 1: INPUT RAW TEXT */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Tạo Bài Học Luyện Nói AI
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Phân tích câu, dịch nghĩa tiếng Việt chuẩn THCS, tách từ & phiên âm IPA
                </p>
              </div>
            </div>
          </div>

          {/* Quick sample fillers */}
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-indigo-900">
              💡 Dùng mẫu thử nghiệm nhanh:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleFillExample('conversation')}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 shadow-2xs transition-colors"
              >
                Hội thoại A-B (Đánh cầu lông)
              </button>
              <button
                type="button"
                onClick={() => handleFillExample('reading')}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 shadow-2xs transition-colors"
              >
                Đoạn văn (Lối sống lành mạnh)
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleGeneratePreview} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Title */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Tên bài học
                </label>
                <input
                  id="input-lesson-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Daily Activities & Free Time"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Grade */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Khối lớp
                </label>
                <select
                  id="select-lesson-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                >
                  <option value="Lớp 6">Lớp 6</option>
                  <option value="Lớp 7">Lớp 7</option>
                  <option value="Lớp 8">Lớp 8</option>
                  <option value="Lớp 9">Lớp 9</option>
                </select>
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Chủ đề (Topic)
              </label>
              <input
                id="input-lesson-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ví dụ: Hobbies, School, Family, Food, Environment..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Raw text */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Đoạn hội thoại hoặc đoạn văn tiếng Anh *
                </label>
                <span className="text-[11px] text-slate-400">
                  Có thể nhập tiền tố A:, B: hoặc từng đoạn tự do
                </span>
              </div>
              <textarea
                id="textarea-lesson-rawtext"
                rows={7}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Nhập hoặc dán nội dung vào đây...\nVí dụ:\nA: What do you usually do after school?\nB: I usually play badminton with my friends.`}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all resize-y"
                required
              />
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors"
              >
                Hủy bỏ
              </button>

              <button
                id="btn-submit-generate-lesson"
                type="submit"
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'AI Đang Xử Lý Nội Dung...' : 'Xử Lý & Xem Trước Bài Học'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* STEP 2: PREVIEW & INLINE EDITING OF TRANSLATIONS & AUDIO */
        previewData && (
          <div className="space-y-6">
            {/* Top Navigation & Status Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>AI đã phân tích {previewData.sentences.length} câu</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black">
                    Màn Hình Xem Trước & Chỉnh Sửa Bản Dịch
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                    Bạn có thể trực tiếp sửa bản dịch tiếng Việt, điều chỉnh người nói và tạo trước giọng đọc AI biểu cảm trước khi lưu.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Sửa văn bản gốc</span>
                </button>
              </div>
            </div>

            {/* General Lesson Info Bar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Thông tin bài học
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Tên bài học
                  </label>
                  <input
                    type="text"
                    value={previewData.lessonTitle}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, lessonTitle: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Chủ đề
                  </label>
                  <input
                    type="text"
                    value={previewData.topic}
                    onChange={(e) => setPreviewData({ ...previewData, topic: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Khối lớp
                  </label>
                  <select
                    value={previewData.grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white outline-none"
                  >
                    <option value="Lớp 6">Lớp 6</option>
                    <option value="Lớp 7">Lớp 7</option>
                    <option value="Lớp 8">Lớp 8</option>
                    <option value="Lớp 9">Lớp 9</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI Expressive Voice Batch Generation Tool */}
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-3xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-indigo-700" />
                    <h4 className="font-extrabold text-indigo-950 text-sm sm:text-base">
                      Tạo & Lưu Giọng Đọc AI Biểu Cảm Cho Toàn Bài
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-700/90 mt-1">
                    Tạo âm thanh một lần duy nhất. Âm thanh sẽ được lưu vĩnh viễn cùng bài học để nghe lại bất cứ lúc nào mà không cần chờ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedAiVoice}
                    onChange={(e) => setSelectedAiVoice(e.target.value)}
                    className="px-3 py-2 bg-white border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold shadow-2xs outline-none"
                  >
                    {AI_VOICE_OPTIONS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender === 'Female' ? 'Nữ' : 'Nam'} - {v.tag})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleBatchGenerateAudio}
                    disabled={isBatchGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isBatchGenerating ? 'animate-spin' : ''}`} />
                    <span>
                      {isBatchGenerating
                        ? `Đang tạo ${batchProgress.current}/${batchProgress.total} câu...`
                        : 'Tạo Giọng AI Toàn Bài'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sentences Preview & Inline Translation Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-extrabold text-slate-800 text-base">
                  Danh sách {previewData.sentences.length} câu hội thoại / văn bản
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Nhấp vào ô dịch nghĩa để chỉnh sửa bản dịch theo ý muốn
                </span>
              </div>

              {previewData.sentences.map((sentence, idx) => {
                const isExpanded = expandedWordSentenceId === sentence.id;
                const isPlaying = playingSentenceId === sentence.id;
                const isGeneratingThis = generatingSingleId === sentence.id;

                return (
                  <div
                    key={`preview-sentence-${sentence.id}`}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-3.5 hover:border-slate-300 transition-all"
                  >
                    {/* Header: Speaker and Audio Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <input
                          type="text"
                          value={sentence.speaker}
                          onChange={(e) =>
                            handleUpdateSentenceField(sentence.id, 'speaker', e.target.value)
                          }
                          placeholder="Người nói"
                          className="w-28 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 text-center outline-none focus:bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {sentence.audioBase64 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã có audio AI ({sentence.audioVoice || 'Kore'})</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Chưa tạo audio AI
                          </span>
                        )}

                        {/* Test listen button */}
                        <button
                          type="button"
                          onClick={() => handleTestListen(sentence)}
                          className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                            isPlaying
                              ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                          title="Nghe thử câu này"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Generate AI Voice for this sentence */}
                        <button
                          type="button"
                          onClick={() => handleGenerateSingleAudio(sentence)}
                          disabled={isGeneratingThis || isBatchGenerating}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors disabled:opacity-50"
                          title="Tạo giọng AI biểu cảm cho câu này"
                        >
                          <Sparkles className={`w-3 h-3 ${isGeneratingThis ? 'animate-spin' : ''}`} />
                          <span>{sentence.audioBase64 ? 'Tạo lại AI' : 'Tạo AI'}</span>
                        </button>
                      </div>
                    </div>

                    {/* English sentence text */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        🇬🇧 Câu tiếng Anh:
                      </label>
                      <input
                        type="text"
                        value={sentence.english}
                        onChange={(e) =>
                          handleUpdateSentenceField(sentence.id, 'english', e.target.value)
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>

                    {/* Vietnamese translation editor (prominent and styled for easy review) */}
                    <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-900 uppercase tracking-wide">
                          <Languages className="w-3.5 h-3.5 text-amber-700" />
                          <span>🇻🇳 Bản dịch tiếng Việt (Nhấp để chỉnh sửa nếu cần):</span>
                        </label>
                        <span className="text-[10px] text-amber-700/80 font-semibold">
                          Chuẩn ngữ cảnh học sinh THCS
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={sentence.vietnamese}
                        onChange={(e) =>
                          handleUpdateSentenceField(sentence.id, 'vietnamese', e.target.value)
                        }
                        className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-y"
                        placeholder="Nhập bản dịch tiếng Việt cho câu này..."
                      />
                    </div>

                    {/* Word tokens breakdown toggle */}
                    {sentence.words && sentence.words.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedWordSentenceId(isExpanded ? null : sentence.id)
                          }
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Thu gọn từ vựng ({sentence.words.length} từ)</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Xem & sửa nghĩa từng từ vựng ({sentence.words.length} từ)</span>
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {sentence.words.map((w, wIdx) => (
                              <div
                                key={`word-edit-${sentence.id}-${wIdx}`}
                                className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs"
                              >
                                <span className="font-bold text-slate-900 shrink-0">
                                  {w.text}
                                </span>
                                {w.ipa && (
                                  <span className="font-mono text-[11px] text-indigo-600 shrink-0">
                                    {w.ipa}
                                  </span>
                                )}
                                <input
                                  type="text"
                                  value={w.meaning || ''}
                                  onChange={(e) =>
                                    handleUpdateWordMeaning(sentence.id, wIdx, e.target.value)
                                  }
                                  placeholder="Nghĩa..."
                                  className="w-full px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 outline-none focus:bg-white"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Bar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Quay lại chỉnh sửa</span>
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold transition-colors"
                >
                  Hủy bỏ
                </button>
              </div>

              <button
                type="button"
                id="btn-confirm-save-lesson"
                onClick={handleConfirmAndSave}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Xác Nhận & Lưu Bài Học Vào Thư Viện</span>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

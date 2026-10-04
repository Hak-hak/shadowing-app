import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Share2,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Check,
  HelpCircle,
  Headphones,
  Layout,
  ListOrdered,
  Play,
  Pause,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Lesson, SentenceItem, VoiceOption, AudioPlaybackState } from '../types';
import { SentenceCard } from '../components/SentenceCard';
import { AudioControls, AudioEngineMode } from '../components/AudioControls';
import { ShadowingModal } from '../components/ShadowingModal';
import { PronunciationModal } from '../components/PronunciationModal';
import { FullLessonPlayerBar } from '../components/FullLessonPlayerBar';
import { FullScriptView } from '../components/FullScriptView';
import { ttsManager } from '../services/tts';
import { aiAudioService } from '../services/aiAudioService';
import { storageService } from '../services/storage';
import { normalizeSentence } from '../utils/sentenceUtils';

interface LessonViewProps {
  lesson: Lesson;
  onBackToLibrary: () => void;
}

export const LessonView: React.FC<LessonViewProps> = ({ lesson, onBackToLibrary }) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [autoNext, setAutoNext] = useState(false);
  const [currentRate, setCurrentRate] = useState(1.0);

  // Audio Mode & Voices
  const [audioMode, setAudioMode] = useState<AudioEngineMode>('ai');
  const [selectedAiVoice, setSelectedAiVoice] = useState('Kore');
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');

  // Audio Cache & Generation states (keyed by `${sentenceId}_${voiceName.toLowerCase()}`)
  const [cachedAiAudioMap, setCachedAiAudioMap] = useState<Record<string, boolean>>({});
  const [isGeneratingSingleAi, setIsGeneratingSingleAi] = useState(false);
  const [isBatchGeneratingLesson, setIsBatchGeneratingLesson] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // High-precision audio.currentTime playback state
  const [audioPlaybackState, setAudioPlaybackState] = useState<AudioPlaybackState | null>(null);
  const [aiAudioError, setAiAudioError] = useState<string | null>(null);

  const handleSeekAudio = (seconds: number) => {
    aiAudioService.seekTo(seconds);
  };

  const handleSeekWord = (wordIndex: number) => {
    aiAudioService.seekToWord(wordIndex);
  };

  // Full Lesson Playback State
  const [isFullPlaying, setIsFullPlaying] = useState(false);
  const [isFullPaused, setIsFullPaused] = useState(false);
  const [fullLoop, setFullLoop] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'script'>('card');

  // Synchronous refs to prevent race conditions during audio callbacks
  const isFullPlayingRef = useRef(false);
  const isFullPausedRef = useRef(false);
  const fullLoopRef = useRef(false);
  const nextSentenceTimeoutRef = useRef<any>(null);
  const autoNextTimeoutRef = useRef<any>(null);

  // Modals
  const [isShadowingOpen, setIsShadowingOpen] = useState(false);
  const [isPronunciationOpen, setIsPronunciationOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Completed sentences set
  const [completedSentences, setCompletedSentences] = useState<number[]>([]);

  const sentences = useMemo(
    () => (lesson.sentences || []).map((s) => normalizeSentence(s)),
    [lesson.sentences]
  );
  const currentSentence: SentenceItem | undefined = sentences[currentSentenceIndex];

  // Keep refs in sync
  useEffect(() => {
    isFullPlayingRef.current = isFullPlaying;
  }, [isFullPlaying]);

  useEffect(() => {
    isFullPausedRef.current = isFullPaused;
  }, [isFullPaused]);

  useEffect(() => {
    fullLoopRef.current = fullLoop;
  }, [fullLoop]);

  // Load voices, initial progress, and subscribe to asynchronous voice loading
  useEffect(() => {
    const loadedVoices = ttsManager.getVoices();
    setVoices(loadedVoices);
    if (!selectedVoiceId && loadedVoices.length > 0) {
      setSelectedVoiceId(ttsManager.getSelectedVoiceId());
    }

    const unsubVoices = ttsManager.subscribeVoices((newVoices) => {
      setVoices(newVoices);
      if (!selectedVoiceId && newVoices.length > 0) {
        setSelectedVoiceId(ttsManager.getSelectedVoiceId());
      }
    });

    const prog = storageService.getProgress(lesson.id);
    if (prog) {
      setCompletedSentences(prog.completedSentences || []);
      if (prog.lastSentenceId) {
        const foundIdx = sentences.findIndex((s) => s.id === prog.lastSentenceId);
        if (foundIdx !== -1) setCurrentSentenceIndex(foundIdx);
      }
    }
    setIsBookmarked(storageService.isBookmarked(lesson.id));

    return () => {
      unsubVoices();
      if (nextSentenceTimeoutRef.current) clearTimeout(nextSentenceTimeoutRef.current);
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
      ttsManager.stop();
      aiAudioService.stopPlayback();
    };
  }, [lesson.id]);

  // Check cached AI audio specifically for the selected AI voice
  useEffect(() => {
    let isCancelled = false;
    const checkCachedAudioForVoice = async () => {
      const map: Record<string, boolean> = {};
      const voiceKey = selectedAiVoice.toLowerCase();
      for (const sent of sentences) {
        const has = await aiAudioService.hasAudio(lesson.id, sent.id, selectedAiVoice);
        const hasMatchingBase64 = Boolean(
          sent.audioBase64 &&
            (!sent.audioVoice || sent.audioVoice.toLowerCase() === voiceKey)
        );
        map[`${sent.id}_${voiceKey}`] = has || hasMatchingBase64;
      }
      if (!isCancelled) {
        setCachedAiAudioMap((prev) => ({ ...prev, ...map }));
      }
    };
    checkCachedAudioForVoice();

    return () => {
      isCancelled = true;
    };
  }, [lesson.id, selectedAiVoice]);

  // Full Lesson Continuous Playback Functions
  const startFullLessonPlay = (startIndex?: number) => {
    if (sentences.length === 0) return;
    if (nextSentenceTimeoutRef.current) clearTimeout(nextSentenceTimeoutRef.current);
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    ttsManager.stop();
    aiAudioService.stopPlayback();

    setIsPlaying(false);
    setIsPaused(false);

    const startIdx =
      startIndex !== undefined
        ? startIndex
        : currentSentenceIndex >= sentences.length - 1 &&
          completedSentences.includes(sentences[currentSentenceIndex]?.id)
        ? 0
        : currentSentenceIndex;

    setIsFullPlaying(true);
    setIsFullPaused(false);
    isFullPlayingRef.current = true;
    isFullPausedRef.current = false;

    playSentenceInFull(startIdx);
  };

  const playSentenceInFull = async (idx: number) => {
    if (!isFullPlayingRef.current) return;

    if (idx >= sentences.length) {
      if (fullLoopRef.current) {
        nextSentenceTimeoutRef.current = setTimeout(() => {
          if (isFullPlayingRef.current && !isFullPausedRef.current) {
            playSentenceInFull(0);
          }
        }, 1000);
        return;
      } else {
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch {
          // ignore
        }
        setIsFullPlaying(false);
        setIsFullPaused(false);
        setActiveWordIndex(null);
        isFullPlayingRef.current = false;
        isFullPausedRef.current = false;
        return;
      }
    }

    const targetSentence = normalizeSentence(sentences[idx]);
    if (!targetSentence) return;

    setCurrentSentenceIndex(idx);
    setActiveWordIndex(null);
    markSentenceDone(targetSentence.id);

    if (audioMode === 'ai') {
      let audioUrl = await aiAudioService.getAudioDataUrl(lesson.id, targetSentence.id, selectedAiVoice);
      if (
        !audioUrl &&
        targetSentence.audioBase64 &&
        (!targetSentence.audioVoice || targetSentence.audioVoice.toLowerCase() === selectedAiVoice.toLowerCase())
      ) {
        audioUrl = await aiAudioService.saveAudio(
          lesson.id,
          targetSentence.id,
          selectedAiVoice,
          targetSentence.audioBase64,
          targetSentence.audioMimeType || 'audio/wav'
        );
      }

      if (!audioUrl) {
        try {
          audioUrl = await aiAudioService.generateAndSaveSentenceAudio(
            lesson.id,
            targetSentence,
            selectedAiVoice
          );
          setCachedAiAudioMap((prev) => ({
            ...prev,
            [`${targetSentence.id}_${selectedAiVoice.toLowerCase()}`]: true,
          }));
          storageService.updateLesson(lesson.id, { sentences });
        } catch (err) {
          console.warn('AI audio auto-generation error in full lesson:', err);
        }
      }

      if (audioUrl && isFullPlayingRef.current) {
        aiAudioService.setPlaybackRate(currentRate);
        try {
          await aiAudioService.playAiAudio(
            audioUrl,
            targetSentence.english,
            targetSentence.words,
            currentRate,
            {
              onWordChange: (wIdx) => {
                if (isFullPlayingRef.current) {
                  setActiveWordIndex(wIdx);
                }
              },
              onTimeUpdate: (state) => {
                if (isFullPlayingRef.current) {
                  setAudioPlaybackState(state);
                }
              },
              onEnd: () => {
                if (!isFullPlayingRef.current) return;
                setActiveWordIndex(null);
                setAudioPlaybackState(null);
                nextSentenceTimeoutRef.current = setTimeout(() => {
                  if (isFullPlayingRef.current && !isFullPausedRef.current) {
                    playSentenceInFull(idx + 1);
                  }
                }, 700);
              },
              onError: () => {
                if (!isFullPlayingRef.current) return;
                setActiveWordIndex(null);
                setAudioPlaybackState(null);
                nextSentenceTimeoutRef.current = setTimeout(() => {
                  if (isFullPlayingRef.current && !isFullPausedRef.current) {
                    playSentenceInFull(idx + 1);
                  }
                }, 800);
              },
            }
          );
          return;
        } catch {
          // fall through to AI fallback below
        }
      }

      // Fallback for AI mode when audioUrl is not produced: Use AI persona voice profile
      ttsManager.setRate(currentRate);
      ttsManager.speakSentenceWithAiVoice(targetSentence.english, targetSentence.words, selectedAiVoice, {
        onWordChange: (wIdx) => {
          if (isFullPlayingRef.current) {
            setActiveWordIndex(wIdx);
          }
        },
        onEnd: () => {
          if (!isFullPlayingRef.current) return;
          setActiveWordIndex(null);
          nextSentenceTimeoutRef.current = setTimeout(() => {
            if (isFullPlayingRef.current && !isFullPausedRef.current) {
              playSentenceInFull(idx + 1);
            }
          }, 700);
        },
        onError: () => {
          if (!isFullPlayingRef.current) return;
          setActiveWordIndex(null);
          nextSentenceTimeoutRef.current = setTimeout(() => {
            if (isFullPlayingRef.current && !isFullPausedRef.current) {
              playSentenceInFull(idx + 1);
            }
          }, 800);
        },
      });
      return;
    }

    // Fallback: System TTS
    ttsManager.setRate(currentRate);
    ttsManager.setVoice(selectedVoiceId);

    ttsManager.speakSentence(targetSentence.english, targetSentence.words, {
      onWordChange: (wIdx) => {
        if (isFullPlayingRef.current) {
          setActiveWordIndex(wIdx);
        }
      },
      onEnd: () => {
        if (!isFullPlayingRef.current) return;
        setActiveWordIndex(null);
        nextSentenceTimeoutRef.current = setTimeout(() => {
          if (isFullPlayingRef.current && !isFullPausedRef.current) {
            playSentenceInFull(idx + 1);
          }
        }, 700);
      },
      onError: () => {
        if (!isFullPlayingRef.current) return;
        setActiveWordIndex(null);
        nextSentenceTimeoutRef.current = setTimeout(() => {
          if (isFullPlayingRef.current && !isFullPausedRef.current) {
            playSentenceInFull(idx + 1);
          }
        }, 800);
      },
    });
  };

  const handlePauseFullLesson = () => {
    if (nextSentenceTimeoutRef.current) clearTimeout(nextSentenceTimeoutRef.current);
    if (audioMode === 'ai') {
      aiAudioService.pausePlayback();
    } else {
      ttsManager.pause();
    }
    setIsFullPaused(true);
    isFullPausedRef.current = true;
  };

  const handleResumeFullLesson = () => {
    setIsFullPaused(false);
    isFullPausedRef.current = false;
    if (audioMode === 'ai') {
      aiAudioService.resumePlayback();
    } else {
      ttsManager.resume();
    }
  };

  const handleStopFullLesson = () => {
    if (nextSentenceTimeoutRef.current) clearTimeout(nextSentenceTimeoutRef.current);
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    aiAudioService.stopPlayback();
    ttsManager.stop();
    setIsFullPlaying(false);
    setIsFullPaused(false);
    setActiveWordIndex(null);
    setAudioPlaybackState(null);
    isFullPlayingRef.current = false;
    isFullPausedRef.current = false;
  };

  const handleJumpSentenceInFull = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= sentences.length) return;
    if (nextSentenceTimeoutRef.current) clearTimeout(nextSentenceTimeoutRef.current);
    aiAudioService.stopPlayback();
    ttsManager.stop();
    playSentenceInFull(newIdx);
  };

  const handleToggleFullLoop = () => {
    const nextVal = !fullLoop;
    setFullLoop(nextVal);
    fullLoopRef.current = nextVal;
  };

  // Play a specific sentence by index with full AI/system support & precise highlight sync
  const handlePlaySentenceAtIndex = async (
    targetIndex: number,
    overrideAiVoice?: string,
    targetMode?: AudioEngineMode,
    overrideRate?: number
  ) => {
    const sentenceToPlay = sentences[targetIndex];
    if (!sentenceToPlay) return;

    const modeToUse = targetMode || audioMode;
    const rateToUse = overrideRate || currentRate;
    const voiceToUse = overrideAiVoice || selectedAiVoice;

    if (isFullPlaying) {
      handleStopFullLesson();
    }
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);

    ttsManager.stop();
    aiAudioService.stopPlayback();
    setIsPlaying(true);
    setIsPaused(false);
    setActiveWordIndex(null);
    setAudioPlaybackState(null);

    if (modeToUse === 'ai') {
      let audioUrl = await aiAudioService.getAudioDataUrl(lesson.id, sentenceToPlay.id, voiceToUse);
      if (
        !audioUrl &&
        sentenceToPlay.audioBase64 &&
        (!sentenceToPlay.audioVoice || sentenceToPlay.audioVoice.toLowerCase() === voiceToUse.toLowerCase())
      ) {
        audioUrl = await aiAudioService.saveAudio(
          lesson.id,
          sentenceToPlay.id,
          voiceToUse,
          sentenceToPlay.audioBase64,
          sentenceToPlay.audioMimeType || 'audio/wav'
        );
      }

      if (!audioUrl) {
        setIsGeneratingSingleAi(true);
        try {
          audioUrl = await aiAudioService.generateAndSaveSentenceAudio(
            lesson.id,
            sentenceToPlay,
            voiceToUse
          );
          setCachedAiAudioMap((prev) => ({
            ...prev,
            [`${sentenceToPlay.id}_${voiceToUse.toLowerCase()}`]: true,
          }));
          storageService.updateLesson(lesson.id, { sentences });
        } catch (err: any) {
          console.warn('AI speech generation notice:', err?.message);
        } finally {
          setIsGeneratingSingleAi(false);
        }
      }

      if (audioUrl) {
        aiAudioService.setPlaybackRate(rateToUse);
        try {
          await aiAudioService.playAiAudio(
            audioUrl,
            sentenceToPlay.english,
            sentenceToPlay.words,
            rateToUse,
            {
              onWordChange: (idx) => setActiveWordIndex(idx),
              onTimeUpdate: (state) => setAudioPlaybackState(state),
              onEnd: () => {
                setIsPlaying(false);
                setIsPaused(false);
                setActiveWordIndex(null);
                setAudioPlaybackState(null);
                markSentenceDone(sentenceToPlay.id);

                if (autoNext && targetIndex < sentences.length - 1) {
                  autoNextTimeoutRef.current = setTimeout(() => {
                    const nextIdx = targetIndex + 1;
                    setCurrentSentenceIndex(nextIdx);
                    handlePlaySentenceAtIndex(nextIdx, undefined, modeToUse);
                  }, 550);
                }
              },
              onError: () => {
                setIsPlaying(false);
                setIsPaused(false);
                setActiveWordIndex(null);
                setAudioPlaybackState(null);
              },
            }
          );
          setAiAudioError(null);
          return;
        } catch (e) {
          console.warn('AI Audio play error:', e);
        }
      }

      // If AI audio could not be retrieved, inform the user clearly instead of silently playing system voice
      setIsPlaying(false);
      setIsPaused(false);
      setActiveWordIndex(null);
      setAudioPlaybackState(null);
      setAiAudioError(
        'Chưa tải được âm thanh AI của câu này (giới hạn API hoặc đường truyền). Bạn hãy bấm nút "Nghe Hệ Thống" bên cạnh để nghe ngay!'
      );
      return;
    } else {
      // System TTS
      ttsManager.setRate(rateToUse);
      ttsManager.setVoice(selectedVoiceId);
      ttsManager.speakSentence(sentenceToPlay.english, sentenceToPlay.words, {
        onWordChange: (idx) => setActiveWordIndex(idx),
        onEnd: () => {
          setIsPlaying(false);
          setIsPaused(false);
          setActiveWordIndex(null);
          markSentenceDone(sentenceToPlay.id);

          if (autoNext && targetIndex < sentences.length - 1) {
            autoNextTimeoutRef.current = setTimeout(() => {
              const nextIdx = targetIndex + 1;
              setCurrentSentenceIndex(nextIdx);
              handlePlaySentenceAtIndex(nextIdx, undefined, modeToUse);
            }, 550);
          }
        },
        onError: () => {
          setIsPlaying(false);
          setIsPaused(false);
          setActiveWordIndex(null);
        },
      });
    }
  };

  // Play specifically with AI Voice (Kore, Puck, Zephyr, etc.) without auto-switching
  const handlePlayAiSentence = () => {
    if (isFullPlaying) {
      handleStopFullLesson();
    }
    if (isPlaying && audioMode === 'ai' && !isPaused) {
      handlePauseSentence();
      return;
    }
    if (isPaused && audioMode === 'ai') {
      aiAudioService.resumePlayback();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    ttsManager.stop();
    aiAudioService.stopPlayback();
    setAudioMode('ai');
    handlePlaySentenceAtIndex(currentSentenceIndex, selectedAiVoice, 'ai');
  };

  // Play specifically with System voice (Device / Browser TTS) without auto-switching
  const handlePlaySystemSentence = () => {
    if (isFullPlaying) {
      handleStopFullLesson();
    }
    if (isPlaying && audioMode === 'system' && !isPaused) {
      handlePauseSentence();
      return;
    }
    if (isPaused && audioMode === 'system') {
      ttsManager.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    aiAudioService.stopPlayback();
    ttsManager.stop();
    setAudioMode('system');
    handlePlaySentenceAtIndex(currentSentenceIndex, undefined, 'system');
  };

  const handlePlaySentence = () => {
    if (isPaused) {
      if (audioMode === 'ai') {
        aiAudioService.resumePlayback();
      } else {
        ttsManager.resume();
      }
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }
    handlePlaySentenceAtIndex(currentSentenceIndex);
  };

  // Instant Next Sentence & Play (User requested: "bấm nghe câu tiếp theo dễ dàng hơn")
  const handlePlayNextSentence = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      const nextIdx = currentSentenceIndex + 1;
      setCurrentSentenceIndex(nextIdx);
      handlePlaySentenceAtIndex(nextIdx);
    }
  };

  const handlePauseSentence = () => {
    if (audioMode === 'ai') {
      aiAudioService.pausePlayback();
    } else {
      ttsManager.pause();
    }
    setIsPlaying(true);
    setIsPaused(true);
  };

  const handleReplaySentence = () => {
    aiAudioService.stopPlayback();
    ttsManager.stop();
    setIsPaused(false);
    handlePlaySentenceAtIndex(currentSentenceIndex);
  };

  const handleSlowPlay = () => {
    if (isFullPlaying) {
      handleStopFullLesson();
    }
    aiAudioService.stopPlayback();
    ttsManager.stop();
    const slowRate = 0.75;
    setCurrentRate(slowRate);
    aiAudioService.setPlaybackRate(slowRate);
    ttsManager.setRate(slowRate);
    setTimeout(() => {
      handlePlaySentenceAtIndex(currentSentenceIndex);
    }, 80);
  };

  // Re-generate AI Audio for current sentence with current voice
  const handleRegenerateSingleAiAudio = async () => {
    if (!currentSentence) return;
    aiAudioService.stopPlayback();
    ttsManager.stop();
    setIsGeneratingSingleAi(true);

    try {
      const audioUrl = await aiAudioService.generateAndSaveSentenceAudio(
        lesson.id,
        currentSentence,
        selectedAiVoice,
        true // force refresh
      );
      setCachedAiAudioMap((prev) => ({
        ...prev,
        [`${currentSentence.id}_${selectedAiVoice.toLowerCase()}`]: true,
      }));
      storageService.updateLesson(lesson.id, { sentences });
      setIsGeneratingSingleAi(false);

      // Play newly created audio
      setIsPlaying(true);
      setIsPaused(false);
      aiAudioService.setPlaybackRate(currentRate);
      await aiAudioService.playAiAudio(
        audioUrl,
        currentSentence.english,
        currentSentence.words,
        currentRate,
        {
          onWordChange: (idx) => setActiveWordIndex(idx),
          onTimeUpdate: (state) => setAudioPlaybackState(state),
          onEnd: () => {
            setIsPlaying(false);
            setIsPaused(false);
            setActiveWordIndex(null);
            setAudioPlaybackState(null);
            markSentenceDone(currentSentence.id);
          },
          onError: () => {
            setIsPlaying(false);
            setIsPaused(false);
            setActiveWordIndex(null);
            setAudioPlaybackState(null);
          },
        }
      );
    } catch (err: any) {
      setIsGeneratingSingleAi(false);
      // Play immediately with AI voice fallback so user is never blocked
      ttsManager.setRate(currentRate);
      ttsManager.speakSentenceWithAiVoice(
        currentSentence.english,
        currentSentence.words,
        selectedAiVoice,
        {
          onWordChange: (idx) => setActiveWordIndex(idx),
          onEnd: () => {
            setIsPlaying(false);
            setIsPaused(false);
            setActiveWordIndex(null);
            markSentenceDone(currentSentence.id);
          },
        }
      );
    }
  };

  // Batch generate all sentences in the lesson with quota awareness
  const handleBatchGenerateLessonAiAudio = async () => {
    if (sentences.length === 0) return;
    setIsBatchGeneratingLesson(true);
    setBatchProgress({ current: 0, total: sentences.length });

    const result = await aiAudioService.batchGenerateLessonAudio(
      lesson,
      selectedAiVoice,
      (curr, tot) => {
        setBatchProgress({ current: curr, total: tot });
      }
    );

    const map: Record<string, boolean> = {};
    const voiceKey = selectedAiVoice.toLowerCase();
    for (const s of sentences) {
      const has =
        (s.audioBase64 && (!s.audioVoice || s.audioVoice.toLowerCase() === voiceKey)) ||
        (await aiAudioService.hasAudio(lesson.id, s.id, selectedAiVoice));
      if (has) {
        map[`${s.id}_${voiceKey}`] = true;
      }
    }
    setCachedAiAudioMap((prev) => ({ ...prev, ...map }));
    storageService.updateLesson(lesson.id, { sentences });
    setIsBatchGeneratingLesson(false);

    if (result.rateLimited) {
      alert(
        `Đã lưu thành công ${result.successCount}/${sentences.length} câu giọng ${selectedAiVoice}. Các câu còn lại sẽ tự động phát mượt mà bằng giọng AI mô phỏng hoặc bạn có thể tạo tiếp sau ít phút!`
      );
    } else {
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      } catch {
        // ignore
      }
    }
  };

  const handleRateChange = (rate: number) => {
    setCurrentRate(rate);
    aiAudioService.setPlaybackRate(rate);
    ttsManager.setRate(rate);
    if (isFullPlaying && !isFullPaused) {
      handleJumpSentenceInFull(currentSentenceIndex);
    } else if (isPlaying && !isPaused) {
      handleReplaySentence();
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    ttsManager.setVoice(voiceId);
    if (isFullPlaying && !isFullPaused) {
      handleJumpSentenceInFull(currentSentenceIndex);
    } else if (isPlaying && !isPaused) {
      handleReplaySentence();
    }
  };

  // Immediate voice change for AI voices: immediately stops and restarts with the chosen persona
  const handleAiVoiceChange = (newVoice: string) => {
    setSelectedAiVoice(newVoice);
    ttsManager.stop();
    aiAudioService.stopPlayback();
    setActiveWordIndex(null);

    // If currently playing, immediately replay sentence with the newly selected voice
    if (isPlaying && !isPaused) {
      setTimeout(() => {
        handlePlaySentenceAtIndex(currentSentenceIndex, newVoice);
      }, 60);
    } else {
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const markSentenceDone = (sentenceId: number) => {
    storageService.recordPractice(lesson.id, sentenceId);
    if (!completedSentences.includes(sentenceId)) {
      const updated = [...completedSentences, sentenceId];
      setCompletedSentences(updated);

      if (updated.length === sentences.length) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }
    }
  };

  const handleNext = () => {
    if (isFullPlaying) {
      if (currentSentenceIndex < sentences.length - 1) {
        handleJumpSentenceInFull(currentSentenceIndex + 1);
      }
      return;
    }
    aiAudioService.stopPlayback();
    ttsManager.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setActiveWordIndex(null);
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex((p) => p + 1);
    }
  };

  const handlePrev = () => {
    if (isFullPlaying) {
      if (currentSentenceIndex > 0) {
        handleJumpSentenceInFull(currentSentenceIndex - 1);
      }
      return;
    }
    aiAudioService.stopPlayback();
    ttsManager.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setActiveWordIndex(null);
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex((p) => p - 1);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?lesson=${lesson.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleBookmark = () => {
    const res = storageService.toggleBookmark(lesson.id);
    setIsBookmarked(res);
  };

  const progressPercent = Math.round(
    (completedSentences.length / Math.max(sentences.length, 1)) * 100
  );

  const currentVoiceKey = selectedAiVoice.toLowerCase();
  const savedAiCount = sentences.filter(
    (s) => cachedAiAudioMap[`${s.id}_${currentVoiceKey}`]
  ).length;

  // Determine active workflow step for student guidance
  const currentSentenceCompleted = currentSentence
    ? completedSentences.includes(currentSentence.id)
    : false;
  const activeStep = isPlaying
    ? 1 // Listening / Looking
    : currentSentenceCompleted
    ? 5 // Ready to move to Next
    : 4; // Ready to practice / speak

  return (
    <div id="lesson-screen" className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* 1. COMPACT & CLEAN LESSON INFO HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          {/* Badges: Topic, Grade, Code */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {lesson.topic || 'Tiếng Anh giao tiếp'}
            </span>
            {lesson.grade && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                {lesson.grade}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-600">
              Mã: {lesson.id}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {lesson.title}
          </h1>

          {/* Metadata */}
          <p className="text-xs text-slate-500 font-medium">
            {lesson.grade ? `${lesson.grade} · ` : ''}{sentences.length} câu · Tạo bởi <span className="font-semibold text-slate-700">{lesson.createdBy}</span>
          </p>
        </div>

        {/* Action Tools: Play Full Lesson, Shadowing, Share, Bookmark */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="btn-play-full-lesson"
            onClick={() => {
              if (isFullPlaying) {
                if (isFullPaused) handleResumeFullLesson();
                else handlePauseFullLesson();
              } else {
                startFullLessonPlay(0);
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer ${
              isFullPlaying
                ? 'bg-indigo-700 text-white ring-2 ring-indigo-300 shadow-md'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
            }`}
            title="Nghe toàn bộ bài học từ đầu đến cuối"
          >
            {isFullPlaying ? (
              isFullPaused ? (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>Tiếp tục</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 text-white" />
                  <span>Tạm dừng</span>
                </>
              )
            ) : (
              <>
                <Headphones className="w-4 h-4 text-indigo-200" />
                <span>Nghe toàn bài</span>
              </>
            )}
          </button>

          <button
            id="btn-open-shadowing"
            onClick={() => {
              handleStopFullLesson();
              setIsShadowingOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Luyện nói nhại theo mẫu (Shadowing)"
          >
            <Sparkles className="w-4 h-4 text-amber-100" />
            <span>Shadowing</span>
          </button>

          <button
            id="btn-copy-lesson-link"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            title="Sao chép liên kết chia sẻ bài học"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            id="btn-toggle-bookmark"
            onClick={handleToggleBookmark}
            className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-amber-50 border-amber-300 text-amber-600'
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
            title={isBookmarked ? 'Đã lưu vào danh sách yêu thích' : 'Lưu bài'}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating/Dedicated Full Lesson Player Bar (When Active) */}
      {isFullPlaying && (
        <FullLessonPlayerBar
          isPlaying={isFullPlaying}
          isPaused={isFullPaused}
          currentIndex={currentSentenceIndex}
          totalSentences={sentences.length}
          currentSentence={currentSentence}
          fullLoop={fullLoop}
          onToggleLoop={handleToggleFullLoop}
          onPlayPause={isFullPaused ? handleResumeFullLesson : handlePauseFullLesson}
          onStop={handleStopFullLesson}
          onPrev={() => handleJumpSentenceInFull(currentSentenceIndex - 1)}
          onNext={() => handleJumpSentenceInFull(currentSentenceIndex + 1)}
          currentRate={currentRate}
          onRateChange={handleRateChange}
          audioMode={audioMode}
          voiceName={selectedAiVoice}
          audioPlaybackState={audioPlaybackState}
        />
      )}

      {/* 2. PEDAGOGICAL WORKFLOW STRIP (LISTEN → LOOK → REPEAT → SPEAK → NEXT) */}
      <div className="bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-emerald-50/90 rounded-2xl border border-indigo-100/80 p-3 sm:px-4">
        <div className="flex items-center justify-between gap-1 overflow-x-auto text-[11px] sm:text-xs font-bold select-none py-0.5">
          {/* STEP 1: LISTEN */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
              activeStep === 1
                ? 'bg-indigo-600 text-white shadow-xs scale-105'
                : 'text-slate-600 bg-white/70'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>LISTEN</span>
          </div>

          <span className="text-slate-300 font-extrabold">➔</span>

          {/* STEP 2: LOOK */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
              activeStep === 1
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 bg-white/70'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span>LOOK</span>
          </div>

          <span className="text-slate-300 font-extrabold">➔</span>

          {/* STEP 3: REPEAT */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
              activeStep === 4 && !currentSentenceCompleted
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 bg-white/70'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            <span>REPEAT</span>
          </div>

          <span className="text-slate-300 font-extrabold">➔</span>

          {/* STEP 4: SPEAK */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
              activeStep === 4 && !currentSentenceCompleted
                ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-200'
                : currentSentenceCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-slate-600 bg-white/70'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">4</span>
            <span>SPEAK</span>
          </div>

          <span className="text-slate-300 font-extrabold">➔</span>

          {/* STEP 5: NEXT */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
              activeStep === 5
                ? 'bg-indigo-600 text-white shadow-xs scale-105 animate-pulse'
                : 'text-slate-600 bg-white/70'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">5</span>
            <span>NEXT</span>
          </div>
        </div>
      </div>

      {/* 3. MOTIVATING PROGRESS & DISPLAY OPTIONS STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Simple & Motivating Progress Bar */}
        <div className="flex-1 max-w-sm">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-800">
              Câu {currentSentenceIndex + 1} / {sentences.length}
            </span>
            <span className="text-emerald-700 font-extrabold">
              {completedSentences.length} / {sentences.length} câu ({progressPercent}%)
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* View Mode & Translation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI Cache Status or Batch button */}
          {savedAiCount < sentences.length ? (
            <button
              type="button"
              onClick={handleBatchGenerateLessonAiAudio}
              disabled={isBatchGeneratingLesson}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Tự động tạo sẵn âm thanh AI cho tất cả câu"
            >
              <RefreshCw className={`w-3 h-3 ${isBatchGeneratingLesson ? 'animate-spin' : ''}`} />
              <span>
                {isBatchGeneratingLesson
                  ? `${batchProgress.current}/${batchProgress.total}...`
                  : `Tạo audio AI (${savedAiCount}/${sentences.length})`}
              </span>
            </button>
          ) : (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
              ✅ Đã lưu {savedAiCount} câu AI
            </span>
          )}

          {/* View mode toggle */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
            <button
              id="view-mode-card"
              onClick={() => setViewMode('card')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Thẻ câu</span>
            </button>
            <button
              id="view-mode-script"
              onClick={() => setViewMode('script')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'script'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Toàn bài</span>
            </button>
          </div>

          {/* Translation Toggle */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setShowVietnamese(false)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !showVietnamese
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇬🇧 EN
            </button>
            <button
              onClick={() => setShowVietnamese(true)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                showVietnamese
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇻🇳 Dịch
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN INTERACTIVE CONTENT */}
      {viewMode === 'card' ? (
        <>
          {/* AI Audio Notice / Error banner */}
          {aiAudioError && (
            <div className="flex items-center justify-between p-3.5 px-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs sm:text-sm font-semibold shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="text-base">ℹ️</span>
                <span>{aiAudioError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAiAudioError(null)}
                className="text-amber-800 hover:text-amber-950 font-bold ml-2 text-xs px-2.5 py-1 bg-amber-200/70 hover:bg-amber-200 rounded-lg cursor-pointer transition-all"
              >
                Đóng
              </button>
            </div>
          )}

          {/* UNIFIED INTERACTIVE SENTENCE CARD WITH INTEGRATED CONTROLS */}
          {currentSentence && (
            <SentenceCard
              sentence={currentSentence}
              sentenceIndex={currentSentenceIndex}
              totalSentences={sentences.length}
              activeWordIndex={activeWordIndex}
              isPlaying={isPlaying || isFullPlaying}
              isPaused={isPaused}
              isCompleted={completedSentences.includes(currentSentence.id)}
              showVietnamese={showVietnamese}
              onPlay={handlePlaySentence}
              onPlayAi={handlePlayAiSentence}
              onPlaySystem={handlePlaySystemSentence}
              onSlowPlay={handleSlowPlay}
              onPractice={() => {
                handleStopFullLesson();
                ttsManager.stop();
                aiAudioService.stopPlayback();
                setIsPronunciationOpen(true);
              }}
              onPrev={handlePrev}
              onNext={handleNext}
              onReplay={handleReplaySentence}
              hasPrev={currentSentenceIndex > 0}
              hasNext={currentSentenceIndex < sentences.length - 1}
              audioMode={audioMode}
              onAudioModeChange={(mode) => {
                ttsManager.stop();
                aiAudioService.stopPlayback();
                setIsPlaying(false);
                setIsPaused(false);
                setActiveWordIndex(null);
                setAudioMode(mode);
              }}
              hasAiAudio={Boolean(cachedAiAudioMap[`${currentSentence.id}_${currentVoiceKey}`])}
              aiVoiceName={selectedAiVoice}
              isGeneratingAiAudio={isGeneratingSingleAi}
              onGenerateAiAudio={handleRegenerateSingleAiAudio}
              onRegenerateAiAudio={handleRegenerateSingleAiAudio}
              currentRate={currentRate}
              onRateChange={handleRateChange}
              voices={voices}
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={handleVoiceChange}
              selectedAiVoice={selectedAiVoice}
              onAiVoiceChange={handleAiVoiceChange}
              audioPlaybackState={audioPlaybackState}
              onSeekAudio={handleSeekAudio}
              onSeekWord={handleSeekWord}
              wordTimeline={aiAudioService.getWordTimeline()}
            />
          )}

          {/* SUBTLE PAGINATION HINT */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-3">
            <button
              onClick={handlePrev}
              disabled={currentSentenceIndex === 0}
              className="hover:text-slate-700 disabled:opacity-20 disabled:pointer-events-none cursor-pointer flex items-center gap-1 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Câu trước</span>
            </button>

            <span className="font-semibold text-slate-500">
              Câu {currentSentenceIndex + 1} trên {sentences.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentSentenceIndex === sentences.length - 1}
              className="hover:text-slate-700 disabled:opacity-20 disabled:pointer-events-none cursor-pointer flex items-center gap-1 font-medium"
            >
              <span>Câu sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        /* Full Script View */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Chế độ toàn bài:</strong> Bấm vào bất kỳ câu nào để nghe liên tục kèm bôi sáng từng từ!
              </span>
            </div>
            {!isFullPlaying && (
              <button
                onClick={() => startFullLessonPlay(0)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shrink-0 transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Bắt đầu nghe</span>
              </button>
            )}
          </div>

          <FullScriptView
            sentences={sentences}
            currentSentenceIndex={currentSentenceIndex}
            activeWordIndex={activeWordIndex}
            isPlaying={isPlaying}
            isFullPlaying={isFullPlaying}
            showVietnamese={showVietnamese}
            onPlayFromSentence={(idx) => {
              startFullLessonPlay(idx);
            }}
            onPracticeSentence={(idx) => {
              handleStopFullLesson();
              aiAudioService.stopPlayback();
              ttsManager.stop();
              setCurrentSentenceIndex(idx);
              setIsPronunciationOpen(true);
            }}
            completedSentences={completedSentences}
          />
        </div>
      )}

      {/* Quick guide on how to learn */}
      <div className="p-3.5 rounded-2xl bg-slate-100/70 text-slate-600 text-xs flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Mẹo học nhanh:</strong> Bấm vào từng từ để nghe phát âm chuẩn và xem phiên âm IPA + nghĩa. Bấm <strong>Nghe câu sau ➔</strong> ở thanh trên cùng để chuyển câu và nghe liên tục tức thì!
        </p>
      </div>

      {/* Shadowing Modal */}
      <ShadowingModal
        lesson={lesson}
        isOpen={isShadowingOpen}
        onClose={() => setIsShadowingOpen(false)}
        onCompleteSentence={(id) => markSentenceDone(id)}
      />

      {/* Pronunciation Practice Modal */}
      {currentSentence && (
        <PronunciationModal
          sentence={currentSentence}
          isOpen={isPronunciationOpen}
          onClose={() => setIsPronunciationOpen(false)}
          onSuccess={() => markSentenceDone(currentSentence.id)}
        />
      )}
    </div>
  );
};

import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { generateContentWithFallback } from "./server/geminiService";
import { lookupWord, translateSentenceHeuristic } from "./server/dictionary";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Google GenAI lazily or with safety check
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API: Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// API: Generate Lesson from raw text/dialogue with multi-model fallback & retry
app.post("/api/ai/generate-lesson", async (req, res) => {
  try {
    const { rawText, title, topic, grade } = req.body;
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "rawText is required" });
    }

    const ai = getGeminiClient();

    // If Gemini client is available, generate structured lesson using resilient multi-model pipeline
    if (ai) {
      const prompt = `You are an expert English language teacher for Vietnamese secondary school students (THCS, grades 6-9).
Analyze the following English text or conversation, and format it into a structured speaking practice lesson.

Guidelines:
1. Break into distinct sentences.
2. If it is a dialogue with speakers like "A:", "B:", "Nam:", "Lan:", etc., identify the speaker accurately (e.g. "Speaker A", "Speaker B" or character name). If it is a monologue/story, use "Narrator" or "Speaker".
3. VIETNAMESE TRANSLATION REQUIREMENT: Provide a 100% natural, fluent, and idiomatic Vietnamese translation ("vietnamese") for each sentence, specifically suited for Vietnamese secondary school students (THCS grades 6-9).
   - The "vietnamese" field MUST NEVER be in English.
   - It MUST NEVER contain placeholder phrases like "(Bản dịch mẫu)".
   - Translate conversational nuances naturally (e.g., "What do you usually do after school?" -> "Bạn thường làm gì sau giờ tan học ở trường?", "I usually play badminton with my friends." -> "Mình thường chơi cầu lông cùng với các bạn của mình.").
4. Tokenize each sentence into its individual words. For each word:
   - "text": the cleaned English word (without surrounding punctuation like commas or periods)
   - "ipa": standard IPA pronunciation (e.g. /ˈbædmɪntən/)
   - "meaning": clear, concise Vietnamese meaning of the word in context
   - "punctuation": immediate trailing punctuation if any (e.g. "," or "." or "?" or "!"). The very last word of every sentence MUST have the sentence-terminating punctuation (".", "?", "!").
5. Keep original English wording intact. Do not truncate.
6. Suggest a suitable title and topic if not provided.

Input text:
"""
${rawText}
"""
`;

      try {
        const response = await generateContentWithFallback(ai, {
          contents: prompt,
          config: {
            systemInstruction:
              "You are a helpful educational AI specializing in English speaking curriculum for Vietnamese students. Always return valid JSON matching the requested schema.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                lessonTitle: { type: Type.STRING },
                topic: { type: Type.STRING },
                grade: { type: Type.STRING, description: "e.g. Lớp 6, Lớp 7, Lớp 8, Lớp 9" },
                sentences: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.INTEGER },
                      speaker: { type: Type.STRING },
                      english: { type: Type.STRING },
                      vietnamese: { type: Type.STRING },
                      words: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            text: { type: Type.STRING },
                            ipa: { type: Type.STRING },
                            meaning: { type: Type.STRING },
                            punctuation: { type: Type.STRING, description: "Trailing punctuation mark like , . ? !" },
                          },
                          required: ["text", "meaning"],
                        },
                      },
                    },
                    required: ["id", "speaker", "english", "vietnamese", "words"],
                  },
                },
              },
              required: ["lessonTitle", "topic", "sentences"],
            },
          },
        });

        let rawJson = (response.text || "{}").trim();
        if (rawJson.startsWith("```json")) {
          rawJson = rawJson.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
        } else if (rawJson.startsWith("```")) {
          rawJson = rawJson.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
        }

        const parsed = JSON.parse(rawJson);

        // Validate and ensure terminal punctuation on last word of each sentence
        if (Array.isArray(parsed.sentences)) {
          parsed.sentences.forEach((s: any) => {
            if (Array.isArray(s.words) && s.words.length > 0) {
              const lastWord = s.words[s.words.length - 1];
              if (!lastWord.punctuation || !/[.?!]$/.test(lastWord.punctuation)) {
                lastWord.punctuation = /[?]$/.test(s.english) ? "?" : /[!]$/.test(s.english) ? "!" : ".";
              }
            }
          });
        }

        return res.json({
          success: true,
          data: {
            lessonTitle: title || parsed.lessonTitle || "Bài học luyện nói mới",
            topic: topic || parsed.topic || "Giao tiếp hàng ngày",
            grade: grade || parsed.grade || "Lớp 7",
            sentences: parsed.sentences,
          },
          modelUsed: response.modelUsed,
        });
      } catch (geminiError: any) {
        console.warn(
          "[Gemini] All AI models currently experiencing high demand. Falling back smoothly to built-in educational dictionary parser:",
          geminiError?.message || geminiError
        );
        // Fall back gracefully to built-in educational parser so user flow is never disrupted
        const parsedFallback = fallbackParseText(rawText, title, topic, grade);
        return res.json({
          success: true,
          data: parsedFallback,
          notice: "Đã tạo bài học với bộ từ điển & ngữ âm tích hợp (máy chủ AI tạm thời tải cao)",
        });
      }
    }

    // Fallback parser if API key is not yet set
    const parsedFallback = fallbackParseText(rawText, title, topic, grade);
    return res.json({
      success: true,
      data: parsedFallback,
      notice: "Tạo bằng bộ phân tích ngữ pháp & từ điển giáo khoa tích hợp",
    });
  } catch (error: any) {
    console.error("Error generating lesson with AI:", error);
    const parsedFallback = fallbackParseText(
      req.body?.rawText || "",
      req.body?.title,
      req.body?.topic,
      req.body?.grade
    );
    return res.json({
      success: true,
      data: parsedFallback,
      notice: "Đã tạo bài học bằng bộ xử lý ngữ âm tích hợp",
    });
  }
});

// API: Pronunciation evaluation with fallback
app.post("/api/ai/evaluate-pronunciation", async (req, res) => {
  try {
    const { referenceSentence, spokenText } = req.body;
    if (!referenceSentence || !spokenText) {
      return res.status(400).json({ error: "Missing referenceSentence or spokenText" });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await generateContentWithFallback(ai, {
          contents: `Reference English sentence: "${referenceSentence}"
Student's spoken transcript: "${spokenText}"

Evaluate the student's pronunciation and accuracy for a Vietnamese secondary school student.
Provide:
1. score: integer 0-100
2. feedback: encouraging feedback in Vietnamese (1-2 sentences)
3. correctWords: list of words spoken correctly
4. mispronouncedWords: list of words that were missed or mispronounced, with pronunciation tips in Vietnamese
`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                feedback: { type: Type.STRING },
                correctWords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                mispronouncedWords: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING },
                      tip: { type: Type.STRING },
                    },
                    required: ["word", "tip"],
                  },
                },
              },
              required: ["score", "feedback", "correctWords", "mispronouncedWords"],
            },
          },
        });

        const parsed = JSON.parse(response.text || "{}");
        return res.json({ success: true, evaluation: parsed, modelUsed: response.modelUsed });
      } catch (geminiError: any) {
        console.warn(
          "[Gemini] Pronunciation AI evaluation transient error, falling back to acoustic text heuristic:",
          geminiError?.message || geminiError
        );
      }
    }

    // Heuristic comparison fallback
    const refWords = referenceSentence.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const spokenWords = spokenText.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const correctWords = refWords.filter((w: string) => spokenWords.includes(w));
    const mispronounced = refWords
      .filter((w: string) => !spokenWords.includes(w))
      .map((w: string) => ({ word: w, tip: `Chú ý phát âm rõ âm đuôi của từ "${w}"` }));
    const score = Math.round((correctWords.length / Math.max(refWords.length, 1)) * 100);

    return res.json({
      success: true,
      evaluation: {
        score: Math.max(score, 45),
        feedback:
          score >= 80
            ? "Rất tuyệt vời! Phát âm của bạn rất chuẩn và rõ ràng."
            : score >= 60
            ? "Khá tốt! Hãy nghe lại mẫu câu và chú ý ngữ điệu, âm cuối nhé."
            : "Cố gắng lên! Bạn hãy bấm nghe lại từ mẫu và thử nói lại một lần nữa nhé.",
        correctWords,
        mispronouncedWords: mispronounced,
      },
    });
  } catch (err: any) {
    console.error("Pronunciation evaluation error:", err);
    res.status(500).json({ error: "Failed to evaluate pronunciation" });
  }
});

// Server-side in-memory audio cache to prevent duplicate Gemini API calls
const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string; voiceName: string }>();

// API: Expressive AI Text-to-Speech generation with multi-model fallback and rate-limit safety
app.post("/api/ai/generate-speech", async (req, res) => {
  try {
    const { text, voiceName, style } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return res.status(400).json({ error: "Text cannot be empty" });
    }

    // Supported prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const validVoices = ["Kore", "Puck", "Zephyr", "Fenrir", "Charon"];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : "Kore";

    // 1. Check server in-memory cache first
    const cacheKey = `${chosenVoice}__${cleanText.toLowerCase()}`;
    const cached = ttsAudioCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        voiceName: cached.voiceName,
        cached: true,
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: "Gemini API is not configured on server" });
    }

    // 2. Cascade across TTS-capable models to survive individual model free-tier rate limits
    const ttsModels = [
      "gemini-3.8-flash-lite-tts",
      "gemini-3.8-flash-tts",
    ];

    let lastError: any = null;
    let isRateLimited = false;

    for (const model of ttsModels) {
      try {
        console.log(`[Gemini TTS] Generating speech using '${model}' for: "${cleanText.slice(0, 35)}..." (${chosenVoice})`);

        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: cleanText }],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });

        const candidate = response.candidates?.[0]?.content?.parts?.[0];
        const audioData = candidate?.inlineData?.data;
        const mimeType = candidate?.inlineData?.mimeType || "audio/wav";

        if (audioData) {
          const payload = {
            audioBase64: audioData,
            mimeType,
            voiceName: chosenVoice,
          };

          // Store in cache (cap at 200 items to prevent unbounded memory growth)
          if (ttsAudioCache.size > 200) {
            const firstKey = ttsAudioCache.keys().next().value;
            if (firstKey) ttsAudioCache.delete(firstKey);
          }
          ttsAudioCache.set(cacheKey, payload);

          return res.json({
            success: true,
            ...payload,
            modelUsed: model,
          });
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || "";
        const errStatus = err?.status || err?.code;

        if (
          errStatus === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("Quota exceeded") ||
          errMsg.includes("RESOURCE_EXHAUSTED")
        ) {
          isRateLimited = true;
          console.warn(`[Gemini TTS] Model '${model}' hit 429 rate limit. Trying next candidate model...`);
          // Continue to next model in cascade
          continue;
        } else {
          // If non-quota error, still try other model
          console.warn(`[Gemini TTS] Model '${model}' encountered: ${errMsg.slice(0, 80)}`);
        }
      }
    }

    // If all models exhausted their quotas or failed:
    if (isRateLimited) {
      console.warn("[Gemini TTS] All TTS models currently reached free-tier rate limit (3 RPM). Returning graceful 429.");
      return res.status(429).json({
        success: false,
        rateLimited: true,
        error: "QUOTA_EXCEEDED",
        message: "Hạn mức tạo giọng AI biểu cảm miễn phí tạm thời đạt giới hạn (3 câu/phút). Ứng dụng tự động chuyển sang giọng chuẩn hệ thống để bạn học tiếp mà không bị gián đoạn!",
        retryAfter: 30,
      });
    }

    return res.status(500).json({
      success: false,
      error: lastError?.message || "Failed to generate speech audio",
    });
  } catch (error: any) {
    console.warn("[Gemini TTS] General error:", error?.message);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate speech audio",
    });
  }
});

// Built-in rule-based educational parser fallback with rich dictionary
function fallbackParseText(rawText: string, title?: string, topic?: string, grade?: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sentences: any[] = [];
  let currentId = 1;

  for (const line of lines) {
    let speaker = "A";
    let content = line;

    // Detect speaker prefix like "A:", "B:", "Nam:", "Lan:"
    const speakerMatch = line.match(/^([A-Za-z0-9\s]+)[:：]\s*(.+)$/);
    if (speakerMatch) {
      speaker = speakerMatch[1].trim();
      content = speakerMatch[2].trim();
    } else if (sentences.length > 0) {
      // Toggle A and B if no speaker explicitly marked
      const prevSpeaker = sentences[sentences.length - 1].speaker;
      speaker = prevSpeaker === "A" ? "B" : "A";
    }

    // Split line into sentences if it has multiple punctuation marks
    const sentenceParts = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [content];

    for (const part of sentenceParts) {
      let cleanPart = part.trim();
      if (!cleanPart) continue;

      // Ensure terminating punctuation
      if (!/[.?!]$/.test(cleanPart)) {
        const isQuestion = /^(\s*(what|where|when|why|who|whom|whose|which|how|do|does|did|are|is|am|was|were|can|could|will|would|shall|should|have|has|had|may|might))\b/i.test(cleanPart);
        cleanPart += isQuestion ? "?" : ".";
      }

      const endingMatch = cleanPart.match(/([.?!]+)$/);
      const endingPunct = endingMatch ? endingMatch[1] : ".";

      const rawTokens = cleanPart.split(/\s+/).filter(Boolean);
      const words = rawTokens
        .map((w, idx) => {
          const punctMatch = w.match(/([,;:!?.…]+)$/);
          let punct = punctMatch ? punctMatch[1] : undefined;
          const cleaned = w.replace(/^[.,/#!$%^&*;:{}=\-_`~()?"']+|[.,/#!$%^&*;:{}=\-_`~()?"']+$/g, "");

          // Last word must have ending punctuation
          if (idx === rawTokens.length - 1) {
            punct = endingPunct;
          }

          const vocab = lookupWord(cleaned || w);

          return {
            text: cleaned || w,
            ipa: vocab.ipa,
            meaning: vocab.meaning,
            punctuation: punct,
          };
        })
        .filter((w) => w.text.length > 0);

      const naturalTranslation = translateSentenceHeuristic(cleanPart);

      sentences.push({
        id: currentId++,
        speaker,
        english: cleanPart,
        vietnamese: naturalTranslation,
        words,
      });
    }
  }

  return {
    lessonTitle: title || "Đoạn hội thoại thực hành",
    topic: topic || "Giao tiếp hàng ngày",
    grade: grade || "Lớp 7",
    sentences,
  };
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import { SentenceItem, Lesson, WordToken } from '../types';
import { translateEnglishSentence } from './sentenceTranslator';

/**
 * Normalizes a sentence to ensure:
 * 1. The English sentence has proper terminating punctuation (. ? !)
 * 2. Each word token is clean for pronunciation and dictionary lookup
 * 3. Intra-sentence punctuation (like commas) and sentence-ending punctuation (. ? !)
 *    are properly attached to the punctuation field of the respective word tokens.
 * 4. CRITICAL: The very last word token MUST have the terminating sentence punctuation (. ? !).
 * 5. GUARANTEE: Every sentence ALWAYS has an accurate, natural Vietnamese translation suited for THCS.
 */
export function normalizeSentence(sentence: SentenceItem): SentenceItem {
  if (!sentence) return sentence;

  let english = (sentence.english || '').trim();

  // If sentence does not end with punctuation, infer appropriate terminating mark (. ? !)
  if (english && !/[.?!]$/.test(english)) {
    const isQuestion = /^(\s*(what|where|when|why|who|whom|whose|which|how|do|does|did|are|is|am|was|were|can|could|will|would|shall|should|have|has|had|may|might))\b/i.test(
      english
    );
    english += isQuestion ? '?' : '.';
  }

  // Extract the sentence-ending punctuation mark (e.g. "?", ".", "!")
  const endingMatch = english.match(/([.?!]+)$/);
  const endingPunctuation = endingMatch ? endingMatch[1] : '.';

  let words: WordToken[] = sentence.words ? [...sentence.words] : [];

  // If words array is missing or empty, generate tokens by splitting english text
  if (words.length === 0 && english) {
    const rawTokens = english.split(/\s+/).filter(Boolean);
    words = rawTokens.map((token) => {
      const punctMatch = token.match(/([,;:!?.…]+)$/);
      const punct = punctMatch ? punctMatch[1] : undefined;
      const clean = token.replace(/^[.,/#!$%^&*;:{}=\-_`~()?"']+|[.,/#!$%^&*;:{}=\-_`~()?"']+$/g, '');
      return {
        text: clean || token,
        punctuation: punct,
      };
    });
  }

  if (words.length > 0) {
    // Split english text into raw tokens to capture intra-sentence punctuation like commas
    const englishTokens = english.split(/\s+/).filter(Boolean);
    const lastWordIdx = words.length - 1;

    words = words.map((w, idx) => {
      let punct = w.punctuation || '';

      // If token punctuation is missing, check against raw English tokens
      if (!punct && englishTokens[idx]) {
        const tokenPunctMatch = englishTokens[idx].match(/([,;:!?.…]+)$/);
        if (tokenPunctMatch) {
          punct = tokenPunctMatch[1];
        }
      }

      // CRITICAL REQUIREMENT:
      // The last word of the sentence MUST have the sentence-terminating punctuation!
      if (idx === lastWordIdx) {
        if (!punct || !/[.?!]$/.test(punct)) {
          // Replace trailing commas/colons with the sentence ending punctuation
          punct = (punct.replace(/[,;:]+$/, '') + endingPunctuation) || endingPunctuation;
        }
      }

      // Ensure the text itself is clean of trailing punctuation for accurate speech synthesis & dictionary lookup
      const cleanText = w.text
        ? w.text.replace(/^[.,/#!$%^&*;:{}=\-_`~()?"']+|[.,/#!$%^&*;:{}=\-_`~()?"']+$/g, '')
        : '';

      return {
        ...w,
        text: cleanText || w.text,
        punctuation: punct || undefined,
      };
    });
  }

  // Ensure Vietnamese translation is NEVER empty or untranslated
  let vietnamese = (sentence.vietnamese || '').trim();
  if (!vietnamese || (vietnamese.toLowerCase() === english.toLowerCase() && english.length > 3)) {
    vietnamese = translateEnglishSentence(english, words);
  }

  if (vietnamese && !/[.?!]$/.test(vietnamese)) {
    vietnamese += endingPunctuation;
  }

  return {
    ...sentence,
    english,
    vietnamese,
    words,
  };
}

/**
 * Normalizes all sentences in a lesson.
 */
export function normalizeLesson(lesson: Lesson): Lesson {
  if (!lesson || !Array.isArray(lesson.sentences)) return lesson;

  return {
    ...lesson,
    sentences: lesson.sentences.map((s) => normalizeSentence(s)),
  };
}

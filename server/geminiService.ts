import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

// Supported models for text tasks in order of preference
export const FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

export interface GeminiFallbackResult {
  text: string;
  modelUsed: string;
}

/**
 * Helper to sleep for ms
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Determines whether an error is transient (e.g. 503 UNAVAILABLE, 429 rate limit, 500, 502, 504)
 */
function isTransientError(error: any): boolean {
  if (!error) return false;

  const status = error.status || error.code || error.statusCode;
  const message = (error.message || "").toLowerCase();

  if (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    status === "UNAVAILABLE" ||
    status === "RESOURCE_EXHAUSTED"
  ) {
    return true;
  }

  if (
    message.includes("high demand") ||
    message.includes("unavailable") ||
    message.includes("spikes in demand") ||
    message.includes("quota exceeded") ||
    message.includes("rate limit") ||
    message.includes("overloaded")
  ) {
    return true;
  }

  return false;
}

/**
 * Execute generateContent with automatic retry on transient errors
 * and automatic fallback across valid Gemini models.
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  baseParams: Omit<GenerateContentParameters, "model">
): Promise<GeminiFallbackResult> {
  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    // Up to 2 attempts per model for transient errors
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[Gemini] Attempting generation with model '${model}' (attempt ${attempt + 1})...`);
        const response: GenerateContentResponse = await ai.models.generateContent({
          ...baseParams,
          model,
        });

        const text = response.text || "";
        console.log(`[Gemini] Generation succeeded with model '${model}'.`);
        return {
          text,
          modelUsed: model,
        };
      } catch (err: any) {
        lastError = err;
        const isTransient = isTransientError(err);
        const errMsg = err?.message || String(err);

        console.warn(
          `[Gemini] Warning: Model '${model}' attempt ${attempt + 1} failed: ${errMsg.slice(0, 160)}...`
        );

        if (!isTransient) {
          // If error is not transient (e.g. invalid request format or invalid auth), don't retry same model
          break;
        }

        // Short exponential backoff before next attempt or next model
        const backoffMs = attempt === 0 ? 600 : 1200;
        await wait(backoffMs);
      }
    }
  }

  // All models and attempts exhausted
  throw lastError || new Error("All Gemini models were unavailable due to high demand.");
}

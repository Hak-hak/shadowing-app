import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

// Supported models for text tasks in order of preference (ultra-fast flash-lite first)
export const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
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
    message.includes("overloaded") ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return true;
  }

  return false;
}

/**
 * Execute generateContent with tight timeout and automatic model fallback
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  baseParams: Omit<GenerateContentParameters, "model">
): Promise<GeminiFallbackResult> {
  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`[Gemini] Attempting generation with model '${model}'...`);

      // 10-second timeout per model to prevent gateway timeouts (504)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Model '${model}' timed out after 10s`)), 10000)
      );

      const response: GenerateContentResponse = await Promise.race([
        ai.models.generateContent({
          ...baseParams,
          model,
        }),
        timeoutPromise,
      ]);

      const text = response.text || "";
      console.log(`[Gemini] Generation succeeded with model '${model}'.`);
      return {
        text,
        modelUsed: model,
      };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(
        `[Gemini] Model '${model}' failed or timed out: ${errMsg.slice(0, 100)}... trying next model.`
      );
      // Wait 300ms before trying next model
      await wait(300);
    }
  }

  // All models exhausted
  throw lastError || new Error("All Gemini models were unavailable due to high demand.");
}

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const DEFAULT_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash'
];

export function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return key.trim();
}

/**
 * Robust JSON parser that handles markdown code fences
 */
export function cleanAndParseJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty response from model');
  }

  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(extracted);
    }
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const extracted = cleaned.substring(firstBracket, lastBracket + 1);
      return JSON.parse(extracted);
    }
    throw new Error(`JSON parsing failed: ${err.message}. Raw: ${cleaned.substring(0, 150)}...`);
  }
}

/**
 * Generate Gemini content with timeouts, retries, and fast fallback models
 */
export async function generateGeminiContent({
  systemInstruction = '',
  contents,
  preferredModel = 'gemini-3.5-flash',
  temperature = 0.2,
  jsonMode = true,
  timeoutMs = 45000
}) {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const modelsToTry = [
    preferredModel,
    ...DEFAULT_MODELS.filter((m) => m !== preferredModel)
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    const maxRetries = 1;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const config = {
          temperature
        };

        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        if (jsonMode) {
          config.responseMimeType = 'application/json';
        }

        let rawResponseText = null;

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Call to model ${model} timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        // 1. Try Official SDK
        try {
          const sdkCall = ai.models.generateContent({
            model,
            contents,
            config
          });
          const response = await Promise.race([sdkCall, timeoutPromise]);
          rawResponseText = response.text;
        } catch (sdkErr) {
          // 2. Direct REST fallback
          const restPromise = (async () => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const bodyPayload = {
              contents: [{ parts: [{ text: typeof contents === 'string' ? contents : JSON.stringify(contents) }] }],
              generationConfig: {
                temperature,
                ...(jsonMode ? { responseMimeType: 'application/json' } : {})
              }
            };
            if (systemInstruction) {
              bodyPayload.systemInstruction = { parts: [{ text: systemInstruction }] };
            }

            const restRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyPayload),
              signal: AbortSignal.timeout(timeoutMs)
            });

            if (!restRes.ok) {
              const errBody = await restRes.text().catch(() => '');
              throw new Error(`REST fallback HTTP ${restRes.status}: ${errBody}`);
            }

            const restJson = await restRes.json();
            return restJson.candidates?.[0]?.content?.parts?.[0]?.text;
          })();

          rawResponseText = await Promise.race([restPromise, timeoutPromise]);
        }

        if (!rawResponseText) {
          throw new Error(`Empty response returned by model ${model}`);
        }

        if (jsonMode) {
          const parsedData = cleanAndParseJson(rawResponseText);
          return { data: parsedData, model, rawText: rawResponseText };
        }

        return { data: rawResponseText, model, rawText: rawResponseText };
      } catch (err) {
        lastError = err;
        if (err.message && (err.message.includes('404') || err.message.includes('not found') || err.message.includes('NOT_FOUND'))) {
          break;
        }
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 800));
        }
      }
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown'}`);
}

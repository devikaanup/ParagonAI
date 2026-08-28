/**
 * Centralized Gemini Client with Exponential Backoff, Multi-Model Fallback,
 * and JSON Schema Repair.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro'
];

export function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

export function isApiKeyConfigured() {
  const key = getApiKey();
  return Boolean(key && key.trim().length > 5);
}

/**
 * Extracts and cleans JSON from LLM response text
 */
export function cleanJsonText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '{}';
  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    }
  }

  // Find first { or [ and last } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = 0;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const endIdx = Math.max(lastBrace, lastBracket);

  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // Remove potential trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  return cleaned;
}

/**
 * Parses JSON safely with fallback repair
 */
export function safeJsonParse(text, fallback = null) {
  try {
    const cleaned = cleanJsonText(text);
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[Gemini Client] Initial JSON parse failed, attempting secondary repair...', err.message);
    try {
      let repaired = text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const start = repaired.indexOf('{');
      const end = repaired.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        repaired = repaired.substring(start, end + 1);
        repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        return JSON.parse(repaired);
      }
    } catch (secondErr) {
      console.error('[Gemini Client] Failed to parse JSON:', secondErr.message, '\nRaw text:\n', text);
    }
    if (fallback !== null) return fallback;
    throw new Error(`Failed to parse structured JSON response: ${err.message}`);
  }
}

/**
 * Executes a Gemini prompt with retries and exponential backoff.
 * @param {object} options
 * @param {string} options.systemInstruction - System instruction/persona
 * @param {string|Array} options.contents - Prompt or content parts
 * @param {string} [options.preferredModel] - Optional specific model
 * @param {number} [options.temperature] - Generation temperature (default 0.2)
 * @param {number} [options.maxTokens] - Max output tokens (default 4096)
 * @param {boolean} [options.jsonMode] - Request JSON output (default true)
 * @param {number} [options.maxRetries] - Retries on 429/5xx (default 2)
 */
export async function generateGeminiContent({
  systemInstruction,
  contents,
  preferredModel = 'gemini-2.5-flash',
  temperature = 0.2,
  maxTokens = 4096,
  jsonMode = true,
  maxRetries = 2
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your environment or Netlify dashboard.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const modelsToTry = [
    preferredModel,
    ...DEFAULT_MODELS.filter((m) => m !== preferredModel)
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.log(`[Gemini Client] Retrying ${modelName} after backoff ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries + 1})...`);
          await new Promise((res) => setTimeout(res, delayMs));
        }

        // Try using official SDK first
        try {
          const ai = new GoogleGenAI({ apiKey });
          const config = {
            temperature,
            maxOutputTokens: maxTokens,
            systemInstruction: systemInstruction || undefined
          };
          if (jsonMode) {
            config.responseMimeType = 'application/json';
          }

          const response = await ai.models.generateContent({
            model: modelName,
            contents: typeof contents === 'string' ? contents : JSON.stringify(contents),
            config
          });

          const text = response.text || (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text);
          if (!text) {
            throw new Error(`Empty response from Gemini API model ${modelName}`);
          }

          return {
            text,
            model: modelName,
            data: jsonMode ? safeJsonParse(text) : null
          };
        } catch (sdkError) {
          // If SDK throws network/fetch error, attempt direct REST fallback
          console.warn(`[Gemini Client] SDK call for ${modelName} encountered error:`, sdkError.message);

          const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const bodyPayload = {
            contents: [
              {
                role: 'user',
                parts: [{ text: typeof contents === 'string' ? contents : JSON.stringify(contents) }]
              }
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              responseMimeType: jsonMode ? 'application/json' : 'text/plain'
            }
          };

          if (systemInstruction) {
            bodyPayload.systemInstruction = {
              parts: [{ text: systemInstruction }]
            };
          }

          const fetchRes = await fetch(restUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
          });

          if (!fetchRes.ok) {
            const errData = await fetchRes.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP ${fetchRes.status} ${fetchRes.statusText}`;
            const error = new Error(`Gemini REST API error (${modelName}): ${errMsg}`);
            error.status = fetchRes.status;
            throw error;
          }

          const restData = await fetchRes.json();
          const responseText = restData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!responseText) {
            throw new Error(`Empty REST candidate text from ${modelName}`);
          }

          return {
            text: responseText,
            model: modelName,
            data: jsonMode ? safeJsonParse(responseText) : null
          };
        }
      } catch (err) {
        lastError = err;
        const isRateLimit = err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('quota'));
        const isServerErr = err.status >= 500 || (err.message && err.message.includes('503'));

        if (!isRateLimit && !isServerErr && attempt === 0) {
          // If error is 400 or invalid model, break out to try next fallback model
          break;
        }
      }
    }
  }

  throw lastError || new Error('All Gemini models and retry attempts exhausted.');
}

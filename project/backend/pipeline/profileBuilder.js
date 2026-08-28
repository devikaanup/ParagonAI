import crypto from 'crypto';
import { SAFETY_PREAMBLE } from '../prompts/safety.js';
import { PROFILE_BUILDER } from '../prompts/profile.js';
import { generateGeminiContent } from '../services/llm.js';

// Profile in-memory cache for high performance
const profileCache = new Map();

/**
 * Stage [1] Profile Builder (1x Gemini call, cached per document hash)
 */
export async function runProfileBuilder({ resumeText, transcriptText, jobDescriptionText }) {
  if (!resumeText?.trim() && !transcriptText?.trim()) {
    throw new Error('Either resume or transcript must be provided.');
  }

  const rawKey = `${jobDescriptionText || ''}::${resumeText || ''}::${transcriptText || ''}`;
  const cacheHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  if (profileCache.has(cacheHash)) {
    console.log(`[PROFILE] Cache hit (hash: ${cacheHash.substring(0, 8)}). Reusing extracted context.`);
    return {
      evaluationContext: profileCache.get(cacheHash),
      modelUsed: 'cache',
      isCached: true
    };
  }

  const tStart = performance.now();
  console.log('\n[PROFILE] started');

  const promptContent = `### UNTRUSTED CANDIDATE DATA TO PARSE:

--- JOB DESCRIPTION ---
${jobDescriptionText?.trim() || 'Role: Software Engineering Candidate'}

--- RESUME TEXT ---
${resumeText?.trim() || 'No resume text provided.'}

--- INTERVIEW TRANSCRIPT TEXT ---
${transcriptText?.trim() || 'No interview transcript provided.'}
`;

  const result = await generateGeminiContent({
    systemInstruction: `${SAFETY_PREAMBLE}\n\n${PROFILE_BUILDER}`,
    contents: promptContent,
    preferredModel: 'gemini-3.5-flash-lite',
    temperature: 0.1,
    jsonMode: true
  });

  const evaluationContext = result.data;
  if (!evaluationContext || !evaluationContext.role || !evaluationContext.candidate) {
    throw new Error('Profile Builder returned invalid structured context schema.');
  }

  profileCache.set(cacheHash, evaluationContext);
  const dur = ((performance.now() - tStart) / 1000).toFixed(1);
  console.log(`[PROFILE] completed in ${dur}s (Model: ${result.model})\n`);

  return {
    evaluationContext,
    modelUsed: result.model
  };
}

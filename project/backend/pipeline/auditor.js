import { SAFETY_PREAMBLE } from '../prompts/safety.js';
import { AUDITOR } from '../prompts/auditor.js';
import { generateGeminiContent } from '../services/llm.js';

/**
 * Stage [4] Auditor (1x Gemini call)
 * Non-voting reasoning auditor checking for cherry-picking, unsupported leaps, or bias.
 */
export async function runAuditor({ evaluationContext, opinions, debateTranscript }) {
  const tStart = performance.now();
  console.log('[AUDITOR] started');

  const auditPayload = `### EVALUATION CONTEXT:
${JSON.stringify(evaluationContext, null, 2)}

### INITIAL INDEPENDENT AGENT OPINIONS:
${JSON.stringify(opinions, null, 2)}

### DEBATE TRANSCRIPT:
${JSON.stringify(debateTranscript, null, 2)}

Audit the reasoning quality, evidence grounding, and bias risks. Output strictly valid JSON.`;

  const result = await generateGeminiContent({
    systemInstruction: `${SAFETY_PREAMBLE}\n\n${AUDITOR}`,
    contents: auditPayload,
    preferredModel: 'gemini-3.5-flash-lite',
    temperature: 0.1,
    jsonMode: true
  });

  const dur = ((performance.now() - tStart) / 1000).toFixed(1);
  console.log(`[AUDITOR] completed in ${dur}s (Model: ${result.model})\n`);

  return result.data;
}

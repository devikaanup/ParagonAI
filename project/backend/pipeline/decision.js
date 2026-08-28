import { SAFETY_PREAMBLE } from '../prompts/safety.js';
import { DECISION_SYNTHESIZER } from '../prompts/decision.js';
import { generateGeminiContent } from '../services/llm.js';

/**
 * Stage [5] Decision Synthesizer (1x Gemini call)
 * Dedicated comparative reasoning call; NEVER averages scores.
 */
export async function runDecisionSynthesizer({ evaluationContext, opinions, debateTranscript, auditorReport }) {
  const tStart = performance.now();
  console.log('[SYNTHESIS] started');

  const synthesisPayload = `### EVALUATION CONTEXT:
${JSON.stringify(evaluationContext, null, 2)}

### INITIAL AGENT OPINIONS:
${JSON.stringify(opinions, null, 2)}

### DEBATE TRANSCRIPT:
${JSON.stringify(debateTranscript, null, 2)}

### AUDITOR REPORT:
${JSON.stringify(auditorReport, null, 2)}

CRITICAL REMINDER: Do NOT average scores or use majority voting. Perform rigorous comparative evidence weighting and identify resolved and unresolved disagreements. Output strictly valid JSON.`;

  const result = await generateGeminiContent({
    systemInstruction: `${SAFETY_PREAMBLE}\n\n${DECISION_SYNTHESIZER}`,
    contents: synthesisPayload,
    preferredModel: 'gemini-3.5-flash',
    temperature: 0.2,
    jsonMode: true
  });

  const dur = ((performance.now() - tStart) / 1000).toFixed(1);
  console.log(`[SYNTHESIS] completed in ${dur}s (Model: ${result.model})\n`);

  return result.data;
}

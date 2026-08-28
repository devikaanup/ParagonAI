import { SAFETY_PREAMBLE } from '../prompts/safety.js';
import { QUESTION_GENERATOR } from '../prompts/questions.js';
import { generateGeminiContent } from '../services/llm.js';

/**
 * Stage [6] Interview Question Generator (1x Gemini call)
 * Generates 2-3 questions tied strictly to unresolved disagreements.
 */
export async function runQuestionGenerator({ evaluationContext, unresolvedDisagreements }) {
  const tStart = performance.now();
  console.log('[QUESTIONS] started');

  const disagreementsToUse = Array.isArray(unresolvedDisagreements) && unresolvedDisagreements.length > 0
    ? unresolvedDisagreements
    : [{
        issue: "Deep dive into candidate's production outage recovery and architecture boundaries",
        agents_involved: ["Technical Agent", "Skeptic Agent"],
        positions: ["Technical highlights consensus depth", "Skeptic queries exact individual vs team ownership"],
        why_unresolved: "Requires direct interactive verification by human interviewer",
        importance: "medium"
      }];

  const questionPayload = `### EVALUATION CONTEXT:
${JSON.stringify(evaluationContext, null, 2)}

### UNRESOLVED DISAGREEMENTS IDENTIFIED BY THE PANEL:
${JSON.stringify(disagreementsToUse, null, 2)}

Generate 2 to 3 targeted, neutral, evidence-based follow-up interview questions corresponding directly to these unresolved disagreements. Output strictly valid JSON.`;

  const result = await generateGeminiContent({
    systemInstruction: `${SAFETY_PREAMBLE}\n\n${QUESTION_GENERATOR}`,
    contents: questionPayload,
    preferredModel: 'gemini-3.5-flash-lite',
    temperature: 0.3,
    jsonMode: true
  });

  const dur = ((performance.now() - tStart) / 1000).toFixed(1);
  console.log(`[QUESTIONS] completed in ${dur}s (Model: ${result.model})\n`);

  return result.data;
}

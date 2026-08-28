import { SAFETY_PREAMBLE } from '../prompts/safety.js';
import { TECHNICAL_AGENT } from '../prompts/technical.js';
import { HR_CULTURE_AGENT } from '../prompts/hr.js';
import { HIRING_MANAGER_AGENT } from '../prompts/hiringManager.js';
import { SKEPTIC_AGENT } from '../prompts/skeptic.js';
import { generateGeminiContent } from '../services/llm.js';
import { validateAgentEvidence } from '../services/validator.js';

export const AGENT_PERSONAS = [
  {
    key: 'technical',
    aliases: ['tech', 'technical_agent'],
    name: 'Technical Agent',
    systemPrompt: TECHNICAL_AGENT,
    accent: 'var(--tech-blue)'
  },
  {
    key: 'hr',
    aliases: ['hr_culture', 'culture', 'hr_agent'],
    name: 'HR / Culture Agent',
    systemPrompt: HR_CULTURE_AGENT,
    accent: 'var(--hr-green)'
  },
  {
    key: 'hiringManager',
    aliases: ['manager', 'hiring_manager', 'hiring-manager', 'hiringmanager', 'manager_agent'],
    name: 'Hiring Manager Agent',
    systemPrompt: HIRING_MANAGER_AGENT,
    accent: 'var(--manager-amber)'
  },
  {
    key: 'skeptic',
    aliases: ['skeptic_agent'],
    name: 'Skeptic Agent',
    systemPrompt: SKEPTIC_AGENT,
    accent: 'var(--skeptic-red)'
  }
];

export function findPersonaByKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  const normalized = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    AGENT_PERSONAS.find((p) => {
      const pKeyNorm = p.key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const pNameNorm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (pKeyNorm === normalized || pNameNorm.includes(normalized) || normalized.includes(pKeyNorm)) {
        return true;
      }
      if (Array.isArray(p.aliases)) {
        return p.aliases.some((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized);
      }
      return false;
    }) || null
  );
}

/**
 * Stage [2] Single Independent Agent (Isolated call)
 * Enforces strict isolation: receives ONLY evaluation_context + persona instructions.
 */
export async function runIndependentAgent({ agentPersona, evaluationContext, rawSourceText = '' }) {
  if (!agentPersona || !evaluationContext) {
    throw new Error('Agent persona and evaluation context are required for independent evaluation.');
  }

  // ISOLATION VERIFICATION: Ensure NO other agent opinions are included in this payload
  const isolatedContent = `### IMMUTABLE EVALUATION CONTEXT:
${JSON.stringify(evaluationContext, null, 2)}

Provide your independent evaluation strictly in JSON format as specified.`;

  const result = await generateGeminiContent({
    systemInstruction: `${SAFETY_PREAMBLE}\n\n${agentPersona.systemPrompt}`,
    contents: isolatedContent,
    preferredModel: 'gemini-3.5-flash',
    temperature: 0.2,
    jsonMode: true
  });

  let rawOpinion = result.data;
  if (!rawOpinion) {
    throw new Error(`Failed to generate opinion for ${agentPersona.name}`);
  }

  // Ensure mandatory fields
  rawOpinion.agent = agentPersona.name;
  rawOpinion.score = typeof rawOpinion.score === 'number' ? Math.min(100, Math.max(0, Math.round(rawOpinion.score))) : 75;
  rawOpinion.confidence = rawOpinion.confidence || 'Medium';

  // Programmatic quote validation
  const validatedOpinion = validateAgentEvidence(rawOpinion, evaluationContext, rawSourceText);
  validatedOpinion.modelUsed = result.model;

  return validatedOpinion;
}

/**
 * Stage [2] Run all 4 Independent Agents IN PARALLEL (4 genuinely isolated Gemini calls)
 */
export async function runAllIndependentAgents({ evaluationContext, rawSourceText = '', onProgress = null }) {
  const tStart = performance.now();
  console.log('\n[4 AGENTS] Starting parallel evaluation across 4 personas...');
  AGENT_PERSONAS.forEach((p) => console.log(`[${p.name.toUpperCase()}] started`));

  const promises = AGENT_PERSONAS.map(async (persona) => {
    const tAgent = performance.now();
    try {
      if (onProgress) onProgress({ agent: persona.name, status: 'evaluating' });
      const opinion = await runIndependentAgent({
        agentPersona: persona,
        evaluationContext,
        rawSourceText
      });
      const dur = ((performance.now() - tAgent) / 1000).toFixed(1);
      console.log(`[${persona.name.toUpperCase()}] completed in ${dur}s (Score: ${opinion.score}/100, Model: ${opinion.modelUsed})`);
      if (onProgress) onProgress({ agent: persona.name, status: 'completed', opinion });
      return opinion;
    } catch (err) {
      const dur = ((performance.now() - tAgent) / 1000).toFixed(1);
      console.error(`[${persona.name.toUpperCase()}] failed after ${dur}s:`, err.message);
      const fallback = {
        agent: persona.name,
        error: err.message,
        score: null,
        confidence: 'Unavailable',
        verdict: 'Unavailable',
        summary: `Evaluation unavailable: ${err.message}`,
        evidence_quotes: [],
        strengths: [],
        concerns: [`Agent failed with error: ${err.message}`],
        reasoning: 'Evaluation could not be completed.'
      };
      if (onProgress) onProgress({ agent: persona.name, status: 'failed', error: err.message });
      return fallback;
    }
  });

  const opinions = await Promise.all(promises);
  const totalDur = ((performance.now() - tStart) / 1000).toFixed(1);
  console.log(`[4 AGENTS] completed in ${totalDur}s total (parallel)\n`);

  return opinions;
}

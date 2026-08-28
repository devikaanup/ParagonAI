import { SAFETY_PREAMBLE } from '../prompts/safety.js';
import { DEBATE_TURN } from '../prompts/debate.js';
import { generateGeminiContent } from '../services/llm.js';
import { AGENT_PERSONAS, findPersonaByKey } from './agents.js';

export const DEBATE_TURNS_CONFIG = [
  { turnNumber: 1, turnType: 'Challenge', personaKey: 'technical' },
  { turnNumber: 2, turnType: 'Defense / Cross-examination', personaKey: 'hr' },
  { turnNumber: 3, turnType: 'Reassessment', personaKey: 'hiringManager' },
  { turnNumber: 4, turnType: 'Closing Challenge', personaKey: 'skeptic' }
];

/**
 * Stage [3] Single Deliberation Turn (1x Gemini call)
 */
export async function runSingleDebateTurn({
  evaluationContext,
  opinions,
  debateTranscript = [],
  persona,
  turnNumber = 1,
  turnType = 'Challenge'
}) {
  const validOpinions = (opinions || []).filter((op) => !op.error && op.score !== null);
  const priorOpinion = (opinions || []).find((op) => op.agent === persona.name);
  const initialScore = priorOpinion && typeof priorOpinion.score === 'number' ? priorOpinion.score : 75;

  const debatePrompt = DEBATE_TURN({
    agentName: persona.name,
    personaPrompt: persona.systemPrompt,
    turnNumber,
    turnType
  });

  const contextPayload = `### EVALUATION CONTEXT (Candidate Profile & Claims):
${JSON.stringify(evaluationContext, null, 2)}

### INITIAL INDEPENDENT OPINIONS FROM ALL 4 AGENTS:
${JSON.stringify(validOpinions, null, 2)}

### ACCUMULATED DEBATE TRANSCRIPT SO FAR:
${debateTranscript.length > 0 ? JSON.stringify(debateTranscript, null, 2) : 'No prior debate statements yet. You are speaking in Turn 1.'}

### YOUR PREVIOUS SCORE:
${initialScore}

Engage directly with the other agents' specific arguments, address agreements/disagreements by name, cite specific claims/quotes, and state whether your position has changed. Output strictly valid JSON.`;

  const tStart = performance.now();
  console.log(`[DEBATE TURN ${turnNumber}] (${turnType}) ${persona.name} started`);

  const result = await generateGeminiContent({
    systemInstruction: `${SAFETY_PREAMBLE}\n\n${debatePrompt}`,
    contents: contextPayload,
    preferredModel: 'gemini-3.5-flash',
    temperature: 0.25,
    jsonMode: true
  });

  const dur = ((performance.now() - tStart) / 1000).toFixed(1);
  console.log(`[DEBATE TURN ${turnNumber}] completed in ${dur}s (Model: ${result.model})`);

  const turn = result.data || {};
  turn.agent = persona.name;
  turn.turn_number = turnNumber;
  turn.turn_type = turnType;
  turn.score_before = initialScore;
  turn.score_after = typeof turn.score_after === 'number'
    ? Math.min(100, Math.max(0, Math.round(turn.score_after)))
    : initialScore;
  turn.position_changed = turn.position_changed === true || (turn.score_after !== turn.score_before);
  turn.confidence = turn.confidence || priorOpinion?.confidence || 'Medium';
  turn.cited_evidence = Array.isArray(turn.cited_evidence) ? turn.cited_evidence : [];
  turn.agreements = Array.isArray(turn.agreements) ? turn.agreements : [];
  turn.disagreements = Array.isArray(turn.disagreements) ? turn.disagreements : [];
  turn.modelUsed = result.model;

  return turn;
}

/**
 * Stage [3] Sequential Live Committee Debate (4 separate Gemini calls)
 */
export async function runDebateRound({ evaluationContext, opinions, onTurnComplete = null }) {
  const tStart = performance.now();
  console.log('\n[DEBATE] Starting sequential 4-turn committee deliberation...');
  const debateTranscript = [];

  for (let i = 0; i < DEBATE_TURNS_CONFIG.length; i++) {
    const config = DEBATE_TURNS_CONFIG[i];
    const persona = findPersonaByKey(config.personaKey) || AGENT_PERSONAS[i];
    const priorOpinion = opinions.find((op) => op.agent === persona.name);
    const initialScore = priorOpinion && typeof priorOpinion.score === 'number' ? priorOpinion.score : 75;

    try {
      const turn = await runSingleDebateTurn({
        evaluationContext,
        opinions,
        debateTranscript,
        persona,
        turnNumber: config.turnNumber,
        turnType: config.turnType
      });

      debateTranscript.push(turn);
      if (onTurnComplete) onTurnComplete(turn);
    } catch (err) {
      console.error(`[DEBATE TURN ${config.turnNumber}] Error for ${persona.name}:`, err.message);
      const fallbackTurn = {
        agent: persona.name,
        turn_number: config.turnNumber,
        turn_type: config.turnType,
        responding_to: 'Panel Committee',
        position_changed: false,
        score_before: initialScore,
        score_after: initialScore,
        reason_for_change: `Maintained position. (Encountered transient notice: ${err.message})`,
        response: `Maintained position. (Debate call encountered transient notice: ${err.message})`,
        cited_evidence: [],
        agreements: [],
        disagreements: [],
        remaining_uncertainties: [],
        confidence: priorOpinion?.confidence || 'Medium'
      };
      debateTranscript.push(fallbackTurn);
      if (onTurnComplete) onTurnComplete(fallbackTurn);
    }
  }

  const totalDur = ((performance.now() - tStart) / 1000).toFixed(1);
  console.log(`[DEBATE] completed in ${totalDur}s total (4 turns)\n`);
  return debateTranscript;
}

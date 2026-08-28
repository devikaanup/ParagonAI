/**
 * The Panel Multi-Agent Pipeline Orchestrator
 * Implements 6 distinct pipeline stages and 12 isolated/sequential Gemini API calls.
 */

import { SYSTEM_INSTRUCTIONS } from './prompts.js';
import { generateGeminiContent } from './gemini.js';
import { validateAgentEvidence, validateQuote } from './evidenceValidator.js';
import { GOLDEN_RUN_OUTPUT } from './demoData.js';

export const AGENT_PERSONAS = [
  {
    key: 'technical',
    name: 'Technical Agent',
    systemPrompt: SYSTEM_INSTRUCTIONS.TECHNICAL_AGENT,
    accent: 'var(--tech-blue)'
  },
  {
    key: 'hr',
    name: 'HR / Culture Agent',
    systemPrompt: SYSTEM_INSTRUCTIONS.HR_CULTURE_AGENT,
    accent: 'var(--hr-green)'
  },
  {
    key: 'manager',
    name: 'Hiring Manager Agent',
    systemPrompt: SYSTEM_INSTRUCTIONS.HIRING_MANAGER_AGENT,
    accent: 'var(--manager-amber)'
  },
  {
    key: 'skeptic',
    name: 'Skeptic Agent',
    systemPrompt: SYSTEM_INSTRUCTIONS.SKEPTIC_AGENT,
    accent: 'var(--skeptic-red)'
  }
];

/**
 * Stage [1] Profile Builder (1x Gemini call)
 */
export async function runProfileBuilder({ resumeText, transcriptText, jobDescriptionText }) {
  if (!resumeText?.trim() && !transcriptText?.trim()) {
    throw new Error('Either resume or transcript must be provided.');
  }

  const promptContent = `### UNTRUSTED CANDIDATE DATA TO PARSE:

--- JOB DESCRIPTION ---
${jobDescriptionText?.trim() || 'Role: Software Engineering Candidate'}

--- RESUME TEXT ---
${resumeText?.trim() || 'No resume text provided.'}

--- INTERVIEW TRANSCRIPT TEXT ---
${transcriptText?.trim() || 'No interview transcript provided.'}
`;

  console.log('\n[Pipeline Stage 1] Profile Builder Input Summary:');
  console.log(`  - Resume text length: ${resumeText?.trim().length || 0} chars`);
  console.log(`  - Transcript text length: ${transcriptText?.trim().length || 0} chars`);
  console.log(`  - Job description length: ${jobDescriptionText?.trim().length || 0} chars`);
  console.log('==================== STAGE 1 FULL PROMPT START ====================');
  console.log(promptContent);
  console.log('==================== STAGE 1 FULL PROMPT END ====================\n');

  const result = await generateGeminiContent({
    systemInstruction: `${SYSTEM_INSTRUCTIONS.SAFETY_PREAMBLE}\n\n${SYSTEM_INSTRUCTIONS.PROFILE_BUILDER}`,
    contents: promptContent,
    preferredModel: 'gemini-3.6-flash',
    temperature: 0.1,
    jsonMode: true
  });

  const evaluationContext = result.data;
  if (!evaluationContext || !evaluationContext.role || !evaluationContext.candidate) {
    throw new Error('Profile Builder returned invalid structured context schema.');
  }

  return {
    evaluationContext,
    modelUsed: result.model
  };
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

  console.log(`[Pipeline Stage 2] Running isolated call for: ${agentPersona.name}...`);
  const result = await generateGeminiContent({
    systemInstruction: `${SYSTEM_INSTRUCTIONS.SAFETY_PREAMBLE}\n\n${agentPersona.systemPrompt}`,
    contents: isolatedContent,
    preferredModel: 'gemini-3.6-flash',
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
 * Stage [2] Run all 4 Independent Agents (4 genuinely isolated Gemini calls)
 */
export async function runAllIndependentAgents({ evaluationContext, rawSourceText = '', onProgress = null }) {
  const opinions = [];

  for (const persona of AGENT_PERSONAS) {
    try {
      if (onProgress) onProgress({ agent: persona.name, status: 'evaluating' });
      const opinion = await runIndependentAgent({
        agentPersona: persona,
        evaluationContext,
        rawSourceText
      });
      opinions.push(opinion);
      if (onProgress) onProgress({ agent: persona.name, status: 'completed', opinion });
    } catch (err) {
      console.error(`[Pipeline Stage 2] Error evaluating ${persona.name}:`, err.message);
      opinions.push({
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
      });
      if (onProgress) onProgress({ agent: persona.name, status: 'failed', error: err.message });
    }
  }

  return opinions;
}

export const DEBATE_TURNS_CONFIG = [
  { turnNumber: 1, turnType: 'Challenge', personaKey: 'technical' },
  { turnNumber: 2, turnType: 'Response', personaKey: 'hr' },
  { turnNumber: 3, turnType: 'Reassessment', personaKey: 'manager' },
  { turnNumber: 4, turnType: 'Final Position', personaKey: 'skeptic' }
];

/**
 * Executes a single sequential debate turn for a specific persona.
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

  const debatePrompt = SYSTEM_INSTRUCTIONS.DEBATE_TURN({
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

  console.log(`[Pipeline Stage 3] Running Debate Turn ${turnNumber} (${turnType}) for ${persona.name}...`);
  const result = await generateGeminiContent({
    systemInstruction: `${SYSTEM_INSTRUCTIONS.SAFETY_PREAMBLE}\n\n${debatePrompt}`,
    contents: contextPayload,
    preferredModel: 'gemini-3.6-flash',
    temperature: 0.25,
    jsonMode: true
  });

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

  return turn;
}

/**
 * Stage [3] Sequential Live Committee Debate (4 separate Gemini calls)
 * Each agent receives: evaluation_context, all 4 independent opinions, and accumulated transcript.
 */
export async function runDebateRound({ evaluationContext, opinions, onTurnComplete = null }) {
  const debateTranscript = [];

  for (let i = 0; i < DEBATE_TURNS_CONFIG.length; i++) {
    const config = DEBATE_TURNS_CONFIG[i];
    const persona = AGENT_PERSONAS.find((p) => p.key === config.personaKey) || AGENT_PERSONAS[i];
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
      await new Promise((res) => setTimeout(res, 800));
    } catch (err) {
      console.error(`[Pipeline Stage 3] Error during debate turn ${config.turnNumber} for ${persona.name}:`, err.message);
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

  return debateTranscript;
}

/**
 * Stage [4] Auditor (1x Gemini call)
 * Non-voting reasoning auditor checking for cherry-picking, unsupported leaps, or bias.
 */
export async function runAuditor({ evaluationContext, opinions, debateTranscript }) {
  const auditPayload = `### EVALUATION CONTEXT:
${JSON.stringify(evaluationContext, null, 2)}

### INITIAL INDEPENDENT AGENT OPINIONS:
${JSON.stringify(opinions, null, 2)}

### DEBATE TRANSCRIPT:
${JSON.stringify(debateTranscript, null, 2)}

Audit the reasoning quality, evidence grounding, and bias risks. Output strictly valid JSON.`;

  console.log('[Pipeline Stage 4] Running Auditor...');
  const result = await generateGeminiContent({
    systemInstruction: `${SYSTEM_INSTRUCTIONS.SAFETY_PREAMBLE}\n\n${SYSTEM_INSTRUCTIONS.AUDITOR}`,
    contents: auditPayload,
    preferredModel: 'gemini-3.6-flash',
    temperature: 0.1,
    jsonMode: true
  });

  return result.data;
}

/**
 * Stage [5] Decision Synthesizer (1x Gemini call)
 * Dedicated comparative reasoning call; NEVER averages scores.
 */
export async function runDecisionSynthesizer({ evaluationContext, opinions, debateTranscript, auditorReport }) {
  const synthesisPayload = `### EVALUATION CONTEXT:
${JSON.stringify(evaluationContext, null, 2)}

### INITIAL AGENT OPINIONS:
${JSON.stringify(opinions, null, 2)}

### DEBATE TRANSCRIPT:
${JSON.stringify(debateTranscript, null, 2)}

### AUDITOR REPORT:
${JSON.stringify(auditorReport, null, 2)}

CRITICAL REMINDER: Do NOT average scores or use majority voting. Perform rigorous comparative evidence weighting and identify resolved and unresolved disagreements. Output strictly valid JSON.`;

  console.log('[Pipeline Stage 5] Running Decision Synthesizer...');
  const result = await generateGeminiContent({
    systemInstruction: `${SYSTEM_INSTRUCTIONS.SAFETY_PREAMBLE}\n\n${SYSTEM_INSTRUCTIONS.DECISION_SYNTHESIZER}`,
    contents: synthesisPayload,
    preferredModel: 'gemini-3.6-flash',
    temperature: 0.2,
    jsonMode: true
  });

  const decision = result.data;
  // Validation: Ensure comparative reasoning exists and not a mere score repeat
  if (!decision.decision_summary || decision.decision_summary.length < 30) {
    console.warn('[Pipeline Stage 5] Decision summary too short; retrying synthesis once...');
    const retryResult = await generateGeminiContent({
      systemInstruction: `${SYSTEM_INSTRUCTIONS.SAFETY_PREAMBLE}\n\n${SYSTEM_INSTRUCTIONS.DECISION_SYNTHESIZER}`,
      contents: synthesisPayload + '\n\nEnsure decision_summary provides at least two detailed paragraphs explaining why specific evidence prevailed.',
      preferredModel: 'gemini-3.6-flash',
      temperature: 0.3,
      jsonMode: true
    });
    return retryResult.data;
  }

  return decision;
}

/**
 * Stage [6] Interview Question Generator (1x Gemini call)
 * Generates 2-3 questions tied strictly to unresolved disagreements.
 */
export async function runQuestionGenerator({ evaluationContext, unresolvedDisagreements }) {
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

  console.log('[Pipeline Stage 6] Running Interview Question Generator...');
  const result = await generateGeminiContent({
    systemInstruction: `${SYSTEM_INSTRUCTIONS.SAFETY_PREAMBLE}\n\n${SYSTEM_INSTRUCTIONS.QUESTION_GENERATOR}`,
    contents: questionPayload,
    preferredModel: 'gemini-3.6-flash',
    temperature: 0.3,
    jsonMode: true
  });

  return result.data;
}

/**
 * Complete End-to-End Pipeline Execution (12 Gemini API Calls)
 */
export async function runFullPipeline({
  resumeText,
  transcriptText,
  jobDescriptionText,
  onStageUpdate = null
}) {
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const startTime = Date.now();
  const rawCombinedText = `${jobDescriptionText || ''}\n${resumeText || ''}\n${transcriptText || ''}`;

  const state = {
    runId,
    timestamp: new Date().toISOString(),
    status: 'running',
    stages: {
      profile: { status: 'pending' },
      opinions: { status: 'pending' },
      debate: { status: 'pending' },
      auditor: { status: 'pending' },
      decision: { status: 'pending' },
      questions: { status: 'pending' }
    }
  };

  const updateStage = (stageName, stageData) => {
    state.stages[stageName] = { ...state.stages[stageName], ...stageData };
    if (onStageUpdate) onStageUpdate({ stage: stageName, data: state });
  };

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // Stage 1: Profile Builder
  updateStage('profile', { status: 'in_progress' });
  const { evaluationContext, modelUsed } = await runProfileBuilder({
    resumeText,
    transcriptText,
    jobDescriptionText
  });
  state.evaluation_context = evaluationContext;
  state.profileModel = modelUsed;
  updateStage('profile', { status: 'completed', evaluationContext });
  await sleep(1000);

  // Stage 2: Independent Agent Opinions (4 isolated calls)
  updateStage('opinions', { status: 'in_progress', agentStatuses: {} });
  const opinions = await runAllIndependentAgents({
    evaluationContext,
    rawSourceText: rawCombinedText,
    onProgress: ({ agent, status, opinion, error }) => {
      state.stages.opinions.agentStatuses = state.stages.opinions.agentStatuses || {};
      state.stages.opinions.agentStatuses[agent] = { status, error };
      if (onStageUpdate) onStageUpdate({ stage: 'opinions', data: state });
    }
  });
  state.opinions = opinions;
  const availableAgentsCount = opinions.filter((op) => !op.error).length;
  state.panelLabel = availableAgentsCount === 4 ? '4-agent panel (Full)' : `${availableAgentsCount}-agent panel (Partial)`;
  updateStage('opinions', { status: 'completed', opinions });
  await sleep(1000);

  // Stage 3: Debate (4 sequential calls)
  updateStage('debate', { status: 'in_progress', turns: [] });
  const debateTranscript = await runDebateRound({
    evaluationContext,
    opinions,
    onTurnComplete: (turn) => {
      state.stages.debate.turns = state.stages.debate.turns || [];
      state.stages.debate.turns.push(turn);
      if (onStageUpdate) onStageUpdate({ stage: 'debate', data: state });
    }
  });
  state.debate = debateTranscript;
  updateStage('debate', { status: 'completed', debate: debateTranscript });
  await sleep(1000);

  // Stage 4: Auditor (1 call)
  updateStage('auditor', { status: 'in_progress' });
  const auditorReport = await runAuditor({
    evaluationContext,
    opinions,
    debateTranscript
  });
  state.auditor = auditorReport;
  updateStage('auditor', { status: 'completed', auditor: auditorReport });
  await sleep(1000);

  // Stage 5: Decision Synthesizer (1 call)
  updateStage('decision', { status: 'in_progress' });
  const decision = await runDecisionSynthesizer({
    evaluationContext,
    opinions,
    debateTranscript,
    auditorReport
  });
  state.decision = decision;
  updateStage('decision', { status: 'completed', decision });
  await sleep(1000);

  // Stage 6: Interview Questions (1 call)
  updateStage('questions', { status: 'in_progress' });
  const questions = await runQuestionGenerator({
    evaluationContext,
    unresolvedDisagreements: decision.unresolved_disagreements
  });
  state.questions = questions;
  updateStage('questions', { status: 'completed', questions });

  state.status = 'completed';
  state.durationMs = Date.now() - startTime;

  return state;
}

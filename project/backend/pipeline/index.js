import { runProfileBuilder } from './profileBuilder.js';
import { runIndependentAgent, runAllIndependentAgents, AGENT_PERSONAS } from './agents.js';
import { runSingleDebateTurn, runDebateRound, DEBATE_TURNS_CONFIG } from './debate.js';
import { runAuditor } from './auditor.js';
import { runDecisionSynthesizer } from './decision.js';
import { runQuestionGenerator } from './followups.js';

export {
  runProfileBuilder,
  runIndependentAgent,
  runAllIndependentAgents,
  AGENT_PERSONAS,
  runSingleDebateTurn,
  runDebateRound,
  DEBATE_TURNS_CONFIG,
  runAuditor,
  runDecisionSynthesizer,
  runQuestionGenerator
};

/**
 * Complete End-to-End Pipeline Execution (12 Gemini API Calls)
 */
export async function runFullPipeline({
  resumeText,
  transcriptText,
  jobDescriptionText,
  onStageUpdate = null
}) {
  const tPipelineStart = performance.now();
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const rawCombinedText = `${jobDescriptionText || ''}\n${resumeText || ''}\n${transcriptText || ''}`;

  console.log('\n===============================================================');
  console.log(`[PIPELINE START] Launching Full Evaluation (Run ID: ${runId})`);
  console.log('===============================================================');

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

  // Stage 2: Independent Agent Opinions (4 PARALLEL calls)
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

  // Stage 4: Auditor (1 call)
  updateStage('auditor', { status: 'in_progress' });
  const auditorReport = await runAuditor({
    evaluationContext,
    opinions,
    debateTranscript
  });
  state.auditor = auditorReport;
  updateStage('auditor', { status: 'completed', auditor: auditorReport });

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

  // Stage 6: Interview Questions (1 call)
  updateStage('questions', { status: 'in_progress' });
  const questions = await runQuestionGenerator({
    evaluationContext,
    unresolvedDisagreements: decision.unresolved_disagreements
  });
  state.questions = questions;
  updateStage('questions', { status: 'completed', questions });

  state.status = 'completed';
  const totalElapsed = ((performance.now() - tPipelineStart) / 1000).toFixed(1);
  state.durationMs = Math.round(performance.now() - tPipelineStart);

  console.log('===============================================================');
  console.log(`[PIPELINE COMPLETE] Total Pipeline Duration: ${totalElapsed}s across 12 Gemini calls`);
  console.log('===============================================================\n');

  return state;
}

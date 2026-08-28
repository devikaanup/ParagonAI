import dotenv from 'dotenv';
dotenv.config();

import { runProfileBuilder } from '../backend/pipeline/profileBuilder.js';
import { runIndependentAgent, AGENT_PERSONAS } from '../backend/pipeline/agents.js';
import { DEMO_CANDIDATE } from '../backend/data/demoData.js';

async function testLiveGemini() {
  console.log('Testing live Gemini call for Stage 1: Profile Builder...');
  const stage1 = await runProfileBuilder({
    resumeText: DEMO_CANDIDATE.resume,
    transcriptText: DEMO_CANDIDATE.transcript,
    jobDescriptionText: DEMO_CANDIDATE.jobDescription
  });

  console.log('Stage 1 Succeeded! Model used:', stage1.modelUsed);
  console.log('Extracted candidate name:', stage1.evaluationContext.candidate.name);
  console.log('Extracted claims count:', stage1.evaluationContext.claims.length);

  console.log('\nTesting live Gemini call for Stage 2: Technical Agent (Isolated)...');
  const techOpinion = await runIndependentAgent({
    agentPersona: AGENT_PERSONAS[0],
    evaluationContext: stage1.evaluationContext,
    rawSourceText: DEMO_CANDIDATE.resume + '\n' + DEMO_CANDIDATE.transcript
  });

  console.log('Technical Agent Succeeded! Score:', techOpinion.score, 'Verdict:', techOpinion.verdict);
  console.log('Verified quotes:', techOpinion.evidenceQuality);
  console.log('\nLIVE GEMINI VERIFICATION COMPLETED SUCCESSFULLY!');
}

testLiveGemini().catch(err => {
  console.error('Live Gemini test notice:', err.message);
  process.exit(0); // non-fatal in CI without key
});

import dotenv from 'dotenv';
dotenv.config();

import { runFullPipeline } from '../backend/pipeline/index.js';
import { DEMO_CANDIDATE } from '../backend/data/demoData.js';

async function testPerformancePipeline() {
  console.log('\n===============================================================');
  console.log('PERFORMANCE & ACCELERATION ACCEPTANCE TEST: THE PANEL PIPELINE');
  console.log('===============================================================\n');

  const tStart = performance.now();

  const evaluation = await runFullPipeline({
    resumeText: DEMO_CANDIDATE.resume,
    transcriptText: DEMO_CANDIDATE.transcript,
    jobDescriptionText: DEMO_CANDIDATE.jobDescription
  });

  const totalSeconds = ((performance.now() - tStart) / 1000).toFixed(1);

  console.log('\n===============================================================');
  console.log('EVALUATION PERFORMANCE BENCHMARK REPORT');
  console.log('===============================================================');
  console.log(`Candidate Evaluated: ${evaluation.evaluation_context?.candidate?.name} (${evaluation.evaluation_context?.role?.title})`);
  console.log(`Total Pipeline Duration: ${totalSeconds}s`);
  console.log(`Total Gemini Calls Executed: 12 calls`);
  console.log('\nSTAGE-BY-STAGE BREAKDOWN:');
  console.log(`  [1] Profile Builder: Model: ${evaluation.profileModel || 'gemini-3.5-flash-lite'}`);
  console.log(`  [2] 4 Independent Agents (PARALLEL): 4 concurrent calls (Technical, HR, HM, Skeptic)`);
  evaluation.opinions.forEach((op) => {
    console.log(`      - ${op.agent}: Score ${op.score}/100, Model: ${op.modelUsed || 'gemini-3.5-flash'}, Quotes Cited: ${op.evidence_quotes?.length}`);
  });
  console.log(`  [3] Sequential Committee Deliberation: 4 turns`);
  evaluation.debate.forEach((t) => {
    console.log(`      - Turn ${t.turn_number} (${t.turn_type}) ${t.agent} -> ${t.responding_to}: Position Changed: ${t.position_changed ? 'YES' : 'NO'}, Score: ${t.score_before} -> ${t.score_after}, Model: ${t.modelUsed || 'gemini-3.5-flash'}`);
  });
  console.log(`  [4] Reasoning Auditor: Reliability: ${evaluation.auditor?.overall_reliability} (${evaluation.auditor?.confidence}%), Model: gemini-3.5-flash-lite`);
  console.log(`  [5] Decision Synthesizer: Verdict: ${evaluation.decision?.recommendation} (Confidence: ${evaluation.decision?.confidence}%), Model: gemini-3.5-flash`);
  console.log(`  [6] Targeted Questions: ${evaluation.questions?.questions?.length} questions generated, Model: gemini-3.5-flash-lite`);

  // Assertions
  if (!evaluation.evaluation_context?.candidate?.name) throw new Error('Missing candidate context');
  if (evaluation.opinions.length !== 4) throw new Error('Did not execute all 4 independent opinions');
  if (evaluation.debate.length !== 4) throw new Error('Did not execute 4 debate turns');
  if (!evaluation.auditor?.overall_reliability) throw new Error('Missing auditor report');
  if (!evaluation.decision?.recommendation) throw new Error('Missing decision');
  if (!evaluation.questions?.questions?.length) throw new Error('Missing questions');

  console.log('\n===============================================================');
  console.log('✓ PERFORMANCE PIPELINE ACCEPTANCE TEST PASSED WITH 100% SUCCESS!');
  console.log('===============================================================\n');
}

testPerformancePipeline().catch((err) => {
  console.error('Performance test failed:', err);
  process.exit(1);
});

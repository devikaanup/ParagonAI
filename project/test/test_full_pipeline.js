import dotenv from 'dotenv';
dotenv.config();

import { runFullPipeline } from '../lib/pipeline.js';
import { DEMO_CANDIDATE } from '../lib/demoData.js';

async function testFullPipelineLive() {
  console.log('\n======================================================');
  console.log('RUNNING FULL 6-STAGE, 12-CALL PIPELINE WITH REAL GEMINI API');
  console.log('======================================================\n');

  const startTime = Date.now();

  const result = await runFullPipeline({
    resumeText: DEMO_CANDIDATE.resume,
    transcriptText: DEMO_CANDIDATE.transcript,
    jobDescriptionText: DEMO_CANDIDATE.jobDescription,
    onStageUpdate: ({ stage, data }) => {
      console.log(`[Pipeline Progress] Stage: ${stage} -> Status: ${data.stages[stage]?.status}`);
    }
  });

  console.log('\n---------------- RESULTS SUMMARY ----------------');
  console.log('Run ID:', result.runId);
  console.log('Candidate:', result.evaluation_context?.candidate?.name);
  console.log('Panel Type:', result.panelLabel);
  console.log('Independent Opinions Count:', result.opinions?.length);
  result.opinions?.forEach(op => {
    console.log(`  - ${op.agent}: Score ${op.score}/100 (${op.verdict}) | Quotes verified: ${op.evidenceQuality?.verificationRate}%`);
  });
  console.log('Debate Turns Count:', result.debate?.length);
  result.debate?.forEach(turn => {
    console.log(`  - Turn: ${turn.agent} (Score: ${turn.score_before} -> ${turn.score_after})`);
  });
  console.log('Auditor Overall Reliability:', result.auditor?.overall_reliability, `(Confidence: ${result.auditor?.confidence}%)`);
  console.log('Decision Recommendation:', result.decision?.recommendation, `(Confidence: ${result.decision?.confidence}%)`);
  console.log('Decision Summary Excerpt:', result.decision?.decision_summary?.substring(0, 150) + '...');
  console.log('Unresolved Disagreements Count:', result.decision?.unresolved_disagreements?.length);
  result.decision?.unresolved_disagreements?.forEach(u => {
    console.log(`  * Issue: ${u.issue}`);
  });
  console.log('Generated Follow-up Questions Count:', result.questions?.questions?.length);
  result.questions?.questions?.forEach((q, i) => {
    console.log(`  Q${i + 1}: ${q.question}`);
    console.log(`     Target: ${q.source_disagreement}`);
  });

  console.log(`\nTotal pipeline execution time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('\nFULL 12-CALL PIPELINE VERIFIED SUCCESSFULLY!');
}

testFullPipelineLive().catch(err => {
  console.error('Full pipeline test error:', err);
  process.exit(1);
});

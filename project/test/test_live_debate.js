import dotenv from 'dotenv';
dotenv.config();

import {
  runProfileBuilder,
  runAllIndependentAgents,
  runSingleDebateTurn,
  runAuditor,
  runDecisionSynthesizer,
  runQuestionGenerator,
  AGENT_PERSONAS,
  DEBATE_TURNS_CONFIG
} from '../backend/pipeline/index.js';
import { DEMO_CANDIDATE } from '../backend/data/demoData.js';

async function testLiveSequentialDebate() {
  console.log('\n===============================================================');
  console.log('ACCEPTANCE TEST: LIVE SEQUENTIAL MULTI-AGENT COMMITTEE DEBATE');
  console.log('===============================================================\n');

  // Candidate with deliberate contradiction: 99.999% uptime vs 3-hour cascading outage
  console.log('[Step 1] Initializing Candidate Profile Builder (Stage 1)...');
  const { evaluationContext } = await runProfileBuilder({
    resumeText: DEMO_CANDIDATE.resume,
    transcriptText: DEMO_CANDIDATE.transcript,
    jobDescriptionText: DEMO_CANDIDATE.jobDescription
  });

  console.log(`✓ Context established for: ${evaluationContext.candidate?.name} (${evaluationContext.role?.title})`);
  console.log(`  Identified inconsistencies: ${evaluationContext.potential_inconsistencies?.length || 0}`);

  // Stage 2: 4 Isolated Opinions
  console.log('\n[Step 2] Running 4 Independent Isolated Opinions (Stage 2)...');
  const opinions = await runAllIndependentAgents({
    evaluationContext,
    rawSourceText: `${DEMO_CANDIDATE.resume}\n${DEMO_CANDIDATE.transcript}`
  });

  console.log('✓ Initial Independent Scores:');
  opinions.forEach((op) => {
    console.log(`  - ${op.agent}: Score ${op.score}/100 (${op.verdict}) — "${op.summary?.substring(0, 70)}..."`);
  });

  // Stage 3: Live Sequential Deliberation Turns (4 separate Gemini calls)
  console.log('\n[Step 3] Launching Live Sequential Committee Deliberation (Stage 3)...');
  const debateTranscript = [];
  const allCitedEvidence = [];

  for (let i = 0; i < DEBATE_TURNS_CONFIG.length; i++) {
    const config = DEBATE_TURNS_CONFIG[i];
    const persona = AGENT_PERSONAS.find((p) => p.key === config.personaKey) || AGENT_PERSONAS[i];
    
    console.log(`\n--- [Turn ${config.turnNumber}/4: ${config.turnType.toUpperCase()}] ${persona.name} speaking... ---`);
    
    const turn = await runSingleDebateTurn({
      evaluationContext,
      opinions,
      debateTranscript,
      persona,
      turnNumber: config.turnNumber,
      turnType: config.turnType
    });

    debateTranscript.push(turn);

    console.log(`  Speaker: ${turn.agent}`);
    console.log(`  Turn Type: ${turn.turn_type} (Turn #${turn.turn_number})`);
    console.log(`  Addressing: ${turn.responding_to || 'Committee'}`);
    console.log(`  Position Changed: ${turn.position_changed ? 'YES' : 'NO'}`);
    console.log(`  Score: ${turn.score_before} → ${turn.score_after} (${turn.score_after - turn.score_before >= 0 ? '+' : ''}${turn.score_after - turn.score_before})`);
    console.log(`  Rationale: "${turn.reason_for_change}"`);
    console.log(`  Response Spoken:\n    "${turn.response?.substring(0, 150)}..."`);

    if (Array.isArray(turn.cited_evidence) && turn.cited_evidence.length > 0) {
      console.log(`  Cited Evidence (${turn.cited_evidence.length} quotes):`);
      turn.cited_evidence.forEach((ev, j) => {
        console.log(`    [${j + 1}] (${ev.source}) "${ev.quote}" -> Supports: ${ev.supports_issue}`);
        allCitedEvidence.push({ ...ev, agent: turn.agent });
      });
    }

    // Assertions for this turn
    if (!turn.agent || !turn.turn_type) {
      throw new Error(`Turn ${config.turnNumber} missing agent or turn_type.`);
    }
    if (typeof turn.score_before !== 'number' || typeof turn.score_after !== 'number') {
      throw new Error(`Turn ${config.turnNumber} missing numeric before/after scores.`);
    }
    if (!turn.reason_for_change) {
      throw new Error(`Turn ${config.turnNumber} missing reason_for_change.`);
    }
  }

  // Summary of Evidence Board
  console.log(`\n--- EVIDENCE BOARD SUMMARY (${allCitedEvidence.length} total quotes cited during deliberation) ---`);
  allCitedEvidence.forEach((item, idx) => {
    console.log(`  [#${idx + 1}] [${item.agent}] (${item.source}): "${item.quote?.substring(0, 60)}..."`);
  });

  // Stage 4: Auditor
  console.log('\n[Step 4] Running Reasoning Auditor (Stage 4)...');
  const auditor = await runAuditor({ evaluationContext, opinions, debateTranscript });
  console.log(`✓ Auditor Reliability: ${auditor.overall_reliability} (${auditor.confidence}%) | Issues Flagged: ${auditor.issues?.length}`);

  // Stage 5: Decision Synthesizer
  console.log('\n[Step 5] Running Decision Synthesizer (Stage 5)...');
  const decision = await runDecisionSynthesizer({ evaluationContext, opinions, debateTranscript, auditorReport: auditor });
  console.log(`✓ Decision: ${decision.recommendation} (Confidence: ${decision.confidence}%)`);
  console.log(`  Comparative Synthesis:\n  "${decision.comparative_synthesis?.substring(0, 150)}..."`);
  console.log(`  Unresolved Disagreements: ${decision.unresolved_disagreements?.length}`);

  // Stage 6: Targeted Questions
  console.log('\n[Step 6] Running Targeted Interview Question Generator (Stage 6)...');
  const questions = await runQuestionGenerator({ evaluationContext, unresolvedDisagreements: decision.unresolved_disagreements });
  console.log(`✓ Generated ${questions.questions?.length} targeted interview questions:`);
  questions.questions?.forEach((q, i) => {
    console.log(`  Q${i + 1}: ${q.question} (Target: ${q.target_uncertainty})`);
  });

  console.log('\n===============================================================');
  console.log('✓ ACCEPTANCE TEST PASSED: LIVE SEQUENTIAL COMMITTEE DEBATE VERIFIED!');
  console.log('===============================================================\n');
}

testLiveSequentialDebate().catch((err) => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});

import {
  escapeHtml,
  renderProfileContext,
  renderOpinions,
  updateCommitteeBar,
  renderSingleDebateTurnCard,
  updateEvidenceBoard,
  renderAuditor,
  renderVerdict,
  renderQuestions
} from '../frontend/js/ui.js';

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exit(1);
  }
}

// Mock DOM elements for testing UI render functions in Node.js
global.document = {
  getElementById: (id) => {
    return {
      id,
      innerHTML: '',
      textContent: '',
      style: {},
      className: '',
      appendChild: () => {},
      scrollIntoView: () => {},
      querySelector: () => ({ textContent: '', className: '' }),
      querySelectorAll: () => []
    };
  },
  createElement: (tag) => {
    return {
      tagName: tag,
      className: '',
      style: {},
      innerHTML: '',
      appendChild: () => {},
      scrollIntoView: () => {}
    };
  }
};

async function testFrontendRendering() {
  console.log('\n===============================================================');
  console.log('TESTING DEFENSIVE FRONTEND RENDERING ACROSS ALL STAGES');
  console.log('===============================================================\n');

  // Test 1: Stage 1 Profile Context (Normal, Nested, Partial, Empty)
  console.log('[Test 1] Stage 1 Profile Builder Rendering:');
  try {
    renderProfileContext({ candidate: { name: 'Alex Rivera', summary: 'Staff Engineer' }, role: { title: 'Staff' } });
    assert(true, 'Render standard profile context succeeded');

    renderProfileContext({ evaluationContext: { candidate: { name: 'Alex' }, role: {} } });
    assert(true, 'Render nested evaluationContext profile succeeded');

    renderProfileContext({});
    assert(true, 'Render empty profile context succeeded without throwing');

    renderProfileContext(null);
    assert(true, 'Render null profile context handled safely');
  } catch (err) {
    assert(false, `Stage 1 rendering failed: ${err.message}`);
  }

  // Test 2: Stage 2 Opinions (Normal, Nested, and Missing Names)
  console.log('\n[Test 2] Stage 2 Opinions Rendering:');
  try {
    const rawOps = [
      { agent: 'Technical Agent', score: 94, verdict: 'Strong Hire', evidence_quotes: [{ quote: 'Raft consensus' }] },
      { opinion: { agent: 'HR / Culture Agent', score: 88, verdict: 'Hire' } },
      { agent: '', score: null } // Edge case: empty agent name
    ];
    renderOpinions(rawOps, {});
    assert(true, 'Render mixed opinions array succeeded without throwing');
  } catch (err) {
    assert(false, `Stage 2 rendering failed: ${err.message}`);
  }

  // Test 3: Stage 3 Debate Turn Card (.charAt safety tests)
  console.log('\n[Test 3] Stage 3 Live Deliberation Turn Card (.charAt() safety):');
  try {
    // Case A: Standard turn
    renderSingleDebateTurnCard({ agent: 'Technical Agent', turn_number: 1, turn_type: 'Challenge', response: 'Test', score_before: 94, score_after: 94 }, 1);
    assert(true, 'Standard debate turn rendered');

    // Case B: Wrapped turn { turn: { agent: "Technical Agent" } }
    renderSingleDebateTurnCard({ turn: { agent: 'Technical Agent', turn_number: 1, turn_type: 'Challenge', response: 'Test' } }, 1);
    assert(true, 'Wrapped debate turn rendered');

    // Case C: Missing agent property (was the root cause of charAt on undefined)
    renderSingleDebateTurnCard({}, 1);
    assert(true, 'Empty turn object handled safely without charAt TypeError');

    // Case D: Null / undefined turn input
    renderSingleDebateTurnCard(null, 1);
    assert(true, 'Null turn input handled safely');

    // Case E: Non-string agent name
    renderSingleDebateTurnCard({ agent: 123 }, 1);
    assert(true, 'Non-string agent name handled safely');
  } catch (err) {
    assert(false, `Stage 3 debate turn rendering failed: ${err.message}`);
  }

  // Test 4: Stage 4 Auditor
  console.log('\n[Test 4] Stage 4 Auditor Rendering:');
  try {
    renderAuditor({ overall_reliability: 'High', confidence: 95, issues: [] });
    renderAuditor({ auditor: { overall_reliability: 'Medium', issues: [{ agent: 'Skeptic Agent', issue: 'Overly critical' }] } });
    renderAuditor(null);
    assert(true, 'Auditor rendering succeeded');
  } catch (err) {
    assert(false, `Stage 4 auditor rendering failed: ${err.message}`);
  }

  // Test 5: Stage 5 Verdict
  console.log('\n[Test 5] Stage 5 Decision Verdict Rendering:');
  try {
    renderVerdict({ recommendation: 'Strong Hire', confidence: 92, decision_summary: 'Consensus hire.' });
    renderVerdict({ decision: { recommendation: 'Hire' } });
    renderVerdict(null);
    assert(true, 'Verdict rendering succeeded');
  } catch (err) {
    assert(false, `Stage 5 verdict rendering failed: ${err.message}`);
  }

  // Test 6: Stage 6 Targeted Questions
  console.log('\n[Test 6] Stage 6 Targeted Questions Rendering:');
  try {
    renderQuestions({ questions: [{ question: 'How did you handle the failover?' }] });
    renderQuestions([{ question: 'Direct array question' }]);
    renderQuestions(null);
    assert(true, 'Questions rendering succeeded');
  } catch (err) {
    assert(false, `Stage 6 questions rendering failed: ${err.message}`);
  }

  console.log('\n===============================================================');
  console.log('✓ ALL DEFENSIVE RENDERING & .charAt() SAFETY TESTS PASSED!');
  console.log('===============================================================\n');
}

testFrontendRendering().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

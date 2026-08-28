import {
  escapeHtml,
  openQuoteInspector,
  setStageStatus,
  resetTracker,
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
const mockElements = new Map();

global.document = {
  getElementById: (id) => {
    if (!mockElements.has(id)) {
      mockElements.set(id, {
        id,
        innerHTML: '',
        textContent: '',
        style: {},
        className: '',
        appendChild: function (child) { this.innerHTML += child.innerHTML; },
        scrollIntoView: () => {},
        querySelector: function (sel) {
          if (!this._badge) this._badge = { textContent: '', className: '' };
          return this._badge;
        },
        querySelectorAll: () => []
      });
    }
    return mockElements.get(id);
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
  console.log('TESTING STAGE 1 PROFILE RENDERING & STAGE 2 STATUS TRACKING');
  console.log('===============================================================\n');

  // Test 1: Stage 1 Profile Context into #profileContextBody
  console.log('[Test 1] Stage 1 Profile Builder Rendering:');
  const sampleProfile = {
    role: {
      title: 'Staff Distributed Systems Engineer',
      must_have: ['10+ yrs distributed systems', 'Raft / Paxos consensus', 'Go or Rust']
    },
    candidate: {
      name: 'Alex Rivera',
      summary: 'Staff-level engineer with deep Raft expertise and 8 years production experience.'
    },
    claims: [
      { claim: 'Led Raft migration', source: 'resume', quote: 'Led consensus migration serving 2.5M QPS' }
    ],
    potential_inconsistencies: [
      { topic: 'SLA Downtime', resume_statement: '99.999% uptime', interview_statement: '3-hour Q3 outage', observation: 'SLA discrepancy' }
    ]
  };

  renderProfileContext(sampleProfile);
  const profileBodyEl = document.getElementById('profileContextBody');
  assert(profileBodyEl.innerHTML.includes('Alex Rivera'), 'profileContextBody contains candidate name');
  assert(profileBodyEl.innerHTML.includes('Staff Distributed Systems Engineer'), 'profileContextBody contains role title');
  assert(profileBodyEl.innerHTML.includes('10+ yrs distributed systems'), 'profileContextBody contains must-haves');
  assert(profileBodyEl.innerHTML.includes('Tensions') && profileBodyEl.innerHTML.includes('Inconsistencies'), 'profileContextBody contains inconsistencies');

  // Test 2: Empty Profile Builder fallback
  console.log('\n[Test 2] Empty Stage 1 context fallback notice:');
  renderProfileContext({});
  assert(profileBodyEl.innerHTML.includes('Profile Builder returned no evaluation context'), 'Empty context displays explicit fallback notice');

  // Test 3: Stage 2 Tracker Status Update (Aliasing step-opinions and step-agents)
  console.log('\n[Test 3] Stage 2 Tracker Status Updates:');
  setStageStatus('opinions', 'running', 'Evaluating (1/4)');
  const stepOpinionsEl = document.getElementById('step-opinions');
  assert(stepOpinionsEl.className.includes('is-running'), "setStageStatus('opinions') marks #step-opinions as running");
  assert(stepOpinionsEl.querySelector('.step-badge').textContent === 'Evaluating (1/4)', 'Badge updated to Evaluating (1/4)');

  setStageStatus('agents', 'completed', '4/4 Complete');
  assert(stepOpinionsEl.className.includes('is-completed'), "setStageStatus('agents') alias normalizes to #step-opinions");
  assert(stepOpinionsEl.querySelector('.step-badge').textContent === '4/4 Complete', 'Badge updated to 4/4 Complete');

  // Test 4: Stage 3 Committee Bar (#committeeBar)
  console.log('\n[Test 4] Committee Deliberation Bar Updates:');
  const opinions = [
    { agent: 'Technical Agent', score: 94 },
    { agent: 'HR / Culture Agent', score: 88 },
    { agent: 'Hiring Manager Agent', score: 92 },
    { agent: 'Skeptic Agent', score: 72 }
  ];
  updateCommitteeBar({ activeKey: 'hiringManager', opinions, turns: [] });
  const committeeBarEl = document.getElementById('committeeBar');
  assert(committeeBarEl.innerHTML.includes('Hiring Manager Agent'), 'committeeBar contains Hiring Manager Agent');
  assert(committeeBarEl.innerHTML.includes('is-speaking'), 'Active speaker is marked as is-speaking');

  // Test 5: Modal Quote Inspector
  console.log('\n[Test 5] Interactive Quote Inspector:');
  openQuoteInspector('Verbatim consensus quote', 'Resume Page 1', 'Claim verification');
  const inspectorContent = document.getElementById('inspectorContent');
  assert(inspectorContent.innerHTML.includes('Verbatim consensus quote'), 'inspectorContent contains quote');
  assert(inspectorContent.innerHTML.includes('Resume Page 1'), 'inspectorContent contains source');

  console.log('\n===============================================================');
  console.log('✓ ALL STAGE 1 & 2 RENDERING TESTS PASSED!');
  console.log('===============================================================\n');
}

testFrontendRendering().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

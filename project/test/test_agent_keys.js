import { AGENT_PERSONAS, findPersonaByKey } from '../backend/pipeline/agents.js';
import { DEBATE_TURNS_CONFIG } from '../backend/pipeline/debate.js';
import { handler } from '../backend/api.js';

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exit(1);
  }
}

async function testAgentKeys() {
  console.log('\n===============================================================');
  console.log('TESTING CANONICAL AGENT KEYS & API PERSONA ROUTING');
  console.log('===============================================================\n');

  const canonicalKeys = ['technical', 'hr', 'hiringManager', 'skeptic'];

  // Test 1: findPersonaByKey with canonical keys
  console.log('[Test 1] Canonical Keys Resolution:');
  for (const key of canonicalKeys) {
    const persona = findPersonaByKey(key);
    assert(persona !== null, `findPersonaByKey('${key}') returned ${persona?.name}`);
  }

  // Test 2: findPersonaByKey with aliases
  console.log('\n[Test 2] Alias Resolution:');
  assert(findPersonaByKey('manager')?.name === 'Hiring Manager Agent', "'manager' resolves to Hiring Manager Agent");
  assert(findPersonaByKey('hiring_manager')?.name === 'Hiring Manager Agent', "'hiring_manager' resolves to Hiring Manager Agent");
  assert(findPersonaByKey('hiringmanager')?.name === 'Hiring Manager Agent', "'hiringmanager' resolves to Hiring Manager Agent");
  assert(findPersonaByKey('tech')?.name === 'Technical Agent', "'tech' resolves to Technical Agent");
  assert(findPersonaByKey('culture')?.name === 'HR / Culture Agent', "'culture' resolves to HR / Culture Agent");

  // Test 3: Debate turns config keys
  console.log('\n[Test 3] Debate Turns Config Keys:');
  for (const turn of DEBATE_TURNS_CONFIG) {
    const persona = findPersonaByKey(turn.personaKey);
    assert(persona !== null, `Debate Turn ${turn.turnNumber} (${turn.personaKey}) resolves to ${persona?.name}`);
  }

  // Test 4: API Endpoint /api/evaluate/opinion with hiringManager
  console.log('\n[Test 4] API /api/evaluate/opinion Persona Key Validation:');
  const dummyContext = { candidate: { name: 'Test' }, claims: [] };

  // Valid hiringManager request
  const hiringManagerRes = await handler({
    httpMethod: 'POST',
    path: '/api/evaluate/opinion',
    body: JSON.stringify({
      agentKey: 'hiringManager',
      evaluationContext: dummyContext,
      rawSourceText: 'Sample test source'
    })
  }, {});
  // We check that it didn't return 400 "Unknown agent key"
  assert(hiringManagerRes.statusCode !== 400 || !hiringManagerRes.body.includes('Unknown agent key'),
    'POST /api/evaluate/opinion with agentKey: "hiringManager" does NOT fail with 400 Unknown agent key');

  // Invalid key returns 400
  const invalidRes = await handler({
    httpMethod: 'POST',
    path: '/api/evaluate/opinion',
    body: JSON.stringify({
      agentKey: 'nonExistentAgent',
      evaluationContext: dummyContext
    })
  }, {});
  assert(invalidRes.statusCode === 400, 'POST /api/evaluate/opinion with unknown key correctly returns 400');
  assert(invalidRes.body.includes('Unknown agent key'), 'Response body contains "Unknown agent key" error');

  console.log('\n===============================================================');
  console.log('✓ ALL AGENT KEY & PERSONA ROUTING TESTS PASSED!');
  console.log('===============================================================\n');
}

testAgentKeys().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

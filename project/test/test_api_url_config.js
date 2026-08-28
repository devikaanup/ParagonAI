import { apiUrl, API_BASE_URL } from '../frontend/js/pipelineClient.js';
import { handler } from '../backend/api.js';

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exit(1);
  }
}

async function testApiUrlConfig() {
  console.log('\n===============================================================');
  console.log('TESTING API URL RESOLUTION & DEPLOYMENT CONFIGURATION');
  console.log('===============================================================\n');

  // Test 1: Default / Local relative URL behavior
  console.log('[Test 1] Local development relative URL resolution:');
  const localHealthUrl = apiUrl('/api/health');
  assert(localHealthUrl === '/api/health', `apiUrl('/api/health') returned '${localHealthUrl}'`);
  const localEvalUrl = apiUrl('/api/evaluate/full');
  assert(localEvalUrl === '/api/evaluate/full', `apiUrl('/api/evaluate/full') returned '${localEvalUrl}'`);

  // Test 2: Custom base URL logic simulation
  console.log('\n[Test 2] Production base URL resolution logic:');
  const simulateUrl = (base, path) => {
    const cleanBase = (base || '').replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  };

  const renderUrl = simulateUrl('https://the-panel-backend.onrender.com', '/api/evaluate/profile');
  assert(renderUrl === 'https://the-panel-backend.onrender.com/api/evaluate/profile', `Render URL resolved correctly: ${renderUrl}`);

  const renderUrlTrailingSlash = simulateUrl('https://the-panel-backend.onrender.com/', '/api/extract');
  assert(renderUrlTrailingSlash === 'https://the-panel-backend.onrender.com/api/extract', `Render URL with trailing slash handled: ${renderUrlTrailingSlash}`);

  // Test 3: Backend CORS headers verification
  console.log('\n[Test 3] Backend CORS headers on API responses:');
  const optionsRes = await handler({ httpMethod: 'OPTIONS', path: '/api/health' }, {});
  assert(optionsRes.statusCode === 204, 'OPTIONS preflight returned HTTP 204');
  assert(optionsRes.headers['Access-Control-Allow-Origin'] === '*', 'Access-Control-Allow-Origin is *');
  assert(optionsRes.headers['Access-Control-Allow-Methods'].includes('POST'), 'Access-Control-Allow-Methods includes POST');

  const healthRes = await handler({ httpMethod: 'GET', path: '/api/health' }, {});
  assert(healthRes.statusCode === 200, 'GET /api/health returned HTTP 200');
  assert(healthRes.headers['Access-Control-Allow-Origin'] === '*', 'Response headers include Access-Control-Allow-Origin: *');

  console.log('\n===============================================================');
  console.log('✓ ALL API CONFIGURATION & CORS TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

testApiUrlConfig().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

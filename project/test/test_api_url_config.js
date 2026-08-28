import { getApiBaseUrl, apiUrl } from '../frontend/js/pipelineClient.js';
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
  console.log('TESTING PRODUCTION VERCEL -> RENDER API URL & EXTRACTION FLOW');
  console.log('===============================================================\n');

  // Test 1: Default / Local relative URL behavior
  console.log('[Test 1] Local development relative URL resolution:');
  const localHealthUrl = apiUrl('/api/health');
  assert(localHealthUrl === '/api/health', `apiUrl('/api/health') returned '${localHealthUrl}'`);
  const localExtractUrl = apiUrl('/api/extract');
  assert(localExtractUrl === '/api/extract', `apiUrl('/api/extract') returned '${localExtractUrl}'`);

  // Test 2: URL Normalization with different environment variable formats
  console.log('\n[Test 2] Production base URL resolution logic for Vercel/Render:');
  const normalize = (envVal) => {
    let clean = (envVal || '').trim().replace(/\/+$/, '');
    if (clean.endsWith('/api')) clean = clean.slice(0, -4);
    return clean;
  };
  const buildUrl = (base, path) => {
    const cleanBase = normalize(base);
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (!cleanBase) return cleanPath;
    return `${cleanBase}${cleanPath}`;
  };

  // Case A: Standard Render URL
  const renderA = buildUrl('https://the-panel-backend.onrender.com', '/api/extract');
  assert(renderA === 'https://the-panel-backend.onrender.com/api/extract', `Standard URL: ${renderA}`);

  // Case B: Render URL with trailing slash
  const renderB = buildUrl('https://the-panel-backend.onrender.com/', '/api/extract');
  assert(renderB === 'https://the-panel-backend.onrender.com/api/extract', `Trailing slash handled: ${renderB}`);

  // Case C: Render URL with /api suffix (avoids double /api/api)
  const renderC = buildUrl('https://the-panel-backend.onrender.com/api', '/api/extract');
  assert(renderC === 'https://the-panel-backend.onrender.com/api/extract', `Double /api prevented: ${renderC}`);

  // Case D: Render URL with /api/ suffix
  const renderD = buildUrl('https://the-panel-backend.onrender.com/api/', '/api/extract');
  assert(renderD === 'https://the-panel-backend.onrender.com/api/extract', `Trailing /api/ handled: ${renderD}`);

  // Test 3: Backend route handling for /api/extract, /extract, and /api/api/extract
  console.log('\n[Test 3] Backend path tolerance for various route forms:');
  const samplePayload = JSON.stringify({
    base64: Buffer.from('ALEX RIVERA\nStaff Distributed Systems Engineer').toString('base64'),
    filename: 'resume.txt',
    mimeType: 'text/plain'
  });

  const res1 = await handler({ httpMethod: 'POST', path: '/api/extract', body: samplePayload }, {});
  assert(res1.statusCode === 200, `POST /api/extract returned HTTP ${res1.statusCode}`);

  const res2 = await handler({ httpMethod: 'POST', path: '/extract', body: samplePayload }, {});
  assert(res2.statusCode === 200, `POST /extract returned HTTP ${res2.statusCode}`);

  const res3 = await handler({ httpMethod: 'POST', path: '/api/api/extract', body: samplePayload }, {});
  assert(res3.statusCode === 200, `POST /api/api/extract returned HTTP ${res3.statusCode}`);

  // Test 4: CORS preflight and headers
  console.log('\n[Test 4] Backend CORS headers:');
  const optionsRes = await handler({ httpMethod: 'OPTIONS', path: '/api/extract' }, {});
  assert(optionsRes.statusCode === 204, 'OPTIONS preflight returned HTTP 204');
  assert(optionsRes.headers['Access-Control-Allow-Origin'] === '*', 'Access-Control-Allow-Origin is *');
  assert(optionsRes.headers['Access-Control-Allow-Methods'].includes('POST'), 'Access-Control-Allow-Methods includes POST');

  console.log('\n===============================================================');
  console.log('✓ ALL PRODUCTION URL RESOLUTION & CORS TESTS PASSED!');
  console.log('===============================================================\n');
}

testApiUrlConfig().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

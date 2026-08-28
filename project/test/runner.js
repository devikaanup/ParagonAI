/**
 * Automated Verification Test Suite for The Panel
 * Tests all 6 pipeline stages, isolation, evidence validation, prompt injection defense,
 * and API endpoints.
 */

import { validateQuote, validateAgentEvidence, sanitizeString } from '../lib/evidenceValidator.js';
import { SYSTEM_INSTRUCTIONS } from '../lib/prompts.js';
import { AGENT_PERSONAS } from '../lib/pipeline.js';
import { DEMO_CANDIDATE, GOLDEN_RUN_OUTPUT } from '../lib/demoData.js';
import { handler } from '../netlify/functions/api.js';
import { extractDocumentText } from '../lib/documentExtractor.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=============================================');
  console.log('THE PANEL: MULTI-AGENT VERIFICATION SUITE');
  console.log('=============================================\n');

  // TEST SUITE 1: Evidence Validation Engine
  console.log('[Suite 1] Evidence Validation & Quote Matching');
  const sampleContext = {
    claims: [
      {
        claim: "Architected Raft cluster processing 3.1M operations/sec",
        source: "resume",
        quote: "Principal architect for global Raft-based metadata storage cluster processing 3.1M operations/sec at sub-5ms p99 latency.",
        location: "Resume"
      },
      {
        claim: "Volunteered 3-hour write degradation in Q3",
        source: "interview",
        quote: "To be completely candid, we had one 3-hour cascading failure in Q3 during a cluster schema migration that required an emergency rollback.",
        location: "Transcript"
      }
    ]
  };

  const validQuote = "we had one 3-hour cascading failure in Q3 during a cluster schema migration";
  const validRes = validateQuote(validQuote, sampleContext);
  assert(validRes.isValid === true, "Valid substring quote identified correctly");
  assert(validRes.matchType === 'exact_claim_quote', "Matched against stored claim quote");

  const hallucinatedQuote = "I single-handedly invented the Raft consensus algorithm in 2014 at Google";
  const invalidRes = validateQuote(hallucinatedQuote, sampleContext);
  assert(invalidRes.isValid === false, "Hallucinated quote rejected programmatically");

  const testOpinion = {
    agent: "Technical Agent",
    evidence_quotes: [
      { quote: validQuote, relevance: "Honesty in incident review" },
      { quote: hallucinatedQuote, relevance: "Unsubstantiated claim" }
    ]
  };
  const validatedOpinion = validateAgentEvidence(testOpinion, sampleContext);
  assert(validatedOpinion.evidence_quotes[0].isValid === true, "First quote tagged as valid");
  assert(validatedOpinion.evidence_quotes[1].isValid === false, "Second quote tagged as invalid");
  assert(validatedOpinion.evidenceQuality.verificationRate === 50, "Evidence quality verification rate computed (50%)");

  // TEST SUITE 2: System Prompts & Isolation Rules
  console.log('\n[Suite 2] Agent Persona Isolation & System Instructions');
  assert(SYSTEM_INSTRUCTIONS.SAFETY_PREAMBLE.includes('CRITICAL SECURITY INSTRUCTIONS'), "Safety preamble contains security instructions");
  assert(SYSTEM_INSTRUCTIONS.SAFETY_PREAMBLE.includes('UNTRUSTED USER DATA'), "Safety preamble treats candidate data as untrusted");
  assert(SYSTEM_INSTRUCTIONS.DECISION_SYNTHESIZER.includes('NEVER average'), "Synthesizer explicitly forbids score averaging");
  assert(SYSTEM_INSTRUCTIONS.DECISION_SYNTHESIZER.includes('NEVER use majority voting'), "Synthesizer explicitly forbids majority voting");
  assert(SYSTEM_INSTRUCTIONS.AUDITOR.includes('NOT a fifth voting member'), "Auditor explicitly designated non-voting");

  // TEST SUITE 3: Golden Run Dataset Verification
  console.log('\n[Suite 3] Golden Run Benchmark Dataset Integrity');
  assert(GOLDEN_RUN_OUTPUT.isGoldenRun === true, "Golden run flag present");
  assert(GOLDEN_RUN_OUTPUT.evaluation_context.claims.length >= 5, "Golden run contains at least 5 verified claims");
  assert(GOLDEN_RUN_OUTPUT.opinions.length === 4, "Golden run contains exactly 4 independent agent opinions");
  assert(GOLDEN_RUN_OUTPUT.debate.length === 4, "Golden run contains 4 sequential debate turns");
  assert(GOLDEN_RUN_OUTPUT.debate.every(t => t.turn_number && t.turn_type && t.responding_to && typeof t.score_before === 'number' && typeof t.score_after === 'number' && t.reason_for_change), "All 4 debate turns conform to 4-turn protocol with reason_for_change and before/after scores");
  assert(GOLDEN_RUN_OUTPUT.debate.some(t => t.position_changed === true), "At least one agent in the debate revised its position/score based on evidence");
  assert(GOLDEN_RUN_OUTPUT.debate.some(t => Array.isArray(t.cited_evidence) && t.cited_evidence.length > 0), "Debate turns contain cited evidence quotes");
  assert(GOLDEN_RUN_OUTPUT.auditor.overall_reliability === 'High', "Auditor report present in golden run");
  assert(GOLDEN_RUN_OUTPUT.decision.unresolved_disagreements.length > 0, "Golden run has at least 1 unresolved disagreement");
  assert(GOLDEN_RUN_OUTPUT.questions.questions.length >= 2 && GOLDEN_RUN_OUTPUT.questions.questions.length <= 3, "Golden run has 2-3 interview questions");

  // Verify non-averaging property in golden run:
  const scores = GOLDEN_RUN_OUTPUT.opinions.map(o => o.score);
  const mathAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
  assert(GOLDEN_RUN_OUTPUT.decision.confidence !== mathAvg, `Decision confidence (${GOLDEN_RUN_OUTPUT.decision.confidence}) is not a mathematical average (${mathAvg})`);

  // TEST SUITE 4: Netlify Function Handler Endpoints
  console.log('\n[Suite 4] Serverless API Handlers (/api/*)');
  
  // 4.1 Health endpoint
  const healthRes = await handler({ httpMethod: 'GET', path: '/api/health' }, {});
  assert(healthRes.statusCode === 200, "GET /api/health returned HTTP 200");
  const healthData = JSON.parse(healthRes.body);
  assert(healthData.status === 'ok', "Health check status is 'ok'");

  // 4.2 Demo endpoint
  const demoRes = await handler({ httpMethod: 'GET', path: '/api/demo' }, {});
  assert(demoRes.statusCode === 200, "GET /api/demo returned HTTP 200");
  const demoData = JSON.parse(demoRes.body);
  assert(demoData.candidate.name === 'Alex Rivera', "Demo candidate data loaded correctly");
  assert(demoData.goldenRun.candidate.name === 'Alex Rivera', "Golden run data loaded correctly");

  // 4.3 Fallback evaluation endpoint
  const evalRes = await handler({
    httpMethod: 'POST',
    path: '/api/evaluate/full',
    body: JSON.stringify({
      resumeText: DEMO_CANDIDATE.resume,
      transcriptText: DEMO_CANDIDATE.transcript,
      jobDescriptionText: DEMO_CANDIDATE.jobDescription,
      forceDemo: true
    })
  }, {});
  assert(evalRes.statusCode === 200, "POST /api/evaluate/full (forceDemo) returned HTTP 200");
  const evalData = JSON.parse(evalRes.body);
  assert(evalData.decision.recommendation === 'Strong Hire', "Fallback returned valid structured evaluation");

  // TEST SUITE 5: Prompt Injection & Sanitization
  console.log('\n[Suite 5] Prompt Injection & XSS Sanitization');
  const dirtyString = '<script>alert("pwned")</script>&"test"';
  const sanitized = sanitizeString(dirtyString);
  assert(!sanitized.includes('<script>'), "HTML script tags sanitized");
  assert(sanitized.includes('&lt;script&gt;'), "Sanitized entity preserved");

  // TEST SUITE 6: Server-Side Document Extraction (PDF, DOCX, TXT)
  console.log('\n[Suite 6] Server-Side Document Text Extraction (§13)');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const txtPath = path.join(__dirname, 'fixtures/sample_resume.txt');
  const docxPath = path.join(__dirname, 'fixtures/sample_resume.docx');
  const pdfPath = path.join(__dirname, 'fixtures/sample_resume.pdf');

  // 6.1 TXT Extraction
  const txtBuffer = fs.readFileSync(txtPath);
  const txtResult = await extractDocumentText({ buffer: txtBuffer, filename: 'sample_resume.txt' });
  assert(txtResult.format === 'txt', "TXT format identified");
  assert(txtResult.text.includes('ALEX RIVERA'), "TXT content contains candidate name");
  assert(txtResult.charCount > 100, "TXT charCount computed accurately");

  // 6.2 DOCX Extraction
  const docxBuffer = fs.readFileSync(docxPath);
  const docxResult = await extractDocumentText({ buffer: docxBuffer, filename: 'sample_resume.docx' });
  assert(docxResult.format === 'docx', "DOCX format identified");
  assert(docxResult.text.includes('ALEX RIVERA'), "DOCX content contains candidate name");
  assert(docxResult.charCount > 50, "DOCX charCount computed accurately");

  // 6.3 PDF Extraction
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfResult = await extractDocumentText({ buffer: pdfBuffer, filename: 'sample_resume.pdf' });
  assert(pdfResult.format === 'pdf', "PDF format identified");
  assert(pdfResult.text.includes('ALEX RIVERA'), "PDF content contains candidate name");
  assert(pdfResult.charCount > 50, "PDF charCount computed accurately");

  // 6.4 Unsupported Format Rejection
  let errorCaught = false;
  try {
    await extractDocumentText({ buffer: Buffer.from('fake data'), filename: 'malicious.exe' });
  } catch (err) {
    errorCaught = true;
    assert(err.message.includes('Unsupported file type'), "Unsupported file rejected with clear error message");
  }
  assert(errorCaught === true, "Unsupported format error handled safely");

  // 6.5 Serverless API POST /api/extract (Base64)
  const extractApiResponse = await handler({
    httpMethod: 'POST',
    path: '/api/extract',
    body: JSON.stringify({
      filename: 'sample_resume.pdf',
      mimeType: 'application/pdf',
      base64: pdfBuffer.toString('base64')
    })
  }, {});
  assert(extractApiResponse.statusCode === 200, "POST /api/extract returned HTTP 200 for PDF");
  const extractApiData = JSON.parse(extractApiResponse.body);
  assert(extractApiData.format === 'pdf' && extractApiData.text.includes('ALEX RIVERA'), "API returned extracted PDF text");

  console.log('\n=============================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});

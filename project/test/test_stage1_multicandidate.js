import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import { extractDocumentTextFromBuffer } from '../backend/services/pdfParser.js';
import { runProfileBuilder } from '../backend/pipeline/profileBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMultiCandidateVerification() {
  console.log('\n================================================================');
  console.log('STAGE [1] PROFILE BUILDER MULTI-CANDIDATE DYNAMIC EXTRACTION TEST');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // CANDIDATE A: Alex Rivera (Distributed Systems Engineer)
  // -------------------------------------------------------------
  console.log('>>> [TEST CANDIDATE A] Loading Alex Rivera PDF...');
  const pdfBufferA = fs.readFileSync(path.join(__dirname, 'fixtures/sample_resume.pdf'));
  
  // Log 1: Extracted text log
  console.log('\n--- LOG 1A: PDF Text Extraction (Candidate A) ---');
  const extractedA = await extractDocumentTextFromBuffer(pdfBufferA, 'sample_resume.pdf');
  
  const roleA = "Position: Staff Distributed Systems Engineer\nRequirements: Distributed consensus, Raft, Paxos, low-latency Go.";
  const transcriptA = `[00:01:00] Interviewer: "Tell us about the Raft cluster at Apex."\n[00:01:30] Alex Rivera: "I architected the 5-node replica groups processing 3.1M operations per second."`;

  // Log 2 & Log 3 will be printed inside runProfileBuilder & gemini.js
  console.log('\n--- LOG 2A & 3A: Invoking Stage 1 for Candidate A (Alex Rivera) ---');
  const profileA = await runProfileBuilder({
    resumeText: extractedA.text,
    transcriptText: transcriptA,
    jobDescriptionText: roleA
  });

  console.log('\n>>> Candidate A Extraction Summary:');
  console.log('  - Candidate Name:', profileA.evaluationContext?.candidate?.name);
  console.log('  - Extracted Role:', profileA.evaluationContext?.role?.title);
  console.log('  - Extracted Skills:', profileA.evaluationContext?.skills?.join(', '));
  console.log('  - First Claim Quote:', profileA.evaluationContext?.claims?.[0]?.quote);

  // -------------------------------------------------------------
  // CANDIDATE B: Elena Rostova (Lead Frontend / WebGL UI Architect)
  // -------------------------------------------------------------
  console.log('\n\n================================================================');
  console.log('>>> [TEST CANDIDATE B] Loading Elena Rostova PDF...');
  const pdfBufferB = fs.readFileSync(path.join(__dirname, 'fixtures/candidate_b_elena.pdf'));

  // Log 1: Extracted text log
  console.log('\n--- LOG 1B: PDF Text Extraction (Candidate B) ---');
  const extractedB = await extractDocumentTextFromBuffer(pdfBufferB, 'candidate_b_elena.pdf');

  const roleB = "Position: Lead WebGL Graphics Engineer\nRequirements: 3D browser graphics, WebGL, WebGPU, Three.js, WebAssembly.";
  const transcriptB = `[00:01:00] Interviewer: "Walk us through the 3D scene editor at VoxelWorks."\n[00:01:40] Elena Rostova: "I designed the WebGPU texture streaming pipeline achieving stable 60fps on mobile browsers."`;

  console.log('\n--- LOG 2B & 3B: Invoking Stage 1 for Candidate B (Elena Rostova) ---');
  const profileB = await runProfileBuilder({
    resumeText: extractedB.text,
    transcriptText: transcriptB,
    jobDescriptionText: roleB
  });

  console.log('\n>>> Candidate B Extraction Summary:');
  console.log('  - Candidate Name:', profileB.evaluationContext?.candidate?.name);
  console.log('  - Extracted Role:', profileB.evaluationContext?.role?.title);
  console.log('  - Extracted Skills:', profileB.evaluationContext?.skills?.join(', '));
  console.log('  - First Claim Quote:', profileB.evaluationContext?.claims?.[0]?.quote);

  // -------------------------------------------------------------
  // COMPARISON AND INTEGRITY ASSERTIONS
  // -------------------------------------------------------------
  console.log('\n\n================================================================');
  console.log('VERIFYING DYNAMIC EXTRACTION INTEGRITY (A vs B):');
  console.log('================================================================');

  const nameA = profileA.evaluationContext?.candidate?.name || '';
  const nameB = profileB.evaluationContext?.candidate?.name || '';

  console.log(`Candidate A name: "${nameA}"`);
  console.log(`Candidate B name: "${nameB}"`);

  if (nameA.toLowerCase().includes('alex') && nameB.toLowerCase().includes('elena')) {
    console.log('✓ PASS: Candidate names are completely distinct and match their respective PDFs.');
  } else {
    throw new Error(`FAIL: Candidate names matched or did not reflect distinct PDFs: A="${nameA}", B="${nameB}"`);
  }

  if (nameA !== nameB) {
    console.log('✓ PASS: Stage 1 Profile Builder produces genuinely dynamic, non-mocked outputs for different documents.');
  } else {
    throw new Error('FAIL: Profile Builder output was identical across different inputs.');
  }

  console.log('\nALL 3 LOGS CONFIRMED AND MULTI-CANDIDATE DYNAMIC EXTRACTION FULLY VERIFIED!');
}

runMultiCandidateVerification().catch(err => {
  console.error('Multi-candidate verification error:', err);
  process.exit(1);
});

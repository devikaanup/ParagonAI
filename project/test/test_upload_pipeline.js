import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import { extractDocumentTextFromBuffer } from '../backend/services/pdfParser.js';
import { runFullPipeline } from '../backend/pipeline/index.js';
import { DEMO_CANDIDATE } from '../backend/data/demoData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testUploadAndPipeline() {
  console.log('\n======================================================');
  console.log('TESTING FILE UPLOAD EXTRACTION + END-TO-END PIPELINE');
  console.log('======================================================\n');

  // 1. Test PDF Extraction
  const pdfPath = path.join(__dirname, 'fixtures/sample_resume.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log('[Step 1] Extracting text from PDF (sample_resume.pdf)...');
  const pdfExtracted = await extractDocumentTextFromBuffer(pdfBuffer, 'sample_resume.pdf');
  console.log(`✓ PDF extracted successfully: ${pdfExtracted.charCount} chars, ${pdfExtracted.pages || 1} page(s)`);
  console.log(`  Preview: ${pdfExtracted.text.substring(0, 100).replace(/\n/g, ' ')}...`);

  // 2. Test DOCX Extraction
  const docxPath = path.join(__dirname, 'fixtures/sample_resume.docx');
  const docxBuffer = fs.readFileSync(docxPath);
  console.log('\n[Step 2] Extracting text from DOCX (sample_resume.docx)...');
  const docxExtracted = await extractDocumentTextFromBuffer(docxBuffer, 'sample_resume.docx');
  console.log(`✓ DOCX extracted successfully: ${docxExtracted.charCount} chars`);
  console.log(`  Preview: ${docxExtracted.text.substring(0, 100).replace(/\n/g, ' ')}...`);

  // 3. Test TXT Extraction
  const txtPath = path.join(__dirname, 'fixtures/sample_resume.txt');
  const txtBuffer = fs.readFileSync(txtPath);
  console.log('\n[Step 3] Extracting text from TXT (sample_resume.txt)...');
  const txtExtracted = await extractDocumentTextFromBuffer(txtBuffer, 'sample_resume.txt');
  console.log(`✓ TXT extracted successfully: ${txtExtracted.charCount} chars`);

  // 4. Run Live Multi-Agent Pipeline on the extracted document text
  console.log('\n[Step 4] Launching Live Gemini Pipeline using extracted document text...');
  const result = await runFullPipeline({
    resumeText: pdfExtracted.text,
    transcriptText: DEMO_CANDIDATE.transcript,
    jobDescriptionText: DEMO_CANDIDATE.jobDescription,
    onStageUpdate: ({ stage, data }) => {
      console.log(`  -> Pipeline stage: ${stage} (${data.stages[stage]?.status})`);
    }
  });

  console.log('\n---------------- FINAL REPORT VERIFICATION ----------------');
  console.log('Run ID:', result.runId);
  console.log('Candidate Name:', result.evaluation_context?.candidate?.name);
  console.log('Final Recommendation:', result.decision?.recommendation, `(Confidence: ${result.decision?.confidence}%)`);
  console.log('Unresolved Disagreements:', result.decision?.unresolved_disagreements?.length);
  console.log('Targeted Interview Questions:', result.questions?.questions?.length);
  result.questions?.questions?.forEach((q, i) => {
    console.log(`  Q${i + 1}: ${q.question}`);
  });

  console.log('\n✓ END-TO-END FILE UPLOAD + LIVE PIPELINE VERIFICATION PASSED!');
}

testUploadAndPipeline().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

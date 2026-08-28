import { createRequire } from 'module';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');

/**
 * Extracts text from a document buffer based on filename and/or mimeType.
 * Supports PDF, DOCX, and TXT in server-side Node.js environment without browser workers.
 * @param {object} params
 * @param {Buffer} params.buffer - Raw file buffer
 * @param {string} params.filename - Name of the uploaded file
 * @param {string} [params.mimeType] - MIME type of the uploaded file
 * @returns {Promise<{ text: string, charCount: number, pageCount?: number, format: string }>}
 */
export async function extractDocumentText({ buffer, filename = '', mimeType = '' }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid or missing file buffer for text extraction.');
  }

  const name = filename.toLowerCase();

  // 1. Plain Text (.txt)
  if (name.endsWith('.txt') || mimeType === 'text/plain') {
    const text = buffer.toString('utf-8').trim();
    if (!text) {
      throw new Error(`The uploaded text file '${filename}' is empty.`);
    }

    console.log(`[Document Extractor] Extracted TXT file '${filename}' (Total: ${text.length} chars)`);
    console.log(`[Document Extractor] First 300 chars of '${filename}':\n${text.substring(0, 300)}\n---`);

    return {
      text,
      charCount: text.length,
      format: 'txt'
    };
  }

  // 2. Microsoft Word (.docx)
  if (
    name.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      if (!text) {
        throw new Error(`No extractable text found in DOCX file '${filename}'.`);
      }

      console.log(`[Document Extractor] Extracted DOCX file '${filename}' (Total: ${text.length} chars)`);
      console.log(`[Document Extractor] First 300 chars of '${filename}':\n${text.substring(0, 300)}\n---`);

      return {
        text,
        charCount: text.length,
        format: 'docx',
        messages: result.messages
      };
    } catch (err) {
      throw new Error(`Failed to parse DOCX document '${filename}': ${err.message}`);
    }
  }

  // 3. Adobe PDF (.pdf)
  if (name.endsWith('.pdf') || mimeType === 'application/pdf') {
    try {
      let text = '';
      let pageCount = 1;

      if (typeof pdfParseModule === 'function') {
        const data = await pdfParseModule(buffer);
        text = (data.text || '').trim();
        pageCount = data.numpages || 1;
      } else if (pdfParseModule && pdfParseModule.PDFParse) {
        const parser = new pdfParseModule.PDFParse({ data: buffer });
        const result = await parser.getText();
        text = (result.text || '').trim();
        pageCount = result.total || (result.pages ? result.pages.length : 1);
      } else {
        throw new Error('PDF parsing library interface unrecognized.');
      }

      if (!text) {
        throw new Error(`No extractable text found in PDF document '${filename}'.`);
      }

      console.log(`[Document Extractor] Extracted PDF file '${filename}' (${pageCount} pages, Total: ${text.length} chars)`);
      console.log(`[Document Extractor] First 300 chars of '${filename}':\n${text.substring(0, 300)}\n---`);

      return {
        text,
        charCount: text.length,
        pageCount,
        format: 'pdf'
      };
    } catch (err) {
      throw new Error(`Failed to parse PDF document '${filename}': ${err.message}`);
    }
  }

  throw new Error(`Unsupported file type for '${filename}'. Please upload a PDF (.pdf), Word (.docx), or Text (.txt) file.`);
}

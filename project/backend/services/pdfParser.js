/**
 * Server-Side Document Text Extractor (§13 of build spec)
 * Parses PDF, DOCX, and TXT entirely in Node.js without browser worker dependencies.
 */

import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export async function extractDocumentTextFromBuffer(buffer, filename = 'document.pdf', mimeType = '') {
  const lowerName = filename.toLowerCase();

  // TXT extraction
  if (lowerName.endsWith('.txt') || mimeType === 'text/plain') {
    const text = buffer.toString('utf-8');
    return {
      text,
      format: 'txt',
      filename,
      charCount: text.length
    };
  }

  // DOCX extraction
  if (
    lowerName.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || '').trim();
    return {
      text,
      format: 'docx',
      filename,
      charCount: text.length
    };
  }

  // PDF extraction
  if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
    try {
      const pdfParseModule = require('pdf-parse');
      let pdfExtract = null;

      if (typeof pdfParseModule === 'function') {
        pdfExtract = pdfParseModule;
      } else if (pdfParseModule && typeof pdfParseModule.default === 'function') {
        pdfExtract = pdfParseModule.default;
      } else if (pdfParseModule && typeof pdfParseModule.PDFParser === 'function') {
        pdfExtract = async (buf) => {
          const parser = new pdfParseModule.PDFParser();
          const parsed = await parser.parse(buf);
          return { text: parsed.text || '', numpages: parsed.numPages || 1 };
        };
      }

      if (pdfExtract) {
        const parsed = await pdfExtract(buffer);
        const text = (parsed.text || '').trim();
        return {
          text,
          format: 'pdf',
          filename,
          charCount: text.length,
          pages: parsed.numpages || parsed.numPages || 1
        };
      }
    } catch (nodePdfErr) {
      console.warn('[PDF Extractor] Primary parser failed; attempting pdfjs fallback:', nodePdfErr.message);
    }

    // Fallback: pdfjs-dist in Node environment
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs').catch(() => import('pdfjs-dist'));
      const uint8Array = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        useSystemFonts: true,
        disableFontFace: true
      });
      const doc = await loadingTask.promise;
      let fullText = '';

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items.map((item) => item.str).filter(Boolean);
        fullText += pageStrings.join(' ') + '\n';
      }

      return {
        text: fullText.trim(),
        format: 'pdf',
        filename,
        charCount: fullText.trim().length,
        pages: doc.numPages
      };
    } catch (pdfjsErr) {
      throw new Error(`Failed to extract text from PDF '${filename}': ${pdfjsErr.message}`);
    }
  }

  throw new Error(`Unsupported file type: '${filename}'. Please provide a .pdf, .docx, or .txt file.`);
}

export async function extractDocumentText(input, filename = 'document.pdf', mimeType = '') {
  if (input && typeof input === 'object' && input.buffer) {
    return extractDocumentTextFromBuffer(input.buffer, input.filename || filename, input.mimeType || mimeType);
  }

  if (typeof input === 'string') {
    const cleanBase64 = input.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    return extractDocumentTextFromBuffer(buffer, filename, mimeType);
  }

  if (Buffer.isBuffer(input)) {
    return extractDocumentTextFromBuffer(input, filename, mimeType);
  }

  throw new Error('No valid document payload provided for extraction.');
}

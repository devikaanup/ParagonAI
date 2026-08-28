/**
 * Frontend Document Upload and Server-Side Extraction Handler
 * Manages file picker events, drag-and-drop lifecycle, and status feedback.
 */

import { extractFileServerSide } from './pipelineClient.js';

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function setDropzoneStatus(dropzoneEl, msg, isError = false) {
  const statusEl = dropzoneEl?.querySelector('.dropzone-status');
  if (statusEl) {
    statusEl.textContent = msg;
    statusEl.className = 'dropzone-status' + (isError ? ' error' : '');
  }
}

export function setupDropzone(id, onFileProcessed) {
  const dz = document.querySelector(`[data-dropzone="${id}"]`);
  if (!dz) return;
  const input = document.getElementById(id + 'File');
  const targetTextarea = document.getElementById(id);

  const handleFile = async (file, eventSource = 'input') => {
    if (!file) return;

    if (eventSource === 'drop') {
      console.log(`FILE DROP\nfilename: ${file.name}\ntype: ${file.type || 'unknown'}\nsize: ${file.size} bytes`);
    } else {
      console.log(`FILE INPUT CHANGE\nfilename: ${file.name}\ntype: ${file.type || 'unknown'}\nsize: ${file.size} bytes\nfile object received: true`);
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const isPdf = ext === '.pdf' || (file.type && file.type.includes('pdf'));
    const isDocx = ext === '.docx' || (file.type && file.type.includes('wordprocessingml'));
    const isTxt = ext === '.txt' || (file.type && file.type.includes('text/plain'));

    if (!isPdf && !isDocx && !isTxt) {
      setDropzoneStatus(dz, `Unsupported file format '${ext}'. Please upload a PDF, DOCX, or TXT file.`, true);
      return;
    }

    setDropzoneStatus(dz, `Uploading & extracting ${file.name} (${formatBytes(file.size)})…`, false);

    try {
      const result = await extractFileServerSide(file);
      if (targetTextarea) {
        targetTextarea.value = result.text;
        targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const summary = `✓ ${file.name} (${formatBytes(file.size)}) — ${result.charCount || result.text.length} chars extracted`;
      setDropzoneStatus(dz, summary, false);

      if (onFileProcessed) {
        onFileProcessed({ file, result, id });
      }
    } catch (err) {
      console.error(`[Extraction Error for ${file.name}]:`, err);
      setDropzoneStatus(dz, `Extraction failed: ${err.message}`, true);
    }
  };

  if (input) {
    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file, 'input');
      input.value = '';
    });
  }

  dz.addEventListener('click', (e) => {
    if (e.target.tagName !== 'INPUT' && input) {
      input.click();
    }
  });

  dz.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.add('drag-over');
  });

  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.add('drag-over');
  });

  dz.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dz.contains(e.relatedTarget)) {
      dz.classList.remove('drag-over');
    }
  });

  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file, 'drop');
  });
}

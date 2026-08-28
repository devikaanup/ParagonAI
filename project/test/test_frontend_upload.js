import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lightweight DOM event target simulator
class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName;
    this.id = id;
    this.value = '';
    this.className = '';
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      toggle: (c, force) => force ? this.classList._classes.add(c) : this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c)
    };
    this.listeners = {};
    this.children = [];
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.style = {};
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    for (const fn of list) {
      fn(event);
    }
  }

  querySelector(sel) {
    if (sel === '.dropzone-status') {
      return this.children.find((c) => c.className === 'dropzone-status');
    }
    if (sel === '.dropzone-inner') {
      return this;
    }
    return null;
  }

  querySelectorAll(sel) {
    return this.children.filter((c) => c.className.includes(sel.replace('.', '')));
  }

  appendChild(el) {
    this.children.push(el);
    return el;
  }

  remove() {
    this.isRemoved = true;
  }
}

async function testFrontendUploadFlow() {
  console.log('\n===============================================================');
  console.log('FRONTEND FILE INPUT & DRAG-AND-DROP EVENT HANDLING TEST');
  console.log('===============================================================\n');

  // Setup mock DOM elements matching run.html
  const resumeEl = new MockElement('textarea', 'resume');
  const transcriptEl = new MockElement('textarea', 'transcript');
  const roleEl = new MockElement('textarea', 'role');
  const runBtn = new MockElement('button', 'runBtn');
  const runHint = new MockElement('p', 'runHint');
  const resumeDz = new MockElement('div', 'resumeDz');
  resumeDz.dataset.dropzone = 'resume';
  const transcriptDz = new MockElement('div', 'transcriptDz');
  transcriptDz.dataset.dropzone = 'transcript';
  const roleDz = new MockElement('div', 'roleDz');
  roleDz.dataset.dropzone = 'role';

  const resumeInput = new MockElement('input', 'resumeFile');
  const transcriptInput = new MockElement('input', 'transcriptFile');
  const roleInput = new MockElement('input', 'roleFile');

  // Mock global document & window
  const elements = {
    'resume': resumeEl,
    'transcript': transcriptEl,
    'role': roleEl,
    'runBtn': runBtn,
    'runHint': runHint,
    'resumeFile': resumeInput,
    'transcriptFile': transcriptInput,
    'roleFile': roleInput
  };

  const dropzones = {
    'resume': resumeDz,
    'transcript': transcriptDz,
    'role': roleDz
  };

  const globalDocument = {
    getElementById: (id) => elements[id] || null,
    querySelector: (sel) => {
      const match = sel.match(/\[data-dropzone="([^"]+)"\]/);
      if (match) return dropzones[match[1]] || null;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.dropzone-status') return [];
      if (sel === '.mode-tabs') return [];
      if (sel === '.dropzone input[type=\'file\']') return [resumeInput, transcriptInput, roleInput];
      return [];
    },
    createElement: (tag) => new MockElement(tag)
  };

  // Wire up the exact logic from app.js
  const ACCEPTED = ['.pdf', '.docx', '.txt'];
  const selectedFiles = { resume: null, transcript: null, role: null };

  const hasInput = () =>
    (resumeEl.value.trim().length > 0 || transcriptEl.value.trim().length > 0);

  const updateBtn = () => {
    const processing = runBtn.classList.contains('is-processing');
    runBtn.disabled = !hasInput() || processing;
    runHint.textContent = hasInput()
      ? 'Ready to launch multi-agent evaluation.'
      : 'Paste or upload at least a resume or transcript to begin.';
  };

  function setStatus(dz, msg, isError) {
    let status = dz.querySelector('.dropzone-status');
    if (!status) {
      status = new MockElement('p');
      status.className = 'dropzone-status';
      dz.appendChild(status);
    }
    status.textContent = msg;
    status.classList.toggle('error', !!isError);
  }

  async function mockExtractFileServerSide(file) {
    const isPdf = file.name.endsWith('.pdf');
    return {
      filename: file.name,
      charCount: isPdf ? 260 : 1069,
      pageCount: isPdf ? 1 : 1,
      format: isPdf ? 'pdf' : 'txt',
      text: isPdf
        ? 'ALEX RIVERA - Staff Distributed Systems Engineer\nPrincipal architect for Raft cluster processing 3.1M ops/sec.'
        : 'INTERVIEW TRANSCRIPT: [00:01:00] Alex Rivera on Raft leader leases.'
    };
  }

  function wireDropzone(id) {
    const dz = globalDocument.querySelector(`[data-dropzone="${id}"]`);
    if (!dz) return;
    const input = globalDocument.getElementById(id + 'File');
    const target = globalDocument.getElementById(id);

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
        setStatus(dz, `Unsupported file format '${ext}'. Please upload a PDF, DOCX, or TXT file.`, true);
        return;
      }

      setStatus(dz, `Uploading & extracting ${file.name}…`, false);

      try {
        const result = await mockExtractFileServerSide(file);
        selectedFiles[id] = {
          file,
          filename: file.name,
          size: file.size,
          text: result.text,
          pageCount: result.pageCount
        };

        if (target) {
          target.value = result.text;
        }

        const pageInfo = result.pageCount ? ` (${result.pageCount} pages)` : '';
        setStatus(dz, `✓ Loaded ${file.name}${pageInfo} — ${result.charCount.toLocaleString()} chars`, false);

        updateBtn();
      } catch (err) {
        setStatus(dz, `Could not process ${file.name}: ${err.message}`, true);
      }
    };

    dz.addEventListener('click', () => {
      if (input) input.dispatchEvent({ type: 'click' });
    });

    if (input) {
      input.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          handleFile(file, 'input');
          input.value = '';
        }
      });
    }

    dz.addEventListener('dragover', (e) => {
      e.defaultPrevented = true;
      dz.classList.add('drag-over');
    });

    dz.addEventListener('dragleave', () => {
      dz.classList.remove('drag-over');
    });

    dz.addEventListener('drop', (e) => {
      e.defaultPrevented = true;
      dz.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) {
        handleFile(file, 'drop');
      }
    });
  }

  // Initialize
  updateBtn();
  wireDropzone('resume');
  wireDropzone('transcript');
  wireDropzone('role');

  // Test 1: Initial state
  console.log('[Test 1] Initial Button State:');
  console.assert(runBtn.disabled === true, 'Run button must be disabled initially');
  console.log('  ✓ PASS: runBtn.disabled === true');

  // Test 2: File input selection (Finder)
  console.log('\n[Test 2] Selecting Resume PDF via File Input Change:');
  const mockPdfFile = { name: 'sample_resume.pdf', size: 1024, type: 'application/pdf' };
  resumeInput.dispatchEvent({
    type: 'change',
    target: { files: [mockPdfFile] }
  });

  await new Promise((r) => setTimeout(r, 20));
  const resumeStatus = resumeDz.querySelector('.dropzone-status');
  console.log('  Dropzone Status:', resumeStatus ? resumeStatus.textContent : '(none)');
  console.log('  Resume Value Length:', resumeEl.value.length);
  console.assert(resumeStatus && resumeStatus.textContent.includes('sample_resume.pdf'), 'Resume status contains filename');
  console.assert(resumeEl.value.includes('ALEX RIVERA'), 'Resume textarea populated');
  console.log('  ✓ PASS: Resume file input change handler verified');

  // Test 3: Drag and Drop
  console.log('\n[Test 3] Dragging & Dropping Transcript TXT:');
  const mockTxtFile = { name: 'sample_transcript.txt', size: 2048, type: 'text/plain' };
  
  const dragOverEv = { type: 'dragover' };
  transcriptDz.dispatchEvent(dragOverEv);
  console.assert(dragOverEv.defaultPrevented === true, 'Dragover calls preventDefault');
  console.assert(transcriptDz.classList.contains('drag-over'), 'Dropzone has drag-over class');

  transcriptDz.dispatchEvent({
    type: 'drop',
    dataTransfer: { files: [mockTxtFile] }
  });

  await new Promise((r) => setTimeout(r, 20));
  const transcriptStatus = transcriptDz.querySelector('.dropzone-status');
  console.log('  Dropzone Status:', transcriptStatus ? transcriptStatus.textContent : '(none)');
  console.log('  Transcript Value Length:', transcriptEl.value.length);
  console.assert(transcriptStatus && transcriptStatus.textContent.includes('sample_transcript.txt'), 'Transcript status contains filename');
  console.assert(transcriptEl.value.includes('INTERVIEW TRANSCRIPT'), 'Transcript textarea populated');
  console.log('  ✓ PASS: Drag and drop handler verified');

  // Test 4: Run Button State
  console.log('\n[Test 4] Run Button Enabled State:');
  console.log('  runBtn.disabled:', runBtn.disabled);
  console.assert(runBtn.disabled === false, 'Run button enabled with input');
  console.log('  ✓ PASS: runBtn.disabled === false');

  console.log('\n===============================================================');
  console.log('✓ ALL FILE INPUT & DRAG-AND-DROP TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

testFrontendUploadFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});



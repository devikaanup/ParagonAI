/**
 * Frontend Client for The Panel API
 * Executes progressive multi-agent pipeline calls.
 *
 * Robustly supports:
 * - Production: Vercel frontend -> Render backend (via VITE_API_URL or VITE_BACKEND_URL)
 * - Local dev: Vite development proxy (via relative paths /api/*)
 */

export function getApiBaseUrl() {
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL)) ||
    (typeof window !== 'undefined' && (window.VITE_API_URL || window.VITE_BACKEND_URL)) ||
    ''
  ).trim();

  // Strip trailing slashes and optional /api suffix to normalize
  let clean = envUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api')) {
    clean = clean.slice(0, -4);
  }
  return clean;
}

export const API_BASE_URL = getApiBaseUrl();

export function apiUrl(path) {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return cleanPath;
  }
  return `${base}${cleanPath}`;
}

export async function fetchHealth() {
  const res = await fetch(apiUrl('/api/health'));
  return res.json();
}

export async function fetchDemoData() {
  const res = await fetch(apiUrl('/api/demo'));
  if (!res.ok) throw new Error(`Failed to load demo data (${res.status})`);
  return res.json();
}

export async function extractFileServerSide(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const targetUrl = apiUrl('/api/extract');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        let res;
        try {
          res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64: base64Data,
              filename: file.name,
              mimeType: file.type
            }),
            signal: controller.signal
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          if (fetchErr.name === 'AbortError') {
            throw new Error('Backend request timed out (60s). If your Render backend was sleeping, please wait a moment and try again.');
          }
          throw new Error(`Failed to connect to backend at ${targetUrl}: ${fetchErr.message}`);
        }
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Server extraction failed (${res.status} ${res.statusText})`);
        }

        const data = await res.json();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsDataURL(file);
  });
}

export async function fetchProfile({ resumeText, transcriptText, jobDescriptionText }) {
  const res = await fetch(apiUrl('/api/evaluate/profile'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, transcriptText, jobDescriptionText })
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Profile extraction failed (${res.status})`);
  }
  return res.json();
}

export async function fetchOpinion({ evaluationContext, agentKey, rawSourceText = '' }) {
  const res = await fetch(apiUrl('/api/evaluate/opinion'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evaluationContext, agentKey, rawSourceText })
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Opinion for ${agentKey} failed (${res.status})`);
  }
  return res.json();
}

export async function fetchDebateTurn({
  evaluationContext,
  opinions,
  debateTranscript,
  personaKey,
  turnNumber,
  turnType
}) {
  const res = await fetch(apiUrl('/api/evaluate/debate/turn'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evaluationContext,
      opinions,
      debateTranscript,
      personaKey,
      turnNumber,
      turnType
    })
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Debate turn ${turnNumber} failed (${res.status})`);
  }
  return res.json();
}

export async function fetchAudit({ evaluationContext, opinions, debateTranscript }) {
  const res = await fetch(apiUrl('/api/evaluate/audit'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evaluationContext, opinions, debateTranscript })
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Auditor failed (${res.status})`);
  }
  return res.json();
}

export async function fetchSynthesize({ evaluationContext, opinions, debateTranscript, auditorReport }) {
  const res = await fetch(apiUrl('/api/evaluate/synthesize'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evaluationContext,
      opinions,
      debateTranscript,
      auditorReport
    })
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Decision synthesizer failed (${res.status})`);
  }
  return res.json();
}

export async function fetchQuestions({ evaluationContext, unresolvedDisagreements }) {
  const res = await fetch(apiUrl('/api/evaluate/questions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evaluationContext,
      unresolvedDisagreements
    })
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Question generator failed (${res.status})`);
  }
  return res.json();
}

export async function fetchFullPipeline({ resumeText, transcriptText, jobDescriptionText, forceDemo = false }) {
  const res = await fetch(apiUrl('/api/evaluate/full'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, transcriptText, jobDescriptionText, forceDemo })
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Evaluation pipeline failed (${res.status})`);
  }
  return res.json();
}

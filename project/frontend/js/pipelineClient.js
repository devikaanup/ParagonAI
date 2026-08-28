/**
 * Frontend Client for The Panel API
 * Executes progressive multi-agent pipeline calls.
 *
 * Supports both:
 * - Production (Vercel frontend -> Render backend via VITE_API_URL, e.g. https://your-backend.onrender.com)
 * - Local development (Vite development proxy via relative paths /api/*)
 */

export const API_BASE_URL = (import.meta.env?.VITE_API_URL || '').replace(/\/+$/, '');

export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
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
        const res = await fetch(apiUrl('/api/extract'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64: base64Data,
            filename: file.name,
            mimeType: file.type
          })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Server extraction failed (${res.status})`);
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

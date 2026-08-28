/**
 * Central API Router & Handler for The Panel Multi-Agent Platform
 * Powers both local Node HTTP server and Netlify serverless functions.
 */

import {
  runProfileBuilder,
  runIndependentAgent,
  runAllIndependentAgents,
  runDebateRound,
  runSingleDebateTurn,
  runAuditor,
  runDecisionSynthesizer,
  runQuestionGenerator,
  runFullPipeline,
  AGENT_PERSONAS
} from './pipeline/index.js';
import { getApiKey } from './services/llm.js';
import { DEMO_CANDIDATE, GOLDEN_RUN_OUTPUT } from './data/demoData.js';
import { extractDocumentTextFromBuffer } from './services/pdfParser.js';

export function isApiKeyConfigured() {
  try {
    return Boolean(getApiKey());
  } catch {
    return false;
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const path = event.path.replace(/^\/\.netlify\/functions\/api/, '').replace(/^(\/api)+/, '') || '/';
  const method = event.httpMethod;

  let requestBody = {};
  if (event.body) {
    try {
      requestBody = JSON.parse(event.body);
    } catch {
      requestBody = {};
    }
  }

  try {
    // Health Check
    if (method === 'GET' && (path === '/health' || path === '' || path === '/')) {
      return jsonResponse(200, {
        status: 'ok',
        service: 'The Panel — Multi-Agent Hiring Backend',
        hasGeminiKey: isApiKeyConfigured(),
        timestamp: new Date().toISOString()
      });
    }

    // Demo Data / Golden Run
    if (method === 'GET' && path === '/demo') {
      return jsonResponse(200, {
        candidate: DEMO_CANDIDATE,
        goldenRun: GOLDEN_RUN_OUTPUT,
        hasGeminiKey: isApiKeyConfigured()
      });
    }

    // Document Text Extraction (Server-Side PDF / DOCX / TXT)
    if (method === 'POST' && path === '/extract') {
      let buffer;
      const filename = requestBody.filename || 'document';
      const mimeType = requestBody.mimeType || '';

      if (requestBody.base64) {
        const cleanBase64 = requestBody.base64.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
      } else if (event.isBase64Encoded && event.body) {
        buffer = Buffer.from(event.body, 'base64');
      } else if (event.body && typeof event.body === 'string') {
        buffer = Buffer.from(event.body);
      } else {
        return jsonResponse(400, { error: 'No document payload provided for extraction.' });
      }

      const result = await extractDocumentTextFromBuffer(buffer, filename, mimeType);
      return jsonResponse(200, result);
    }

    // Pipeline Stage 1: Profile Builder
    if (method === 'POST' && path === '/evaluate/profile') {
      const { resumeText, transcriptText, jobDescriptionText } = requestBody;
      const result = await runProfileBuilder({ resumeText, transcriptText, jobDescriptionText });
      return jsonResponse(200, result);
    }

    // Pipeline Stage 2: Independent Agent (Single or Batch)
    if (method === 'POST' && (path === '/evaluate/agent' || path === '/evaluate/opinion')) {
      const { agentKey, evaluationContext, rawSourceText } = requestBody;

      if (agentKey) {
        const persona = AGENT_PERSONAS.find((p) => p.key === agentKey || p.name.toLowerCase().includes(agentKey.toLowerCase()));
        if (!persona) {
          return jsonResponse(400, { error: `Unknown agent key: ${agentKey}` });
        }
        const opinion = await runIndependentAgent({
          agentPersona: persona,
          evaluationContext,
          rawSourceText
        });
        return jsonResponse(200, { opinion });
      } else {
        const opinions = await runAllIndependentAgents({
          evaluationContext,
          rawSourceText
        });
        return jsonResponse(200, { opinions });
      }
    }

    // Pipeline Stage 3: Live Sequential Debate Turn
    if (method === 'POST' && path === '/evaluate/debate/turn') {
      const { evaluationContext, opinions, debateTranscript, personaKey, turnNumber, turnType } = requestBody;
      const persona = AGENT_PERSONAS.find((p) => p.key === personaKey || p.name.toLowerCase().includes((personaKey || '').toLowerCase())) || AGENT_PERSONAS[0];
      const turn = await runSingleDebateTurn({
        evaluationContext,
        opinions,
        debateTranscript: debateTranscript || [],
        persona,
        turnNumber: turnNumber || 1,
        turnType: turnType || 'Challenge'
      });
      return jsonResponse(200, { turn });
    }

    // Pipeline Stage 3: Full Debate Round
    if (method === 'POST' && path === '/evaluate/debate') {
      const { evaluationContext, opinions } = requestBody;
      const debateTranscript = await runDebateRound({
        evaluationContext,
        opinions
      });
      return jsonResponse(200, { debate: debateTranscript });
    }

    // Pipeline Stage 4: Auditor
    if (method === 'POST' && path === '/evaluate/audit') {
      const { evaluationContext, opinions, debateTranscript } = requestBody;
      const auditorReport = await runAuditor({
        evaluationContext,
        opinions,
        debateTranscript
      });
      return jsonResponse(200, { auditor: auditorReport });
    }

    // Pipeline Stage 5: Decision Synthesizer
    if (method === 'POST' && path === '/evaluate/synthesize') {
      const { evaluationContext, opinions, debateTranscript, auditorReport } = requestBody;
      const decision = await runDecisionSynthesizer({
        evaluationContext,
        opinions,
        debateTranscript,
        auditorReport
      });
      return jsonResponse(200, { decision });
    }

    // Pipeline Stage 6: Interview Questions
    if (method === 'POST' && path === '/evaluate/questions') {
      const { evaluationContext, unresolvedDisagreements } = requestBody;
      const questions = await runQuestionGenerator({
        evaluationContext,
        unresolvedDisagreements
      });
      return jsonResponse(200, { questions });
    }

    // Full Pipeline Orchestration
    if (method === 'POST' && (path === '/evaluate/full' || path === '/evaluate')) {
      const { resumeText, transcriptText, jobDescriptionText, forceDemo } = requestBody;

      if (!isApiKeyConfigured() || forceDemo) {
        console.log('[API] Returning golden run fallback...');
        return jsonResponse(200, {
          ...GOLDEN_RUN_OUTPUT,
          isFallback: !isApiKeyConfigured(),
          fallbackReason: !isApiKeyConfigured() ? 'No server-side GEMINI_API_KEY detected' : 'Demo Mode requested'
        });
      }

      const fullResult = await runFullPipeline({
        resumeText,
        transcriptText,
        jobDescriptionText
      });
      return jsonResponse(200, fullResult);
    }

    return jsonResponse(404, { error: `Route not found: ${method} ${path}` });
  } catch (err) {
    console.error(`[API Error] ${method} ${path}:`, err);
    return jsonResponse(500, {
      error: err.message || 'Internal Server Error during evaluation pipeline'
    });
  }
}

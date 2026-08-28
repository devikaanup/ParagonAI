/**
 * Main Application Bootstrap for The Panel
 * Orchestrates event listeners, dropzones, progressive pipeline execution, and UI rendering.
 */

import { setupDropzone } from './upload.js';
import {
  fetchDemoData,
  fetchProfile,
  fetchOpinion,
  fetchDebateTurn,
  fetchAudit,
  fetchSynthesize,
  fetchQuestions
} from './pipelineClient.js';
import {
  openQuoteInspector,
  resetTracker,
  setStageStatus,
  renderProfileContext,
  renderOpinions,
  updateCommitteeBar,
  renderSingleDebateTurnCard,
  updateEvidenceBoard,
  renderAuditor,
  renderVerdict,
  renderQuestions
} from './ui.js';

// Expose modal helper globally for inline onclick handlers
window.thePanelOpenQuote = openQuoteInspector;

document.addEventListener('DOMContentLoaded', () => {
  const resumeEl = document.getElementById('resume');
  const transcriptEl = document.getElementById('transcript');
  const roleEl = document.getElementById('role');
  const runBtn = document.getElementById('runBtn');
  const runHint = document.getElementById('runHint');
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const resultsSection = document.getElementById('resultsSection');
  const pipelineTracker = document.getElementById('pipelineTracker');
  const quoteModal = document.getElementById('quoteModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const runIdLabel = document.getElementById('runIdLabel');
  const panelStatusBadge = document.getElementById('panelStatusBadge');

  /* ===== Setup Drag-and-Drop Dropzones ===== */
  setupDropzone('resume', () => updateRunButton());
  setupDropzone('transcript', () => updateRunButton());

  /* ===== Tab Mode Switching ===== */
  document.querySelectorAll('.mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const fieldId = tab.dataset.target;
      const mode = tab.dataset.mode;
      const parent = tab.closest('.input-field');
      if (!parent) return;

      parent.querySelectorAll('.mode-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const dropzone = parent.querySelector('.dropzone');
      const textarea = parent.querySelector('textarea');

      if (mode === 'upload') {
        if (dropzone) dropzone.style.display = 'flex';
        if (textarea) textarea.style.display = 'none';
      } else {
        if (dropzone) dropzone.style.display = 'none';
        if (textarea) textarea.style.display = 'block';
      }
    });
  });

  /* ===== Run Button State ===== */
  function updateRunButton() {
    if (!runBtn) return;
    const hasResume = resumeEl && resumeEl.value.trim().length > 0;
    const hasTranscript = transcriptEl && transcriptEl.value.trim().length > 0;
    runBtn.disabled = !hasResume && !hasTranscript;
  }

  if (resumeEl) resumeEl.addEventListener('input', updateRunButton);
  if (transcriptEl) transcriptEl.addEventListener('input', updateRunButton);

  /* ===== Modal Close ===== */
  if (modalCloseBtn && quoteModal) {
    modalCloseBtn.addEventListener('click', () => {
      quoteModal.style.display = 'none';
    });
    quoteModal.addEventListener('click', (e) => {
      if (e.target === quoteModal) quoteModal.style.display = 'none';
    });
  }

  /* ===== Load Demo Candidate ===== */
  if (loadDemoBtn) {
    loadDemoBtn.addEventListener('click', async () => {
      try {
        loadDemoBtn.textContent = 'Loading…';
        const data = await fetchDemoData();
        const demo = data.candidate || {};

        if (resumeEl) resumeEl.value = demo.resume || '';
        if (transcriptEl) transcriptEl.value = demo.transcript || '';
        if (roleEl) roleEl.value = demo.jobDescription || '';

        // Switch tabs to text mode so candidate data is visible
        document.querySelectorAll('.mode-tab[data-mode="text"]').forEach((t) => t.click());

        updateRunButton();
        loadDemoBtn.textContent = '✓ Loaded Demo';
        setTimeout(() => {
          loadDemoBtn.textContent = 'Load Demo Candidate (Alex Rivera)';
        }, 2500);
      } catch (err) {
        console.error('Failed to load demo candidate:', err);
        loadDemoBtn.textContent = 'Failed to Load';
      }
    });
  }

  /* ===== Main Evaluation Flow ===== */
  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      if (runBtn.disabled) return;

      const resumeText = resumeEl ? resumeEl.value.trim() : '';
      const transcriptText = transcriptEl ? transcriptEl.value.trim() : '';
      const jobDescriptionText = roleEl ? roleEl.value.trim() : '';

      if (!resumeText && !transcriptText) {
        alert('Please provide at least a resume or interview transcript.');
        return;
      }

      const runId = `run_${Date.now()}`;
      if (runIdLabel) runIdLabel.textContent = `Run ID: ${runId}`;
      if (panelStatusBadge) panelStatusBadge.textContent = '4-agent panel (Full)';

      runBtn.classList.add('is-processing');
      runBtn.textContent = 'Evaluating Panel…';
      runBtn.disabled = true;
      if (runHint) runHint.textContent = 'Evaluation in progress — running parallel agents and live debate…';

      resetTracker();
      if (resultsSection) resultsSection.style.display = 'none';

      const tClientStart = performance.now();

      try {
        // Stage 1: Profile Builder
        setStageStatus('profile', 'running', 'Extracting');
        if (pipelineTracker) pipelineTracker.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const { evaluationContext, modelUsed, isCached } = await fetchProfile({
          resumeText,
          transcriptText,
          jobDescriptionText
        });

        setStageStatus('profile', 'completed', isCached ? 'Cached' : 'Complete');
        if (resultsSection) resultsSection.style.display = 'block';
        renderProfileContext(evaluationContext);

        // Stage 2: 4 Independent Agents (PARALLEL)
        setStageStatus('opinions', 'running', '4 in Parallel');
        const AGENT_KEYS = [
          { key: 'technical', name: 'Technical Agent' },
          { key: 'hr', name: 'HR / Culture Agent' },
          { key: 'manager', name: 'Hiring Manager Agent' },
          { key: 'skeptic', name: 'Skeptic Agent' }
        ];

        let completedCount = 0;
        const opinionPromises = AGENT_KEYS.map(async (ag) => {
          try {
            const { opinion } = await fetchOpinion({ evaluationContext, agentKey: ag.key });
            completedCount++;
            setStageStatus('opinions', 'running', `${completedCount}/4 Done`);
            return opinion;
          } catch (err) {
            completedCount++;
            return {
              agent: ag.name,
              error: err.message,
              score: null,
              verdict: 'Unavailable',
              summary: `Evaluation unavailable: ${err.message}`,
              evidence_quotes: [],
              reasoning: 'Evaluation could not be completed.'
            };
          }
        });

        const opinions = await Promise.all(opinionPromises);
        setStageStatus('opinions', 'completed', '4 Done');
        renderOpinions(opinions, evaluationContext);

        // Stage 3: Live Sequential Deliberation Turns
        setStageStatus('debate', 'running', 'Turn 1/4');
        const debateContainer = document.getElementById('debateContainer');
        const evidenceBoardList = document.getElementById('evidenceBoardList');
        const statusIndicator = document.getElementById('debateStatusIndicator');

        if (debateContainer) debateContainer.innerHTML = '';
        if (evidenceBoardList) evidenceBoardList.innerHTML = '<div class="evidence-empty-hint">Awaiting deliberation citations…</div>';

        const DEBATE_TURNS_CONFIG = [
          { turnNumber: 1, turnType: 'Challenge', personaKey: 'technical', agentName: 'Technical Agent' },
          { turnNumber: 2, turnType: 'Response', personaKey: 'hr', agentName: 'HR / Culture Agent' },
          { turnNumber: 3, turnType: 'Reassessment', personaKey: 'manager', agentName: 'Hiring Manager Agent' },
          { turnNumber: 4, turnType: 'Final Position', personaKey: 'skeptic', agentName: 'Skeptic Agent' }
        ];

        updateCommitteeBar({ activeKey: null, opinions, turns: [] });

        const debateTurns = [];
        const allCitedEvidence = [];

        for (let i = 0; i < DEBATE_TURNS_CONFIG.length; i++) {
          const turnConfig = DEBATE_TURNS_CONFIG[i];
          setStageStatus('debate', 'running', `Turn ${i + 1}/4`);
          if (statusIndicator) {
            statusIndicator.textContent = `Turn ${turnConfig.turnNumber} of 4: ${turnConfig.turnType} (${turnConfig.agentName})`;
          }

          updateCommitteeBar({
            activeKey: turnConfig.personaKey,
            turnNumber: turnConfig.turnNumber,
            turnType: turnConfig.turnType,
            opinions,
            turns: debateTurns
          });

          const { turn } = await fetchDebateTurn({
            evaluationContext,
            opinions,
            debateTranscript: debateTurns,
            personaKey: turnConfig.personaKey,
            turnNumber: turnConfig.turnNumber,
            turnType: turnConfig.turnType
          });

          debateTurns.push(turn);
          renderSingleDebateTurnCard(turn, i, evaluationContext);

          if (Array.isArray(turn.cited_evidence) && turn.cited_evidence.length > 0) {
            turn.cited_evidence.forEach((ev) => {
              allCitedEvidence.push({ ...ev, agent: turn.agent });
            });
            updateEvidenceBoard(allCitedEvidence, evaluationContext);
          }

          updateCommitteeBar({ activeKey: null, opinions, turns: debateTurns });
        }

        setStageStatus('debate', 'completed', 'Complete');
        if (statusIndicator) statusIndicator.textContent = 'Deliberation Complete (4/4 Turns)';

        // Stage 4: Reasoning Auditor
        setStageStatus('auditor', 'running', 'Auditing');
        const { auditor } = await fetchAudit({ evaluationContext, opinions, debateTranscript: debateTurns });
        setStageStatus('auditor', 'completed', 'Audited');
        renderAuditor(auditor);

        // Stage 5: Decision Synthesizer
        setStageStatus('decision', 'running', 'Synthesizing');
        const { decision } = await fetchSynthesize({
          evaluationContext,
          opinions,
          debateTranscript: debateTurns,
          auditorReport: auditor
        });
        setStageStatus('decision', 'completed', 'Synthesized');
        renderVerdict(decision);

        // Stage 6: Targeted Questions
        setStageStatus('questions', 'running', 'Generating');
        const { questions } = await fetchQuestions({
          evaluationContext,
          unresolvedDisagreements: decision.unresolved_disagreements
        });
        setStageStatus('questions', 'completed', 'Generated');
        renderQuestions(questions);

        const totalElapsed = ((performance.now() - tClientStart) / 1000).toFixed(1);
        if (runHint) runHint.textContent = `✓ Evaluation Complete for ${evaluationContext.candidate?.name || 'candidate'} in ${totalElapsed}s.`;
      } catch (err) {
        console.error('Pipeline error:', err);
        if (runHint) runHint.textContent = `Pipeline error: ${err.message}.`;
        setStageStatus('profile', 'failed', 'Error');
      } finally {
        runBtn.classList.remove('is-processing');
        runBtn.textContent = 'Run The Panel';
        updateRunButton();
      }
    });
  }
});

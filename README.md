# The Panel — AI Hiring Evaluation

**Four Independent AI Agents, One Evidence-Backed Verdict.**
AI assists the human hiring decision-maker. It does not replace them.

The Panel simulates a disciplined hiring committee, not a single model producing a verdict. Four independent AI agents evaluate a candidate separately, debate their disagreements, get audited for reasoning quality, and only then produce a single non-averaged recommendation.

Upload a resume, a job description, and an interview transcript. Run the panel. Watch each stage complete in real time — profile extraction, four isolated agent opinions, a structured debate, a reasoning audit, a weighted final decision, and targeted follow-up questions — all traceable back to a specific quote or fact.

---

## Why This Isn't "One Big Prompt Pretending to Be Four Agents"

This is the distinction the whole system is built to prove, not just claim:

- **Genuinely independent opinions.** In Stage 2, each agent receives *only* the structured `evaluation_context` and its own persona instructions, via a fully separate LLM call. No agent has access to another agent's conclusions before the debate stage. This is enforced architecturally, not just by prompt instruction — request payloads are logged so isolation can be verified directly.
- **A real debate, not a side-by-side display.** In Stage 3, agents review all four independent opinions and respond directly to each other — agreeing, disagreeing, or revising their own score because of what another agent argued. Every score revision requires a stated evidentiary justification; an unexplained score change is treated as invalid output.
- **The moment an agent's opinion changed is visible.** Each debate turn records `score_before` → `score_after` with the reasoning behind the change, so the UI can show — not just claim — the exact point where independent reasoning gave way to real argument.
- **No unexplained numbers, ever.** Every score, verdict, and claim must point to a specific quote or fact from the resume or transcript. Quotes are programmatically validated against source text — traceable back to source, not just cited from memory. If a quote can't be matched to real source text, it's rejected, not silently displayed.
- **Zero averaging, zero majority voting.** The Decision Synthesizer doesn't compute `average(scores)` or take a vote. It reasons comparatively — which evidence is strongest, whose reasoning is best supported, what remains genuinely uncertain — and has to explain *why* it sided with one argument over another.
- **Honest about what it doesn't know.** If there isn't enough information to judge something, every agent is required to say "Insufficient evidence" rather than make up a score. Absence of evidence is never treated as evidence of a negative trait.

---

## Pipeline Architecture

```
Resume + Interview Transcript + Job Description
                      ↓
           [1] Profile Builder (1x Gemini Call)
                      ↓ (Immutable evaluation_context)
           [2] Independent Opinions (4x Isolated Gemini Calls)
                 ├── Technical Agent
                 ├── HR / Culture Agent
                 ├── Hiring Manager Agent
                 └── Skeptic Agent
                      ↓
           [3] Structured Debate (4x Sequential Gemini Calls)
                 ├── Technical Turn
                 ├── HR / Culture Turn
                 ├── Hiring Manager Turn
                 └── Skeptic Turn
                      ↓
           [4] Reasoning Auditor (1x Gemini Call) — bonus/creative addition
                      ↓
           [5] Decision Synthesizer (1x Gemini Call)
                      ↓
           [6] Interview Question Generator (1x Gemini Call) — bonus/creative addition
                      ↓
                  Final Report
```

### Key Architectural Principles

- **Genuinely Isolated Opinions** — Stage 2 agents receive only `evaluation_context` and their own persona instructions. No agent sees another agent's initial opinion. Verified via logged, isolated request payloads.
- **Debate with Attribution & Score Revision** — Stage 3 agents review all four opinions and a sequential debate transcript. Score revisions require concrete evidentiary justification, not a bare number change.
- **Reasoning Auditor (Non-Voting)** — Stage 4 evaluates reasoning validity: checks for cherry-picking, unsupported leaps, and demographic-proxy bias, without holding voting power or changing any agent's score.
- **Comparative Synthesis (Zero Averaging)** — Stage 5 weighs evidence strength and confidence, and tracks resolved vs. unresolved disagreements, without mathematical averaging or majority voting.
- **Programmatically Validated Quotes** — every cited piece of evidence is checked against source claims before it's allowed to reach the UI. Invalid quotes are excluded, never displayed as fact.
- **Prompt Injection Defense** — untrusted candidate data (resume/transcript/job description content) is strictly isolated from system instructions, so nothing embedded in an uploaded document can hijack an agent's persona or behavior.
- **Handles Missing/Unclear Information Sensibly** — every stage is instructed to output "Insufficient evidence" rather than fabricate a score when the source material doesn't support a conclusion.

---

## Beyond the Core Requirements (Creative / Extra)

Two deliberate additions beyond the required pipeline, both designed to strengthen the weakest points of a typical multi-agent hiring tool:

- **The Reasoning Auditor (Stage 4)** — a fifth agent that doesn't vote on the candidate at all. Instead, it checks whether the *panel's own reasoning* held up: did any agent's conclusion lean on cited evidence, or on a weak proxy (resume length, prestige signaling, polished wording, formatting) instead? This makes the "evidence-weighted, not averaged" decision step self-checking rather than a black box.
- **The Interview Question Generator (Stage 6)** — turns unresolved disagreements from the debate into 2–3 specific, non-generic follow-up questions a human interviewer can actually ask, each one explicitly tied to a named contradiction the debate surfaced. This reframes the tool from "AI hands down a verdict" to "AI hands the human interviewer exactly what to ask next" — decision support, not decision replacement.

---

## Handling Both Candidates

The system processes **both** provided candidates — Resume A and Resume B, each against its own interview transcript and the shared job description — as two fully independent evaluation runs. Each run produces its own `evaluation_context`, its own four independent agent opinions, its own debate, its own audit, and its own final report. Candidate A's evaluation never influences Candidate B's — the same isolation discipline that separates agents from each other also separates one candidate's run from the other's.

*(Comparative ranking between Candidate A and Candidate B is treated as optional/bonus territory beyond this — the core requirement is that both are processed and reported on individually.)*

---

## Quick Start & Local Development

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm 9+
- Gemini API Key

### Installation
```bash
git clone <repo-url>
cd promptwars/project
npm install
```

### Environment Configuration
Create a `.env` file in the `project/` directory:
```
GEMINI_API_KEY=your_gemini_api_key_here
```
*(`.env` is already in `.gitignore` — never commit API keys to version control.)*

### Run Locally
```bash
npm run dev
# http://localhost:5173
```

### Using the App
Upload a resume, an interview transcript, and a job description (paste text or upload PDF/DOCX/TXT) → click **Run The Panel** → watch each of the six pipeline stages complete in real time (Building Profile → Running Independent Panel → Opening Debate → Auditing → Synthesizing → Generating Questions) → review the final report, including the evidence behind every conclusion and any disagreement the panel never fully resolved.

---

## Testing & Verification

Run the automated verification suite covering all 6 stages, quote verification, and API handlers:
```bash
npm test
```

Run a live 12-call Gemini API test against the built-in demo candidate:
```bash
node test/test_full_pipeline.js
```

**Reliability features built in:** schema validation on every model response, retry with exponential backoff on rate-limit/server errors, and scoped error states per pipeline stage so a single failed call degrades one section of the report rather than the whole run.

---

## Deployment (Vercel + Render)

The frontend and backend are deployed separately: the static Vite frontend on **Vercel**, and the Express (Node) backend — which runs the full 6-stage pipeline as a persistent server process, not serverless functions — on **Render**.

### Backend (Render)

1. Create a new **Web Service** on Render, pointing at the `project/` backend directory.
2. Build command: `npm install`
3. Start command: `npm start` (or your configured server entry point)
4. Under **Environment**, add:
   - `GEMINI_API_KEY` → your Gemini API key
   - `NODE_VERSION` → `20`
5. Deploy. Render will give you a live backend URL, e.g. `https://the-panel-backend.onrender.com`.

**Note:** Render's free tier spins down after inactivity — the first request after idle can take 30–60+ seconds to wake the service. If demoing live, ping the backend a few minutes beforehand, or the UI should show a clear "waking up the panel…" state rather than an unexplained stall.

### Frontend (Vercel)

1. Import the repository into Vercel.
2. Root directory: `project/`
3. Build command: `npm run build` — output directory: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL` → your deployed Render backend URL (e.g. `https://the-panel-backend.onrender.com`)
5. Deploy.

### CORS

The Render backend explicitly allows requests from the deployed Vercel frontend domain (plus `localhost` for local development) — cross-origin requests are expected here since frontend and backend live on separate domains, unlike the previous same-origin Netlify Functions setup.

### Security note

`GEMINI_API_KEY` lives only in Render's environment variables, on the backend. It is never set on Vercel and never reachable from frontend/client code.

---

## Demo Mode & Golden Run Fallback

- **Built-in Demo Candidate** — a preloaded profile (Alex Rivera, Staff Distributed Systems Engineer) featuring real technical depth, a subtle resume/interview discrepancy, and a mix of resolvable and genuinely unresolvable tensions — deliberately constructed to exercise every stage of the pipeline rather than produce an easy unanimous verdict.
- **One-Click Golden Demo** — click **"🏆 Run Demo / Golden Mode"** on `/run.html` to instantly load a previously-verified, real (not fabricated) benchmark evaluation output, in case live API quotas are constrained during judging.
- **Prompt Injection Defense Test** — click **"🛡️ Test Prompt Injection Safety"** to verify that adversarial instructions hidden inside a transcript cannot hijack an agent's persona or override its evaluation instructions.

---

## Rubric Alignment Summary

| Requirement | Where it's addressed |
|---|---|
| 4 independent, genuinely separate agent personas | Stage 2 — isolated calls, verified via logged payloads |
| Every opinion backed by a real quote or fact | Programmatic quote validation against source claims |
| Real debate with direct agent-to-agent response | Stage 3 — sequential turns with named agreement/disagreement and justified score revision |
| Visible moment an agent's opinion changed | Debate turn `score_before` → `score_after` with stated reasoning |
| Final decision without simple averaging | Stage 5 — comparative, evidence-weighted reasoning, explicitly not an average or vote |
| Full final report per candidate | Recommendation, confidence, strengths, concerns, unresolved disagreements |
| Handles unclear/missing information | Explicit "Insufficient evidence" output — never a fabricated score |
| Both candidates processed | Two fully independent evaluation runs, Candidate A and B |
| Creative/extra additions | Reasoning Auditor (Stage 4) and Interview Question Generator (Stage 6) |

# The Panel — AI Hiring Evaluation

> **Four Independent AI Agents, One Evidence-Backed Verdict.**
> AI assists the human hiring decision-maker. It does not replace them.

The Panel simulates a disciplined hiring committee. Four independent AI agents evaluate a candidate separately, debate their disagreements, get audited for reasoning quality, and only then produce a single non-averaged recommendation.

---

## 🏛️ Pipeline Architecture

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
           [4] Reasoning Auditor (1x Gemini Call)
                      ↓
           [5] Decision Synthesizer (1x Gemini Call)
                      ↓
           [6] Interview Question Generator (1x Gemini Call)
                      ↓
                  Final Report
```

### Key Architectural Principles:
1. **Genuinely Isolated Opinions**: In Stage 2, each agent receives *only* the structured `evaluation_context` and its own persona instructions. No agent sees another agent's initial opinion.
2. **Debate with Attribution & Score Revision**: In Stage 3, agents review all four opinions and sequential debate turns. Score revisions require concrete evidentiary justification.
3. **Reasoning Auditor (Non-Voting)**: In Stage 4, an auditor evaluates reasoning validity, checks for cherry-picking, unsupported leaps, and demographic proxy bias without holding voting power.
4. **Comparative Synthesis (Zero Averaging)**: In Stage 5, the Decision Synthesizer weights evidence strength and tracks resolved vs unresolved disagreements without mathematical averaging or majority voting.
5. **Programmatically Validated Quotes**: Every cited evidence quote is checked against source claims.
6. **Prompt Injection Defense**: Untrusted candidate data is strictly isolated from system instructions.

---

## 🚀 Quick Start & Local Development

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm 9+
- Gemini API Key

### Installation
```bash
npm install
```

### Environment Configuration
Create a `.env` file in the `project/` directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: Do not commit `.env` to version control. It is already added to `.gitignore`.)*

### Run Locally
```bash
npm run dev
# Open in your browser: http://localhost:5173
```

---

## 🧪 Testing & Verification

Run the automated verification suite:
```bash
npm test
```

Run a live 12-call Gemini API test against the built-in demo candidate:
```bash
node test/test_full_pipeline.js
```

---

## 🌐 Netlify Deployment

The project is structured with Netlify Serverless Functions in `netlify/functions/api.js`.

### Deploying to Netlify:
1. Link the repository to Netlify.
2. Under **Site Configuration** → **Environment Variables**, add:
   - `GEMINI_API_KEY`: `your_gemini_api_key`
3. Deploy! Netlify builds the Vite multi-page application and deploys the serverless functions.

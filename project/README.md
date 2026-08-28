# The Panel — Gemini-Powered Multi-Agent Hiring Evaluation Platform

A production-grade, multi-agent AI candidate evaluation system powered by Google Gemini. The Panel features genuinely isolated independent assessments across four specialist personas, a live sequential committee deliberation with position revisions, a non-voting reasoning auditor, comparative decision synthesis without score averaging, and evidence-grounded follow-up question generation.

---

## 🏛️ Project Architecture & Folder Structure

```
the-panel/
│
├── frontend/                     # Frontend client layer
│   ├── index.html                # Landing page
│   ├── run.html                  # Main Deliberation & Evaluation Dashboard
│   ├── how-it-works.html         # Pipeline architecture explanation
│   ├── agents.html               # Persona breakdowns and criteria
│   ├── css/
│   │   └── styles.css            # Atmospheric lavender-pink gradient & glassmorphism theme
│   ├── js/
│   │   ├── app.js                # Main application bootstrap & event listeners
│   │   ├── pipelineClient.js     # Progressive API client for /api/* stages
│   │   ├── upload.js             # Drag-and-drop & server-side extraction triggers
│   │   └── ui.js                 # DOM rendering for cards, debate turns, and modals
│   └── assets/                   # Static assets & icons
│
├── backend/                      # Backend services and multi-agent pipeline
│   ├── server.js                 # Local Node HTTP server (port 3001)
│   ├── api.js                    # Central API router & Netlify handler
│   ├── pipeline/                 # 6-Stage Multi-Agent Pipeline
│   │   ├── index.js              # Pipeline orchestrator (runFullPipeline)
│   │   ├── profileBuilder.js     # Stage 1: Structured evidence extraction
│   │   ├── agents.js             # Stage 2: 4 isolated parallel agent evaluations
│   │   ├── debate.js             # Stage 3: 4-turn sequential committee deliberation
│   │   ├── auditor.js            # Stage 4: Non-voting reasoning auditor
│   │   ├── decision.js           # Stage 5: Comparative decision synthesizer
│   │   └── followups.js          # Stage 6: Targeted follow-up question generator
│   ├── services/                 # Reusable backend services
│   │   ├── llm.js                # Gemini API client with timeouts & fast retries
│   │   ├── pdfParser.js          # Server-side document text extractor (PDF, DOCX, TXT)
│   │   └── validator.js          # Substring evidence quote validation engine
│   ├── prompts/                  # Immutable system instructions & personas
│   │   ├── index.js              # Prompts barrel exporter
│   │   ├── safety.js             # Prompt injection defense preamble
│   │   ├── profile.js            # Stage 1 Profile Builder schema
│   │   ├── technical.js          # Technical Agent persona
│   │   ├── hr.js                 # HR / Culture Agent persona
│   │   ├── hiringManager.js      # Hiring Manager Agent persona
│   │   ├── skeptic.js            # Skeptic Agent persona
│   │   ├── debate.js             # 4-turn sequential debate instructions
│   │   ├── auditor.js            # Reasoning Auditor checklist
│   │   ├── decision.js           # Decision Synthesizer rules
│   │   └── questions.js          # Interview Question Generator rules
│   └── data/
│       └── demoData.js           # Built-in Alex Rivera candidate & Golden Run dataset
│
├── test/                         # Automated verification & acceptance suite
│   ├── runner.js                 # 44-test verification suite
│   ├── test_frontend_upload.js   # File picker & drag-and-drop verification
│   ├── test_performance_pipeline.js # Benchmark stopwatch test
│   └── fixtures/                 # Sample PDF, DOCX, and TXT files
│
├── netlify/                      # Netlify serverless functions
│   └── functions/
│       └── api.js                # Serverless function entrypoint
│
├── .env                          # Local environment variables (ignored by git)
├── .env.example                  # Safe template for environment configuration
├── .gitignore                    # Git exclusions
├── netlify.toml                  # Netlify build & redirect routing configuration
├── vite.config.js                # Vite development server & rollup build config
└── package.json                  # Dependencies & npm scripts
```

---

## ⚡ Quick Start

### 1. Configure Environment
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Add your Gemini API key:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

### 2. Run Locally in Development Mode
```bash
npm run dev
```
Open **[http://localhost:5173/run.html](http://localhost:5173/run.html)** in your browser.

### 3. Run Automated Tests
```bash
npm test
```

### 4. Build for Production
```bash
npm run build
```

---

## 🔒 Security & Verification Guarantees
- **Strict Persona Isolation**: In Stage 2, each agent is evaluated independently via separate, concurrent Gemini calls with zero cross-talk.
- **Server-Side Extraction**: All document parsing (PDF, DOCX, TXT) occurs exclusively in Node.js on the server.
- **Prompt Injection Defense**: Security preamble treats candidate text strictly as untrusted user data.
- **Evidence-Grounded**: All candidate quotes are validated programmatically as verbatim substrings.

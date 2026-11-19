# Next Role

A portable, agent-operated job-search workspace. Bring your own AI assistant; keep your experience, opportunities, applications, and interview preparation in ordinary local files.

The assistant does the research and writing. The HTML dashboard gives you a calm place to see the results. It contains no chatbot, AI subscription, or built-in job scraper.

## Quick start

Share this repository link with someone who has an AI assistant that can download files and run commands on their computer. They can give their assistant this prompt:

> Download https://github.com/d93ben/next-role into a local folder, read START-HERE.md, and set up Next Role for me. Use the launcher for my operating system and show me where to add my career materials.

For manual setup, clone the repository or download and extract its source ZIP. Then run the launcher from the extracted folder.

- **Windows:** double-click `Start Next Role.cmd`.
- **macOS/Linux:** run `sh start.sh`.
- **From a terminal:** `npm run open` starts the local app and opens your browser.

The launcher uses Node.js 20 or newer if it is available. On Windows, macOS and Linux x64 or Arm64, it can also download a pinned Node.js 24 LTS runtime, verify its SHA-256 checksum, and cache its executable and license in `.next-role-runtime/`. The first download needs internet access. The cached runtime travels with the folder when moved to a compatible machine. Viewing a generated dashboard from disk only needs a browser.

Add career material to `workspace/input`. Tell your assistant:

> Read START-HERE.md, review the materials in workspace/input, and suggest a job search profile I can confirm or edit.

Your assistant recommends roles and a starting search area from your materials and highlights assumptions about work arrangement, pay, and priorities. Review the suggestions together and change anything that feels off. A few career notes or a description of a recent project are enough to get started.

## What is included

- A searchable applications table with status, favorites, filters, next steps, and direct original-listing links. The dark interface uses bright text and distinct status colors. Each row opens a full-page job view with a right sidebar for links, submitted materials, prepared files, and emails.
- A career profile with a brain dump that saves original notes for the agent to organize.
- Original answers, source-backed career facts, preferences, open questions, and indexed input files.
- A separate record for every opportunity, including a saved listing, fit explanation, gaps, notes, next actions, dates, and activity history.
- An evidence match percentage for assessed roles, with a per-criterion breakdown, a highest-match sort, and scores in the assistant's search summaries.
- A finished, editable Word resume for the selected role, plus printable HTML, plain text and an evidence snapshot. The assistant explains significant edits in chat using original wording, tailored wording and the reason for the change. Preparing a role also includes starter interview questions and answer outlines.
- Import existing PDF, DOCX, HTML, Markdown, or text application documents; archive the exact submitted resume and selected attachments.
- An interview coach in your assistant chat that researches employer guides and candidate reports, builds answers from your experience, and runs one-question-at-a-time mock interviews with feedback. Try “Research questions for [role] at [company] and coach me through a mock interview.”
- Correspondence records and unsent reply drafts, supplied through the assistant's email tools or pasted messages.
- AGENTS.md operating rules, a MEMORY.md navigation guide, generated workspace indexes, a short session handoff, guided workflows, validation, backups, and a fictional demo.

## How the dashboard works

The agent saves local records and rebuilds the dashboard and indexes. The dashboard presents an applications table, full-page job details, and career profile. Users can star jobs and save rough career notes. These two actions write to the same workspace files that the agent reads; they do not start an agent task. Search, tailoring, status changes, and conversation happen in the IDE or agent host.

The launcher starts a small local server and opens the personal dashboard. Agent updates refresh automatically, preserving the current page and filters. Unsaved notes are retained in the current browser session and pause automatic refresh while you type. Saved notes are durable workspace records. The separate fictional demo is at `http://127.0.0.1:4317/demo/dashboard.html`.

Click a document card under **Prepared files** or **Submitted materials** to preview it. Word and PDF source files also open in the preview from **Career profile**. The browser renders Word text, formatting, lists and tables locally. Complex Word layouts and page breaks can differ from the original. PDF uses your browser's built-in viewer. Use **Download** to keep the original file. In a dashboard opened directly from disk, generated resumes can use their printable HTML, and standalone Word files can be selected in the preview.

For a foreground server, use `npm start` and stop it with Ctrl+C. The launcher keeps the local server running after its window closes and reuses it on subsequent launches. Directly opened HTML files remain portable, view-only snapshots; use the launcher for stars and note saving. There is no built-in search engine, email connection, or chatbot.

## Assistant compatibility

Shared instructions live in `AGENTS.md`; `CLAUDE.md` imports them, and `.github/copilot-instructions.md` points to them. Other hosts can start by explicitly reading `START-HERE.md`. Instruction discovery depends on the host and configuration. The assistant needs local file access and command execution. Browser, search, email, and document-reading capabilities are optional and vary by host.

This release verifies the local helper and dashboard workflow. It does not certify every assistant integration or automatically connect accounts. Browsing and sending/submitting remain governed by the user's chosen assistant and authorization.

## Your data

`workspace/` is personal and excluded from Git. `demo/` contains fictional examples and is also excluded. The app makes no external network requests, stores no AI credentials, and does not send email or submit applications by itself. Your chosen assistant may send the material it reads to its own provider; local file storage is not a promise of offline AI processing.

Back up the entire workspace folder, including application documents and input files. Updating app code must preserve this folder. Automatic file backups are in `workspace/.backups`; see `docs/ARCHITECTURE.md` for recovery.

## Develop and distribute

```text
npm run setup
npm test
npm run validate
npm run build
npm start
npm run package
```

There are no npm dependencies and no install step. `npm run package` produces `release/next-role-v1.1.1.zip` from an explicit source allowlist, a fresh empty personal workspace, and newly generated fictional examples. It excludes existing personal data, credentials, test output, and backups.

See `docs/COMMANDS.md` for commands, `docs/ARCHITECTURE.md` for storage contracts, and `docs/QA.md` for verification and current limitations. MIT licensed.

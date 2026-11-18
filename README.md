# Next Role

A portable, agent-operated job-search workspace. Bring your own AI assistant; keep your experience, opportunities, applications, and interview preparation in ordinary local files.

The assistant does the research and writing. The HTML dashboard gives you a calm place to see the results. It contains no chatbot, AI subscription, or built-in job scraper.

## Quick start

Download and extract the release ZIP, then open the folder in an AI assistant with local file access and command execution. Node.js 20+ is the only runtime requirement for updating records. You can view the included dashboards without Node.

- **Windows:** double-click `Start Next Role.cmd`.
- **macOS/Linux:** run `sh start.sh`.
- **From a terminal:** `npm run open` starts the local app and opens your browser.

Add career material to `workspace/input`. Tell your assistant:

> Read START-HERE.md and help me start my job search.

You do not need an existing resume. The onboarding workflow can help you describe your experience through conversation.

## What is included

- A searchable applications table with status, favorites, filters, next steps, and direct original-listing links. The dark interface uses bright text and distinct status colors. Each row opens a full-page job view with a right sidebar for links, submitted materials, prepared files, and emails.
- A career profile with a brain dump that saves original notes for the agent to organize.
- Original answers, source-backed career facts, preferences, open questions, and indexed input files.
- A separate record for every opportunity, including a saved listing, fit explanation, gaps, notes, next actions, dates, and activity history.
- Tailored resume generation in printable HTML and plain text, with a JSON source/evidence snapshot. Open the HTML and choose **Print / save as PDF**. A PDF is created only when you complete that print flow.
- Import existing PDF, DOCX, HTML, Markdown, or text application documents; archive the exact submitted resume and selected attachments.
- Distinct company research, reported interview questions, predicted questions, and experience-based answer outlines.
- Correspondence records and unsent reply drafts, supplied through the assistant's email tools or pasted messages.
- AGENTS.md operating rules, a MEMORY.md navigation guide, generated workspace indexes, a short session handoff, guided workflows, validation, backups, and a fictional demo.

## How the dashboard works

The agent saves local records and rebuilds the dashboard and indexes. The dashboard presents an applications table, full-page job details, and career profile. Users can star jobs and save rough career notes. These two actions write to the same workspace files that the agent reads; they do not start an agent task. Search, tailoring, status changes, and conversation happen in the IDE or agent host.

The launcher starts a small local server and opens the personal dashboard. Agent updates refresh automatically, preserving the current page and filters. Unsaved notes are retained in the current browser session and pause automatic refresh while you type. Saved notes are durable workspace records. The separate fictional demo is at `http://127.0.0.1:4317/demo/dashboard.html`.

For a foreground server, use `npm start` and stop it with Ctrl+C. The launcher keeps the local server running after its window closes and reuses it on subsequent launches. Directly opened HTML files remain portable, view-only snapshots; use the launcher for stars and note saving. There is no built-in search engine, email connection, or chatbot.

## Assistant compatibility

Shared instructions live in `AGENTS.md`; `CLAUDE.md` imports them, and `.github/copilot-instructions.md` points to them. Other hosts can start by explicitly reading `START-HERE.md`. Instruction discovery depends on the host and configuration. The core requirements are project-file read/write access and Node execution. Browser, search, email, and document-reading capabilities are optional and vary by host.

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

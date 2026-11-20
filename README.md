# Next Role

A portable, agent-operated job-search workspace. Bring your own AI assistant; keep your experience, opportunities, applications, and interview preparation in ordinary local files.

The assistant does the research and writing. The HTML dashboard gives you a calm place to see the results. It contains no chatbot, AI subscription, or built-in job scraper.

You always submit your own applications. When you ask to apply, your assistant prepares the materials and stops before the final click or email send. Tell it once you've submitted so it can record the application.

## Quick start

Give your AI assistant the GitHub link and this prompt.

> Set up https://github.com/d93ben/next-role in a local folder, read START-HERE.md, and help me start my job search. Ask me for my résumé in this chat.

Drag your résumé, LinkedIn export, notes, or work samples into that chat. You can also start by describing a recent role. Ask the assistant to find jobs, save favorites, record updates, or prepare you for an interview.

To browse a packaged release, extract the ZIP and open **workspace/dashboard.html**. On Windows, **Start Next Role.cmd** also opens the file. On macOS or Linux, use **sh start.sh**. Viewing the prebuilt dashboard requires only a browser. A source checkout needs a first build. The launcher can use an existing Node 20+ runtime or download a checksum-verified portable runtime into the project for the helpers.

Your assistant recommends roles and a starting search area from your materials and highlights assumptions about work arrangement, pay, and priorities. Review the suggestions together and change anything that feels off. A few career notes or a description of a recent project are enough to get started.

## What is included

- A searchable applications table with status, favorites, filters, next steps, and direct original-listing links. The dark interface uses bright text and distinct status colors. Each row opens a full-page job view with a right sidebar for links, submitted materials, prepared files, and emails.
- A career profile that displays original notes saved through chat.
- Original answers, source-backed career facts, preferences, open questions, and indexed input files.
- A separate record for every opportunity, including a saved listing, fit explanation, gaps, notes, next actions, dates, and activity history.
- An evidence match percentage for assessed roles, with a per-criterion breakdown, a highest-match sort, and scores in the assistant's search summaries.
- One current tailored resume per role, with a submission-ready `firstname_lastname_company.pdf`, an editable Word copy and supporting files. The first delivery invites you to drop a preferred template into chat. The assistant explains significant edits in chat using original wording, tailored wording and the reason for the change. Preparing a role also includes starter interview questions and answer outlines.
- Import existing PDF, DOCX, HTML, Markdown, or text application documents; archive the exact submitted resume and selected attachments.
- An interview coach in your assistant chat that researches employer guides and candidate reports, builds answers from your experience, and runs one-question-at-a-time mock interviews with feedback. Try “Research questions for [role] at [company] and coach me through a mock interview.”
- Correspondence records and unsent reply drafts, supplied through the assistant's email tools or pasted messages.
- AGENTS.md operating rules, a MEMORY.md navigation guide, generated workspace indexes, a short session handoff, guided workflows, validation, backups, and a fictional demo.

## How the dashboard works

The agent saves local records and regenerates the HTML after each update. Refresh an open tab to see the latest jobs, favorites, notes, and documents. Open `demo/dashboard.html` to explore the fictional example.

After a job search, the assistant offers to check job-related email from the past three months or a date range you specify. Accept in chat to receive a summary of recruiter outreach, application updates, and deadlines.

Click a document card under **Prepared files** or **Submitted materials** to preview it. Word and PDF source files also open in the preview from **Career profile**. The browser renders Word text, formatting, lists and tables locally. Complex Word layouts and page breaks can differ from the original. PDF uses your browser's built-in viewer. Use **Download** to keep the original file. In a dashboard opened directly from disk, generated resumes can use their printable HTML, and standalone Word files can be selected in the preview.

Developers can run the optional local server with `npm run live` for live refresh and the legacy favorite and note controls.

## Assistant compatibility

Shared instructions live in `AGENTS.md`; `CLAUDE.md` imports them, and `.github/copilot-instructions.md` points to them. Other hosts can start by explicitly reading `START-HERE.md`. Instruction discovery depends on the host and configuration. The assistant needs local file access and command execution. Browser, search, email, and document-reading capabilities are optional and vary by host.

This release verifies the local helper and dashboard workflow. It does not certify every assistant integration or automatically connect accounts. Browsing and correspondence depend on the tools available in the user's chosen assistant.

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

There are no npm dependencies and no install step. `npm run package` produces a versioned ZIP under `release/` from an explicit source allowlist, a fresh empty personal workspace, and newly generated fictional examples. It excludes existing personal data, credentials, test output, and backups.

See `docs/COMMANDS.md` for commands, `docs/ARCHITECTURE.md` for storage contracts, and `docs/QA.md` for verification and current limitations. MIT licensed.

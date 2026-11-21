# Next Role

A portable, agent-operated job-search workspace. Bring your own AI assistant; keep your experience, opportunities, applications, and interview preparation in ordinary local files.

The assistant does the research and writing. The HTML dashboard gives you a calm place to see the results. It contains no chatbot, AI subscription, or built-in job scraper.

You always submit your own applications. When you ask to apply, your assistant prepares the materials and stops before the final click or email send. Tell it once you've submitted so it can record the application.

## Quick start

For the desktop dashboard, download the Windows executable or the universal Mac ZIP from [GitHub Releases](https://github.com/d93ben/next-role/releases). On Windows, put `NextRole.exe` in a writable folder and double-click it. On Mac, unzip the archive, open `Next Role.app`, and choose a folder for your records. A Mac artifact labeled **preview** is ad-hoc signed and has no Apple notarization. The desktop dashboard includes its runtime and works without a server. Click a star to save a favorite or use **Career profile** to add a note. Changes from your AI assistant appear automatically after a save.

Use **File → Show workspace folder** to locate your records. Move that entire folder when switching computers, then use **File → Open another workspace** on the other device. Replacing the executable or app bundle preserves the records. AI chat, live job searches, and mail connections still run in your chosen assistant.

Give your AI assistant the GitHub link and this prompt.

> Set up https://github.com/d93ben/next-role in a local folder, read START-HERE.md, and help me start my job search. Ask me what career materials I’d like to share in this chat.

Drag any career materials into that chat. A current or past résumé, a past cover letter, a commendation, a performance review, a LinkedIn export, or a work sample is enough. You can also paste your LinkedIn profile text or describe a recent role. Ask the assistant to find jobs, save favorites, record updates, or prepare you for an interview.

To browse a packaged release, extract the ZIP and open **workspace/dashboard.html**. On Windows, **Start Next Role.cmd** also opens the file. On macOS or Linux, use **sh start.sh**. Viewing the prebuilt dashboard requires only a browser. A source checkout needs a first build. The launcher can use an existing Node 20+ runtime or download a checksum-verified portable runtime into the project for the helpers.

Your assistant recommends roles from your materials and uses the location on your résumé as your starting search area. If you give a pay target without a currency, it uses the local currency for that search area. You can specify a different area or currency at any time.

## What is included

- A searchable applications table with status, favorites, filters, next steps, and direct original-listing links. The dark interface uses bright text and distinct status colors. Each row opens a full-page job view with a right sidebar for links, submitted materials, prepared files, and emails.
- A career profile that displays original notes saved through chat.
- Original answers, source-backed career facts, preferences, open questions, and indexed input files.
- A separate record for every opportunity, including a saved listing, fit explanation, gaps, notes, next actions, dates, and activity history.
- An evidence match percentage for assessed roles, with a per-criterion breakdown, a highest-match sort, and scores in the assistant's search summaries.
- One current tailored résumé per role, with a submission-ready `firstname_lastname_company.pdf`, an editable DOCX and supporting files. To reuse a layout, upload it and say “use this as my template.” An upload alone is treated as career material. Next Role edits a copy of a selected DOCX and exports its PDF in the background. The desktop edition includes the renderer. The source and HTML editions can use a locally installed Chrome, Edge or Chromium. Fonts and complex layouts can affect pagination, so the assistant checks the exported PDF before delivery.
- Import existing PDF, DOCX, HTML, Markdown, or text application documents; archive the exact submitted resume and selected attachments.
- An interview coach in your assistant chat that researches employer guides and candidate reports, builds answers from your experience, and runs one-question-at-a-time mock interviews with feedback. Try “Research questions for [role] at [company] and coach me through a mock interview.”
- Correspondence records and unsent reply drafts, supplied through the assistant's email tools or pasted messages.
- AGENTS.md operating rules, a MEMORY.md navigation guide, generated workspace indexes, a short session handoff, guided workflows, validation, and backups.

## How the dashboard works

The agent saves local records and regenerates the HTML after each update. Refresh an open tab to see the latest jobs, favorites, notes, and documents.

After a job search, the assistant offers to check job-related email from the past three months or a date range you specify. Accept in chat to receive a summary of recruiter outreach, application updates, and deadlines.

Click a document card under **Prepared files** or **Submitted materials** to preview it. Word and PDF source files also open in the preview from **Career profile**. The browser renders Word text, formatting, lists and tables locally. Complex Word layouts and page breaks can differ from the original. PDF uses your browser's built-in viewer. Use **Download** to keep the original file. In a dashboard opened directly from disk, generated resumes can use their printable HTML, and standalone Word files can be selected in the preview.

Developers can run the optional local server with `npm run live` for live refresh and the legacy favorite and note controls.

## Assistant compatibility

Shared instructions live in `AGENTS.md`; `CLAUDE.md` imports them, and `.github/copilot-instructions.md` points to them. Other hosts can start by explicitly reading `START-HERE.md`. Instruction discovery depends on the host and configuration. The assistant needs local file access and command execution. Browser, search, email, and document-reading capabilities are optional and vary by host.

This release verifies the local helper and dashboard workflow. It does not certify every assistant integration or automatically connect accounts. Browsing and correspondence depend on the tools available in the user's chosen assistant.

## Your data

`workspace/` is personal and excluded from Git. The app makes no external network requests, stores no AI credentials, and does not send email or submit applications by itself. Your chosen assistant may send the material it reads to its own provider; local file storage is not a promise of offline AI processing.

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

The HTML release and workspace helpers use Node's standard library. The desktop build tools are development dependencies. To build the portable Windows executable or universal Mac ZIP, install the development dependencies and run `npm run desktop:win` on Windows or `npm run desktop:mac` on macOS. Desktop build output goes to `release/desktop/`. The GitHub workflow tests the packaged application on each OS before publishing. `npm run package` continues to produce the HTML ZIP with a clean workspace and fictional examples.

See `docs/COMMANDS.md` for commands, `docs/ARCHITECTURE.md` for storage contracts, and `docs/QA.md` for verification and current limitations. MIT licensed.

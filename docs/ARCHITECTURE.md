# Architecture and recovery

## Boundaries

The agent host owns conversation, search, reasoning, connected tools, and authorization for external actions. Next Role supplies instructions, a durable record format, validation/helpers, resume rendering, and a local dashboard. There is no embedded model runtime, task runner, cloud database, or email sender.

The agent performs work → helpers save records → helpers validate and rebuild → the dashboard refreshes. Users filter, browse, inspect, open documents, star opportunities, and save raw career notes in the dashboard. They request work in their IDE/host.

## Records (schema version 1)

```text
workspace/
  workspace.json                 schema version, workspace ID, demo flag
  memory.json                    concise handoff: focus, decisions, next steps
  INDEX.md / index.json           generated navigation and pending-work index
  input/                         original material
  profile/
    profile.json                 contact, preferences, skills, education
    answers.json                 append-only original responses/corrections
    brain-dump.json               original career notes and processing links
    experiences.json             current source-backed experience facts
    questions.json               open/deferred questions
    intake.json                  source metadata, hashes, extracted text
  applications/
    job_<id>/
      application.json           listing, status, favorite, documents, research,
                                 messages, notes, submission, history
      documents/                 versioned drafts/imported documents
      submitted/submission_<id>/ exact selected files with stored hashes
  .backups/                      previous versions of changed record files
  dashboard.html                 generated, self-contained display snapshot
  dashboard-version.json         local live-preview refresh marker
```

Each job's listing text is embedded in its application record rather than a second editable listing file. The original URL and captured date accompany it. Application IDs are stable and independent of employer name. No browser storage is authoritative: sessionStorage keeps view/filter preferences and an unsaved note draft. A note is durable only after the server confirms saving it.

Source references link experience to original answers, brain-dump notes, or input versions. Input changes create new source IDs while retaining historical source metadata/text. Resume JSON captures the profile and selected facts at generation time, so later experience edits do not rewrite earlier resumes. Submission files are separate byte copies; validation detects missing files or hash changes.

## Writes and validation

CLI mutations take an exclusive .write.lock, validate the payload, save with a temporary file plus rename, retain previous JSON under .backups, validate the workspace, and rebuild its display. Locks reject simultaneous writers rather than silently interleaving edits. Mutations spanning multiple files are not database transactions: a crash can leave unreferenced generated documents, but existing record files are atomically replaced. Unique submission archive paths make a retry possible if copying was interrupted before the record was committed.

Payload validation lives in scripts/lib.mjs. It checks required fields, dates, allowed URL schemes, relative managed paths, referenced IDs, statuses, document existence, and submission hashes. This does not prove factual correctness, verify a live job is still open, or guarantee an external submission happened. Agents must check source material and record actual evidence.

## Dashboard writes and portable memory

The local server binds to loopback and accepts only two write operations: set a favorite and append a brain-dump note. POST requests require the exact same Origin, JSON content type, and a per-process token obtained from the local session endpoint. There is no CORS allowance, arbitrary command execution, generic file-write endpoint, or email/submission action. A note request ID prevents a network retry from creating duplicate notes. Both operations use the same workspace lock, validators, backups, index generation, and rebuild as CLI writes.

Root AGENTS.md is the operating contract; MEMORY.md maps destinations; each workspace has a generated INDEX.md/index.json and agent-maintained memory.json handoff. Every build regenerates the indexes from canonical records. These files let a new agent session resume without relying on host chat history. Schema 1 workspaces without the new optional fields load with empty notes/memory and unstarred jobs; build adds missing files without changing prior records.

## Recovery

1. Stop the writer before restoring anything. Copy the entire workspace to a backup location.
2. If a lock remains after a crash, inspect its PID and confirm no updater is running before removing only that lock file.
3. For a broken JSON file, find its previous version under .backups with the same relative path and a timestamp suffix. Restore a complete, appropriate version. Check any related records if a multi-step task was interrupted.
4. Run validate, then build. Generated dashboard files can always be rebuilt from canonical records.
5. If submitted hash validation fails, investigate the changed/missing archived file. Restore the original bytes from a known backup. Do not rewrite the stored hash to conceal a change.

Automatic backups are local and currently retained indefinitely. Include input files, document folders, and records in your external backup. Backup pruning, synchronization, and concurrent multi-user editing are outside version 1.

## Distribution

The release script uses an explicit allowlist of application source and documentation. It creates a new empty personal workspace and generates a new fictional demo inside a staging folder. It never copies the developer's personal workspace or credentials. The ZIP contains ready-to-view dashboards as well as source, instructions, and tests. Staging is under ignored release/.

## Intentional limits

- File reading, browser research, email connections, and submission depend on the host. Basic capability fallback is described in the workflows; this is not a universal plugin installer.
- TXT/MD/CSV/JSON input text is indexed directly. Rich documents require extraction through the agent's available tools.
- Native resume export is HTML and TXT with an evidence JSON snapshot. PDF uses the browser print flow; DOCX/PDF from other tools can be imported.
- No automated account login, background search schedule, ranking algorithm, or mass application service is included.
- Dashboard writes are limited to favorites and original career notes. Agent task controls are absent. A static HTML file supports viewing only.
- Core records are local; the user's chosen AI provider may process records the agent reads.

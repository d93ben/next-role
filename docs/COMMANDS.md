# Agent command reference

Run commands from the project root. `workspace/` is the default data directory. Use `--workspace PATH` to select another directory. Keep demo operations in the demo workspace.

If Node.js 20 or newer is unavailable, replace `node` in the examples with `scripts\run-node.cmd` on Windows or `sh scripts/run-node.sh` on macOS and Linux. The wrapper checks for a project-local runtime, then a compatible system Node, then downloads the pinned runtime if required. The first download uses the official Node.js distribution and the checksums in `scripts/node-runtime.txt`.

```text
node scripts/career.mjs init
node scripts/career.mjs status
node scripts/career.mjs intake
node scripts/career.mjs validate
node scripts/career.mjs build
```

`init` preserves existing records. `status` returns profile, job IDs, favorites, next actions, unresolved questions, pending notes, the handoff, index location, and source metadata. `intake` indexes files under input, preserving old source records when files change. Every successful mutation rebuilds the indexes and dashboard. JSON is printed to stdout; failures return a nonzero exit code with the reason. Writes are serialized with a workspace lock.

Mutation payloads are UTF-8 JSON files. Put personal payload files in `workspace/` so they are not committed. `--file -` reads JSON from stdin. Use files rather than complex shell quoting. Sample shapes in `templates/` contain placeholders, not usable personal data.

## Profile and conversation

```text
node scripts/career.mjs profile set --file workspace/profile-update.json
node scripts/career.mjs question add --file workspace/question.json
node scripts/career.mjs answer add --file workspace/answer.json
node scripts/career.mjs question update --file workspace/question-update.json
node scripts/career.mjs experience add --file workspace/experience.json
node scripts/career.mjs experience update --file workspace/experience-update.json
node scripts/career.mjs intake extract --file workspace/extraction.json
```

- **profile set:** partial update. Supports `name`, `headline`, `location`, `email`, `phone`, `website`, `summary`, `skills` (string array), `education` (objects with institution/qualification/date), and `preferences`. Preferences supports arrays `roles`, `locations`, `priorities` and strings `work_style`, `salary`. Unspecified fields stay unchanged.
- **question add:** `question`, `why`, optional `job_id`. The helper returns its ID.
- **answer add:** required `question` and `response`; optional `question_id` resolves a saved question. Optional `supersedes` points to an older answer corrected by this one. Answers are appended, not overwritten. Saving a new answer does not automatically rewrite factual experience records; the agent must reconcile them.
- **question update:** `{ "id": "question_…", "status": "deferred" }` or status `open`. Answered status is derived from saved answers, avoiding a separate inconsistent flag.
- **experience add:** company/project, actual title, period, optional context, `source_refs`, and accomplishments. Every accomplishment contains `text`, optional stable `id`, `source_refs` (defaults to experience sources), and `evidence_type` (`user_reported` or `documented`). References must identify an existing answer, brain-dump note, or indexed source.
- **experience update:** the same complete experience payload plus its `id`. Preserve IDs for unchanged facts. Current facts may change; old resume snapshots and submitted documents do not.
- **intake extract:** `{ "source_id": "source_…", "text": "actual extracted text", "method": "actual tool or reader used" }`. This saves externally extracted text; it does not itself parse PDFs or images.

Use questions for unconfirmed ideas. The program validates structure and references, not whether a person is telling the truth or whether a rewritten sentence is semantically supported. That review belongs to the agent and user.

## Jobs and status

```text
node scripts/career.mjs job add --file workspace/job.json
node scripts/career.mjs job shortlist --since "<UTC timestamp at start of final checks>"
node scripts/career.mjs job update --id job_… --file workspace/job-update.json
node scripts/career.mjs note add --id job_… --file workspace/note.json
```

**job add** requires `company`, `title`, and actual `listing_text`. Supply the original `url` when known. Optional fields: location, work_style, salary, summary, requirements/matches/gaps arrays, next_action, next_action_date. Initial status is `saved` or `queued`; queued requires the user's actual `user_request`. `requested_action` records intent, such as `apply`. Canonical URLs are deduplicated after removing common tracking parameters; query parameters that identify a posting remain intact.

**job update** supports status, location, work_style, salary, summary, requested_action, user_request, next_action, next_action_date, requirements/matches/gaps, `fit_assessment`, and optional `change_note`. Unknown fields are not persisted. Core listing/title/employer identity is preserved; create a distinct record for a distinct posting.

Both commands accept a `fit_assessment` array. Each item has a distinct `requirement`, `priority` of `required` or `preferred`, a `status` of `direct`, `partial`, `gap`, or `unknown`, and a short `reason`. Direct and partial credit require `evidence_refs` containing saved experience, fact, source, answer, or career-note IDs. Passing an empty array clears the assessment. The saved assessment includes its criteria, `percent`, and `assessed_at`. The status and index summaries expose `match_percent` when assessed. Required items weigh twice as much as preferred items. Direct and partial evidence earn full and half credit, respectively.

Both commands accept a `listing_verification` object with `status` (`open`, `closed`, or `unverified`) and a `detail` describing what the agent saw. Supply `posting_url` for an open or closed result and `apply_url` for an open result. Use the same URL for an inline application form. The helper stamps `checked_at`, stores the latest check separately from application status, and exposes the check in `status`. The assistant performs the live check using the workflow in `workflows/job-search.md`.

`job shortlist` returns only saved openings with an `open` check recorded at or after `--since`. Use the UTC timestamp emitted by `new Date().toISOString()` immediately before the final availability pass. Older checks, closed or unverified listings, jobs with no check, and demo records are excluded.

Statuses: saved → queued → preparing → ready → applied → interview → offer; rejected and withdrawn are terminal display groups. Status changes are explicit, not inferred from drafts or messages. `ready` requires a resume. Applied/interview/offer/rejected require recorded submission evidence. Use withdrawn for a saved opportunity the user decides not to pursue. To record an already-applied job, save its listing, import its actual submitted resume, and record the user's report.

**note add:** `{ "text": "the note" }`. A note and application-history event are saved.

## Resume and documents

```text
node scripts/career.mjs resume create --id job_… --file workspace/resume.json
node scripts/career.mjs document add --id job_… --file workspace/document.json
node scripts/career.mjs submission record --id job_… --file workspace/submission.json
```

**resume create** generates a named submission PDF, editable DOCX, printable HTML, text and an evidence snapshot. Select existing skills and experience IDs and include supporting fact IDs for each bullet. Optional bullet fields are `rationale` and `source_excerpt` with `source_id` and an exact `quote`. Each successful revision becomes the sole current AI resume for that job. Older generated working files go into local recovery backups. Prior entries are collapsed when displaying older workspaces. Uploaded originals, other roles, and submitted copies are retained.

The primary filename uses lowercase given name, family name, and company separated by underscores. Set `given_name` and `family_name` via `profile set` for compound names or a different display order. The fallback uses the first and last words in the profile's display name. A single name appears once.

Supply a checked `pdf_path` to use a template-rendered or externally rendered PDF as the primary file. Supply its `docx_path` for a matching editable file. The default PDF uses standard Western fonts. Use the host's document renderer with suitable fonts for other scripts. If `cleanup_pending` is positive, a prior working file was locked. The next revision retries its cleanup.

The first template can be selected with `profile set` and `{"resume_template_path":"templates/first.docx"}`. Store originals under distinct filenames in `workspace/templates/`. A saved template applies across roles and sessions and suppresses `offer_template_in_chat`. If the helper offers the invitation and you deliver it in chat, record `{"resume_template_offered":true}` once. Leave template fields out of routine profile and intake updates.

When the user asks to use a different template, send both paths in one update, for example `{"replaces_resume_template_path":"templates/first.docx","resume_template_path":"templates/new.docx"}`. The helper checks that the old path is still current. For an explicit return to the default layout, use the same update with an empty new path. A change of role or a new file attachment alone keeps the current selection.

**document add:** `kind` is resume, cover_letter, or other; `source_path` is an existing file; `title`; optional `tailoring_notes`. Supports PDF/DOCX/TXT/MD/HTML. Copies the exact file into the job's documents folder. Used for externally prepared documents, exported PDFs, and applications submitted before starting this workspace. Import only trusted documents; HTML documents may contain active content.

**submission record:** `resume_id`, optional `attachment_ids` (document IDs for cover letters or other attachments), `evidence_type` (`user_reported` or `observed_confirmation`), nonempty `evidence`, optional ISO date/time `at`, next_action, next_action_date. Copies the selected files into a unique submitted archive, computes SHA-256 hashes, records evidence, and marks applied. It never sends an application. A second submission record is rejected to protect the original archive. If a reapplication is a genuinely distinct attempt, create a new opportunity with a distinct listing identity and note its relationship to the prior attempt.

New submission records archive a single PDF resume, plus the explicitly selected supporting documents. The archived PDF uses the candidate/company filename. Historical submission archives retain their original bytes and formats. To record a PDF that was edited or rendered elsewhere, import the actual file and select its document ID.

## Research and correspondence

```text
node scripts/career.mjs research add --id job_… --file workspace/research.json
node scripts/career.mjs message add --id job_… --file workspace/message.json
```

**research add:** kind company/reported_question/predicted_question; title; content; optional answer_outline and existing experience_ids. Company and reported_question records require `url` and `source_name`. Add source_date and role_context when known. `checked_at` records when it was saved. Predicted questions may omit a source but must not imply a reported interview.

**message add:** direction inbound/outbound/draft; subject; contact; body; source; optional original email URL `url`, ISO date/time at, external_id, next_action, due_date. Repeated nonempty external IDs in the same application are rejected. Message recording does not send email or change the job's status/next action. Update the application explicitly when necessary. A draft remains a draft even when another outbound message is later recorded; both are historical records.

## Favorites, career notes, and memory

```text
node scripts/career.mjs favorite set --id job_… --file workspace/favorite.json
node scripts/career.mjs brain-dump add --file workspace/thought.json
node scripts/career.mjs brain-dump update --file workspace/thought-update.json
node scripts/career.mjs memory set --file workspace/handoff.json
```

- **favorite set:** `{ "favorite": true }` or false. Repeating the same value is harmless. A star does not change application status or authorize submission. `job add` also accepts an optional boolean favorite.
- **brain-dump add:** required `text`; optional `title`, and `request_id` for retry-safe saving. Original text is retained. The same request ID and content return the existing note; different content with that ID is rejected.
- **brain-dump update:** `id`, `status` unprocessed/processed, optional `experience_ids` array and `processing_note`. A processed note requires linked experiences or an explanation of where its information went. This does not rewrite original text. Experience source_refs may use a brain-dump note ID.
- **memory set:** partial update with strings `summary`, `current_focus`, and string arrays `decisions`, `next_steps`. Keep this short and current; factual records and original sources remain authoritative. Arrays supplied replace their previous values.

## Rebuild and refresh

`build` validates records and writes INDEX.md, index.json, dashboard.html, and dashboard-version.json. The launcher, `npm start`, and `npm run open` open a standalone file. For the optional foreground server, use `npm run live`. Directly opened HTML files are view-only snapshots and can be manually reloaded after a build.

The server accepts GET/HEAD and a restricted POST endpoint for favorites and brain-dump notes, with same-origin/token checks. It binds to loopback, blocks dot-directories and escaping paths, and never executes agent tasks. It is a local personal app, not a hosted multi-user service.

# Verification and release notes

Version 1.1.1 was developed on Windows with Node.js 24 and checked on November 2, 2026 (America/Los_Angeles).

The 1.1.1 visual update adds a charcoal theme, subtle translucent header, larger type, vivid status labels, and direct `View job` links in application rows. All 22 existing tests pass. The table and correspondence view were visually checked; a listing link opened the saved source URL in a separate tab without changing the applications route. Demo URLs remain fictional examples. Table and profile layouts were checked in a 390px iframe with no document-level horizontal overflow. Calculated contrast for the primary table text, secondary text, headings, links, and status text/background pairs ranged from 7.52:1 to 14.84:1; this is a palette check, not a complete accessibility audit.

## Automated workflow coverage

The Node test suite covers:

- Repeatable initialization and state read by a fresh process.
- Saved answers, question resolution, and correction history.
- Required evidence references and retained source versions when inputs change.
- Rich-document intake that stays pending until actual extraction is supplied.
- Canonical listing deduplication without removing job-identifying parameters.
- Invalid application transitions and unsupported resume facts/skills.
- Resume generation, readiness, recorded submission, and interview progression.
- Submitted archives remaining unchanged after later profile/resume updates.
- Detection of tampered archived documents.
- Exact imported resume and cover-letter bytes in submission archives.
- Research provenance requirements and distinct predicted questions.
- Correspondence deduplication and drafts remaining unsent.
- Escaped embedded dashboard data, absence of agent task controls, and refresh markers.
- Workspace traversal rejection, writer locks, and backup creation.
- CLI payload paths containing spaces.
- Chat-first setup, including a single personal dashboard and a handoff that advances after intake.
- ZIP content/CRC and Unicode filename handling.
- Preview-path handling, including encoded traversal and private directories.
- Favorites persisted across a fresh process without changing application status; repeated star writes are idempotent.
- Career notes preserved as sources, retry deduplication, processed-experience links, and generated pending-note indexes.
- Memory handoffs, resolved questions, and generated navigation remaining consistent.
- Backward compatibility with schema 1 records missing favorites, brain-dump files, or memory.
- HTTP writes requiring the correct origin, token, JSON content type, allowed workspace, and allowed action. Requests targeting the former demo route are rejected.

Run `npm test` for the current result. `validate` separately checks the personal workspace.

## Browser checks

The working local dashboard was checked in the in-app browser: the applications table, star/unstar actions, favorite filtering, search, status filtering, sorting, full-page job details, and the career profile. The right sidebar displayed separate archived resume, cover letter, and work sample links plus prepared files, research, and correspondence. The submitted resume link opened its actual archived HTML document. Interview practice questions and unsent email drafts retained their labels.

An unsaved brain-dump draft survived a browser reload. Saving it created a real note and index entry in demo files, with no personal-workspace note added. A helper then marked that note processed and linked it to existing experience; automatic refresh displayed the change while preserving the original note text. A star survived a reload and the Favorites filter showed the expected three rows; the extra test star was subsequently removed.

A 390px iframe was used for responsive inspection: the table scrolls within its panel, and both table and full-page details had matching document/client widths (375px after the scrollbar). No browser warnings or errors were recorded during these checks. The launch helper started a hidden local server on a separate port and reused it on the second call; the owned test server was then stopped. This check used `--no-open` to avoid opening a second system browser.

## Release checks

The package includes one clean personal workspace, source, workflows, memory instructions, and tests. Release verification checks the ZIP CRCs, confirms no personal profile/jobs, browser-test notes, server logs, or backups are included, extracts into a fresh location, and runs validation/tests there.

## Scope of verification

The data/document/dashboard path is exercised with fictional inputs. No real job applications or emails were sent. Real web research, account access, and document extraction depend on the chosen agent host. The user performs the final application submission. Cross-host instructions are supplied, but Claude Code, Cursor, and VS Code integrations were not each independently run. Windows is the executed platform; the macOS/Linux launcher is supplied but not executed here. HTML/TXT resume generation was tested; an actual saved PDF or DOCX is not claimed.

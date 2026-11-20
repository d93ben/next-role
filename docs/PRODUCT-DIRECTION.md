# Next Role product direction

## The user works in chat

Next Role is an agent-operated job search. The user asks their AI assistant to set up a career profile, find and verify jobs, save favorites, take notes, tailor résumés, and prepare for interviews. The assistant saves results in the local workspace and tells the user what changed and where to find it.

The user personally submits every application. The assistant can prepare a form or an application email, then hands it back with the exact files and remaining action. Even a request to submit ends at that handoff. The application stays ready until the user reports submitting or the assistant observes a matching receipt.

## First-time setup

The assistant invites the user to drop career files into the chat. A résumé, LinkedIn export, or work sample is enough to start. The user can also begin by describing their experience in a message.

> Drag and drop your résumé, LinkedIn export, or work samples into this chat. If you have nothing handy, tell me about your most recent role and what you want to do next.

When the host can access the original attachments and write local files, the assistant saves them under `workspace/input/` and indexes them with the existing intake helper. If the host cannot access the attachment, the assistant asks for pasted text or offers `workspace/input/` as the file-manager fallback. The assistant confirms which materials it actually saved and was able to review.

## The dashboard shows saved work

- The default entry point is `workspace/dashboard.html`, opened directly in a browser. Opening a prebuilt dashboard should work without a localhost server or a Node installation.
- Keep search, filters, job details, match explanations, and résumé and document access in the dashboard. Handle file intake, favorites, notes, and other record changes through the assistant in chat. The draft dashboard upload field is outside the planned onboarding flow.
- The workspace helpers regenerate the HTML after saving records. An already-open standalone tab needs a refresh. When the assistant can control that browser, it can reload the tab after the update.
- Keep the existing helpers for local records, validation, and document generation. Those helpers currently need Node 20 or newer. Use an existing or portable runtime for agent setup when needed.

## Distribution

The preferred download is a GitHub Release ZIP with a clean, prebuilt personal dashboard and a separate fictional demo. A user should be able to extract it and open the dashboard with a double-click. A source checkout can have its dashboard built by the assistant during setup. Release packaging uses fresh records and demo data.

The local server is outside the default setup. Its eventual retirement is an implementation decision. Electron is deferred. Revisit it if a desktop-only capability becomes necessary for the chat-first workflow.

## Change history

| Date | Change | Status |
| --- | --- | --- |
| 2026-11-02 | The earliest packaged release combined a standalone HTML dashboard with Node helpers and a localhost server. | Released in v1.0.0 |
| 2026-11-18 | The launcher gained a folder-local Node download option so setup could use a portable runtime. | Existing implementation |
| 2026-11-19 | After two localhost timeout reports, direct HTML became the preferred dashboard entry point. An Electron wrapper was discussed and deferred. | Product direction |
| 2026-11-19 | The user chose chat as the main interface and chat attachments as the preferred way to add files. A dashboard drop zone was drafted locally before work paused. | Product direction. Dashboard draft untested and unshipped. |
| 2026-11-19 | Implemented standalone HTML startup and chat attachment onboarding. Removed the dashboard intake draft. | Included in the local 1.2.0 package. |
| 2026-11-19 | Added an optional post-search email review for the last three calendar months, a single date, or a custom range. The assistant waits for the user's request before reading mail. | Included in the local 1.2.0 package. |
| 2026-11-19 | Each role now has one current generated resume. Submission uses a named PDF and preserves the exact copy sent. The assistant offers a reusable template with the first resume. The workspace index shows both resume links and template state. | Included in the local 1.3.0 package. |
| 2026-11-19 | Made the final submission a user action for every application, including one-click forms and application emails. | Included in v1.3.1. |

Append a dated row when a product decision changes or ships. Record the reason and distinguish agreed direction, local drafts, and released behavior.

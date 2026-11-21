# Next Role product direction

## The user works in chat

Next Role is an agent-operated job search. The user asks their AI assistant to set up a career profile, find and verify jobs, save favorites, take notes, tailor résumés, and prepare for interviews. The assistant saves results in the local workspace and tells the user what changed and where to find it.

The user personally submits every application. The assistant can prepare a form or an application email, then hands it back with the exact files and remaining action. Even a request to submit ends at that handoff. The application stays ready until the user reports submitting or the assistant observes a matching receipt.

## First-time setup

The assistant invites the user to drop career files into the chat. A résumé, LinkedIn export, or work sample is enough to start. The user can also begin by describing their experience in a message.

> Drag and drop your résumé, LinkedIn export, or work samples into this chat. If you have nothing handy, tell me about your most recent role and what you want to do next.

When the host can access the original attachments and write local files, the assistant saves them under `workspace/input/` and indexes them with the existing intake helper. If the host cannot access the attachment, the assistant asks the user to paste the text in chat. The assistant confirms which materials it actually saved and was able to review.

The user's résumé template is a workspace-wide preference. The assistant reuses it automatically for each role and revision. The first résumé delivery includes a template invitation only when the user has neither supplied a template nor received the invitation. Later uploads become the active template only when the user asks to switch.

## The dashboard shows saved work

- The HTML distribution opens `workspace/dashboard.html` directly in a browser. Opening a prebuilt dashboard should work without a localhost server or a Node installation.
- Keep search, filters, job details, match explanations, and résumé and document access in the dashboard. Handle file intake and career workflows through the assistant in chat. Favorites and notes can also be saved directly in the desktop app. The draft dashboard upload field is outside the planned onboarding flow.
- The workspace helpers regenerate the HTML after saving records. An already-open standalone tab needs a refresh. When the assistant can control that browser, it can reload the tab after the update.
- Keep the existing helpers for local records, validation, and document generation. Those helpers currently need Node 20 or newer. Use an existing or portable runtime for agent setup when needed.

## Distribution

Each distribution opens one personal dashboard. The HTML ZIP includes a prebuilt dashboard that opens with a double-click. For a source checkout, the assistant builds it during setup. Release packaging starts from an empty personal workspace.

Offer portable Windows and Mac apps for users who want automatic refresh, favorites, and notes directly in the dashboard. Bundle the runtime and keep a movable workspace outside the executable or app bundle. Preserve the standalone HTML ZIP for browser viewing. Searches, file intake, and application preparation stay in chat.

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
| 2026-11-19 | Made template reuse explicit across roles and sessions. A supplied template suppresses the invitation. Changing the saved template requires the user to choose a replacement. | Included in v1.3.2. |
| 2026-11-20 | Added Windows portable and universal Mac desktop builds, direct favorites and career notes, automatic refresh, and a bundled agent CLI. A shared workspace can move between platforms. | v1.4.0 desktop build. Apple notarization requires publisher credentials. |
| 2026-11-20 | A first-time user was told to copy files into a folder and was shown a second dashboard. First setup now opens one personal dashboard and asks for career materials in the same chat. The assistant files the attachments. | v1.4.1 |

Append a dated row when a product decision changes or ships. Record the reason and distinguish agreed direction, local drafts, and released behavior.

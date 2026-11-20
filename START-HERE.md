# Start your next chapter

Open this folder in an AI assistant with permission to read and write project files. Tell it:

> Read START-HERE.md and help me start my job search. Review the materials in workspace/input and suggest a search profile I can confirm or edit.

You can start with an old resume, a few notes, or nothing at all.

## For the person using Next Role

1. Open the extracted project folder in your AI assistant and use the starter prompt above.
2. Drag your résumé, LinkedIn export, or work samples into the chat. You can also tell the assistant about a recent role. Ask it to save notes, star jobs, or update applications as you go.
3. Open **workspace/dashboard.html** to browse the results. Refresh it after the assistant updates your records.
4. When you ask to apply, the assistant prepares the materials and stops before submission. Review the application and click **Submit** yourself, or send the draft email if the employer accepts applications by email.

Open **demo/dashboard.html** to explore the fictional search.

Try saying:

- “Help me figure out what roles fit my experience.”
- “Find remote operations roles that match my preferences.”
- “Add this job to my shortlist: [paste the listing or URL].”
- “Prepare a resume for the Canopy role.”
- “I submitted that resume today. Record the application.”
- "Research interview questions for [role] at [company]. My next round is [stage]."
- "Coach my answer to this question: [question and answer]."
- "Run a mock interview for [role]. Ask one question at a time and give feedback after I answer."
- “Here is a recruiter email. Save it to the right application and help me draft a reply.”

## For the assistant

For setup from a GitHub link, clone the repository or download and extract its source ZIP into a writable folder on the user's computer. Start there. Read `AGENTS.md`, `MEMORY.md`, and the generated `workspace/INDEX.md` if present. Open the generated workspace/dashboard.html directly when showing results. Reload an existing dashboard tab when available or give the user the file location and a refresh instruction. Verify the workspace with `node scripts/career.mjs status`, or use `scripts\run-node.cmd scripts/career.mjs status` on Windows and `sh scripts/run-node.sh scripts/career.mjs status` on macOS/Linux when `node` is unavailable. The wrappers retrieve the folder-local runtime when needed. Initialize only if needed. Read the relevant workflow and use the saved records before asking questions already answered. Never replace the user's workspace with demo data.

When you need materials, say “Drop your résumé, LinkedIn export, or work samples into this chat, or tell me about a recent role.” Save accessible original attachments under `workspace/input/`, index them, and report what you could read. If your host cannot save the original, offer pasted text or a file-manager copy to that folder. Continue with any materials already supplied.

For a new or incomplete search profile, follow `workflows/onboarding.md`. Review the available materials, then show one suggested plan covering roles, search area, work arrangement, compensation, and priorities. Ask the user to confirm or edit the plan. Ask a focused follow-up only when missing information materially affects the search or is needed to support an experience claim. Save exact responses with `answer add` before updating records, and use the source IDs returned by the helpers.

If you cannot read files or run Node, explain the missing capability and help the user open the project in a capable host. Do not claim that state was saved when it was only written in chat. If only a particular tool is missing (web/email/document reading), continue with available tools and ask for pasted content as needed.

Full payload reference: `docs/COMMANDS.md`. Architecture and recovery: `docs/ARCHITECTURE.md`.

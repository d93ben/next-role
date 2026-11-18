# Start your next chapter

Open this folder in an AI assistant with permission to read and write project files. Tell it:

> Read START-HERE.md and help me start my job search. Use what is already in my input folder, and interview me about anything important that is missing.

You can start with an old resume, a few notes, or nothing at all.

## For the person using Next Role

1. Open **Start Next Role.cmd** on Windows. On macOS/Linux, run `sh start.sh`. The helpers require Node.js 20 or newer; no package installation or API key is needed.
2. Put career material in **workspace/input**. Keep original resumes, work notes, project descriptions, reviews, and useful examples.
3. Open the project in your assistant and use the starter prompt above.
4. The launcher opens your local dashboard. Browse applications, star favorites, or save rough notes in **Career profile**. Agent updates refresh automatically.

Use **http://127.0.0.1:4317/demo/dashboard.html** to explore the fictional search while the app is running. The HTML files can also be opened directly as view-only snapshots.

Try saying:

- “Help me figure out what roles fit my experience.”
- “Find remote operations roles that match my preferences.”
- “Add this job to my shortlist: [paste the listing or URL].”
- “Prepare a resume for the Canopy role.”
- “I submitted that resume today. Record the application.”
- “Help me practice for my interview using my own experience.”
- “Here is a recruiter email. Save it to the right application and help me draft a reply.”

## For the assistant

Read `AGENTS.md`, `MEMORY.md`, and the generated `workspace/INDEX.md`, then run `node scripts/career.mjs status`. Initialize only if needed. Read the relevant workflow and use the saved records before asking questions already answered. Never replace the user's workspace with demo data.

If no profile exists, follow `workflows/onboarding.md`. Ask one to three useful questions at a time. Save exact responses with `answer add` before extracting claims into experience records. Use source IDs returned by the helpers. A short, accurate profile is enough to begin; improve it when a role reveals a useful gap.

If you cannot read files or run Node, explain the missing capability and help the user open the project in a capable host. Do not claim that state was saved when it was only written in chat. If only a particular tool is missing (web/email/document reading), continue with available tools and ask for pasted content as needed.

Full payload reference: `docs/COMMANDS.md`. Architecture and recovery: `docs/ARCHITECTURE.md`.

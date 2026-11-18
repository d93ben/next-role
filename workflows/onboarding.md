# Guided onboarding

## Review the materials first

1. Read status, the index, the existing profile, open questions, relevant saved answers, and unprocessed brain-dump notes. Resume any pending review and honor preferences that the user already stated. Use note IDs as sources for supported experience and `brain-dump update` to link the resulting records or explain where the information was saved. Preserve the original wording.
2. Run `intake` to index `workspace/input` and read the source material using available tools. TXT/MD/CSV/JSON files can be read directly. For PDF/DOCX/images, use an available reader and save the extracted text with `intake extract`, the source ID, and the actual extraction method. If a needed file is unreadable, request pasted text or a readable export. If the folder was just set up and there is no usable career history yet, invite the user to add a resume, notes, or work examples. If they prefer to start in chat, ask for a brief description of a recent role or project. Use the resulting material before asking about search preferences.

## Propose one search profile

Present the fields together in a short summary. Indicate which details the user already gave you, which are recommendations and why, and which are open. Propose the fields you can support even if some are open.

| Field | How to build the recommendation |
| --- | --- |
| Target roles | Recommend a small, ranked set of role families or titles at the level supported by the user's experience. Explain the connection to specific responsibilities, results, or work samples. Mark a stretch role when useful. |
| Search area | Use an explicit location preference first. Otherwise suggest a starting market from a current city in the materials or recent evidence tying the person to a local worksite. State the clue and ask for confirmation. Treat an employer headquarters, an old location, or conflicting locations as insufficient on their own. Keep the area open when the evidence is weak. |
| Work arrangement | Use a stated preference or suggest a flexible starting search mix if helpful. Prior remote, hybrid, or on-site work can support a suggestion, while the user's current preference still needs confirmation. Avoid inferring commute radius, relocation, or willingness to go on-site from an address. |
| Compensation | Use a stated target. When current, reliable market data for comparable roles and locations is available, you may offer a sourced benchmark and specify the currency and whether it is base or total pay. Keep the user's target or minimum open until they state or explicitly adopt one. |
| Priorities | Reflect stated interests and suggest possible priorities when the user's career notes or projects show a recurring interest. Label these as suggestions and leave the field open where there is little evidence. |

End with one invitation to review the whole plan, such as “Does this look like a good starting point? Tell me what you’d change, or say ‘looks good’ and I’ll use these suggestions.” When an open item materially changes the search, add a focused question for that item. Defer experience questions until there is a specific gap worth clarifying. A resume or work sample that already answers a question is enough to move on.

## Save the review

1. Save the user's exact response with `answer add`. Use `profile set` for preferences the user stated or approved, including suggestions covered by an explicit approval of the plan. Leave open fields and unapproved suggestions out of the saved preferences. A market benchmark stays context unless the user adopts it as a target. Use a saved question or the handoff to carry a pending proposal across sessions. If the user steps away, continue work that can proceed without confirmation.
2. Save supported profile details with `profile set` and role/project facts with `experience add` and their source IDs. Paid work, volunteering, school projects, caregiving logistics, and independent work may be relevant. Label the context accurately and use only supported dates, credentials, and outcomes. When records conflict, ask about the discrepancy. Record corrections as a new answer with `supersedes` and update affected facts while keeping unchanged fact IDs and submitted archives.
3. Save progress with `memory set`, validate, rebuild, and link the dashboard. Include any focused questions still pending. Resume them in a later session. Once the profile is confirmed, start the search if the user already asked for it. When the user is ready to search and has only requested onboarding, give them a concrete reply they can use, such as "Say 'Find matching jobs' and I'll search using this profile."

# Organize correspondence

1. Use an available email connector or browser only within the user's request. Otherwise ask the user to paste or save a message. Never assume email access exists.
2. Identify the exact application by employer, role, contacts, and thread context. If ambiguous, ask before attaching a message to the wrong role.
3. Save relevant message text, contact, subject, actual received/sent date, source, and an external message ID when available with `message add`. Existing external IDs prevent duplicates. Avoid importing unrelated mail or unnecessary sensitive details.
4. Distinguish inbound messages, messages already sent, and unsent drafts. `message add` is a local recording operation; it never sends email. A proposed reply must use direction `draft`.
5. Extract the requested next action and known deadline. Update the job's next action/date when appropriate; don't manufacture deadlines or an interview time. Recording a message does not automatically change application status.
6. Draft a reply when requested. Send only when the user asks and the host permits it; satisfy any required final approval/handoff. After sending, record the actual outbound message and its evidence/source. Never describe a draft as sent.
7. Validate and rebuild. Tell the user what was recorded, what requires their input, and whether any reply is still a draft.

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, init, load, lock, mutate, resume, intake, extracted, build, validate, readJSON, verifiedListings } from './lib.mjs';

const args = process.argv.slice(2); const opts = {}; const words = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--help') words.push('help');
  else if (args[i].startsWith('--')) { const key = args[i].slice(2); if (!['workspace', 'file', 'id', 'since'].includes(key)) throw new Error(`Unknown option --${key}`); if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for --${key}`); opts[key] = args[++i]; }
  else words.push(args[i]);
}
const root = path.resolve(opts.workspace ?? path.join(ROOT, 'workspace'));
const command = words.join(' ');
const help = `Next Role — agent workspace commands (Node 20+)\n\n  init                       Create a personal workspace (preserves existing data)\n  status                     Show saved state and open questions\n  intake                     Index files in workspace/input\n  intake extract --file X    Save text extracted by your assistant\n  profile set --file X       Update name, preferences, skills, education\n  memory set --file X        Save a concise session handoff\n  brain-dump add --file X    Save an original career note\n  brain-dump update --file X Mark a note organized with references\n  favorite set --id ID --file X\n  document add --id ID --file X\n  answer add --file X        Save a user's exact response\n  question add --file X      Track a missing detail\n  question update --file X   Defer/reopen an unanswered question\n  experience add --file X    Save experience with source references\n  experience update --file X Replace an experience; preserve fact IDs when unchanged\n  job add --file X           Save a listing or queue a requested application\n  job update --id ID --file X\n  job shortlist --since UTC  Show openings verified in this search pass\n  resume create --id ID --file X\n  submission record --id ID --file X\n  research add --id ID --file X\n  message add --id ID --file X\n  note add --id ID --file X\n  validate                   Check records, links, and submitted document hashes\n  build                      Rebuild the standalone dashboard\n\nAll writes validate and rebuild the dashboard. --file is a JSON payload.\nUse --file - to read JSON from stdin. --workspace PATH selects another workspace.\nSee docs/COMMANDS.md and templates/ for payload examples.\n`;
try {
  if (!command || ['help', '--help'].includes(command)) { console.log(help); process.exit(0); }
  let result;
  if (command === 'status') {
    const s = load(root); result = { workspace: root, demo: s.meta.demo, profile: s.profile, memory: s.memory, index: path.join(root, 'INDEX.md'), pending_notes: s.brain_dump.filter(n => n.status !== 'processed'), jobs: s.jobs.map(j => ({ id: j.id, company: j.company, title: j.title, status: j.status, favorite: j.favorite, match_percent: j.fit_assessment?.percent ?? null, listing_verification: j.listing_verification ?? null, record: `applications/${j.id}/application.json`, next_action: j.next_action })), questions: s.questions.filter(q => q.status !== 'deferred' && !s.answers.some(a => a.question_id === q.id)), sources: s.intake.map(({ text, ...s }) => s), experience_count: s.experiences.length, answer_count: s.answers.length };
  } else if (command === 'job shortlist') {
    result = verifiedListings(root, opts.since);
  } else if (command === 'validate') result = validate(root);
  else result = lock(root, () => {
    let data;
    if (command === 'init') data = { workspace: root, initialized: Boolean(init(root)) };
    else if (command === 'build') return build(root);
    else if (command === 'intake') data = intake(root).map(({ text, ...s }) => s);
    else {
      if (!opts.file) throw new Error('This command requires --file PATH (or --file - for JSON on stdin).');
      const payload = opts.file === '-' ? JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '')) : readJSON(path.resolve(opts.file));
      if (command === 'resume create') data = resume(root, opts.id, payload);
      else if (command === 'intake extract') data = extracted(root, payload);
      else data = mutate(root, command, payload, opts.id);
    }
    const dashboard = build(root); return { result: data, dashboard: dashboard.dashboard };
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(`Next Role: ${error.message}`); process.exitCode = 1; }

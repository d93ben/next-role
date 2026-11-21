import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { ROOT, init, load, lock, mutate, resume, intake, extracted, build, validate, inside, readJSON } from '../scripts/lib.mjs';
import { runCareer } from '../scripts/cli.mjs';
import { packageApp, zipEntries, crc32 } from '../scripts/package.mjs';
import { resolveRequest } from '../scripts/server-paths.mjs';

function workspace(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'next-role-test-'));t.after(()=>{const resolved=path.resolve(root);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep));assert.match(path.basename(resolved),/^next-role-test-/);fs.rmSync(resolved,{recursive:true,force:true});});init(root);return root;}
function fixture(t){
  const root=workspace(t);
  mutate(root,'profile set',{name:'Jamie Example',headline:'Operations Coordinator',skills:['Excel'],education:[]});
  const answer=mutate(root,'answer add',{question:'What did you improve?',response:'I built a shared tracker used by three supervisors.'});
  const experience=mutate(root,'experience add',{company:'Example Company',title:'Coordinator',period:'2022–2025',source_refs:[answer.id],accomplishments:[{text:'Built a shared tracker used by three supervisors.'}]});
  const job=mutate(root,'job add',{company:'Acme',title:'Coordinator',url:'https://example.com/job/42',listing_text:'Coordinate projects and maintain records.',status:'queued',user_request:'Apply to this role.',next_action:'Prepare resume'});
  const payload={skills:['Excel'],tailoring_notes:'Prioritized coordination.',experiences:[{experience_id:experience.id,bullets:[{text:experience.accomplishments[0].text,fact_ids:[experience.accomplishments[0].id]}]}]};
  return{root,answer,experience,job,payload};
}

test('fresh setup is idempotent and persisted state survives a new process',t=>{
  const {root,job}=fixture(t);const before=load(root);init(root);assert.deepEqual(load(root),before);
  const out=spawnSync(process.execPath,[path.join(ROOT,'scripts/career.mjs'),'status','--workspace',root],{encoding:'utf8'});assert.equal(out.status,0,out.stderr);assert.equal(JSON.parse(out.stdout).jobs[0].id,job.id);
});
test('guided answers resolve a saved question and corrections preserve the original',t=>{
  const root=workspace(t);const q=mutate(root,'question add',{question:'What did you build?',why:'Need a concrete example.'});
  const a=mutate(root,'answer add',{question:q.question,response:'A staffing tracker.',question_id:q.id});
  mutate(root,'answer add',{question:'Correction',response:'A contractor availability tracker.',supersedes:a.id});
  build(root);const html=fs.readFileSync(path.join(root,'dashboard.html'),'utf8');assert.match(html,/"status":"answered"/);assert.equal(load(root).answers[0].response,'A staffing tracker.');assert.equal(load(root).answers.length,2);
  assert.throws(()=>mutate(root,'answer add',{question:'?',response:'x',question_id:'missing'}),/Unknown/);
});
test('sources are required and changed input versions retain provenance',t=>{
  const root=workspace(t);const file=path.join(root,'input','notes.txt');fs.writeFileSync(file,'First version');const first=intake(root)[0];
  mutate(root,'experience add',{company:'Example',title:'Volunteer',period:'2025',source_refs:[first.id],accomplishments:[{text:'Organized a project.'}]});
  fs.writeFileSync(file,'Second version');const next=intake(root)[0];assert.notEqual(next.id,first.id);assert.equal(load(root).intake.find(i=>i.id===first.id).text,'First version');assert.equal(validate(root).ok,true);
  assert.throws(()=>mutate(root,'experience add',{company:'X',title:'Y',period:'Z',source_refs:['invented'],accomplishments:[]}),/Unknown source/);
});
test('rich-document intake is honestly marked until extraction is provided',t=>{
  const root=workspace(t);fs.writeFileSync(path.join(root,'input','resume.pdf'),'PDF test marker');const source=intake(root)[0];assert.equal(source.status,'needs_extraction');assert.equal(source.text,'');
  extracted(root,{source_id:source.id,text:'Actual extracted text',method:'Test reader'});assert.equal(load(root).intake[0].status,'extracted');
});
test('job URL deduplication removes tracking but preserves posting IDs',t=>{
  const {root}=fixture(t);assert.throws(()=>mutate(root,'job add',{company:'Acme',title:'Coordinator',url:'https://example.com/job/42?utm_source=email#top',listing_text:'same'}),/already exists/);
  const j=mutate(root,'job add',{company:'Acme',title:'Second opening',url:'https://example.com/job/42?posting=43',listing_text:'Different posting'});assert.ok(j.id);
});
test('shortlists require a fresh open posting check with an application route', t => {
  const {root, job} = fixture(t);
  const runShortlist = since => spawnSync(process.execPath,
    [path.join(ROOT, 'scripts/career.mjs'), 'job', 'shortlist', '--workspace', root, '--since', since],
    {encoding: 'utf8'});
  const shortlist = since => {
    const output = runShortlist(since);
    assert.equal(output.status, 0, output.stderr);
    return JSON.parse(output.stdout);
  };
  const since = new Date().toISOString();
  assert.deepEqual(shortlist(since), []);
  assert.match(runShortlist('2026-01-01').stderr, /--since must be an ISO UTC timestamp/);

  const posting_url = 'https://careers.example.com/roles/42';
  const apply_url = `${posting_url}/apply`;
  assert.throws(() => mutate(root, 'job update', {listing_verification: {
    status: 'open', posting_url, detail: 'Found an indexed result.'
  }}, job.id), /application URL/);
  const verified = mutate(root, 'job update', {listing_verification: {
    status: 'open', posting_url, apply_url, detail: 'Read the exact posting and opened its form.'
  }}, job.id);
  const [result] = shortlist(since);
  assert.equal(result.id, job.id);
  assert.equal(result.posting_url, posting_url);
  assert.equal(result.apply_url, apply_url);
  assert.equal(verified.url, job.url);
  assert.equal(verified.status, 'queued');
  assert.deepEqual(shortlist(new Date(Date.parse(result.checked_at) + 1).toISOString()), []);

  const blocked = mutate(root, 'job add', {company: 'Example', title: 'Analyst', listing_text: 'Saved description.',
    listing_verification: {status: 'unverified', detail: 'The site blocked access.'}});
  assert.deepEqual(shortlist(since).map(row => row.id), [job.id]);
  mutate(root, 'job update', {listing_verification: {
    status: 'closed', posting_url, detail: 'The posting now says applications are closed.'
  }}, job.id);
  assert.deepEqual(shortlist(since), []);
  assert.equal(load(root).jobs.find(row => row.id === blocked.id).listing_verification.status, 'unverified');
  assert.equal(validate(root).ok, true);
});
test('evidence matches use weighted criteria, reject unsupported credit, and persist across updates', t => {
  const {root, job, experience} = fixture(t);
  const evidence_refs = [experience.accomplishments[0].id];
  const direct = {requirement:'Shared project records', priority:'required', status:'direct', reason:'Built a shared tracker.', evidence_refs};
  const partial = {requirement:'Department-wide reporting', priority:'required', status:'partial', reason:'The tracker was used by three supervisors.', evidence_refs};
  const unknown = {requirement:'Power BI', priority:'preferred', status:'unknown', reason:'No saved evidence for this tool.'};
  assert.equal(job.fit_assessment, undefined);
  assert.throws(() => mutate(root, 'job update', {fit_assessment:[{...direct, evidence_refs:[]}]}, job.id), /Match evidence is required/);
  assert.throws(() => mutate(root, 'job update', {fit_assessment:[{...direct, evidence_refs:['fact_missing']}]}, job.id), /Unknown match evidence reference/);
  assert.throws(() => mutate(root, 'job update', {fit_assessment:[direct, {...direct, requirement:'Shared  Project Records'}]}, job.id), /Repeated match requirement/);

  const assessed = mutate(root, 'job update', {fit_assessment:[direct, partial, unknown]}, job.id);
  assert.equal(assessed.fit_assessment.percent, 60);
  assert.deepEqual(assessed.fit_assessment.criteria[0].evidence_refs, evidence_refs);
  assert.equal(mutate(root, 'job update', {next_action:'Review the listing'}, job.id).fit_assessment.percent, 60);
  build(root);
  assert.equal(readJSON(path.join(root, 'index.json')).applications[0].match_percent, 60);

  const scoredOnAdd = mutate(root, 'job add', {
    company:'Example', title:'Project coordinator', listing_text:'Project records required. Power BI preferred.',
    fit_assessment:[direct, unknown]
  });
  assert.equal(scoredOnAdd.fit_assessment.percent, 67);
  assert.equal(mutate(root, 'job update', {fit_assessment:[]}, job.id).fit_assessment, null);
  const zero = mutate(root, 'job update', {fit_assessment:[{...unknown,status:'gap'}]}, job.id);
  assert.equal(zero.fit_assessment.percent, 0);
  assert.equal(validate(root).ok, true);
});
test('invalid states and invented resume source IDs are rejected',t=>{
  const {root,job,payload}=fixture(t);
  assert.throws(()=>mutate(root,'job update',{status:'applied'},job.id),/Record a submission/);
  assert.throws(()=>mutate(root,'job update',{status:'ready'},job.id),/Create a resume/);
  assert.throws(()=>resume(root,job.id,{...payload,skills:['Unreported skill']}),/already be in the profile/);
  assert.throws(()=>resume(root,job.id,{...payload,experiences:[{experience_id:payload.experiences[0].experience_id,bullets:[{text:'Invented claim',fact_ids:['fact_fake']}]}]}),/must reference a fact/);
  assert.equal(load(root).jobs[0].documents.length,0);
});
test('resume to submission to interview works and submitted bytes remain frozen',t=>{
  const {root,job,payload,experience}=fixture(t);const doc=resume(root,job.id,payload);
  assert.deepEqual(doc.files.map(f => f.format), ['pdf', 'docx', 'html', 'txt', 'json']);
  assert.equal(doc.offer_template_in_chat, true);
  mutate(root,'job update',{status:'ready'},job.id);
  mutate(root,'submission record',{resume_id:doc.id,evidence_type:'user_reported',evidence:'I submitted this version today.'},job.id);
  mutate(root,'job update',{status:'interview'},job.id);
  const submitted=load(root).jobs[0].submission;const archived=inside(root,submitted.files[0].path);const bytes=fs.readFileSync(archived);
  assert.deepEqual(submitted.files.map(f => f.format), ['pdf']);
  assert.equal(path.basename(archived), 'jamie_example_acme.pdf');
  assert.deepEqual(bytes, fs.readFileSync(inside(root, doc.files[0].path)));
  mutate(root,'experience update',{...experience,accomplishments:[{...experience.accomplishments[0],text:'Updated current wording.'}]});
  mutate(root, 'profile set', {resume_template_offered: true});
  const revision = resume(root,job.id,payload);
  assert.equal(revision.offer_template_in_chat, false);
  assert.deepEqual(load(root).jobs[0].documents.map(d => d.id), [revision.id]);
  for (const file of doc.files) assert.equal(fs.existsSync(inside(root, file.path)), false);
  build(root);
  const index = fs.readFileSync(path.join(root,'INDEX.md'), 'utf8');
  assert.ok(index.includes(revision.files[0].path) && index.includes(submitted.files[0].path));
  assert.deepEqual(fs.readFileSync(archived),bytes);assert.equal(validate(root).ok,true);
  assert.throws(()=>mutate(root,'submission record',{resume_id:doc.id,evidence_type:'user_reported',evidence:'Again'},job.id),/already recorded/);
  fs.appendFileSync(archived,'tampered');assert.throws(()=>validate(root),/submitted document was changed/);
});
test('Word output uses supported public wording and keeps the source comparison in the snapshot', t => {
  const {root, job, payload, answer} = fixture(t);
  const bullet = payload.experiences[0].bullets[0];
  bullet.text = 'Built a tracker for planning & coordination.';
  bullet.rationale = 'Emphasizes the role’s coordination requirement.';
  bullet.source_excerpt = {source_id: answer.id, quote: 'invented quotation'};
  assert.throws(() => resume(root, job.id, payload), /source excerpt/);
  bullet.source_excerpt.quote = 'a shared tracker used by three supervisors';
  const doc = resume(root, job.id, payload);
  const file = format => inside(root, doc.files.find(f => f.format === format).path);
  const snapshot = readJSON(file('json'));
  assert.deepEqual(snapshot.experiences[0].bullets[0], bullet);
  const zip = fs.readFileSync(file('docx'));
  const parts = new Map();
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    const size = zip.readUInt32LE(offset + 18);
    const nameEnd = offset + 30 + zip.readUInt16LE(offset + 26);
    const start = nameEnd + zip.readUInt16LE(offset + 28);
    const name = zip.subarray(offset + 30, nameEnd).toString();
    parts.set(name, inflateRawSync(zip.subarray(start, start + size)).toString());
    offset = start + size;
  }
  assert.ok(parts.has('word/styles.xml'));
  const xml = parts.get('word/document.xml');
  assert.match(xml, /Jamie Example/);
  assert.match(xml, /Built a tracker for planning &amp; coordination\./);
  assert.doesNotMatch(xml, /three supervisors|Emphasizes|Prioritized coordination/);
  assert.throws(() => mutate(root, 'submission record', {resume_id: doc.id, resume_format: 'txt', evidence_type: 'user_reported', evidence: 'Text file uploaded.'}, job.id), /PDF/);
});
test('actual imported resume and cover-letter bytes are archived',t=>{
  const {root,job,payload}=fixture(t);const source=path.join(root,'input','actual.pdf');
  const draft=resume(root,job.id,payload);
  const original=fs.readFileSync(inside(root,draft.files[0].path));fs.writeFileSync(source,original);
  mutate(root,'document add',{kind:'resume',source_path:source,title:'Actual PDF'},job.id);
  const cover=path.join(root,'input','letter.txt');fs.writeFileSync(cover,'Exact cover letter');mutate(root,'document add',{kind:'cover_letter',source_path:cover,title:'Letter'},job.id);
  const docs=load(root).jobs[0].documents;mutate(root,'submission record',{resume_id:docs[1].id,attachment_ids:[docs[2].id],evidence_type:'observed_confirmation',evidence:'Confirmation receipt recorded.'},job.id);
  const archived=load(root).jobs[0].submission.files;assert.equal(archived.length,2);assert.deepEqual(fs.readFileSync(inside(root,archived[0].path)),original);assert.equal(validate(root).ok,true);
});
test('custom template uses supplied PDF bytes and keeps the original, even after a failed revision', t => {
  const {root,job,payload} = fixture(t);
  const initial = resume(root, job.id, payload);
  const originalPdf = fs.readFileSync(inside(root, initial.files[0].path));
  fs.mkdirSync(path.join(root, 'templates'), {recursive:true});
  const template = path.join(root, 'templates', 'personal.pdf');
  fs.writeFileSync(template, originalPdf);
  mutate(root, 'profile set', {given_name:'Jamie Lee',family_name:'De Silva',resume_template_path:'templates/personal.pdf'});
  assert.throws(() => resume(root, job.id, payload), /pdf_path/);
  assert.deepEqual(load(root).jobs[0].documents.map(d => d.id), [initial.id]);
  const replacement = resume(root, job.id, {...payload,pdf_path:template});
  assert.equal(replacement.offer_template_in_chat, false);
  assert.equal(path.basename(replacement.files[0].path),'jamie_lee_de_silva_acme.pdf');
  assert.deepEqual(fs.readFileSync(inside(root,replacement.files[0].path)),originalPdf);
  assert.deepEqual(fs.readFileSync(template),originalPdf);
});
test('a template supplied before first delivery persists across roles until explicitly replaced', t => {
  const {root, job, payload} = fixture(t);
  const first = 'templates/original/layout.docx';
  const next = 'templates/replacement/layout.docx';
  for (const relative of [first, next]) {
    const file = inside(root, relative);
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, relative);
  }
  mutate(root, 'profile set', {resume_template_path:first});
  fs.writeFileSync(inside(root, 'input/sample-resume.txt'), 'A reference resume');
  intake(root);
  mutate(root, 'profile set', {headline:'Updated headline'});
  assert.throws(() => mutate(root, 'profile set', {resume_template_path:next}), /replacement/);
  assert.throws(() => mutate(root, 'profile set', {resume_template_path:''}), /replacement/);
  assert.equal(load(root).profile.resume_template_path, first);

  const pdfPath = inside(root, 'input/rendered.pdf');
  fs.writeFileSync(pdfPath, '%PDF-1.4\nRendered test document\n%%EOF\n');
  const secondJob = mutate(root, 'job add', {company:'Other Co',title:'Lead',listing_text:'Other opening'});
  const render = role => resume(root, role.id, {...payload, pdf_path:pdfPath});
  for (const role of [job, secondJob]) {
    assert.throws(() => resume(root, role.id, payload), /saved template/);
    const draft = render(role);
    assert.equal(draft.offer_template_in_chat, false);
    const snapshot = readJSON(inside(root, draft.files.find(f => f.format === 'json').path));
    assert.equal(snapshot.profile.resume_template_path, first);
  }

  const change = {resume_template_path:next, replaces_resume_template_path:first};
  mutate(root, 'profile set', change);
  mutate(root, 'profile set', change); // A retry of the same selection is harmless.
  assert.throws(() => mutate(root, 'profile set', {resume_template_path:'',replaces_resume_template_path:first}), /replacement/);
  const revision = render(secondJob);
  assert.equal(revision.offer_template_in_chat, false);
  assert.equal(readJSON(inside(root, revision.files.find(f => f.format === 'json').path)).profile.resume_template_path, next);
  build(root);
  const index = fs.readFileSync(inside(root, 'INDEX.md'), 'utf8');
  assert.ok(index.includes(next) && !index.includes('Offer a template'));
  mutate(root, 'profile set', {resume_template_path:'', replaces_resume_template_path:next});
  assert.equal(resume(root, job.id, payload).offer_template_in_chat, false);
});
test('interview reports need sources; predictions remain distinct',t=>{
  const {root,job,experience}=fixture(t);assert.throws(()=>mutate(root,'research add',{kind:'reported_question',title:'Question',content:'Claimed report'},job.id),/requires|require/);
  mutate(root,'research add',{kind:'predicted_question',title:'Tell me about a tracker.',content:'Suggested from listing.',experience_ids:[experience.id]},job.id);
  mutate(root,'research add',{kind:'reported_question',title:'Real source example',content:'Test fixture report.',url:'https://example.com/report',source_name:'Fixture',role_context:'Related role'},job.id);
  assert.deepEqual(load(root).jobs[0].research.map(r=>r.kind),['predicted_question','reported_question']);
});
test('correspondence deduplicates connector IDs and never treats drafts as sent',t=>{
  const {root,job}=fixture(t);const m={direction:'draft',subject:'Hello',contact:'Recruiter',body:'Draft only',source:'User request',external_id:'msg-1'};
  mutate(root,'message add',m,job.id);assert.throws(()=>mutate(root,'message add',m,job.id),/already recorded/);assert.equal(load(root).jobs[0].messages[0].direction,'draft');assert.equal(load(root).jobs[0].status,'queued');
});
test('generated dashboard escapes source content and has no assistant task controls',t=>{
  const {root}=fixture(t);mutate(root,'profile set',{name:'</script><script>alert(1)</script>'});build(root);const html=fs.readFileSync(path.join(root,'dashboard.html'),'utf8');
  assert.ok(!html.includes('</script><script>alert(1)</script>'));assert.ok(html.includes('\\u003c/script>'));assert.ok(!html.includes('data-prompt='));assert.ok(!html.includes('Continue with my assistant'));assert.ok(!html.includes('prompt-dialog'));
  assert.match(html,/__next-role\/version/);const version=readJSON(path.join(root,'dashboard-version.json'));assert.ok(html.includes(version.built_at));
  assert.match(html, /<dialog id="document-preview"/);
  assert.match(html, /DecompressionStream\('deflate-raw'\)/);
  assert.ok(!html.includes('/*__DOCUMENT_PREVIEW__*/'));
});
test('managed paths reject traversal, unsafe URLs, and simultaneous writes',t=>{
  const root=workspace(t);assert.throws(()=>inside(root,'../outside.json'),/inside/);assert.throws(()=>inside(root,'C:\\outside.json'),/relative/);
  assert.throws(()=>mutate(root,'job add',{company:'X',title:'Y',url:'javascript:alert(1)',listing_text:'Z'}),/HTTP/);
  lock(root,()=>assert.throws(()=>lock(root,()=>{}),/in progress/));assert.equal(fs.existsSync(path.join(root,'.write.lock')),false);
  mutate(root,'profile set',{name:'A'});mutate(root,'profile set',{name:'B'});assert.ok(fs.readdirSync(path.join(root,'.backups','profile')).some(n=>n.startsWith('profile.json.')));
});
test('CLI mutation with spaces in its file path persists and rebuilds',t=>{
  const root=workspace(t);const payload=path.join(root,'profile payload.json');fs.writeFileSync(payload,JSON.stringify({name:'A Person'}));
  const result=spawnSync(process.execPath,[path.join(ROOT,'scripts/career.mjs'),'profile','set','--file',payload,'--workspace',root],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(load(root).profile.name,'A Person');assert.ok(fs.existsSync(JSON.parse(result.stdout).dashboard));
});
test('first setup invites chat attachments until career material has been saved', t => {
  const root = path.join(workspace(t), 'new', 'workspace');
  const command = (...args) => JSON.parse(runCareer(args, root));
  const first = command('init');
  assert.equal(first.dashboard, path.join(root, 'dashboard.html'));
  assert.match(first.result.onboarding_message, /drag .* into this chat/i);
  for (const material of ['past résumé', 'past cover letter', 'commendation', 'LinkedIn export', 'work sample']) {
    assert.ok(first.result.onboarding_message.includes(material), material);
  }
  assert.match(first.result.onboarding_message, /tell me about a recent role/i);
  assert.equal(command('status').onboarding_message, first.result.onboarding_message);
  assert.deepEqual(fs.readdirSync(path.join(root, 'input')), []);
  fs.writeFileSync(path.join(root, 'input', 'commendation.txt'), 'Thank you for coordinating the project handoff.');
  assert.equal(command('intake').result.length, 1);
  assert.equal(command('init').result.onboarding_message, undefined);
  assert.equal(command('status').onboarding_message, undefined);
  assert.equal(command('status').sources[0].name, 'commendation.txt');
});
test('release ZIP entries preserve content, Unicode paths, and CRC',()=>{
  const bytes=Buffer.from('Useful content ✓');const zip=zipEntries([{name:'next-role/notes/é.txt',bytes}]);assert.equal(zip.readUInt32LE(0),0x04034b50);const nameLen=zip.readUInt16LE(26);const size=zip.readUInt32LE(18);assert.equal(zip.subarray(30,30+nameLen).toString(),'next-role/notes/é.txt');assert.deepEqual(inflateRawSync(zip.subarray(30+nameLen,30+nameLen+size)),bytes);assert.equal(zip.readUInt32LE(14),crc32(bytes));assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
});
test('preview routing blocks encoded traversal and private directories',t=>{
  const root=workspace(t);
  for(const url of ['/workspace/%2e%2e/README.md','/workspace/../README.md','/workspace/.backups/a','/workspace/%5c..%5c.env','/workspace/%00','/scripts/lib.mjs','/workspace/C:/secret']) assert.equal(resolveRequest(root,url),null,url);
  assert.equal(resolveRequest(root,'/workspace/dashboard.html'),path.join(root,'workspace','dashboard.html'));
  assert.equal(resolveRequest(root,'/README.md'),path.join(root,'README.md'));
});

test('release ZIP can be extracted and validated immediately, including an empty applications folder',t=>{
  const root=workspace(t);const result=packageApp(path.join(root,'release'));const bytes=fs.readFileSync(result.archive);const extracted=path.join(root,'unpacked');fs.mkdirSync(extracted);let offset=0;
  while(bytes.readUInt32LE(offset)===0x04034b50) {
    const size=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extraLength=bytes.readUInt16LE(offset+28);
    const name=bytes.subarray(offset+30,offset+30+nameLength).toString();const start=offset+30+nameLength+extraLength;const content=inflateRawSync(bytes.subarray(start,start+size));const dest=inside(extracted,name);
    assert.equal(crc32(content),bytes.readUInt32LE(offset+14));assert.ok(!name.includes('/.backups/'));
    if(name.endsWith('/'))fs.mkdirSync(dest,{recursive:true});else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);}offset=start+size;
  }
  const app=path.join(extracted,'next-role');const personal=path.join(app,'workspace');assert.equal(validate(personal).ok,true);assert.equal(load(personal).jobs.length,0);assert.equal(load(personal).profile.name,'');assert.deepEqual(load(personal).brain_dump,[]);assert.equal(fs.existsSync(path.join(app,'demo')),false);assert.ok(fs.existsSync(path.join(app,'MEMORY.md')));assert.ok(fs.existsSync(path.join(personal,'INDEX.md')));
  const dashboard = path.join(personal, 'dashboard.html');
  const setup = spawnSync('npm run setup', {cwd: app, shell: true, encoding: 'utf8'});
  assert.equal(setup.status, 0, setup.stderr);
  assert.match(setup.stdout, /into this chat/i);
  const before = fs.readFileSync(dashboard, 'utf8');
  assert.doesNotMatch(before, /Explore demo|\.\.\/demo\/dashboard\.html/);
  const launch = spawnSync(process.execPath, ['scripts/launch.mjs', '--no-open'], {
    cwd: app, encoding: 'utf8', env: { ...process.env, PORT: 'invalid' }
  });
  assert.equal(launch.status, 0, launch.stderr);
  assert.match(launch.stdout, /^file:\/\/\/.*\/workspace\/dashboard\.html\s*$/);
  assert.equal(fs.readFileSync(dashboard, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(app,'demo')), false);
  assert.ok(!before.includes('career-intake-template'));
  assert.ok(!fs.existsSync(path.join(personal, '.server.log')));
});

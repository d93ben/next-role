import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { ROOT, init, load, lock, mutate, resume, intake, extracted, build, validate, inside, readJSON } from '../scripts/lib.mjs';
import { createDemo } from '../scripts/demo.mjs';
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
  assert.deepEqual(doc.files.map(f => f.format), ['docx', 'html', 'txt', 'json']);
  mutate(root,'job update',{status:'ready'},job.id);
  mutate(root,'submission record',{resume_id:doc.id,evidence_type:'user_reported',evidence:'I submitted this version today.'},job.id);
  mutate(root,'job update',{status:'interview'},job.id);
  const submitted=load(root).jobs[0].submission;const archived=inside(root,submitted.files[0].path);const bytes=fs.readFileSync(archived);
  assert.deepEqual(submitted.files.map(f => f.format), ['docx']);
  mutate(root,'experience update',{...experience,accomplishments:[{...experience.accomplishments[0],text:'Updated current wording.'}]});
  resume(root,job.id,payload);assert.deepEqual(fs.readFileSync(archived),bytes);assert.equal(validate(root).ok,true);
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
  mutate(root, 'submission record', {resume_id: doc.id, resume_format: 'txt', evidence_type: 'user_reported', evidence: 'Text file uploaded.'}, job.id);
  assert.deepEqual(load(root).jobs[0].submission.files.map(f => f.format), ['txt']);
});
test('actual imported resume and cover-letter bytes are archived',t=>{
  const {root,job}=fixture(t);const source=path.join(root,'input','actual.pdf');fs.writeFileSync(source,'Exact test PDF bytes');
  mutate(root,'document add',{kind:'resume',source_path:source,title:'Actual PDF'},job.id);
  const cover=path.join(root,'input','letter.txt');fs.writeFileSync(cover,'Exact cover letter');mutate(root,'document add',{kind:'cover_letter',source_path:cover,title:'Letter'},job.id);
  const docs=load(root).jobs[0].documents;mutate(root,'submission record',{resume_id:docs[0].id,attachment_ids:[docs[1].id],evidence_type:'observed_confirmation',evidence:'Confirmation receipt recorded.'},job.id);
  const archived=load(root).jobs[0].submission.files;assert.equal(archived.length,2);assert.equal(fs.readFileSync(inside(root,archived[0].path),'utf8'),'Exact test PDF bytes');assert.equal(validate(root).ok,true);
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
test('fictional demo is isolated and generation is repeatable without duplication',t=>{
  const root=workspace(t);assert.throws(()=>createDemo(root),/personal workspace/);
  const demo=path.join(root,'example');createDemo(demo);const before=load(demo);assert.equal(before.jobs.length,5);assert.equal(before.meta.demo,true);assert.equal(load(root).jobs.length,0);createDemo(demo);assert.equal(load(demo).jobs.length,5);assert.equal(validate(demo).ok,true);
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
  const app=path.join(extracted,'next-role');const personal=path.join(app,'workspace');assert.equal(validate(personal).ok,true);assert.equal(load(personal).jobs.length,0);assert.equal(load(personal).profile.name,'');assert.deepEqual(load(personal).brain_dump,[]);assert.equal(validate(path.join(app,'demo')).ok,true);assert.ok(fs.existsSync(path.join(app,'MEMORY.md')));assert.ok(fs.existsSync(path.join(personal,'INDEX.md')));
});

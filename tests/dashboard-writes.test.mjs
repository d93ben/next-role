import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, init, load, mutate, build, readJSON, validate } from '../scripts/lib.mjs';
import { createAppServer } from '../scripts/server.mjs';

function temp(t) { const dir=fs.mkdtempSync(path.join(os.tmpdir(),'next-role-ui-test-'));t.after(()=>{assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));assert.match(path.basename(dir),/^next-role-ui-test-/);fs.rmSync(dir,{recursive:true,force:true});});return dir; }
function job(root) { return mutate(root,'job add',{company:'Example',title:'Coordinator',listing_text:'Help the team coordinate projects.'}); }

test('favorites persist across processes, update the index, and never queue an application',t=>{
  const root=temp(t);init(root);const j=job(root);mutate(root,'favorite set',{favorite:true},j.id);const count=load(root).jobs[0].history.length;mutate(root,'favorite set',{favorite:true},j.id);build(root);
  assert.equal(load(root).jobs[0].history.length,count);assert.equal(load(root).jobs[0].status,'saved');assert.equal(readJSON(path.join(root,'index.json')).counts.favorites,1);
  const result=spawnSync(process.execPath,[path.join(ROOT,'scripts/career.mjs'),'status','--workspace',root],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).jobs[0].favorite,true);
  mutate(root,'favorite set',{favorite:false},j.id);build(root);assert.equal(readJSON(path.join(root,'index.json')).counts.favorites,0);assert.throws(()=>mutate(root,'favorite set',{favorite:'yes'},j.id),/true or false/);
});
test('original career notes can become linked evidence without losing the source',t=>{
  const root=temp(t);init(root);const note=mutate(root,'brain-dump add',{title:'Volunteer project',text:'I coordinated three volunteers.',request_id:'note-retry-1'});
  assert.equal(mutate(root,'brain-dump add',{title:note.title,text:note.text,request_id:'note-retry-1'}).id,note.id);
  assert.throws(()=>mutate(root,'brain-dump add',{title:note.title,text:'Different',request_id:'note-retry-1'}),/different note/);
  assert.throws(()=>mutate(root,'brain-dump update',{id:note.id,status:'processed'}),/Explain/);
  const e=mutate(root,'experience add',{company:'Community group',title:'Volunteer coordinator',period:'2025',source_refs:[note.id],accomplishments:[{text:'Coordinated three volunteers.'}]});
  mutate(root,'brain-dump update',{id:note.id,status:'processed',experience_ids:[e.id],processing_note:'Recorded the volunteer role.'});build(root);
  assert.equal(load(root).brain_dump[0].text,note.text);assert.equal(load(root).brain_dump.length,1);assert.equal(readJSON(path.join(root,'index.json')).counts.pending_notes,0);assert.equal(validate(root).ok,true);
});
test('handoff and generated navigation stay in sync with unresolved questions and notes',t=>{
  const root=temp(t);init(root);job(root);const q=mutate(root,'question add',{question:'What dates?',why:'Confirm timeline.'});mutate(root,'brain-dump add',{text:'Remember my weekend project.'});
  mutate(root,'memory set',{summary:'Profile started.',current_focus:'Confirm dates.',decisions:['Prefer local roles.'],next_steps:['Ask about the weekend project.']});build(root);
  let index=readJSON(path.join(root,'index.json'));assert.equal(index.counts.open_questions,1);assert.equal(index.counts.pending_notes,1);assert.equal(index.memory.current_focus,'Confirm dates.');
  mutate(root,'answer add',{question:q.question,response:'2024–2025',question_id:q.id});build(root);index=readJSON(path.join(root,'index.json'));assert.equal(index.counts.open_questions,0);assert.match(fs.readFileSync(path.join(root,'INDEX.md'),'utf8'),/Confirm dates/);
});
test('older workspaces gain optional files without changing job records or answers',t=>{
  const root=temp(t);init(root);const j=job(root);const file=path.join(root,'applications',j.id,'application.json');const old=readJSON(file);delete old.favorite;fs.writeFileSync(file,JSON.stringify(old));fs.unlinkSync(path.join(root,'memory.json'));fs.unlinkSync(path.join(root,'profile','brain-dump.json'));const original=fs.readFileSync(file);
  build(root);assert.equal(load(root).jobs[0].favorite,false);assert.deepEqual(fs.readFileSync(file),original);assert.deepEqual(load(root).brain_dump,[]);assert.ok(fs.existsSync(path.join(root,'INDEX.md')));
});
test('local write API enforces origin/token/action boundaries and accepts only the personal workspace',async t=>{
  const project=temp(t);
  const root=path.join(project,'workspace');
  init(root);
  const j=job(root);
  build(root);
  const server=createAppServer(project);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));const base=`http://127.0.0.1:${server.address().port}`;
  const session=await (await fetch(base+'/__next-role/session')).json();
  const send=(payload,headers={})=>fetch(base+'/__next-role/action',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,'X-Next-Role-Token':session.token,...headers},body:JSON.stringify(payload)});
  const star={workspace:'workspace',action:'favorite',job_id:j.id,favorite:true};
  for(const headers of [{Origin:'https://unrelated.example'},{'X-Next-Role-Token':'wrong'},{'Content-Type':'text/plain'}])assert.equal((await send(star,headers)).status,403);
  assert.equal((await send({...star,workspace:'../outside'})).status,400);assert.equal((await send({...star,action:'job update'})).status,400);
  assert.equal((await send({...star,workspace:'demo'})).status,400);
  assert.equal((await send(star)).status,200);assert.equal(load(root).jobs[0].favorite,true);assert.equal(load(root).jobs[0].status,'saved');
  const note={workspace:'workspace',action:'brain-dump',text:'My original note <script>example</script>',request_id:'api-retry'};assert.equal((await send(note)).status,200);assert.equal((await send(note)).status,200);assert.equal(load(root).brain_dump.length,1);assert.equal(readJSON(path.join(root,'index.json')).counts.pending_notes,1);
  assert.equal((await fetch(base+'/demo/dashboard.html')).status,403);
  const html=await (await fetch(base+'/workspace/dashboard.html')).text();assert.ok(!html.includes('My original note <script>'));assert.ok(html.includes('My original note \\u003cscript>'));
  assert.equal((await fetch(base+'/workspace/.backups/file')).status,403);assert.equal((await fetch(base+'/__next-role/version?workspace=unknown')).status,400);
});

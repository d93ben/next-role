import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import { _electron } from 'playwright-core';
import { checkTemplateExport } from './template-check.mjs';

// Run against both the delivered launcher and the Electron binary inside the package.
const [launcher, executable] = process.argv.slice(2).map(p => path.resolve(p));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'next-role-packaged-'));
let root = path.join(tmp,'original','workspace');
let desktop;
function cli(args) {
  const output = path.join(tmp,'output.json');
  fs.rmSync(output,{force:true});
  const child = spawnSync(launcher,['--cli',...args,'--workspace',root,'--output',output],{encoding:'utf8',timeout:120000});
  assert.equal(child.status,0,child.error?.message || child.stderr);
  return JSON.parse(fs.readFileSync(output,'utf8'));
}
function payload(name,data) {
  const f=path.join(tmp,name+'.json');
  fs.writeFileSync(f,JSON.stringify(data));
  return f;
}
try {
  assert.match(cli(['init']).result.onboarding_message, /into this chat/i);
  desktop = await _electron.launch({executablePath:executable,args:['--workspace',root],timeout:90000});
  const page = await desktop.firstWindow();
  page.setDefaultTimeout(25000);
  page.on('pageerror',error => console.error('Dashboard error:',error.message));
  page.on('console',msg => { if (['warning','error'].includes(msg.type())) console.error('Dashboard:',msg.text()); });
  await page.getByText('Your shortlist starts here', {exact:true}).waitFor();
  await page.getByText(/past cover letter.*commendation.*LinkedIn export.*work sample in your AI chat/i).waitFor();
  assert.equal(await page.getByRole('link',{name:/demo/i}).count(),0);
  assert.equal(fs.existsSync(path.join(path.dirname(root),'demo')),false);
  const job = cli(['job','add','--file',payload('job',{company:'QA Example',title:'Temporary role',listing_text:'Fictional test'})]).result;
  await page.getByRole('button',{name:/^Star QA Example/}).click();
  await page.getByRole('button',{name:/^Unstar QA Example/}).waitFor();
  await page.locator('a[href="#profile"]').first().click();
  await page.locator('#brain-text').fill('Saved in the packaged app');
  await page.locator('#brain-form button[type="submit"]').click();
  await page.locator('#saved-thoughts').getByText('Saved in the packaged app').waitFor();
  await page.locator('#brain-text').fill('Preserve this draft');
  cli(['brain-dump','add','--file',payload('agent',{text:'Saved by the chat agent'})]);
  await page.locator('#saved-thoughts').getByText('Saved by the chat agent').waitFor({timeout:20000});
  assert.equal(await page.locator('#brain-text').inputValue(),'Preserve this draft');
  assert.equal(await page.locator('#brain-text').evaluate(el=>el===document.activeElement),true);
  assert.match(page.url(),/^nextrole:\/\/app\/workspace\/dashboard.html#profile$/);
  assert.equal(cli(['status']).jobs.find(j=>j.id===job.id).favorite,true);
  await desktop.close();
  desktop=null;
  checkTemplateExport(cli,payload,root,job);
  fs.renameSync(path.dirname(root),path.join(tmp,'moved'));
  root=path.join(tmp,'moved','workspace');
  assert.equal(cli(['validate']).ok,true);
  assert.equal(cli(['status']).pending_notes.length,2);
  console.log('Packaged app passed favorite, note, external refresh, draft preservation and workspace relocation checks.');
} finally {
  if (desktop) await desktop.close();
  fs.rmSync(tmp,{recursive:true,force:true});
}


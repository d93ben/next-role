import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from '../scripts/vendor/jszip.min.js';
import { fillTemplate } from '../scripts/template-docx.mjs';
import { init, intake, load } from '../scripts/lib.mjs';

const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
async function sample() {
  const archive = new JSZip();
  const p = text => '<w:p><w:r><w:t>'+text+'</w:t></w:r></w:p>';
  archive.file('word/document.xml','<w:document xmlns:w="'+ns+'"><w:body>'+
    '<w:p><w:r><w:t>First </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>LAST</w:t></w:r></w:p>'+
    '<w:tbl><w:tr><w:tc>'+p('Sample bullet')+'</w:tc></w:tr></w:tbl>'+
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>');
  archive.file('word/header1.xml','<w:hdr xmlns:w="'+ns+'">'+p('Contact here')+'</w:hdr>');
  archive.file('word/styles.xml','<w:styles xmlns:w="'+ns+'"/>');
  return archive.generateAsync({type:'base64'});
}

test('template fill keeps table, page size and formatting across split runs and edits a header', async () => {
  const input = await sample();
  const edits = [
    {id:'document:0',from:'First LAST',to:'First Example'},
    {id:'document:1',from:'Sample bullet',to:['One result','Another result']},
    {id:'header1:0',from:'Contact here',to:'Local contact'}
  ];
  const {filled,pageSize} = await fillTemplate({input,edits,requiredText:['First Example','Another result']});
  assert.deepEqual(pageSize,[595.3,841.9]);
  const result = await fillTemplate({input:filled,mode:'inspect'});
  assert.deepEqual(result.paragraphs.map(p => p.text), ['First Example','One result','Another result','Local contact']);
  const original = await JSZip.loadAsync(input,{base64:true});
  const output = await JSZip.loadAsync(filled,{base64:true});
  assert.equal(await original.file('word/styles.xml').async('string'),await output.file('word/styles.xml').async('string'));
  const xml = await output.file('word/document.xml').async('string');
  assert.match(xml,/<w:b\/><\/w:rPr><w:t[^>]*>Example</);
  assert.match(xml,/<w:tbl>/);
  await assert.rejects(fillTemplate({input,edits:[{...edits[0],from:'stale text'}]}),/changed or repeated/);
  await assert.rejects(fillTemplate({input,edits,requiredText:['Unsourced paragraph']}),/missing/);
  assert.deepEqual((await fillTemplate({input,mode:'inspect'})).paragraphs.map(p=>p.text),['First LAST','Sample bullet','Contact here']);
});

test('a DOCX upload named template is read locally and does not select a layout', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'next-role-docx-intake-'));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  init(root);
  fs.writeFileSync(path.join(root,'input','template.docx'),Buffer.from(await sample(),'base64'));
  const [record] = intake(root);
  assert.equal(record.status,'extracted');
  assert.match(record.text,/First LAST\nSample bullet/);
  assert.ok(!load(root).profile.resume_template_path);
  assert.equal(intake(root)[0].id,record.id);
});

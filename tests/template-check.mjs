import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderResumeDocx } from '../scripts/resume-docx.mjs';

export function checkTemplateExport(cli, payload, root, job) {
  const example = 'Example sample bullet';
  const achievement = 'Coordinated the weekly release review.';
  const layout = renderResumeDocx({
    profile:{name:'Example Person',education:[]},headline:'Operations',summary:'',
    experiences:[{title:'Coordinator',company:'Acme',period:'2025',bullets:[{text:example}]}],skills:[]
  });
  fs.mkdirSync(path.join(root,'templates'),{recursive:true});
  fs.writeFileSync(path.join(root,'input','template.docx'),layout);
  cli(['intake']);
  assert.ok(!cli(['status']).profile.resume_template_path);
  const original = path.join(root,'templates','layout.docx');
  fs.writeFileSync(original,layout);
  cli(['profile','set','--file',payload('profile',{name:'Jamie Example',resume_template_path:'templates/layout.docx'})]);
  const source = cli(['answer','add','--file',payload('answer',{question:'What did you coordinate?',response:achievement})]).result;
  const role = cli(['experience','add','--file',payload('role',{title:'Coordinator',company:'Acme',period:'2025',
    source_refs:[source.id],accomplishments:[{text:achievement}]})]).result;
  const {paragraphs} = cli(['template','inspect']);
  const edit = (from,to) => ({id:paragraphs.find(row => row.text === from).id,from,to});
  const draft = {experiences:[{experience_id:role.id,bullets:[{text:achievement,fact_ids:[role.accomplishments[0].id]}]}],
    template_edits:[edit('Example Person','Jamie Example'),edit(example,[achievement])]};
  const doc = cli(['resume','create','--id',job.id,'--file',payload('template-resume',draft)]).result;
  assert.deepEqual(fs.readFileSync(original),layout);
  const file = format => path.join(root, doc.files.find(f => f.format === format).path);
  const pdf = fs.readFileSync(file('pdf'));
  assert.match(pdf.subarray(0,10).toString(),/^%PDF-/);
  assert.ok(pdf.length > 3000);
  const extracted = spawnSync('python',['-c',
    "import sys; from pypdf import PdfReader; print(' '.join(p.extract_text() or '' for p in PdfReader(sys.argv[1]).pages))",
    file('pdf')],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  assert.equal(extracted.status,0,extracted.error?.message || extracted.stderr);
  const text = extracted.stdout.replace(/\s+/g,' ').trim();
  assert.ok(text.includes('Jamie Example') && text.includes(achievement),'The printed PDF must contain the filled résumé.');
  assert.ok(!text.includes('Example Person') && !text.includes(example),'Sample template text appeared in the PDF.');
  // Reinspect the filled DOCX with the same reader a user would use for the next revision.
  fs.copyFileSync(file('docx'),path.join(root,'templates','filled.docx'));
  cli(['profile','set','--file',payload('selected-copy',{
    replaces_resume_template_path:'templates/layout.docx',resume_template_path:'templates/filled.docx'
  })]);
  const filled = cli(['template','inspect']).paragraphs.map(row => row.text);
  assert.ok(filled.includes('Jamie Example') && filled.includes(achievement));
  assert.ok(!filled.includes('Example Person') && !filled.includes(example));
  return { pdf:file('pdf'), docx:file('docx') };
}

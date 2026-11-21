import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readPdf } from './resume-pdf.mjs';
import { fillTemplate } from './template-docx.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const limit = 32 * 1024 * 1024;
export const offlinePage = '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\' data:; img-src data: blob:; font-src data: blob:; base-uri \'none\'; form-action \'none\'"><main id="pages"></main>';

// The worker is isolated from the workspace writer. Only verified outputs leave its private directory.
export function processTemplate(file, mode, edits = [], requiredText = []) {
  if (path.extname(file).toLowerCase() !== '.docx') throw new Error('The built-in template renderer accepts DOCX files.');
  if (!fs.existsSync(file) || fs.statSync(file).size > limit) throw new Error('The selected DOCX is missing or exceeds 32 MiB.');
  if (!Array.isArray(edits)) throw new Error('template_edits must be an array.');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-role-template-'));
  try {
    fs.copyFileSync(file, path.join(dir, 'input.docx'));
    fs.writeFileSync(path.join(dir, 'request.json'), JSON.stringify({ mode, edits, requiredText }));
    const worker = process.versions.electron
      ? [...(process.defaultApp ? [path.resolve(directory, '..')] : []), '--template-worker', dir]
      : [path.join(directory, 'template-chromium.mjs'), dir];
    const result = spawnSync(process.execPath, worker, { windowsHide: true, timeout: 90000, encoding: 'utf8' });
    const errorFile = path.join(dir, 'error.txt');
    if (result.status !== 0) throw new Error(fs.existsSync(errorFile) ? fs.readFileSync(errorFile,'utf8') :
      (result.error?.message || result.stderr?.trim() || 'The offline DOCX renderer did not finish.'));
    if (mode === 'inspect') return JSON.parse(fs.readFileSync(path.join(dir, 'paragraphs.json'), 'utf8'));
    return { pdf: readPdf(path.join(dir, 'output.pdf')), docx: fs.readFileSync(path.join(dir, 'filled.docx')) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  }
}

export async function runTemplatePage(dir, evaluate, print) {
  for (const source of ['vendor/jszip.min.js','vendor/docx-preview.min.js','template-page.js']) {
    await evaluate(fs.readFileSync(path.join(directory, source), 'utf8') + '\n;void 0');
  }
  const filled = fs.readFileSync(path.join(dir,'filled.docx')).toString('base64');
  const pageSize = JSON.parse(fs.readFileSync(path.join(dir,'paper.json'),'utf8'));
  await evaluate('renderTemplatePage(' + JSON.stringify({filled,pageSize}) + ')');
  const pdf = await print();
  fs.writeFileSync(path.join(dir, 'output.pdf'), pdf);
}

export async function prepareTemplateFiles(dir) {
  const request = JSON.parse(fs.readFileSync(path.join(dir,'request.json'),'utf8'));
  request.input = fs.readFileSync(path.join(dir,'input.docx')).toString('base64');
  const result = await fillTemplate(request);
  if (request.mode === 'inspect') {
    fs.writeFileSync(path.join(dir,'paragraphs.json'),JSON.stringify(result));
    return false;
  }
  fs.writeFileSync(path.join(dir,'filled.docx'),Buffer.from(result.filled,'base64'));
  fs.writeFileSync(path.join(dir,'paper.json'),JSON.stringify(result.pageSize ?? null));
  return true;
}

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, atomic, build, init, inside, lock, readJSON } from '../scripts/lib.mjs';
import { createDemo } from '../scripts/demo.mjs';

export const dashboardOrigin = 'nextrole://app';
const guideFiles = ['AGENTS.md', 'START-HERE.md', 'MEMORY.md', 'CLAUDE.md'];
const guideDirs = ['workflows', 'docs', 'templates'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function portableParent(platform, executable, portableDir) {
  if (platform === 'win32') return portableDir || path.dirname(executable);
  if (platform === 'darwin') return path.resolve(path.dirname(executable), '../../..');
  return path.dirname(executable);
}

// Only update a guide if the current copy still matches the one we installed.
function installGuides(root) {
  const parent = path.dirname(root);
  if (path.resolve(parent) === ROOT) return;
  const manifest = inside(root, '.desktop-guides.json');
  const installed = fs.existsSync(manifest) ? readJSON(manifest) : {};
  const files = [...guideFiles];
  for (const dir of guideDirs) {
    for (const entry of fs.readdirSync(path.join(ROOT,dir), {withFileTypes:true})) {
      if (entry.isFile()) files.push(dir + '/' + entry.name);
    }
  }
  for (const relative of files) {
    const original = fs.readFileSync(path.join(ROOT,relative));
    const target = inside(parent,relative);
    const digest = hash(original);
    if (fs.existsSync(target)) {
      const current = hash(fs.readFileSync(target));
      if (current === digest) { installed[relative] = digest; continue; }
      if (current !== installed[relative]) continue;
    }
    atomic(target,original);
    installed[relative] = digest;
  }
  atomic(manifest,JSON.stringify(installed));
}

export function prepareWorkspace(root) {
  lock(root, () => {
    init(root);
    installGuides(root);
    build(root);
  });
}

export function scopeRoot(root, scope) {
  if (scope === 'workspace') return root;
  if (scope !== 'demo') throw new Error('Unknown workspace.');
  const demo = inside(path.dirname(root), 'demo');
  if (!fs.existsSync(path.join(demo,'workspace.json'))) createDemo(demo);
  if (readJSON(inside(demo,'workspace.json')).demo !== true) throw new Error('This folder is not the fictional demo.');
  return demo;
}

export function dashboardScope(url) {
  const page = new URL(url);
  if (page.protocol !== 'nextrole:' || page.host !== 'app' || page.search) return null;
  return /^\/(workspace|demo)\/dashboard\.html$/.exec(page.pathname)?.[1] || null;
}

export function resourcePath(root, url) {
  const page = new URL(url);
  if (page.protocol !== 'nextrole:' || page.host !== 'app') return null;
  const segments = decodeURIComponent(page.pathname).slice(1).split('/');
  if (segments.some(s => !s || s.startsWith('.') || /[\\:\x00]/.test(s))) return null;
  const [scope, dir, ...rest] = segments;
  if (!['workspace','demo'].includes(scope) || !['applications','input','templates'].includes(dir) || !rest.length) return null;
  if (!/\.(pdf|docx|html|txt|md|json|csv|png|jpe?g)$/i.test(rest.at(-1))) return null;
  return inside(scopeRoot(root,scope), [dir,...rest].join('/'));
}

